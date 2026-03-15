import type { Scrobble, AlbumInfo, EnrichedScrobble } from './types.js';
import { albumKey } from './quotient.js';

const TRACK_COUNT_CAP = 20;

const COMPILATION_ARTISTS = new Set([
	'various artists',
	'various',
	'va',
	'soundtrack',
	'original soundtrack'
]);

function normalizeTrackName(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s*\(feat\..*?\)/gi, '')
		.replace(/\s*\[feat\..*?\]/gi, '')
		.replace(/\s*ft\.?\s+.*/gi, '')
		.replace(/\s*featuring\s+.*/gi, '')
		.trim();
}

function findTrackPosition(
	trackName: string,
	albumInfo: AlbumInfo
): number | null {
	const normalized = normalizeTrackName(trackName);

	const exact = albumInfo.tracks.find(
		(t) => t.name.toLowerCase() === trackName.toLowerCase()
	);
	if (exact) return exact.position;

	const normalizedMatch = albumInfo.tracks.find(
		(t) => normalizeTrackName(t.name) === normalized
	);
	if (normalizedMatch) return normalizedMatch.position;

	const prefixMatch = albumInfo.tracks.find(
		(t) => normalized.startsWith(normalizeTrackName(t.name))
	);
	if (prefixMatch) return prefixMatch.position;

	return null;
}

function isCompilationArtist(artist: string): boolean {
	return COMPILATION_ARTISTS.has(artist.toLowerCase().trim());
}

export function enrichScrobbles(
	scrobbles: readonly Scrobble[],
	albumInfoMap: Map<string, AlbumInfo>
): readonly EnrichedScrobble[] {
	return scrobbles.map((scrobble): EnrichedScrobble => {
		const key = albumKey(scrobble.artist, scrobble.album);
		const info = albumInfoMap.get(key);

		if (!info) {
			return {
				track: scrobble.track,
				artist: scrobble.artist,
				album: scrobble.album,
				timestamp: scrobble.timestamp,
				trackPosition: null,
				albumTotalTracks: null,
				isCompilation: false,
				albumMbid: scrobble.albumMbid
			};
		}

		const trackPosition = findTrackPosition(scrobble.track, info);
		const rawTrackCount = info.trackCount;
		const albumTotalTracks = rawTrackCount > TRACK_COUNT_CAP ? TRACK_COUNT_CAP : rawTrackCount;

		return {
			track: scrobble.track,
			artist: scrobble.artist,
			album: scrobble.album,
			timestamp: scrobble.timestamp,
			trackPosition,
			albumTotalTracks,
			isCompilation: isCompilationArtist(scrobble.artist),
			albumMbid: scrobble.albumMbid
		};
	});
}
