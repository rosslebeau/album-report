import { env } from '$env/dynamic/private';
import { createChildLogger, withPerformanceLog } from '../logger.js';
import type {
	RecentTracksResponse,
	LastfmAlbumInfo,
	LastfmAlbumTrack,
	LastfmErrorResponse,
	LastfmTrack
} from './types.js';
import type { Scrobble } from '../algorithm/types.js';
import type { AlbumInfo, AlbumTrack } from '../algorithm/types.js';

const log = createChildLogger('lastfm');
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const USER_AGENT = 'TheAlbumReport/1.0 (album-report)';
const PER_PAGE = 200;

export class LastfmApiError extends Error {
	constructor(
		public readonly code: number,
		message: string
	) {
		super(message);
		this.name = 'LastfmApiError';
	}
}

async function apiFetch<T>(params: Record<string, string>): Promise<T> {
	const url = new URL(BASE_URL);
	const apiKey = env.LASTFM_API_KEY;
	if (!apiKey) {
		throw new Error('LASTFM_API_KEY environment variable is not set');
	}
	url.searchParams.set('api_key', apiKey);
	url.searchParams.set('format', 'json');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url.toString(), {
		headers: { 'User-Agent': USER_AGENT }
	});

	if (!response.ok) {
		throw new LastfmApiError(response.status, `HTTP ${response.status}`);
	}

	const data = await response.json();

	if (data && typeof data === 'object' && 'error' in data) {
		const errorData = data as LastfmErrorResponse;
		throw new LastfmApiError(errorData.error, errorData.message);
	}

	return data as T;
}

function parseTrack(track: LastfmTrack): Scrobble | null {
	if (track['@attr']?.nowplaying === 'true') {
		return null;
	}

	if (!track.date) {
		return null;
	}

	return {
		track: track.name,
		artist: track.artist['#text'] ?? track.artist.name,
		album: track.album['#text'],
		timestamp: parseInt(track.date.uts, 10),
		albumMbid: track.album.mbid || undefined
	};
}

export async function getRecentTracks(
	username: string,
	targetCount: number = 600
): Promise<readonly Scrobble[]> {
	const totalPages = Math.ceil(targetCount / PER_PAGE);
	const scrobbles: Scrobble[] = [];

	for (let page = 1; page <= totalPages; page++) {
		const data = await withPerformanceLog(
			log,
			`getRecentTracks page ${page}/${totalPages}`,
			() =>
				apiFetch<RecentTracksResponse>({
					method: 'user.getrecenttracks',
					user: username,
					limit: PER_PAGE.toString(),
					page: page.toString()
				})
		);

		const tracks = data.recenttracks.track;
		if (!tracks || tracks.length === 0) {
			break;
		}

		for (const track of tracks) {
			const parsed = parseTrack(track);
			if (parsed) {
				scrobbles.push(parsed);
			}
		}

		const total = parseInt(data.recenttracks['@attr'].total, 10);
		if (scrobbles.length >= targetCount || scrobbles.length >= total) {
			break;
		}
	}

	return scrobbles.slice(0, targetCount).sort((a, b) => a.timestamp - b.timestamp);
}

function normalizeAlbumTracks(
	tracks: readonly LastfmAlbumTrack[] | LastfmAlbumTrack | undefined
): readonly AlbumTrack[] {
	if (!tracks) {
		return [];
	}

	const trackArray = Array.isArray(tracks) ? tracks : [tracks];

	return trackArray.map((t) => ({
		name: t.name,
		position: parseInt(t['@attr'].rank, 10)
	}));
}

export async function getAlbumInfo(
	artist: string,
	album: string
): Promise<AlbumInfo | null> {
	try {
		const data = await withPerformanceLog(
			log,
			`getAlbumInfo: ${artist} - ${album}`,
			() =>
				apiFetch<LastfmAlbumInfo>({
					method: 'album.getinfo',
					artist,
					album,
					autocorrect: '1'
				})
		);

		const tracks = normalizeAlbumTracks(data.album.tracks?.track);

		return {
			name: data.album.name,
			artist: data.album.artist,
			trackCount: tracks.length,
			tracks
		};
	} catch (err) {
		if (err instanceof LastfmApiError && (err.code === 6 || err.code === 404)) {
			log.warn({ artist, album, code: err.code }, 'Album not found on last.fm');
			return null;
		}
		throw err;
	}
}
