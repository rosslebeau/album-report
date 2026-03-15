import type { Scrobble, AlbumInfo, AlbumRunCandidate, AlgorithmResult } from './types.js';
import type { AlbumRun } from '$lib/types.js';

const SHORT_ALBUM_MAX_TRACKS = 4;
const STANDARD_MIN_RUN_LENGTH = 3;
const SHORT_MIN_RUN_LENGTH = 2;

const WEIGHT_TRACK1_START = 1.0;
const WEIGHT_MID_ALBUM_START = 0.9;
const WEIGHT_SHORT_ALBUM = 0.5;

export function albumKey(artist: string, album: string): string {
	return `${artist}|||${album}`;
}

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

	// Exact match first
	const exact = albumInfo.tracks.find(
		(t) => t.name.toLowerCase() === trackName.toLowerCase()
	);
	if (exact) return exact.position;

	// Normalized match (strips feat. credits, etc.)
	const normalizedMatch = albumInfo.tracks.find(
		(t) => normalizeTrackName(t.name) === normalized
	);
	if (normalizedMatch) return normalizedMatch.position;

	// Prefix match — scrobble name starts with album track name
	const prefixMatch = albumInfo.tracks.find(
		(t) => normalized.startsWith(normalizeTrackName(t.name))
	);
	if (prefixMatch) return prefixMatch.position;

	return null;
}

export function detectAlbumRuns(
	scrobbles: readonly Scrobble[],
	albumInfoMap: Map<string, AlbumInfo>
): AlbumRunCandidate[] {
	const runs: AlbumRunCandidate[] = [];
	let currentRun: {
		tracks: Scrobble[];
		positions: number[];
		albumName: string;
		artistName: string;
		info: AlbumInfo;
	} | null = null;

	for (const scrobble of scrobbles) {
		const key = albumKey(scrobble.artist, scrobble.album);
		const info = albumInfoMap.get(key);

		if (!info) {
			if (currentRun) {
				flushRun(currentRun, runs);
				currentRun = null;
			}
			continue;
		}

		const position = findTrackPosition(scrobble.track, info);

		if (position === null) {
			if (currentRun) {
				flushRun(currentRun, runs);
				currentRun = null;
			}
			continue;
		}

		const sameAlbum =
			currentRun &&
			currentRun.albumName === scrobble.album &&
			currentRun.artistName === scrobble.artist;

		const ascending =
			sameAlbum &&
			currentRun &&
			position > currentRun.positions[currentRun.positions.length - 1];

		if (sameAlbum && ascending && currentRun) {
			currentRun.tracks.push(scrobble);
			currentRun.positions.push(position);
		} else {
			if (currentRun) {
				flushRun(currentRun, runs);
			}
			currentRun = {
				tracks: [scrobble],
				positions: [position],
				albumName: scrobble.album,
				artistName: scrobble.artist,
				info
			};
		}
	}

	if (currentRun) {
		flushRun(currentRun, runs);
	}

	return runs;
}

function flushRun(
	run: {
		tracks: Scrobble[];
		positions: number[];
		albumName: string;
		artistName: string;
		info: AlbumInfo;
	},
	runs: AlbumRunCandidate[]
): void {
	if (run.tracks.length < 2) {
		return;
	}

	const isShortAlbum = run.info.trackCount <= SHORT_ALBUM_MAX_TRACKS;

	runs.push({
		albumName: run.albumName,
		artistName: run.artistName,
		tracks: [...run.tracks],
		positions: [...run.positions],
		albumTrackCount: run.info.trackCount,
		startPosition: run.positions[0],
		startedFromTrack1: run.positions[0] === 1,
		isShortAlbum
	});
}

export function qualifyRuns(
	runs: readonly AlbumRunCandidate[]
): readonly AlbumRunCandidate[] {
	return runs.filter((run) => {
		const minLength = run.isShortAlbum
			? SHORT_MIN_RUN_LENGTH
			: STANDARD_MIN_RUN_LENGTH;
		return run.tracks.length >= minLength;
	});
}

function computeWeight(run: AlbumRunCandidate): number {
	if (run.isShortAlbum) {
		return WEIGHT_SHORT_ALBUM;
	}
	return run.startedFromTrack1 ? WEIGHT_TRACK1_START : WEIGHT_MID_ALBUM_START;
}

export function calculateQuotient(
	qualifiedRuns: readonly AlbumRunCandidate[],
	totalScrobbles: number
): number {
	if (totalScrobbles === 0) {
		return 0;
	}

	let weightedSum = 0;
	for (const run of qualifiedRuns) {
		const weight = computeWeight(run);
		weightedSum += run.tracks.length * weight;
	}

	const quotient = (weightedSum / totalScrobbles) * 100;
	return Math.round(quotient * 100) / 100;
}

function findTopAlbum(
	qualifiedRuns: readonly AlbumRunCandidate[]
): { name: string; artist: string } | null {
	if (qualifiedRuns.length === 0) {
		return null;
	}

	const albumCounts = new Map<string, { name: string; artist: string; count: number }>();

	for (const run of qualifiedRuns) {
		const key = albumKey(run.artistName, run.albumName);
		const existing = albumCounts.get(key);
		if (existing) {
			existing.count += run.tracks.length;
		} else {
			albumCounts.set(key, {
				name: run.albumName,
				artist: run.artistName,
				count: run.tracks.length
			});
		}
	}

	let top: { name: string; artist: string; count: number } | null = null;
	for (const entry of albumCounts.values()) {
		if (!top || entry.count > top.count) {
			top = entry;
		}
	}

	return top ? { name: top.name, artist: top.artist } : null;
}

function toAlbumRuns(qualifiedRuns: readonly AlbumRunCandidate[]): AlbumRun[] {
	return qualifiedRuns.map((run) => ({
		albumName: run.albumName,
		artistName: run.artistName,
		trackCount: run.tracks.length,
		albumTrackCount: run.albumTrackCount,
		startedFromTrack1: run.startedFromTrack1,
		startPosition: run.startPosition,
		isShortAlbum: run.isShortAlbum,
		weight: computeWeight(run)
	}));
}

export function analyzeScrobbles(
	scrobbles: readonly Scrobble[],
	albumInfoMap: Map<string, AlbumInfo>
): AlgorithmResult {
	const allRuns = detectAlbumRuns(scrobbles, albumInfoMap);
	const qualified = qualifyRuns(allRuns);
	const quotient = calculateQuotient(qualified, scrobbles.length);
	const topAlbum = findTopAlbum(qualified);

	return {
		albumQuotient: quotient,
		totalAlbumsAsUnit: qualified.length,
		topAlbum,
		albumRuns: toAlbumRuns(qualified),
		totalScrobbles: scrobbles.length
	};
}
