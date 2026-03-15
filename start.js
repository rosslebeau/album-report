import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const MIGRATIONS_TABLE = '_migrations';

async function runMigrations() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.warn('DATABASE_URL not set, skipping migrations');
		return;
	}

	const migrationsDir = path.resolve(process.cwd(), 'migrations');
	if (!fs.existsSync(migrationsDir)) {
		console.log('No migrations directory found, skipping');
		return;
	}

	const client = new pg.Client({ connectionString });
	try {
		await client.connect();

		await client.query(`
			CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
				id SERIAL PRIMARY KEY,
				name VARCHAR(255) UNIQUE NOT NULL,
				applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
			)
		`);

		const applied = await client.query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`);
		const appliedSet = new Set(applied.rows.map((r) => r.name));

		const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

		for (const file of files) {
			if (appliedSet.has(file)) continue;

			const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
			await client.query('BEGIN');
			try {
				await client.query(sql);
				await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [file]);
				await client.query('COMMIT');
				console.log(`Migration applied: ${file}`);
			} catch (err) {
				await client.query('ROLLBACK');
				throw new Error(`Migration failed: ${file}: ${err}`);
			}
		}

		console.log('Migrations complete');
	} finally {
		await client.end();
	}
}

async function main() {
	await runMigrations();

	// Start the SvelteKit server
	await import('./build/index.js');
}

main().catch((err) => {
	console.error('Startup failed:', err);
	process.exit(1);
});
