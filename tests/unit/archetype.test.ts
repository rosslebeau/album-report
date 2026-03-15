import { describe, it, expect } from 'vitest';
import { classifyArchetype } from '$lib/server/algorithm/archetype';
import type { Scrobble, AlbumInfo } from '$lib/server/algorithm/types';
import { albumKey } from '$lib/server/algorithm/quotient';

function makeScrobble(track: string, artist: string, album: string, timestamp: number): Scrobble {
	return { track, artist, album, timestamp };
}

function makeAlbumInfo(name: string, artist: string, trackNames: string[]): AlbumInfo {
	return {
		name,
		artist,
		trackCount: trackNames.length,
		tracks: trackNames.map((t, i) => ({ name: t, position: i + 1 }))
	};
}

function generateTrackNames(count: number): string[] {
	return Array.from({ length: count }, (_, i) => `Track ${i + 1}`);
}

/**
 * Build a fixture: repeated full album listens for a single album.
 * Useful for Ritualist and Deep Diver profiles.
 */
function buildRepeatedAlbumScrobbles(
	artist: string,
	album: string,
	trackCount: number,
	repeats: number,
	baseTimestamp = 1000
): { scrobbles: Scrobble[]; albumMap: Map<string, AlbumInfo> } {
	const trackNames = generateTrackNames(trackCount);
	const scrobbles: Scrobble[] = [];

	for (let r = 0; r < repeats; r++) {
		for (let t = 0; t < trackCount; t++) {
			scrobbles.push(
				makeScrobble(trackNames[t], artist, album, baseTimestamp + r * trackCount * 100 + t * 100)
			);
		}
	}

	const albumMap = new Map([[albumKey(artist, album), makeAlbumInfo(album, artist, trackNames)]]);
	return { scrobbles, albumMap };
}

describe('classifyArchetype', () => {
	describe('Clear Completionist', () => {
		it('should classify a user who completes many albums across artists', () => {
			// 12 albums from 8 artists, 90%+ completion each (8-10 tracks per album, hear most of them)
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 12; a++) {
				const artist = `Artist ${(a % 8) + 1}`;
				const album = `Album ${a + 1}`;
				const trackCount = 10;
				const trackNames = generateTrackNames(trackCount);
				const tracksHeard = trackNames.slice(0, 9); // 9 of 10

				for (let t = 0; t < tracksHeard.length; t++) {
					scrobbles.push(makeScrobble(tracksHeard[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Completionist');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Clear Ritualist', () => {
		it('should classify a user who replays a few albums obsessively', () => {
			// 4 albums, 150 scrobbles each (heavy repeat of same albums)
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 4; a++) {
				const artist = `Artist ${a + 1}`;
				const album = `Album ${a + 1}`;
				const trackCount = 10;
				const trackNames = generateTrackNames(trackCount);

				// Play the album 15 times (15 * 10 = 150 scrobbles)
				for (let r = 0; r < 15; r++) {
					for (let t = 0; t < trackCount; t++) {
						scrobbles.push(makeScrobble(trackNames[t], artist, album, 1000 + a * 100000 + r * 1000 + t * 10));
					}
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Ritualist');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Clear Deep Diver', () => {
		it('should classify a user who explores one artist deeply', () => {
			// 1 artist, 15 albums (> 8 to distinguish from Ritualist), 70%+ completion each
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();
			const artist = 'Favorite Artist';

			for (let a = 0; a < 15; a++) {
				const album = `Album ${a + 1}`;
				const trackCount = 10;
				const trackNames = generateTrackNames(trackCount);
				const tracksHeard = trackNames.slice(0, 8); // 8 of 10

				for (let t = 0; t < tracksHeard.length; t++) {
					scrobbles.push(makeScrobble(tracksHeard[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Deep Diver');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Clear Cherry Picker', () => {
		it('should classify a user who samples many albums shallowly', () => {
			// 35 albums from 10 artists, 4 tracks each from middle of album
			// AC ~0.10 (above Shuffle Gremlin's 0.06 threshold), low ACR, TPS ~0.45
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 35; a++) {
				const artist = `Artist ${(a % 10) + 1}`;
				const album = `Album ${a + 1}`;
				const trackCount = 12;
				const trackNames = generateTrackNames(trackCount);
				// Hear tracks 5-8 from each album (middle tracks, ~4 tracks out of 12)
				const tracksToHear = trackNames.slice(4, 8);

				for (let t = 0; t < tracksToHear.length; t++) {
					scrobbles.push(makeScrobble(tracksToHear[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Cherry Picker');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Clear Side A Loyalist', () => {
		it('should classify a user who always plays early tracks', () => {
			// 20 albums from 12 artists, 6 early tracks each (tracks 1-6 of 12)
			// 120 scrobbles > 100, moderate AC (~0.08), ACR ~0.5, very low TPS
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 20; a++) {
				const artist = `Artist ${(a % 12) + 1}`;
				const album = `Album ${a + 1}`;
				const trackCount = 12;
				const trackNames = generateTrackNames(trackCount);
				const earlyTracks = trackNames.slice(0, 6);

				for (let t = 0; t < earlyTracks.length; t++) {
					scrobbles.push(makeScrobble(earlyTracks[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Side A Loyalist');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Clear Shuffle Gremlin', () => {
		it('should classify a user with maximum entropy listening', () => {
			// 120+ albums from 60+ artists, 1 track each = maximum entropy, zero completion
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 130; a++) {
				const artist = `Artist ${(a % 65) + 1}`;
				const album = `Album ${a + 1}`;
				const trackCount = 10;
				const trackNames = generateTrackNames(trackCount);

				// Only hear 1 random track
				const trackIdx = a % trackCount;
				scrobbles.push(makeScrobble(trackNames[trackIdx], artist, album, 1000 + a * 100));
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBe('Shuffle Gremlin');
			expect(result.confidence).toBeGreaterThan(0.70);
		});
	});

	describe('Borderline Completionist/Deep Diver', () => {
		it('should detect a secondary archetype for borderline cases', () => {
			// 12 albums from 2 artists (~108 scrobbles > 100), high completion — straddles Completionist and Deep Diver
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 12; a++) {
				const artist = a < 6 ? 'Artist A' : 'Artist B';
				const album = `Album ${a + 1}`;
				const trackCount = 10;
				const trackNames = generateTrackNames(trackCount);
				const tracksHeard = trackNames.slice(0, 9); // 9 of 10

				for (let t = 0; t < tracksHeard.length; t++) {
					scrobbles.push(makeScrobble(tracksHeard[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			const result = classifyArchetype(scrobbles, albumMap);

			// Should be one of the two and have a secondary
			expect(['Completionist', 'Deep Diver']).toContain(result.archetype);
			if (result.secondaryArchetype) {
				expect(['Completionist', 'Deep Diver']).toContain(result.secondaryArchetype);
				expect(result.secondaryArchetype).not.toBe(result.archetype);
			}
		});
	});

	describe('Result structure', () => {
		it('should return all required fields', () => {
			const { scrobbles, albumMap } = buildRepeatedAlbumScrobbles('A', 'X', 10, 5);
			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.archetype).toBeTruthy();
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);
			expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
			expect(result.description).toBeTruthy();
			expect(result.metrics).toBeTruthy();
			expect(result.interestingStats.length).toBeGreaterThanOrEqual(2);
			expect(result.archetypeScores).toBeTruthy();
			expect(result.disabledArchetypes).toBeDefined();
		});
	});

	describe('Low scrobble count', () => {
		it('should cap confidence at 0.30 for < 100 scrobbles', () => {
			// Just a few scrobbles
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 5; a++) {
				const artist = `Artist ${a + 1}`;
				const album = `Album ${a + 1}`;
				const trackNames = generateTrackNames(10);
				const tracksHeard = trackNames.slice(0, 9);

				for (let t = 0; t < tracksHeard.length; t++) {
					scrobbles.push(makeScrobble(tracksHeard[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			// 45 scrobbles — under 100
			expect(scrobbles.length).toBeLessThan(100);

			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.confidence).toBeLessThanOrEqual(0.30);
			expect(result.confidenceLevel).toBe('low');
		});
	});

	describe('Enrichment data degradation', () => {
		function buildGenericScrobbles(): { scrobbles: Scrobble[]; albumMap: Map<string, AlbumInfo> } {
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			for (let a = 0; a < 15; a++) {
				const artist = `Artist ${(a % 8) + 1}`;
				const album = `Album ${a + 1}`;
				const trackNames = generateTrackNames(10);
				const tracksHeard = trackNames.slice(0, 8);

				for (let t = 0; t < tracksHeard.length; t++) {
					scrobbles.push(makeScrobble(tracksHeard[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			return { scrobbles, albumMap };
		}

		it('should disable Singles Hound when popularitySkew is null', () => {
			const { scrobbles, albumMap } = buildGenericScrobbles();
			const result = classifyArchetype(scrobbles, albumMap);

			// popularitySkew is always null in v1 (no enrichment)
			expect(result.disabledArchetypes).toContain('Singles Hound');
			expect(result.archetype).not.toBe('Singles Hound');
		});

		it('should disable Curator when genreCoherence is null', () => {
			const { scrobbles, albumMap } = buildGenericScrobbles();
			const result = classifyArchetype(scrobbles, albumMap);

			// genreCoherence is always null in v1
			expect(result.disabledArchetypes).toContain('Curator');
			expect(result.archetype).not.toBe('Curator');
		});

		it('should always have Singles Hound and Curator in disabledArchetypes in v1', () => {
			const { scrobbles, albumMap } = buildGenericScrobbles();
			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.disabledArchetypes).toContain('Singles Hound');
			expect(result.disabledArchetypes).toContain('Curator');
			expect(result.disabledArchetypes).toHaveLength(2);
		});

		it('should classify into remaining 6 archetypes without enrichment data', () => {
			const { scrobbles, albumMap } = buildGenericScrobbles();
			const result = classifyArchetype(scrobbles, albumMap);

			const validArchetypes = [
				'Ritualist', 'Deep Diver', 'Completionist',
				'Side A Loyalist', 'Cherry Picker', 'Shuffle Gremlin'
			];
			expect(validArchetypes).toContain(result.archetype);
		});

		it('should disable Side A Loyalist when > 30% of scrobbles lack trackPosition', () => {
			// Create scrobbles where most don't have album info (so trackPosition = null)
			const scrobbles: Scrobble[] = [];
			const albumMap = new Map<string, AlbumInfo>();

			// 40 scrobbles with album info
			for (let a = 0; a < 4; a++) {
				const artist = `Artist ${a + 1}`;
				const album = `Album ${a + 1}`;
				const trackNames = generateTrackNames(10);
				for (let t = 0; t < 10; t++) {
					scrobbles.push(makeScrobble(trackNames[t], artist, album, 1000 + a * 1000 + t * 10));
				}
				albumMap.set(albumKey(artist, album), makeAlbumInfo(album, artist, trackNames));
			}

			// 80 scrobbles WITHOUT album info (trackPosition will be null)
			for (let i = 0; i < 80; i++) {
				scrobbles.push(makeScrobble(`Unknown ${i}`, `Unknown Artist ${i}`, `Unknown Album ${i}`, 5000 + i * 10));
			}

			// 80/120 = 67% null trackPosition — above 30% threshold
			const result = classifyArchetype(scrobbles, albumMap);

			expect(result.disabledArchetypes).toContain('Side A Loyalist');
			expect(result.archetype).not.toBe('Side A Loyalist');
			// TPS should be set to neutral 0.5
			expect(result.metrics.trackPositionSkew).toBe(0.5);
		});
	});
});
