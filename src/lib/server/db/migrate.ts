import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const MIGRATIONS_TABLE = '_migrations';

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
	await client.query(`
		CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) UNIQUE NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
	const result = await client.query<{ name: string }>(
		`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
	);
	return new Set(result.rows.map((row) => row.name));
}

function getMigrationFiles(migrationsDir: string): string[] {
	if (!fs.existsSync(migrationsDir)) {
		return [];
	}
	return fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();
}

export async function runMigrations(connectionString: string, migrationsDir?: string): Promise<void> {
	const dir = migrationsDir ?? path.resolve(process.cwd(), 'migrations');
	const client = new pg.Client({ connectionString });

	try {
		await client.connect();
		await ensureMigrationsTable(client);

		const applied = await getAppliedMigrations(client);
		const files = getMigrationFiles(dir);

		for (const file of files) {
			if (applied.has(file)) {
				continue;
			}

			const sql = fs.readFileSync(path.join(dir, file), 'utf-8');

			await client.query('BEGIN');
			try {
				await client.query(sql);
				await client.query(
					`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
					[file]
				);
				await client.query('COMMIT');
				console.log(`Migration applied: ${file}`);
			} catch (err) {
				await client.query('ROLLBACK');
				throw new Error(`Migration failed: ${file}: ${err}`);
			}
		}
	} finally {
		await client.end();
	}
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error('DATABASE_URL environment variable is required');
		process.exit(1);
	}
	runMigrations(url).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
