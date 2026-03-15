import { describe, it, expect } from 'vitest';
import { generateInterestingStats } from '$lib/server/algorithm/interesting-stats';
import type { ListeningMetrics, ArchetypeName } from '$lib/types';
import type { EnrichedScrobble } from '$lib/server/algorithm/types';

function makeMetrics(overrides: Partial<ListeningMetrics> = {}): ListeningMetrics {
	return {
		albumCompletionRate: 0.5,
		artistConcentration: 0.15,
		albumBreadth: 0.08,
		trackPositionSkew: 0.48,
		repeatIntensityAlbum: 0.3,
		repeatIntensityTrack: 0.25,
		scrobbleEntropy: 0.7,
		popularitySkew: null,
		genreCoherence: null,
		uniqueAlbums: 20,
		uniqueArtists: 12,
		totalScrobbles: 600,
		qualifyingAlbums: 15,
		...overrides
	};
}

function makeEnrichedScrobble(
	track: string,
	artist: string,
	album: string,
	opts?: Partial<EnrichedScrobble>
): EnrichedScrobble {
	return {
		track,
		artist,
		album,
		timestamp: Date.now(),
		trackPosition: 1,
		albumTotalTracks: 10,
		isCompilation: false,
		...opts
	};
}

function buildScrobblesForArchetype(archetype: ArchetypeName): EnrichedScrobble[] {
	const scrobbles: EnrichedScrobble[] = [];

	switch (archetype) {
		case 'Ritualist':
			// Few albums, heavily repeated
			for (let r = 0; r < 20; r++) {
				for (let t = 1; t <= 10; t++) {
					scrobbles.push(makeEnrichedScrobble(`Track ${t}`, 'Artist A', 'Album 1', { trackPosition: t, albumTotalTracks: 10 }));
				}
			}
			break;
		case 'Completionist':
			// Many albums, most fully completed
			for (let a = 0; a < 15; a++) {
				for (let t = 1; t <= 10; t++) {
					scrobbles.push(makeEnrichedScrobble(`Track ${t}`, `Artist ${a % 8}`, `Album ${a}`, { trackPosition: t, albumTotalTracks: 10 }));
				}
			}
			break;
		case 'Cherry Picker':
			// Many albums, few tracks each
			for (let a = 0; a < 40; a++) {
				scrobbles.push(makeEnrichedScrobble(`Track 3`, `Artist ${a}`, `Album ${a}`, { trackPosition: 3, albumTotalTracks: 12 }));
			}
			break;
		default:
			// Generic scrobbles
			for (let i = 0; i < 50; i++) {
				scrobbles.push(makeEnrichedScrobble(`Track ${i % 10 + 1}`, `Artist ${i % 5}`, `Album ${i % 10}`, { trackPosition: (i % 10) + 1, albumTotalTracks: 10 }));
			}
	}

	return scrobbles;
}

describe('generateInterestingStats', () => {
	it('should return at least 2 stats for every archetype', () => {
		const archetypes: ArchetypeName[] = [
			'Ritualist', 'Deep Diver', 'Completionist', 'Side A Loyalist',
			'Cherry Picker', 'Shuffle Gremlin'
		];

		for (const archetype of archetypes) {
			const scrobbles = buildScrobblesForArchetype(archetype);
			const metrics = makeMetrics();
			const stats = generateInterestingStats(metrics, scrobbles, archetype);

			expect(stats.length).toBeGreaterThanOrEqual(2);
			for (const stat of stats) {
				expect(stat.label).toBeTruthy();
				expect(stat.value).toBeTruthy();
			}
		}
	});

	it('should include albums completed for Completionist', () => {
		const scrobbles = buildScrobblesForArchetype('Completionist');
		const metrics = makeMetrics({ albumCompletionRate: 0.85 });
		const stats = generateInterestingStats(metrics, scrobbles, 'Completionist');

		const completedStat = stats.find((s) => s.label.toLowerCase().includes('completed'));
		expect(completedStat).toBeDefined();
	});

	it('should include most-replayed album for Ritualist', () => {
		const scrobbles = buildScrobblesForArchetype('Ritualist');
		const metrics = makeMetrics({ repeatIntensityAlbum: 0.85 });
		const stats = generateInterestingStats(metrics, scrobbles, 'Ritualist');

		const replayStat = stats.find((s) => s.label.toLowerCase().includes('replayed') || s.label.toLowerCase().includes('repeat'));
		expect(replayStat).toBeDefined();
	});

	it('should include albums touched for Cherry Picker', () => {
		const scrobbles = buildScrobblesForArchetype('Cherry Picker');
		const metrics = makeMetrics({ uniqueAlbums: 40, albumBreadth: 0.08 });
		const stats = generateInterestingStats(metrics, scrobbles, 'Cherry Picker');

		const touchedStat = stats.find((s) =>
			s.label.toLowerCase().includes('album') && (s.label.toLowerCase().includes('touched') || s.label.toLowerCase().includes('sampled'))
		);
		expect(touchedStat).toBeDefined();
	});

	it('should format stat values as strings', () => {
		const scrobbles = buildScrobblesForArchetype('Completionist');
		const metrics = makeMetrics();
		const stats = generateInterestingStats(metrics, scrobbles, 'Completionist');

		for (const stat of stats) {
			expect(typeof stat.label).toBe('string');
			expect(typeof stat.value).toBe('string');
			expect(stat.detail === null || typeof stat.detail === 'string').toBe(true);
		}
	});
});
