import { describe, it, expect } from 'vitest';
import {
	computeAlbumCompletionRate,
	computeArtistConcentration,
	computeAlbumBreadth,
	computeTrackPositionSkew,
	computeRepeatIntensity,
	computeScrobbleEntropy,
	computeAllMetrics
} from '$lib/server/algorithm/metrics';
import type { EnrichedScrobble } from '$lib/server/algorithm/types';

function makeEnrichedScrobble(overrides: Partial<EnrichedScrobble> & { track: string; artist: string; album: string }): EnrichedScrobble {
	return {
		timestamp: Date.now(),
		trackPosition: null,
		albumTotalTracks: null,
		isCompilation: false,
		...overrides
	};
}

/**
 * Helper: generates N scrobbles for a given album with sequential track positions.
 */
function makeAlbumScrobbles(
	artist: string,
	album: string,
	tracksHeard: number[],
	albumTotalTracks: number,
	opts?: { isCompilation?: boolean; baseTimestamp?: number }
): EnrichedScrobble[] {
	const base = opts?.baseTimestamp ?? 1000;
	return tracksHeard.map((pos, i) =>
		makeEnrichedScrobble({
			track: `Track ${pos}`,
			artist,
			album,
			timestamp: base + i * 100,
			trackPosition: pos,
			albumTotalTracks,
			isCompilation: opts?.isCompilation ?? false
		})
	);
}

describe('computeAlbumCompletionRate', () => {
	it('should return 1.0 for a fully completed album', () => {
		const scrobbles = makeAlbumScrobbles('Artist', 'Album', [1, 2, 3, 4, 5], 5);
		const acr = computeAlbumCompletionRate(scrobbles);
		expect(acr).toBeCloseTo(1.0, 2);
	});

	it('should weight by album track count', () => {
		// Album A: 10 tracks, heard 5 = 0.5 completion, weight = 10
		// Album B: 5 tracks, heard 5 = 1.0 completion, weight = 5
		// Weighted ACR = (0.5*10 + 1.0*5) / (10+5) = 10/15 ≈ 0.667
		const scrobbles = [
			...makeAlbumScrobbles('Artist', 'Album A', [1, 2, 3, 4, 5], 10),
			...makeAlbumScrobbles('Artist', 'Album B', [1, 2, 3, 4, 5], 5)
		];
		const acr = computeAlbumCompletionRate(scrobbles);
		expect(acr).toBeCloseTo(0.667, 2);
	});

	it('should exclude albums with < 4 tracks', () => {
		// Short album (3 tracks) should be excluded
		const scrobbles = [
			...makeAlbumScrobbles('Artist', 'EP', [1, 2, 3], 3),
			...makeAlbumScrobbles('Artist', 'Album', [1, 2, 3, 4], 8)
		];
		const acr = computeAlbumCompletionRate(scrobbles);
		// Only Album counts: 4/8 = 0.5
		expect(acr).toBeCloseTo(0.5, 2);
	});

	it('should exclude compilation albums', () => {
		const scrobbles = [
			...makeAlbumScrobbles('Various Artists', 'Compilation', [1, 2, 3, 4, 5], 10, { isCompilation: true }),
			...makeAlbumScrobbles('Artist', 'Album', [1, 2, 3, 4, 5], 5)
		];
		const acr = computeAlbumCompletionRate(scrobbles);
		// Only non-compilation Album counts: 5/5 = 1.0
		expect(acr).toBeCloseTo(1.0, 2);
	});

	it('should count unique tracks heard per album', () => {
		// Hear track 1 twice — should only count once
		const scrobbles = [
			...makeAlbumScrobbles('Artist', 'Album', [1, 1, 2, 3, 4], 8)
		];
		const acr = computeAlbumCompletionRate(scrobbles);
		// 4 unique tracks / 8 total = 0.5
		expect(acr).toBeCloseTo(0.5, 2);
	});

	it('should return 0 when no qualifying albums exist', () => {
		const scrobbles = makeAlbumScrobbles('Artist', 'EP', [1, 2], 3);
		const acr = computeAlbumCompletionRate(scrobbles);
		expect(acr).toBe(0);
	});
});

describe('computeArtistConcentration', () => {
	it('should return 1.0 for a single artist', () => {
		const scrobbles = makeAlbumScrobbles('Only Artist', 'Album', [1, 2, 3], 5);
		const ac = computeArtistConcentration(scrobbles);
		expect(ac).toBeCloseTo(1.0, 2);
	});

	it('should return HHI for even distribution', () => {
		// 4 artists, each with 25% share => HHI = 4*(0.25^2) = 0.25
		const scrobbles = [
			...makeAlbumScrobbles('A1', 'X', [1, 2, 3], 5),
			...makeAlbumScrobbles('A2', 'Y', [1, 2, 3], 5),
			...makeAlbumScrobbles('A3', 'Z', [1, 2, 3], 5),
			...makeAlbumScrobbles('A4', 'W', [1, 2, 3], 5)
		];
		const ac = computeArtistConcentration(scrobbles);
		expect(ac).toBeCloseTo(0.25, 2);
	});

	it('should return higher value for concentrated listening', () => {
		// Artist A: 8 scrobbles, Artist B: 2 scrobbles
		// HHI = (0.8)^2 + (0.2)^2 = 0.64 + 0.04 = 0.68
		const scrobbles = [
			...makeAlbumScrobbles('A', 'X', [1, 2, 3, 4, 5, 6, 7, 8], 10),
			...makeAlbumScrobbles('B', 'Y', [1, 2], 5)
		];
		const ac = computeArtistConcentration(scrobbles);
		expect(ac).toBeCloseTo(0.68, 2);
	});
});

describe('computeAlbumBreadth', () => {
	it('should return unique albums / total scrobbles', () => {
		// 2 unique albums, 6 scrobbles => 2/6 ≈ 0.333
		const scrobbles = [
			...makeAlbumScrobbles('A', 'X', [1, 2, 3], 5),
			...makeAlbumScrobbles('A', 'Y', [1, 2, 3], 5)
		];
		const ab = computeAlbumBreadth(scrobbles);
		expect(ab).toBeCloseTo(2 / 6, 3);
	});

	it('should return 0 for empty scrobbles', () => {
		const ab = computeAlbumBreadth([]);
		expect(ab).toBe(0);
	});
});

describe('computeTrackPositionSkew', () => {
	it('should return ~0.0 for consistently early tracks', () => {
		// All tracks at position 1 of 10 => (1-1)/(10-1) = 0 for each
		const scrobbles = makeAlbumScrobbles('A', 'X', [1, 1, 1, 1], 10);
		const tps = computeTrackPositionSkew(scrobbles);
		expect(tps).toBeCloseTo(0.0, 2);
	});

	it('should return ~0.5 for evenly distributed positions', () => {
		// Positions 1,5,10 of 10 tracks => (0+4+9)/9 / 3 = mean of 0, 0.444, 1.0 ≈ 0.481
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X', trackPosition: 1, albumTotalTracks: 10, isCompilation: false }),
			makeEnrichedScrobble({ track: 'T5', artist: 'A', album: 'X', trackPosition: 5, albumTotalTracks: 10, isCompilation: false }),
			makeEnrichedScrobble({ track: 'T10', artist: 'A', album: 'X', trackPosition: 10, albumTotalTracks: 10, isCompilation: false })
		];
		const tps = computeTrackPositionSkew(scrobbles);
		expect(tps).toBeCloseTo((0 + 4 / 9 + 1) / 3, 2);
	});

	it('should exclude compilations and < 4-track albums', () => {
		const scrobbles = [
			// Compilation — excluded
			makeEnrichedScrobble({ track: 'C1', artist: 'Various Artists', album: 'Comp', trackPosition: 1, albumTotalTracks: 10, isCompilation: true }),
			// Short album — excluded
			makeEnrichedScrobble({ track: 'S1', artist: 'A', album: 'Short', trackPosition: 1, albumTotalTracks: 3, isCompilation: false }),
			// Valid scrobble
			makeEnrichedScrobble({ track: 'V1', artist: 'A', album: 'Long', trackPosition: 5, albumTotalTracks: 10, isCompilation: false })
		];
		const tps = computeTrackPositionSkew(scrobbles);
		// Only the valid scrobble: (5-1)/(10-1) = 4/9 ≈ 0.444
		expect(tps).toBeCloseTo(4 / 9, 2);
	});

	it('should exclude scrobbles with null trackPosition', () => {
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X', trackPosition: null, albumTotalTracks: 10, isCompilation: false }),
			makeEnrichedScrobble({ track: 'T5', artist: 'A', album: 'X', trackPosition: 5, albumTotalTracks: 10, isCompilation: false })
		];
		const tps = computeTrackPositionSkew(scrobbles);
		expect(tps).toBeCloseTo(4 / 9, 2);
	});

	it('should return 0.5 when no qualifying scrobbles', () => {
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'Short', trackPosition: 1, albumTotalTracks: 3, isCompilation: false })
		];
		const tps = computeTrackPositionSkew(scrobbles);
		expect(tps).toBe(0.5);
	});
});

describe('computeRepeatIntensity', () => {
	it('should return { album: 0, track: 0 } for all unique scrobbles', () => {
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T2', artist: 'A', album: 'Y' }),
			makeEnrichedScrobble({ track: 'T3', artist: 'B', album: 'Z' })
		];
		const ri = computeRepeatIntensity(scrobbles);
		expect(ri.album).toBeCloseTo(0, 2);
		expect(ri.track).toBeCloseTo(0, 2);
	});

	it('should return high values for repeated listening', () => {
		// 4 scrobbles of same album, same track
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' })
		];
		const ri = computeRepeatIntensity(scrobbles);
		// album: 1 - 1/4 = 0.75
		expect(ri.album).toBeCloseTo(0.75, 2);
		// track: 1 - 1/4 = 0.75
		expect(ri.track).toBeCloseTo(0.75, 2);
	});

	it('should differentiate album vs track repeat intensity', () => {
		// Same album, different tracks — album RI high, track RI lower
		const scrobbles = [
			makeEnrichedScrobble({ track: 'T1', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T2', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T3', artist: 'A', album: 'X' }),
			makeEnrichedScrobble({ track: 'T4', artist: 'A', album: 'X' })
		];
		const ri = computeRepeatIntensity(scrobbles);
		// album: 1 - 1/4 = 0.75 (1 unique album, 4 album scrobbles)
		expect(ri.album).toBeCloseTo(0.75, 2);
		// track: 1 - 4/4 = 0.0 (4 unique tracks, 4 total)
		expect(ri.track).toBeCloseTo(0, 2);
	});
});

describe('computeScrobbleEntropy', () => {
	it('should return 1.0 for perfectly even distribution', () => {
		// 4 albums, each with exactly 3 scrobbles => max entropy
		const scrobbles = [
			...makeAlbumScrobbles('A', 'X', [1, 2, 3], 5),
			...makeAlbumScrobbles('B', 'Y', [1, 2, 3], 5),
			...makeAlbumScrobbles('C', 'Z', [1, 2, 3], 5),
			...makeAlbumScrobbles('D', 'W', [1, 2, 3], 5)
		];
		const se = computeScrobbleEntropy(scrobbles);
		expect(se).toBeCloseTo(1.0, 2);
	});

	it('should return 0.0 for a single album', () => {
		const scrobbles = makeAlbumScrobbles('A', 'X', [1, 2, 3, 4], 5);
		const se = computeScrobbleEntropy(scrobbles);
		expect(se).toBe(0);
	});

	it('should return lower entropy for skewed distribution', () => {
		// Album X: 8 scrobbles, Album Y: 2 scrobbles
		const scrobbles = [
			...makeAlbumScrobbles('A', 'X', [1, 2, 3, 4, 5, 6, 7, 8], 10),
			...makeAlbumScrobbles('B', 'Y', [1, 2], 5)
		];
		const se = computeScrobbleEntropy(scrobbles);
		// Should be between 0 and 1, lower than max
		expect(se).toBeGreaterThan(0);
		expect(se).toBeLessThan(1);
	});
});

describe('computeAllMetrics', () => {
	it('should return all metric fields', () => {
		const scrobbles = [
			...makeAlbumScrobbles('A', 'Album1', [1, 2, 3, 4, 5], 8),
			...makeAlbumScrobbles('B', 'Album2', [1, 2, 3], 6)
		];
		const metrics = computeAllMetrics(scrobbles);

		expect(metrics.albumCompletionRate).toBeGreaterThanOrEqual(0);
		expect(metrics.artistConcentration).toBeGreaterThanOrEqual(0);
		expect(metrics.albumBreadth).toBeGreaterThan(0);
		expect(metrics.trackPositionSkew).toBeGreaterThanOrEqual(0);
		expect(metrics.repeatIntensityAlbum).toBeGreaterThanOrEqual(0);
		expect(metrics.repeatIntensityTrack).toBeGreaterThanOrEqual(0);
		expect(metrics.scrobbleEntropy).toBeGreaterThanOrEqual(0);
		expect(metrics.popularitySkew).toBeNull();
		expect(metrics.genreCoherence).toBeNull();
		expect(metrics.uniqueAlbums).toBe(2);
		expect(metrics.uniqueArtists).toBe(2);
		expect(metrics.totalScrobbles).toBe(8);
		expect(metrics.qualifyingAlbums).toBe(2);
	});
});
