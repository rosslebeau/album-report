import type { EnrichedScrobble } from './types.js';
import type { ListeningMetrics } from '$lib/types.js';
import { albumKey } from './quotient.js';

const MIN_TRACKS_FOR_QUALIFYING = 4;

export function computeAlbumCompletionRate(scrobbles: readonly EnrichedScrobble[]): number {
	// Group scrobbles by album, filtering out compilations and short albums
	const albumGroups = new Map<string, { uniqueTracks: Set<number>; totalTracks: number }>();

	for (const s of scrobbles) {
		if (s.isCompilation) continue;
		if (s.albumTotalTracks === null || s.albumTotalTracks < MIN_TRACKS_FOR_QUALIFYING) continue;
		if (s.trackPosition === null) continue;

		const key = albumKey(s.artist, s.album);
		let group = albumGroups.get(key);
		if (!group) {
			group = { uniqueTracks: new Set(), totalTracks: s.albumTotalTracks };
			albumGroups.set(key, group);
		}
		group.uniqueTracks.add(s.trackPosition);
	}

	if (albumGroups.size === 0) return 0;

	let weightedSum = 0;
	let weightTotal = 0;

	for (const group of albumGroups.values()) {
		const completion = group.uniqueTracks.size / group.totalTracks;
		const weight = group.totalTracks;
		weightedSum += completion * weight;
		weightTotal += weight;
	}

	return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}

export function computeArtistConcentration(scrobbles: readonly EnrichedScrobble[]): number {
	if (scrobbles.length === 0) return 0;

	const artistCounts = new Map<string, number>();
	for (const s of scrobbles) {
		artistCounts.set(s.artist, (artistCounts.get(s.artist) ?? 0) + 1);
	}

	let hhi = 0;
	for (const count of artistCounts.values()) {
		const share = count / scrobbles.length;
		hhi += share * share;
	}

	return hhi;
}

export function computeAlbumBreadth(scrobbles: readonly EnrichedScrobble[]): number {
	if (scrobbles.length === 0) return 0;

	const uniqueAlbums = new Set<string>();
	for (const s of scrobbles) {
		uniqueAlbums.add(albumKey(s.artist, s.album));
	}

	return uniqueAlbums.size / scrobbles.length;
}

export function computeTrackPositionSkew(scrobbles: readonly EnrichedScrobble[]): number {
	const qualifying = scrobbles.filter(
		(s) =>
			!s.isCompilation &&
			s.trackPosition !== null &&
			s.albumTotalTracks !== null &&
			s.albumTotalTracks >= MIN_TRACKS_FOR_QUALIFYING &&
			s.albumTotalTracks > 1
	);

	if (qualifying.length === 0) return 0.5;

	let sum = 0;
	for (const s of qualifying) {
		// Normalized position: 0 = first track, 1 = last track
		sum += (s.trackPosition! - 1) / (s.albumTotalTracks! - 1);
	}

	return sum / qualifying.length;
}

export function computeRepeatIntensity(scrobbles: readonly EnrichedScrobble[]): { album: number; track: number } {
	if (scrobbles.length === 0) return { album: 0, track: 0 };

	const uniqueAlbums = new Set<string>();
	const uniqueTracks = new Set<string>();
	let albumScrobbles = 0;

	for (const s of scrobbles) {
		const aKey = albumKey(s.artist, s.album);
		uniqueAlbums.add(aKey);
		uniqueTracks.add(`${aKey}|||${s.track}`);
		albumScrobbles++;
	}

	const albumRI = albumScrobbles > 0 ? 1 - uniqueAlbums.size / albumScrobbles : 0;
	const trackRI = scrobbles.length > 0 ? 1 - uniqueTracks.size / scrobbles.length : 0;

	return { album: albumRI, track: trackRI };
}

export function computeScrobbleEntropy(scrobbles: readonly EnrichedScrobble[]): number {
	if (scrobbles.length === 0) return 0;

	const albumCounts = new Map<string, number>();
	for (const s of scrobbles) {
		const key = albumKey(s.artist, s.album);
		albumCounts.set(key, (albumCounts.get(key) ?? 0) + 1);
	}

	const uniqueAlbums = albumCounts.size;
	if (uniqueAlbums <= 1) return 0;

	let entropy = 0;
	for (const count of albumCounts.values()) {
		const p = count / scrobbles.length;
		if (p > 0) {
			entropy -= p * Math.log2(p);
		}
	}

	const maxEntropy = Math.log2(uniqueAlbums);
	return maxEntropy === 0 ? 0 : entropy / maxEntropy;
}

export function computePopularitySkew(): number | null {
	return null;
}

export function computeGenreCoherence(): number | null {
	return null;
}

export function computeAllMetrics(enrichedScrobbles: readonly EnrichedScrobble[]): ListeningMetrics {
	const uniqueAlbums = new Set<string>();
	const uniqueArtists = new Set<string>();
	for (const s of enrichedScrobbles) {
		uniqueAlbums.add(albumKey(s.artist, s.album));
		uniqueArtists.add(s.artist);
	}

	// Count qualifying albums (>= 4 tracks, not compilations)
	const qualifyingAlbumKeys = new Set<string>();
	for (const s of enrichedScrobbles) {
		if (!s.isCompilation && s.albumTotalTracks !== null && s.albumTotalTracks >= MIN_TRACKS_FOR_QUALIFYING) {
			qualifyingAlbumKeys.add(albumKey(s.artist, s.album));
		}
	}

	const ri = computeRepeatIntensity(enrichedScrobbles);

	return {
		albumCompletionRate: computeAlbumCompletionRate(enrichedScrobbles),
		artistConcentration: computeArtistConcentration(enrichedScrobbles),
		albumBreadth: computeAlbumBreadth(enrichedScrobbles),
		trackPositionSkew: computeTrackPositionSkew(enrichedScrobbles),
		repeatIntensityAlbum: ri.album,
		repeatIntensityTrack: ri.track,
		scrobbleEntropy: computeScrobbleEntropy(enrichedScrobbles),
		popularitySkew: computePopularitySkew(),
		genreCoherence: computeGenreCoherence(),
		uniqueAlbums: uniqueAlbums.size,
		uniqueArtists: uniqueArtists.size,
		totalScrobbles: enrichedScrobbles.length,
		qualifyingAlbums: qualifyingAlbumKeys.size
	};
}
