import { query } from './index.js';
import type { PersistedAnalysisResult, AlbumRun } from '$lib/types.js';

interface AnalysisResultRow {
	id: string;
	share_id: string;
	username: string;
	album_quotient: string;
	total_albums_as_unit: number;
	top_album_name: string | null;
	top_album_artist: string | null;
	total_scrobbles: number;
	album_runs: AlbumRun[];
	created_at: Date;
}

function rowToResult(row: AnalysisResultRow): PersistedAnalysisResult {
	return {
		id: row.id,
		shareId: row.share_id,
		username: row.username,
		albumQuotient: parseFloat(row.album_quotient),
		totalAlbumsAsUnit: row.total_albums_as_unit,
		topAlbum:
			row.top_album_name && row.top_album_artist
				? { name: row.top_album_name, artist: row.top_album_artist }
				: null,
		totalScrobbles: row.total_scrobbles,
		albumRuns: row.album_runs,
		createdAt: row.created_at.toISOString()
	};
}

export async function insertAnalysisResult(params: {
	shareId: string;
	username: string;
	albumQuotient: number;
	totalAlbumsAsUnit: number;
	topAlbumName: string | null;
	topAlbumArtist: string | null;
	totalScrobbles: number;
	albumRuns: readonly AlbumRun[];
}): Promise<PersistedAnalysisResult> {
	const result = await query<AnalysisResultRow>(
		`INSERT INTO analysis_results
			(share_id, username, album_quotient, total_albums_as_unit,
			 top_album_name, top_album_artist, total_scrobbles, album_runs)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING *`,
		[
			params.shareId,
			params.username,
			params.albumQuotient,
			params.totalAlbumsAsUnit,
			params.topAlbumName,
			params.topAlbumArtist,
			params.totalScrobbles,
			JSON.stringify(params.albumRuns)
		]
	);

	return rowToResult(result.rows[0]);
}

export async function findByShareId(
	shareId: string
): Promise<PersistedAnalysisResult | null> {
	const result = await query<AnalysisResultRow>(
		'SELECT * FROM analysis_results WHERE share_id = $1',
		[shareId]
	);

	if (result.rows.length === 0) {
		return null;
	}

	return rowToResult(result.rows[0]);
}
