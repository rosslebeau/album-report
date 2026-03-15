import type { ListeningMetrics, ArchetypeName, InterestingStat } from '$lib/types.js';
import type { EnrichedScrobble } from './types.js';
import { albumKey } from './quotient.js';

interface FactoidCandidate {
	readonly stat: InterestingStat;
	readonly relevantArchetypes: readonly ArchetypeName[];
}

function computeAlbumsCompleted(scrobbles: readonly EnrichedScrobble[]): number {
	const albumGroups = new Map<string, { uniqueTracks: Set<number>; totalTracks: number }>();

	for (const s of scrobbles) {
		if (s.isCompilation || s.albumTotalTracks === null || s.albumTotalTracks < 4 || s.trackPosition === null) continue;
		const key = albumKey(s.artist, s.album);
		let group = albumGroups.get(key);
		if (!group) {
			group = { uniqueTracks: new Set(), totalTracks: s.albumTotalTracks };
			albumGroups.set(key, group);
		}
		group.uniqueTracks.add(s.trackPosition);
	}

	let completed = 0;
	for (const group of albumGroups.values()) {
		if (group.uniqueTracks.size / group.totalTracks >= 0.80) {
			completed++;
		}
	}

	return completed;
}

function findTopArtist(scrobbles: readonly EnrichedScrobble[]): { name: string; share: number } | null {
	if (scrobbles.length === 0) return null;

	const counts = new Map<string, number>();
	for (const s of scrobbles) {
		counts.set(s.artist, (counts.get(s.artist) ?? 0) + 1);
	}

	let topName = '';
	let topCount = 0;
	for (const [name, count] of counts) {
		if (count > topCount) {
			topName = name;
			topCount = count;
		}
	}

	return { name: topName, share: topCount / scrobbles.length };
}

function findMostReplayedAlbum(scrobbles: readonly EnrichedScrobble[]): { name: string; artist: string; count: number } | null {
	const counts = new Map<string, { name: string; artist: string; count: number }>();

	for (const s of scrobbles) {
		const key = albumKey(s.artist, s.album);
		const existing = counts.get(key);
		if (existing) {
			existing.count++;
		} else {
			counts.set(key, { name: s.album, artist: s.artist, count: 1 });
		}
	}

	let top: { name: string; artist: string; count: number } | null = null;
	for (const entry of counts.values()) {
		if (!top || entry.count > top.count) {
			top = entry;
		}
	}

	return top;
}

export function generateInterestingStats(
	metrics: ListeningMetrics,
	enrichedScrobbles: readonly EnrichedScrobble[],
	archetypeName: ArchetypeName
): readonly InterestingStat[] {
	const candidates: FactoidCandidate[] = [];

	// Albums completed
	const completed = computeAlbumsCompleted(enrichedScrobbles);
	if (metrics.qualifyingAlbums > 0) {
		candidates.push({
			stat: {
				label: 'Albums completed',
				value: `${completed} out of ${metrics.qualifyingAlbums}`,
				detail: 'Albums where you heard 80% or more of the tracks'
			},
			relevantArchetypes: ['Completionist', 'Deep Diver', 'Ritualist']
		});
	}

	// Unique albums and artists
	candidates.push({
		stat: {
			label: 'Albums sampled',
			value: `${metrics.uniqueAlbums}`,
			detail: null
		},
		relevantArchetypes: ['Cherry Picker', 'Shuffle Gremlin', 'Completionist']
	});

	candidates.push({
		stat: {
			label: 'Unique artists',
			value: `${metrics.uniqueArtists}`,
			detail: null
		},
		relevantArchetypes: ['Shuffle Gremlin', 'Cherry Picker', 'Completionist', 'Curator']
	});

	// Top artist
	const topArtist = findTopArtist(enrichedScrobbles);
	if (topArtist) {
		candidates.push({
			stat: {
				label: 'Top artist',
				value: `${topArtist.name} (${Math.round(topArtist.share * 100)}%)`,
				detail: null
			},
			relevantArchetypes: ['Deep Diver', 'Ritualist', 'Completionist', 'Side A Loyalist']
		});
	}

	// Most replayed album
	const mostReplayed = findMostReplayedAlbum(enrichedScrobbles);
	if (mostReplayed && mostReplayed.count > 5) {
		candidates.push({
			stat: {
				label: 'Most replayed album',
				value: `${mostReplayed.name} (${mostReplayed.count} plays)`,
				detail: `by ${mostReplayed.artist}`
			},
			relevantArchetypes: ['Ritualist', 'Deep Diver']
		});
	}

	// Average tracks per album
	if (metrics.uniqueAlbums > 0) {
		const avgTracks = (metrics.totalScrobbles / metrics.uniqueAlbums).toFixed(1);
		candidates.push({
			stat: {
				label: 'Average plays per album',
				value: avgTracks,
				detail: null
			},
			relevantArchetypes: ['Ritualist', 'Deep Diver']
		});
	}

	// Early/late track preference
	if (metrics.trackPositionSkew < 0.35) {
		candidates.push({
			stat: {
				label: 'Track preference',
				value: 'Early tracks',
				detail: 'You tend to listen to the beginning of albums more than the end'
			},
			relevantArchetypes: ['Side A Loyalist']
		});
	} else if (metrics.trackPositionSkew > 0.65) {
		candidates.push({
			stat: {
				label: 'Track preference',
				value: 'Late tracks',
				detail: 'You tend to listen to later tracks on albums'
			},
			relevantArchetypes: ['Side A Loyalist']
		});
	}

	// Sort candidates: prioritize those relevant to the archetype
	const sorted = [...candidates].sort((a, b) => {
		const aRelevant = a.relevantArchetypes.includes(archetypeName) ? 1 : 0;
		const bRelevant = b.relevantArchetypes.includes(archetypeName) ? 1 : 0;
		return bRelevant - aRelevant;
	});

	// Return 2-4 stats, preferring relevant ones
	return sorted.slice(0, 4).map((c) => c.stat);
}
