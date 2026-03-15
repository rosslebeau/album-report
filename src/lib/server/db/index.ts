import pg from 'pg';
import { env } from '$env/dynamic/private';
import { createChildLogger, withPerformanceLog } from '../logger.js';

const log = createChildLogger('db');

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
	if (!_pool) {
		const connectionString = env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable is not set');
		}
		_pool = new pg.Pool({ connectionString, max: 10 });
		_pool.on('error', (err) => {
			log.error({ err }, 'Unexpected pool error');
		});
	}
	return _pool;
}

export async function query<T extends pg.QueryResultRow>(
	text: string,
	params?: unknown[]
): Promise<pg.QueryResult<T>> {
	return withPerformanceLog(log, `query: ${text.slice(0, 60)}`, async () => {
		return getPool().query<T>(text, params);
	});
}
