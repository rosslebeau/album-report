import { describe, it, expect } from 'vitest';
import {
	detectAlbumRuns,
	qualifyRuns,
	calculateQuotient,
	analyzeScrobbles
} from '$lib/server/algorithm/quotient';
import type { Scrobble, AlbumInfo } from '$lib/server/algorithm/types';

function makeScrobble(
	track: string,
	artist: string,
	album: string,
	timestamp: number
): Scrobble {
	return { track, artist, album, timestamp };
}

function makeAlbumInfo(
	name: string,
	artist: string,
	trackNames: string[]
): AlbumInfo {
	return {
		name,
		artist,
		trackCount: trackNames.length,
		tracks: trackNames.map((t, i) => ({ name: t, position: i + 1 }))
	};
}

describe('detectAlbumRuns', () => {
	it('should detect consecutive album tracks as a run', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Track 1', 'Artist', 'Album', 1000),
			makeScrobble('Track 2', 'Artist', 'Album', 2000),
			makeScrobble('Track 3', 'Artist', 'Album', 3000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album',
				makeAlbumInfo('Album', 'Artist', [
					'Track 1',
					'Track 2',
					'Track 3',
					'Track 4',
					'Track 5'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);

		expect(runs).toHaveLength(1);
		expect(runs[0].tracks).toHaveLength(3);
		expect(runs[0].startedFromTrack1).toBe(true);
		expect(runs[0].startPosition).toBe(1);
	});

	it('should allow gaps in track positions (ascending order)', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Track 1', 'Artist', 'Album', 1000),
			makeScrobble('Track 2', 'Artist', 'Album', 2000),
			makeScrobble('Track 4', 'Artist', 'Album', 3000),
			makeScrobble('Track 5', 'Artist', 'Album', 4000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album',
				makeAlbumInfo('Album', 'Artist', [
					'Track 1',
					'Track 2',
					'Track 3',
					'Track 4',
					'Track 5'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);

		expect(runs).toHaveLength(1);
		expect(runs[0].tracks).toHaveLength(4);
	});

	it('should match tracks with feat. credits stripped', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Sopro (feat. Camila Nebbia)', 'Artist', 'Album', 1000),
			makeScrobble('Fliút', 'Artist', 'Album', 2000),
			makeScrobble('Synthesise (ft. Someone)', 'Artist', 'Album', 3000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album',
				makeAlbumInfo('Album', 'Artist', [
					'Sopro',
					'Trino',
					'Fliút',
					'Synthesise',
					'Curva'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);

		// Sopro is track 1, Fliút is track 3 (ascending, gap OK), Synthesise is track 4
		expect(runs).toHaveLength(1);
		expect(runs[0].tracks).toHaveLength(3);
		expect(runs[0].startPosition).toBe(1);
		expect(runs[0].startedFromTrack1).toBe(true);
	});

	it('should break run when different album appears', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Track 1', 'Artist', 'Album A', 1000),
			makeScrobble('Track 2', 'Artist', 'Album A', 2000),
			makeScrobble('Other Track', 'Artist', 'Album B', 3000),
			makeScrobble('Track 3', 'Artist', 'Album A', 4000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album A',
				makeAlbumInfo('Album A', 'Artist', [
					'Track 1',
					'Track 2',
					'Track 3',
					'Track 4',
					'Track 5'
				])
			],
			[
				'Artist|||Album B',
				makeAlbumInfo('Album B', 'Artist', [
					'Other Track',
					'Other 2',
					'Other 3',
					'Other 4',
					'Other 5'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);

		// Only the first 2-track sequence from Album A qualifies as a run.
		// The single Album B track and lone Album A Track 3 are too short.
		expect(runs).toHaveLength(1);
		expect(runs[0].albumName).toBe('Album A');
		expect(runs[0].tracks).toHaveLength(2);
	});

	it('should not create a run from a single track', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Track 1', 'Artist', 'Album', 1000),
			makeScrobble('Other', 'Other Artist', 'Other Album', 2000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album',
				makeAlbumInfo('Album', 'Artist', [
					'Track 1',
					'Track 2',
					'Track 3',
					'Track 4',
					'Track 5'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);
		const albumRuns = runs.filter(
			(r) => r.albumName === 'Album' && r.tracks.length > 1
		);

		expect(albumRuns).toHaveLength(0);
	});

	it('should detect mid-album start correctly', () => {
		const scrobbles: Scrobble[] = [
			makeScrobble('Track 3', 'Artist', 'Album', 1000),
			makeScrobble('Track 4', 'Artist', 'Album', 2000),
			makeScrobble('Track 5', 'Artist', 'Album', 3000)
		];
		const albumMap = new Map([
			[
				'Artist|||Album',
				makeAlbumInfo('Album', 'Artist', [
					'Track 1',
					'Track 2',
					'Track 3',
					'Track 4',
					'Track 5'
				])
			]
		]);

		const runs = detectAlbumRuns(scrobbles, albumMap);

		expect(runs).toHaveLength(1);
		expect(runs[0].startedFromTrack1).toBe(false);
		expect(runs[0].startPosition).toBe(3);
	});
});

describe('qualifyRuns', () => {
	it('should qualify standard albums with >= 3 tracks', () => {
		const runs = [
			{
				albumName: 'Album',
				artistName: 'Artist',
				tracks: [
					makeScrobble('T1', 'Artist', 'Album', 1),
					makeScrobble('T2', 'Artist', 'Album', 2),
					makeScrobble('T3', 'Artist', 'Album', 3)
				],
				positions: [1, 2, 3],
				albumTrackCount: 10,
				startPosition: 1,
				startedFromTrack1: true,
				isShortAlbum: false
			}
		];

		const qualified = qualifyRuns(runs);
		expect(qualified).toHaveLength(1);
	});

	it('should not qualify standard albums with < 3 tracks', () => {
		const runs = [
			{
				albumName: 'Album',
				artistName: 'Artist',
				tracks: [
					makeScrobble('T1', 'Artist', 'Album', 1),
					makeScrobble('T2', 'Artist', 'Album', 2)
				],
				positions: [1, 2],
				albumTrackCount: 10,
				startPosition: 1,
				startedFromTrack1: true,
				isShortAlbum: false
			}
		];

		const qualified = qualifyRuns(runs);
		expect(qualified).toHaveLength(0);
	});

	it('should qualify short albums with >= 2 tracks', () => {
		const runs = [
			{
				albumName: 'EP',
				artistName: 'Artist',
				tracks: [
					makeScrobble('T1', 'Artist', 'EP', 1),
					makeScrobble('T2', 'Artist', 'EP', 2)
				],
				positions: [1, 2],
				albumTrackCount: 3,
				startPosition: 1,
				startedFromTrack1: true,
				isShortAlbum: true
			}
		];

		const qualified = qualifyRuns(runs);
		expect(qualified).toHaveLength(1);
	});
});

describe('calculateQuotient', () => {
	it('should weight 1.0 for track-1 starts on standard albums', () => {
		const result = analyzeScrobbles(
			[
				makeScrobble('Track 1', 'Artist', 'Album', 1000),
				makeScrobble('Track 2', 'Artist', 'Album', 2000),
				makeScrobble('Track 3', 'Artist', 'Album', 3000),
				makeScrobble('Random', 'Other', 'Other', 4000)
			],
			new Map([
				[
					'Artist|||Album',
					makeAlbumInfo('Album', 'Artist', [
						'Track 1',
						'Track 2',
						'Track 3',
						'Track 4',
						'Track 5'
					])
				]
			])
		);

		// 3 tracks × 1.0 weight / 4 total = 75%
		expect(result.albumQuotient).toBe(75);
	});

	it('should weight 0.9 for mid-album starts on standard albums', () => {
		const result = analyzeScrobbles(
			[
				makeScrobble('Track 3', 'Artist', 'Album', 1000),
				makeScrobble('Track 4', 'Artist', 'Album', 2000),
				makeScrobble('Track 5', 'Artist', 'Album', 3000),
				makeScrobble('Random', 'Other', 'Other', 4000)
			],
			new Map([
				[
					'Artist|||Album',
					makeAlbumInfo('Album', 'Artist', [
						'Track 1',
						'Track 2',
						'Track 3',
						'Track 4',
						'Track 5'
					])
				]
			])
		);

		// 3 tracks × 0.9 weight / 4 total = 67.5%
		expect(result.albumQuotient).toBe(67.5);
	});

	it('should weight 0.5 for short albums', () => {
		const result = analyzeScrobbles(
			[
				makeScrobble('Track 1', 'Artist', 'EP', 1000),
				makeScrobble('Track 2', 'Artist', 'EP', 2000),
				makeScrobble('Random', 'Other', 'Other', 3000)
			],
			new Map([
				[
					'Artist|||EP',
					makeAlbumInfo('EP', 'Artist', ['Track 1', 'Track 2', 'Track 3'])
				]
			])
		);

		// 2 tracks × 0.5 weight / 3 total = 33.33...%
		expect(result.albumQuotient).toBeCloseTo(33.33, 1);
	});

	it('should return 0% when no qualifying runs exist', () => {
		const result = analyzeScrobbles(
			[
				makeScrobble('Random 1', 'A', 'X', 1000),
				makeScrobble('Random 2', 'B', 'Y', 2000),
				makeScrobble('Random 3', 'C', 'Z', 3000)
			],
			new Map()
		);

		expect(result.albumQuotient).toBe(0);
		expect(result.totalAlbumsAsUnit).toBe(0);
		expect(result.topAlbum).toBeNull();
	});

	it('should calculate quotient as (sum weights / total) × 100', () => {
		const result = analyzeScrobbles(
			[
				makeScrobble('Track 1', 'Artist', 'Album', 1000),
				makeScrobble('Track 2', 'Artist', 'Album', 2000),
				makeScrobble('Track 3', 'Artist', 'Album', 3000),
				makeScrobble('Track 4', 'Artist', 'Album', 4000),
				makeScrobble('Random 1', 'Other', 'Other', 5000),
				makeScrobble('Random 2', 'Other2', 'Other2', 6000)
			],
			new Map([
				[
					'Artist|||Album',
					makeAlbumInfo('Album', 'Artist', [
						'Track 1',
						'Track 2',
						'Track 3',
						'Track 4',
						'Track 5',
						'Track 6'
					])
				]
			])
		);

		// 4 tracks × 1.0 / 6 total = 66.67%
		expect(result.albumQuotient).toBeCloseTo(66.67, 1);
		expect(result.totalAlbumsAsUnit).toBe(1);
		expect(result.topAlbum).toEqual({ name: 'Album', artist: 'Artist' });
	});
});
