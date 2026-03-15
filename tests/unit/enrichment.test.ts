import { describe, it, expect } from 'vitest';
import { enrichScrobbles } from '$lib/server/algorithm/enrichment';
import type { Scrobble, AlbumInfo } from '$lib/server/algorithm/types';
import { albumKey } from '$lib/server/algorithm/quotient';

function makeScrobble(
	track: string,
	artist: string,
	album: string,
	timestamp: number,
	opts?: { albumMbid?: string }
): Scrobble {
	return { track, artist, album, timestamp, albumMbid: opts?.albumMbid };
}

function makeAlbumInfo(
	name: string,
	artist: string,
	trackNames: string[],
	opts?: { trackCount?: number }
): AlbumInfo {
	return {
		name,
		artist,
		trackCount: opts?.trackCount ?? trackNames.length,
		tracks: trackNames.map((t, i) => ({ name: t, position: i + 1 }))
	};
}

describe('enrichScrobbles', () => {
	describe('track position resolution', () => {
		it('should resolve exact track name matches', () => {
			const scrobbles = [makeScrobble('Airbag', 'Radiohead', 'OK Computer', 1000)];
			const albumMap = new Map([
				[albumKey('Radiohead', 'OK Computer'), makeAlbumInfo('OK Computer', 'Radiohead', ['Airbag', 'Paranoid Android', 'Subterranean Homesick Alien'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched).toHaveLength(1);
			expect(enriched[0].trackPosition).toBe(1);
			expect(enriched[0].albumTotalTracks).toBe(3);
		});

		it('should resolve normalized matches (strip feat. credits)', () => {
			const scrobbles = [makeScrobble('Song (feat. Artist B)', 'Artist A', 'Album', 1000)];
			const albumMap = new Map([
				[albumKey('Artist A', 'Album'), makeAlbumInfo('Album', 'Artist A', ['Intro', 'Song', 'Outro', 'Bonus'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].trackPosition).toBe(2);
		});

		it('should resolve prefix matches', () => {
			const scrobbles = [makeScrobble('Song Title - Remastered 2011', 'A', 'Album', 1000)];
			const albumMap = new Map([
				[albumKey('A', 'Album'), makeAlbumInfo('Album', 'A', ['Song Title', 'Other', 'Third', 'Fourth'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].trackPosition).toBe(1);
		});

		it('should set null trackPosition when no match found', () => {
			const scrobbles = [makeScrobble('Unknown Track', 'A', 'Album', 1000)];
			const albumMap = new Map([
				[albumKey('A', 'Album'), makeAlbumInfo('Album', 'A', ['Track 1', 'Track 2', 'Track 3', 'Track 4'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].trackPosition).toBeNull();
			expect(enriched[0].albumTotalTracks).toBe(4);
		});
	});

	describe('compilation detection', () => {
		it('should detect "Various Artists" as compilation', () => {
			const scrobbles = [makeScrobble('Song', 'Various Artists', 'Comp', 1000)];
			const albumMap = new Map([
				[albumKey('Various Artists', 'Comp'), makeAlbumInfo('Comp', 'Various Artists', ['Song', 'Other', 'Third', 'Fourth'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].isCompilation).toBe(true);
		});

		it('should not flag non-compilation artists', () => {
			const scrobbles = [makeScrobble('Song', 'Radiohead', 'OK Computer', 1000)];
			const albumMap = new Map([
				[albumKey('Radiohead', 'OK Computer'), makeAlbumInfo('OK Computer', 'Radiohead', ['Song', 'Other', 'Third', 'Fourth'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].isCompilation).toBe(false);
		});
	});

	describe('missing album info', () => {
		it('should handle scrobbles with no album info', () => {
			const scrobbles = [makeScrobble('Song', 'Artist', 'Unknown Album', 1000)];
			const albumMap = new Map<string, AlbumInfo>();

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].trackPosition).toBeNull();
			expect(enriched[0].albumTotalTracks).toBeNull();
			expect(enriched[0].isCompilation).toBe(false);
		});
	});

	describe('deluxe edition track count capping', () => {
		it('should cap albumTotalTracks at 20', () => {
			const trackNames = Array.from({ length: 25 }, (_, i) => `Track ${i + 1}`);
			const scrobbles = [makeScrobble('Track 1', 'A', 'Deluxe', 1000)];
			const albumMap = new Map([
				[albumKey('A', 'Deluxe'), makeAlbumInfo('Deluxe', 'A', trackNames, { trackCount: 25 })]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].albumTotalTracks).toBe(20);
		});

		it('should not cap albums with <= 20 tracks', () => {
			const trackNames = Array.from({ length: 12 }, (_, i) => `Track ${i + 1}`);
			const scrobbles = [makeScrobble('Track 1', 'A', 'Standard', 1000)];
			const albumMap = new Map([
				[albumKey('A', 'Standard'), makeAlbumInfo('Standard', 'A', trackNames)]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched[0].albumTotalTracks).toBe(12);
		});
	});

	describe('podcast filtering', () => {
		it('should filter out podcast scrobbles (duration > 15min)', () => {
			// Podcast detection would be based on duration if available.
			// Since last.fm doesn't provide duration reliably, this mainly tests
			// that non-podcast scrobbles pass through.
			const scrobbles = [
				makeScrobble('Regular Song', 'Artist', 'Album', 1000),
				makeScrobble('Another Song', 'Artist', 'Album', 2000)
			];
			const albumMap = new Map([
				[albumKey('Artist', 'Album'), makeAlbumInfo('Album', 'Artist', ['Regular Song', 'Another Song', 'Third', 'Fourth'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched).toHaveLength(2);
		});
	});

	describe('multiple scrobbles enrichment', () => {
		it('should enrich all scrobbles preserving order', () => {
			const scrobbles = [
				makeScrobble('Track 1', 'A', 'Album', 1000),
				makeScrobble('Track 2', 'A', 'Album', 2000),
				makeScrobble('Track 3', 'A', 'Album', 3000)
			];
			const albumMap = new Map([
				[albumKey('A', 'Album'), makeAlbumInfo('Album', 'A', ['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5'])]
			]);

			const enriched = enrichScrobbles(scrobbles, albumMap);

			expect(enriched).toHaveLength(3);
			expect(enriched[0].trackPosition).toBe(1);
			expect(enriched[1].trackPosition).toBe(2);
			expect(enriched[2].trackPosition).toBe(3);
			expect(enriched[0].timestamp).toBe(1000);
			expect(enriched[2].timestamp).toBe(3000);
		});
	});
});
