import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecentTracks, getAlbumInfo, LastfmApiError } from '$lib/server/lastfm/client';
import { analyzeScrobbles, albumKey } from '$lib/server/algorithm/quotient';
import { classifyArchetype } from '$lib/server/algorithm/archetype';
import type { AlbumInfo } from '$lib/server/algorithm/types';
import { createChildLogger, withPerformanceLog } from '$lib/server/logger';
import type { AnalysisResult, ApiError } from '$lib/types';

const log = createChildLogger('api/analyze');

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

function errorResponse(status: number, error: string, message: string) {
	return json({ error, message } satisfies ApiError, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { username?: string };
	try {
		body = await request.json();
	} catch {
		return errorResponse(400, 'INVALID_USERNAME', 'Request body must be valid JSON with a "username" field.');
	}

	const username = body.username?.trim();

	if (!username || !USERNAME_PATTERN.test(username)) {
		return errorResponse(400, 'INVALID_USERNAME', 'Username must be 1-100 alphanumeric characters, hyphens, or underscores.');
	}

	try {
		const scrobbles = await withPerformanceLog(
			log,
			`fetch scrobbles for ${username}`,
			() => getRecentTracks(username)
		);

		if (scrobbles.length === 0) {
			return errorResponse(422, 'NO_SCROBBLES', `User '${username}' has no scrobble history.`);
		}

		const albumsToFetch = new Map<string, { artist: string; album: string }>();
		let previousKey: string | null = null;

		for (const scrobble of scrobbles) {
			if (scrobble.album) {
				const key = albumKey(scrobble.artist, scrobble.album);
				if (previousKey === key && !albumsToFetch.has(key)) {
					albumsToFetch.set(key, { artist: scrobble.artist, album: scrobble.album });
				}
				previousKey = key;
			} else {
				previousKey = null;
			}
		}

		const albumInfoMap = new Map<string, AlbumInfo>();

		for (const [key, { artist, album }] of albumsToFetch) {
			try {
				const info = await getAlbumInfo(artist, album);
				if (info && info.tracks.length > 0) {
					albumInfoMap.set(key, info);
				}
			} catch (albumErr) {
				log.warn({ artist, album, err: albumErr }, 'Failed to fetch album info, treating as one-off');
			}
		}

		const totalUniqueAlbums = new Set(
			scrobbles.filter(s => s.album).map(s => albumKey(s.artist, s.album))
		).size;
		log.info(
			{ username, uniqueAlbums: totalUniqueAlbums, fetched: albumInfoMap.size, skipped: totalUniqueAlbums - albumsToFetch.size },
			'Album info fetch filtered by consecutive scrobbles'
		);

		const algorithmResult = withPerformanceLog(
			log,
			'album quotient algorithm',
			() => analyzeScrobbles(scrobbles, albumInfoMap)
		);

		const archetypeResult = withPerformanceLog(
			log,
			'archetype classification',
			() => classifyArchetype(scrobbles, albumInfoMap)
		);

		const result: AnalysisResult = {
			username,
			albumQuotient: algorithmResult.albumQuotient,
			totalAlbumsAsUnit: algorithmResult.totalAlbumsAsUnit,
			topAlbum: algorithmResult.topAlbum,
			totalScrobbles: algorithmResult.totalScrobbles,
			albumRuns: algorithmResult.albumRuns,
			archetypeResult
		};

		log.info(
			{
				username,
				quotient: result.albumQuotient,
				albums: result.totalAlbumsAsUnit,
				archetype: archetypeResult.archetype,
				confidence: archetypeResult.confidence
			},
			'Analysis complete'
		);

		return json(result);
	} catch (err) {
		if (err instanceof LastfmApiError) {
			if (err.code === 6) {
				return errorResponse(404, 'USER_NOT_FOUND', `No last.fm user found with username '${username}'.`);
			}
			if (err.code === 17) {
				return errorResponse(404, 'USER_NOT_FOUND', `User '${username}' has a private profile.`);
			}
			log.error({ err, username }, 'last.fm API error');
			return errorResponse(502, 'UPSTREAM_ERROR', 'Unable to reach last.fm. Please try again later.');
		}

		log.error({ err, username }, 'Unexpected error during analysis');
		return errorResponse(502, 'UPSTREAM_ERROR', 'Unable to reach last.fm. Please try again later.');
	}
};
