import { describe, it, expect } from 'vitest';
import { scoreCondition, weightedGeometricMean } from '$lib/server/algorithm/scoring';
import type { MetricCondition } from '$lib/server/algorithm/types';

describe('scoreCondition', () => {
	describe('above direction', () => {
		const condition: MetricCondition = {
			metric: 'acr',
			direction: 'above',
			target: 0.65,
			rampStart: 0.50,
			weight: 1.0
		};

		it('should return 1.0 at or above target', () => {
			expect(scoreCondition(0.65, condition)).toBeCloseTo(1.0, 4);
			expect(scoreCondition(0.80, condition)).toBeCloseTo(1.0, 4);
		});

		it('should return 0.0 at or below rampStart', () => {
			expect(scoreCondition(0.50, condition)).toBeCloseTo(0.0, 4);
			expect(scoreCondition(0.30, condition)).toBeCloseTo(0.0, 4);
		});

		it('should linearly interpolate between rampStart and target', () => {
			// Midpoint: (0.50 + 0.65) / 2 = 0.575 => score = 0.5
			expect(scoreCondition(0.575, condition)).toBeCloseTo(0.5, 2);
		});

		it('should handle ramp zone at 25%', () => {
			// 25% into ramp: 0.50 + 0.25 * (0.65 - 0.50) = 0.5375
			expect(scoreCondition(0.5375, condition)).toBeCloseTo(0.25, 2);
		});
	});

	describe('below direction', () => {
		const condition: MetricCondition = {
			metric: 'acr',
			direction: 'below',
			target: 0.35,
			rampStart: 0.50,
			weight: 1.0
		};

		it('should return 1.0 at or below target', () => {
			expect(scoreCondition(0.35, condition)).toBeCloseTo(1.0, 4);
			expect(scoreCondition(0.10, condition)).toBeCloseTo(1.0, 4);
		});

		it('should return 0.0 at or above rampStart', () => {
			expect(scoreCondition(0.50, condition)).toBeCloseTo(0.0, 4);
			expect(scoreCondition(0.80, condition)).toBeCloseTo(0.0, 4);
		});

		it('should linearly interpolate between target and rampStart', () => {
			// Midpoint: (0.35 + 0.50) / 2 = 0.425 => score = 0.5
			expect(scoreCondition(0.425, condition)).toBeCloseTo(0.5, 2);
		});
	});

	describe('near direction', () => {
		const condition: MetricCondition = {
			metric: 'tps',
			direction: 'near',
			target: 0.50,
			rampStart: 0.20,
			weight: 1.0
		};

		it('should return 1.0 at target', () => {
			expect(scoreCondition(0.50, condition)).toBeCloseTo(1.0, 4);
		});

		it('should return 0.0 at distance >= |target - rampStart|', () => {
			// Distance = |0.50 - 0.20| = 0.30
			expect(scoreCondition(0.20, condition)).toBeCloseTo(0.0, 4);
			expect(scoreCondition(0.80, condition)).toBeCloseTo(0.0, 4);
		});

		it('should linearly interpolate based on distance', () => {
			// 0.35 is 0.15 away from 0.50; max distance = 0.30 => score = 1 - 0.15/0.30 = 0.5
			expect(scoreCondition(0.35, condition)).toBeCloseTo(0.5, 2);
		});
	});

	describe('boundary values', () => {
		const condition: MetricCondition = {
			metric: 'x',
			direction: 'above',
			target: 1.0,
			rampStart: 0.0,
			weight: 1.0
		};

		it('should handle 0 value', () => {
			expect(scoreCondition(0.0, condition)).toBeCloseTo(0.0, 4);
		});

		it('should handle 1 value', () => {
			expect(scoreCondition(1.0, condition)).toBeCloseTo(1.0, 4);
		});

		it('should handle 0.5 value', () => {
			expect(scoreCondition(0.5, condition)).toBeCloseTo(0.5, 4);
		});
	});
});

describe('weightedGeometricMean', () => {
	it('should return correct mean for equal weights', () => {
		// Geometric mean of 0.5 and 0.5 with equal weights = 0.5
		const result = weightedGeometricMean([
			{ score: 0.5, weight: 1.0 },
			{ score: 0.5, weight: 1.0 }
		]);
		expect(result).toBeCloseTo(0.5, 4);
	});

	it('should return correct mean for mixed weights', () => {
		// exp((1.0*ln(0.8) + 0.5*ln(0.4)) / (1.0+0.5))
		const result = weightedGeometricMean([
			{ score: 0.8, weight: 1.0 },
			{ score: 0.4, weight: 0.5 }
		]);
		const expected = Math.exp(
			(1.0 * Math.log(0.8) + 0.5 * Math.log(0.4)) / 1.5
		);
		expect(result).toBeCloseTo(expected, 4);
	});

	it('should return 0 when any component is 0', () => {
		const result = weightedGeometricMean([
			{ score: 0.8, weight: 1.0 },
			{ score: 0.0, weight: 1.0 }
		]);
		expect(result).toBe(0);
	});

	it('should return the score for a single component', () => {
		const result = weightedGeometricMean([
			{ score: 0.7, weight: 1.0 }
		]);
		expect(result).toBeCloseTo(0.7, 4);
	});

	it('should return 0 for empty components', () => {
		const result = weightedGeometricMean([]);
		expect(result).toBe(0);
	});

	it('should handle all perfect scores', () => {
		const result = weightedGeometricMean([
			{ score: 1.0, weight: 1.0 },
			{ score: 1.0, weight: 0.5 }
		]);
		expect(result).toBeCloseTo(1.0, 4);
	});
});
