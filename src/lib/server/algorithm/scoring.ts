import type { MetricCondition } from './types.js';

export function scoreCondition(value: number, condition: MetricCondition): number {
	const { direction, target, rampStart } = condition;

	switch (direction) {
		case 'above': {
			if (value >= target) return 1.0;
			if (value <= rampStart) return 0.0;
			return (value - rampStart) / (target - rampStart);
		}
		case 'below': {
			if (value <= target) return 1.0;
			if (value >= rampStart) return 0.0;
			return (rampStart - value) / (rampStart - target);
		}
		case 'near': {
			const maxDistance = Math.abs(target - rampStart);
			if (maxDistance === 0) return 1.0;
			const distance = Math.abs(value - target);
			if (distance >= maxDistance) return 0.0;
			return 1.0 - distance / maxDistance;
		}
	}
}

export function weightedGeometricMean(
	components: readonly { score: number; weight: number }[]
): number {
	if (components.length === 0) return 0;

	// If any component has a score of 0, the geometric mean is 0
	if (components.some((c) => c.score === 0)) return 0;

	let weightedLogSum = 0;
	let totalWeight = 0;

	for (const { score, weight } of components) {
		weightedLogSum += weight * Math.log(score);
		totalWeight += weight;
	}

	if (totalWeight === 0) return 0;

	return Math.exp(weightedLogSum / totalWeight);
}
