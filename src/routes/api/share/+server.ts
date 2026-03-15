import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';
import { insertAnalysisResult } from '$lib/server/db/queries';
import { createChildLogger, withPerformanceLog } from '$lib/server/logger';
import type { ApiError } from '$lib/types';

const log = createChildLogger('api/share');

function errorResponse(status: number, error: string, message: string) {
	return json({ error, message } satisfies ApiError, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return errorResponse(400, 'INVALID_RESULT', 'Request body must be valid JSON.');
	}

	const { username, albumQuotient, totalAlbumsAsUnit, topAlbum, totalScrobbles, albumRuns } = body;

	if (
		typeof username !== 'string' ||
		typeof albumQuotient !== 'number' ||
		typeof totalAlbumsAsUnit !== 'number' ||
		typeof totalScrobbles !== 'number' ||
		!Array.isArray(albumRuns)
	) {
		return errorResponse(400, 'INVALID_RESULT', 'Missing required fields in analysis result.');
	}

	const shareId = nanoid(12);

	const topAlbumObj = topAlbum as { name?: string; artist?: string } | null;

	try {
		const persisted = await withPerformanceLog(
			log,
			`persist result for ${username}`,
			() =>
				insertAnalysisResult({
					shareId,
					username,
					albumQuotient,
					totalAlbumsAsUnit,
					topAlbumName: topAlbumObj?.name ?? null,
					topAlbumArtist: topAlbumObj?.artist ?? null,
					totalScrobbles,
					albumRuns
				})
		);

		log.info({ shareId, username }, 'Result persisted');

		return json(
			{ shareId: persisted.shareId, url: `/report/${persisted.shareId}` },
			{ status: 201 }
		);
	} catch (err) {
		log.error({ err, username }, 'Failed to persist result');
		return errorResponse(500, 'PERSIST_ERROR', 'Failed to save results. Please try again.');
	}
};
