import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { runMigrations } from '$lib/server/db/migrate';

const TEST_DB_URL = 'postgresql://albumreport:albumreport@localhost:3031/albumreport';

let pool: pg.Pool;

beforeAll(async () => {
	await runMigrations(TEST_DB_URL);
	pool = new pg.Pool({ connectionString: TEST_DB_URL });
});

afterAll(async () => {
	// Clean up test data
	await pool.query("DELETE FROM analysis_results WHERE username LIKE 'test_%'");
	await pool.end();
});

describe('insertAnalysisResult + findByShareId (DB layer)', () => {
	it('should insert a result and retrieve it by share_id', async () => {
		const shareId = 'tstshr000001';
		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING *
		`;
		const insertResult = await pool.query(insertSql, [
			shareId,
			'test_user_1',
			42.5,
			7,
			'OK Computer',
			'Radiohead',
			600,
			JSON.stringify([
				{
					albumName: 'OK Computer',
					artistName: 'Radiohead',
					trackCount: 8,
					albumTrackCount: 12,
					startedFromTrack1: true,
					startPosition: 1,
					isShortAlbum: false,
					weight: 1.0
				}
			])
		]);

		expect(insertResult.rows).toHaveLength(1);
		expect(insertResult.rows[0].share_id).toBe(shareId);
		expect(insertResult.rows[0].username).toBe('test_user_1');
		expect(parseFloat(insertResult.rows[0].album_quotient)).toBe(42.5);
		expect(insertResult.rows[0].total_albums_as_unit).toBe(7);
		expect(insertResult.rows[0].top_album_name).toBe('OK Computer');
		expect(insertResult.rows[0].total_scrobbles).toBe(600);
		expect(insertResult.rows[0].album_runs).toHaveLength(1);
		expect(insertResult.rows[0].id).toBeTruthy();
		expect(insertResult.rows[0].created_at).toBeTruthy();

		// Now retrieve by share_id
		const selectResult = await pool.query(
			'SELECT * FROM analysis_results WHERE share_id = $1',
			[shareId]
		);

		expect(selectResult.rows).toHaveLength(1);
		expect(selectResult.rows[0].username).toBe('test_user_1');
	});

	it('should enforce unique share_id constraint', async () => {
		const shareId = 'tstshr000002';
		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`;
		const params = [shareId, 'test_user_2', 50.0, 3, null, null, 100, '[]'];

		await pool.query(insertSql, params);

		// Inserting same share_id should fail
		await expect(pool.query(insertSql, params)).rejects.toThrow(/unique/i);
	});

	it('should return empty result for nonexistent share_id', async () => {
		const result = await pool.query(
			'SELECT * FROM analysis_results WHERE share_id = $1',
			['nonexistent_id']
		);

		expect(result.rows).toHaveLength(0);
	});

	it('should handle null top_album fields for 0% quotient', async () => {
		const shareId = 'tstshr000003';
		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING *
		`;

		const result = await pool.query(insertSql, [
			shareId, 'test_user_3', 0.0, 0, null, null, 600, '[]'
		]);

		expect(result.rows[0].top_album_name).toBeNull();
		expect(result.rows[0].top_album_artist).toBeNull();
		expect(parseFloat(result.rows[0].album_quotient)).toBe(0);
	});

	it('should insert and retrieve archetype_result JSONB', async () => {
		const shareId = 'tstshr000004';
		const archetypeResult = {
			archetype: 'Completionist',
			confidence: 0.82,
			confidenceLevel: 'high',
			description: 'You listen to albums front-to-back.',
			secondaryArchetype: 'Deep Diver',
			secondaryDescription: 'You also explore artist catalogs.',
			metrics: {
				albumCompletionRate: 0.72,
				artistConcentration: 0.14,
				albumBreadth: 0.08,
				trackPositionSkew: 0.48,
				repeatIntensityAlbum: 0.35,
				repeatIntensityTrack: 0.42,
				scrobbleEntropy: 0.78,
				popularitySkew: null,
				genreCoherence: null,
				uniqueAlbums: 48,
				uniqueArtists: 22,
				totalScrobbles: 600,
				qualifyingAlbums: 32
			},
			interestingStats: [
				{ label: 'Albums completed', value: '8 out of 14', detail: null }
			],
			archetypeScores: { Completionist: 0.82, 'Deep Diver': 0.74 },
			disabledArchetypes: ['Singles Hound', 'Curator']
		};

		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs, archetype_result)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`;

		const insertResult = await pool.query(insertSql, [
			shareId, 'test_user_4', 42.5, 7, 'OK Computer', 'Radiohead', 600,
			JSON.stringify([]),
			JSON.stringify(archetypeResult)
		]);

		expect(insertResult.rows[0].archetype_result).toBeTruthy();
		expect(insertResult.rows[0].archetype_result.archetype).toBe('Completionist');
		expect(insertResult.rows[0].archetype_result.confidence).toBe(0.82);
		expect(insertResult.rows[0].archetype_result.metrics.albumCompletionRate).toBe(0.72);

		// Retrieve
		const selectResult = await pool.query(
			'SELECT * FROM analysis_results WHERE share_id = $1',
			[shareId]
		);

		expect(selectResult.rows[0].archetype_result.archetype).toBe('Completionist');
		expect(selectResult.rows[0].archetype_result.secondaryArchetype).toBe('Deep Diver');
	});

	it('should handle null archetype_result for backward compatibility', async () => {
		const shareId = 'tstshr000005';
		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING *
		`;

		const result = await pool.query(insertSql, [
			shareId, 'test_user_5', 50.0, 3, null, null, 100, '[]'
		]);

		// Old row without archetype_result should have null
		expect(result.rows[0].archetype_result).toBeNull();
	});

	it('should handle explicitly null archetype_result', async () => {
		const shareId = 'tstshr000006';
		const insertSql = `
			INSERT INTO analysis_results
				(share_id, username, album_quotient, total_albums_as_unit,
				 top_album_name, top_album_artist, total_scrobbles, album_runs, archetype_result)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`;

		const result = await pool.query(insertSql, [
			shareId, 'test_user_6', 50.0, 3, null, null, 100, '[]', null
		]);

		expect(result.rows[0].archetype_result).toBeNull();
	});
});
