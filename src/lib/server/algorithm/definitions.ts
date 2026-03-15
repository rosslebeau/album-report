import type { ArchetypeDefinition } from './types.js';

export const ARCHETYPE_DEFINITIONS: readonly ArchetypeDefinition[] = [
	{
		name: 'Ritualist',
		description:
			'You return to the same few albums over and over, listening deeply and completely. Your listening is a ritual — familiar records played with devotion.',
		conditions: [
			{ metric: 'repeatIntensityAlbum', direction: 'above', target: 0.70, rampStart: 0.55, weight: 1.0 },
			{ metric: 'uniqueAlbums', direction: 'below', target: 8, rampStart: 12, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'above', target: 0.50, rampStart: 0.35, weight: 0.5 }
		],
		requiredData: []
	},
	{
		name: 'Deep Diver',
		description:
			'You latch onto one or two artists and explore their catalogs deeply, listening to album after album from the same creator.',
		conditions: [
			{ metric: 'artistConcentration', direction: 'above', target: 0.20, rampStart: 0.12, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'above', target: 0.45, rampStart: 0.30, weight: 1.0 },
			{ metric: 'uniqueAlbums', direction: 'above', target: 8, rampStart: 4, weight: 0.5 }
		],
		requiredData: []
	},
	{
		name: 'Completionist',
		description:
			'You listen to albums front-to-back across many different artists. When you put on a record, you hear it through — and then move on to the next.',
		conditions: [
			{ metric: 'albumCompletionRate', direction: 'above', target: 0.65, rampStart: 0.50, weight: 1.0 },
			{ metric: 'artistConcentration', direction: 'below', target: 0.20, rampStart: 0.30, weight: 1.0 },
			{ metric: 'scrobbleEntropy', direction: 'above', target: 0.60, rampStart: 0.45, weight: 0.5 }
		],
		requiredData: []
	},
	{
		name: 'Side A Loyalist',
		description:
			'You consistently gravitate toward the opening tracks of albums. Whether intentional or not, you rarely make it past the midpoint.',
		conditions: [
			{ metric: 'trackPositionSkew', direction: 'below', target: 0.35, rampStart: 0.45, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'near', target: 0.425, rampStart: 0.15, weight: 0.5 }
		],
		requiredData: []
	},
	{
		name: 'Singles Hound',
		description:
			'You gravitate toward the popular tracks — the singles, the hits, the tracks everyone knows. You know what sounds good and you go straight for it.',
		conditions: [
			{ metric: 'popularitySkew', direction: 'above', target: 0.10, rampStart: 0.02, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'below', target: 0.40, rampStart: 0.55, weight: 1.0 },
			{ metric: 'albumBreadth', direction: 'above', target: 0.05, rampStart: 0.02, weight: 0.5 }
		],
		requiredData: ['popularity']
	},
	{
		name: 'Cherry Picker',
		description:
			'You dip into many albums but rarely stick around for the whole thing. A track or two from here, a track from there — you curate your own path.',
		conditions: [
			{ metric: 'albumCompletionRate', direction: 'below', target: 0.35, rampStart: 0.50, weight: 1.0 },
			{ metric: 'albumBreadth', direction: 'above', target: 0.06, rampStart: 0.03, weight: 1.0 },
			{ metric: 'trackPositionSkew', direction: 'near', target: 0.45, rampStart: 0.15, weight: 0.5 }
		],
		requiredData: []
	},
	{
		name: 'Curator',
		description:
			'Your listening is genre-coherent and intentional — you craft listening sessions around mood and style, favoring consistency over variety.',
		conditions: [
			{ metric: 'genreCoherence', direction: 'above', target: 0.60, rampStart: 0.40, weight: 1.0 },
			{ metric: 'artistConcentration', direction: 'below', target: 0.12, rampStart: 0.20, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'below', target: 0.35, rampStart: 0.50, weight: 0.5 }
		],
		requiredData: ['genre']
	},
	{
		name: 'Shuffle Gremlin',
		description:
			'Maximum entropy. You bounce between dozens of albums and artists with no pattern — your listening is spontaneous, eclectic, and unpredictable.',
		conditions: [
			{ metric: 'scrobbleEntropy', direction: 'above', target: 0.85, rampStart: 0.70, weight: 1.0 },
			{ metric: 'artistConcentration', direction: 'below', target: 0.06, rampStart: 0.10, weight: 1.0 },
			{ metric: 'albumCompletionRate', direction: 'below', target: 0.30, rampStart: 0.45, weight: 0.5 }
		],
		requiredData: []
	}
] as const;
