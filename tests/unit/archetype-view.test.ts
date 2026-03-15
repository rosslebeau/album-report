import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import ArchetypeView from '$lib/components/ArchetypeView.svelte';
import type { ArchetypeResult, ListeningMetrics } from '$lib/types';

afterEach(() => cleanup());

function makeMetrics(overrides: Partial<ListeningMetrics> = {}): ListeningMetrics {
	return {
		albumCompletionRate: 0.72,
		artistConcentration: 0.14,
		albumBreadth: 0.08,
		trackPositionSkew: 0.48,
		repeatIntensityAlbum: 0.35,
		repeatIntensityTrack: 0.42,
		scrobbleEntropy: 0.78,
		popularitySkew: null,
		genreCoherence: null,
		uniqueAlbums: 48,
		uniqueArtists: 22,
		totalScrobbles: 600,
		qualifyingAlbums: 32,
		...overrides
	};
}

function makeResult(overrides: Partial<ArchetypeResult> = {}): ArchetypeResult {
	return {
		archetype: 'Completionist',
		confidence: 0.82,
		confidenceLevel: 'high',
		description: 'You listen to albums front-to-back across many different artists.',
		secondaryArchetype: null,
		secondaryDescription: null,
		metrics: makeMetrics(),
		interestingStats: [
			{ label: 'Albums completed', value: '8 out of 14', detail: null },
			{ label: 'Top artist', value: 'Radiohead (18%)', detail: null }
		],
		archetypeScores: { Completionist: 0.82, 'Deep Diver': 0.45 },
		disabledArchetypes: ['Singles Hound', 'Curator'],
		...overrides
	};
}

describe('ArchetypeView', () => {
	it('should render archetype name as heading', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult() } });
		expect(screen.getByText('Completionist')).toBeInTheDocument();
	});

	it('should render description text', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult() } });
		expect(screen.getByText(/albums front-to-back/)).toBeInTheDocument();
	});

	it('should render confidence badge with correct color for high confidence', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult({ confidenceLevel: 'high' }) } });
		const badge = screen.getByText(/high/i);
		expect(badge).toBeInTheDocument();
	});

	it('should render confidence badge with correct color for medium confidence', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult({ confidenceLevel: 'medium', confidence: 0.50 }) } });
		const badge = screen.getByText(/medium/i);
		expect(badge).toBeInTheDocument();
	});

	it('should render confidence badge with correct color for low confidence', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult({ confidenceLevel: 'low', confidence: 0.20 }) } });
		const badge = screen.getByText(/low/i);
		expect(badge).toBeInTheDocument();
	});

	it('should render secondary archetype with tendencies phrasing when present', () => {
		render(ArchetypeView, {
			props: {
				archetypeResult: makeResult({
					secondaryArchetype: 'Deep Diver',
					secondaryDescription: 'You also show signs of binging specific artists.'
				})
			}
		});
		expect(screen.getByText(/Deep Diver/)).toBeInTheDocument();
		expect(screen.getByText(/tendencies/i)).toBeInTheDocument();
	});

	it('should not render secondary archetype when null', () => {
		render(ArchetypeView, {
			props: { archetypeResult: makeResult({ secondaryArchetype: null }) }
		});
		expect(screen.queryByText(/tendencies/i)).not.toBeInTheDocument();
	});

	it('should render interesting stats as factoid cards', () => {
		render(ArchetypeView, { props: { archetypeResult: makeResult() } });
		expect(screen.getByText('Albums completed')).toBeInTheDocument();
		expect(screen.getByText('8 out of 14')).toBeInTheDocument();
		expect(screen.getByText('Top artist')).toBeInTheDocument();
	});

	it('should show low-confidence messaging for scores < 0.30', () => {
		render(ArchetypeView, {
			props: {
				archetypeResult: makeResult({
					confidence: 0.20,
					confidenceLevel: 'low'
				})
			}
		});
		expect(screen.getByText(/best guess|insufficient|not enough/i)).toBeInTheDocument();
	});
});
