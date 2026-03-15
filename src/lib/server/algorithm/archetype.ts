import type { Scrobble, AlbumInfo } from './types.js';
import type { ArchetypeResult, ArchetypeName, ConfidenceLevel, ListeningMetrics } from '$lib/types.js';
import { enrichScrobbles } from './enrichment.js';
import { computeAllMetrics } from './metrics.js';
import { scoreCondition, weightedGeometricMean } from './scoring.js';
import { ARCHETYPE_DEFINITIONS } from './definitions.js';
import { generateInterestingStats } from './interesting-stats.js';
import { createChildLogger, withPerformanceLog } from '$lib/server/logger.js';

const log = createChildLogger('algorithm/archetype');

function getMetricValue(metrics: ListeningMetrics, metricName: string): number | null {
	switch (metricName) {
		case 'albumCompletionRate': return metrics.albumCompletionRate;
		case 'artistConcentration': return metrics.artistConcentration;
		case 'albumBreadth': return metrics.albumBreadth;
		case 'trackPositionSkew': return metrics.trackPositionSkew;
		case 'repeatIntensityAlbum': return metrics.repeatIntensityAlbum;
		case 'repeatIntensityTrack': return metrics.repeatIntensityTrack;
		case 'scrobbleEntropy': return metrics.scrobbleEntropy;
		case 'popularitySkew': return metrics.popularitySkew;
		case 'genreCoherence': return metrics.genreCoherence;
		case 'uniqueAlbums': return metrics.uniqueAlbums;
		case 'uniqueArtists': return metrics.uniqueArtists;
		case 'totalScrobbles': return metrics.totalScrobbles;
		case 'qualifyingAlbums': return metrics.qualifyingAlbums;
		default: return null;
	}
}

function deriveConfidenceLevel(confidence: number): ConfidenceLevel {
	if (confidence >= 0.65) return 'high';
	if (confidence >= 0.30) return 'medium';
	return 'low';
}

export function classifyArchetype(
	scrobbles: readonly Scrobble[],
	albumInfoMap: Map<string, AlbumInfo>
): ArchetypeResult {
	return withPerformanceLog(log, 'archetype classification', () => {
		const enrichedScrobbles = enrichScrobbles(scrobbles, albumInfoMap);

		const metrics = withPerformanceLog(log, 'compute metrics', () =>
			computeAllMetrics(enrichedScrobbles)
		);

		log.debug({ metrics }, 'Computed listening metrics');

		// Track position data quality gate
		const nullPositionCount = enrichedScrobbles.filter((s) => s.trackPosition === null).length;
		const nullPositionRatio = enrichedScrobbles.length > 0 ? nullPositionCount / enrichedScrobbles.length : 0;
		const tpsDisabled = nullPositionRatio > 0.30;

		if (tpsDisabled) {
			log.warn(
				{ nullPositionRatio: Math.round(nullPositionRatio * 100) },
				'Track position data quality gate triggered — disabling Side A Loyalist'
			);
			// Set TPS to neutral value
			(metrics as { trackPositionSkew: number }).trackPositionSkew = 0.5;
		}

		// Score all candidate archetypes
		const archetypeScores: Partial<Record<ArchetypeName, number>> = {};
		const disabledArchetypes: ArchetypeName[] = [];

		// Disable Side A Loyalist if track position data is insufficient
		if (tpsDisabled) {
			disabledArchetypes.push('Side A Loyalist');
		}

		for (const definition of ARCHETYPE_DEFINITIONS) {
			// Skip already-disabled archetypes (e.g., from track position quality gate)
			if (disabledArchetypes.includes(definition.name)) {
				continue;
			}

			// Check if required data is available
			const missingData = definition.requiredData.some((req) => {
				if (req === 'popularity') return metrics.popularitySkew === null;
				if (req === 'genre') return metrics.genreCoherence === null;
				return false;
			});

			if (missingData) {
				disabledArchetypes.push(definition.name);
				continue;
			}

			// Score each condition
			const components: { score: number; weight: number }[] = [];

			for (const condition of definition.conditions) {
				const value = getMetricValue(metrics, condition.metric);
				if (value === null) {
					components.push({ score: 0, weight: condition.weight });
					continue;
				}
				const score = scoreCondition(value, condition);
				components.push({ score, weight: condition.weight });
			}

			const fitScore = weightedGeometricMean(components);
			archetypeScores[definition.name] = fitScore;
		}

		// Sort by fit score descending
		const scored = Object.entries(archetypeScores)
			.map(([name, score]) => ({ name: name as ArchetypeName, score: score! }))
			.sort((a, b) => b.score - a.score);

		// Select primary (highest score)
		const primary = scored[0] ?? { name: 'Cherry Picker' as ArchetypeName, score: 0 };

		// Detect secondary (if within 0.10 of primary)
		const secondary = scored.length > 1 && (primary.score - scored[1].score) <= 0.10
			? scored[1]
			: null;

		// Cap confidence for low scrobble counts
		let confidence = primary.score;
		const lowScrobbleCount = metrics.totalScrobbles < 100;
		if (lowScrobbleCount) {
			confidence = Math.min(confidence, 0.30);
		}

		// Force low confidence level for insufficient data per spec edge case
		const confidenceLevel = lowScrobbleCount ? 'low' : deriveConfidenceLevel(confidence);

		// Get descriptions from definitions
		const primaryDef = ARCHETYPE_DEFINITIONS.find((d) => d.name === primary.name);
		const secondaryDef = secondary
			? ARCHETYPE_DEFINITIONS.find((d) => d.name === secondary.name)
			: null;

		// Generate interesting stats
		const interestingStats = generateInterestingStats(metrics, enrichedScrobbles, primary.name);

		const result: ArchetypeResult = {
			archetype: primary.name,
			confidence,
			confidenceLevel,
			description: primaryDef?.description ?? '',
			secondaryArchetype: secondary?.name ?? null,
			secondaryDescription: secondaryDef?.description ?? null,
			metrics,
			interestingStats,
			archetypeScores,
			disabledArchetypes
		};

		log.info(
			{
				archetype: result.archetype,
				confidence: result.confidence,
				confidenceLevel: result.confidenceLevel,
				secondary: result.secondaryArchetype,
				totalScrobbles: metrics.totalScrobbles
			},
			'Archetype classification complete'
		);

		return result;
	});
}
