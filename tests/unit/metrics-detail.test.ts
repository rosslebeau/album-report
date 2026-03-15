import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import MetricsDetail from '$lib/components/MetricsDetail.svelte';
import type { ListeningMetrics } from '$lib/types';

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

describe('MetricsDetail', () => {
	it('should be collapsed by default', () => {
		render(MetricsDetail, { props: { metrics: makeMetrics() } });
		// The toggle button should exist
		expect(screen.getByText(/see your metrics/i)).toBeInTheDocument();
		// The actual metric values should not be visible
		expect(screen.queryByText('Album Completion Rate')).not.toBeInTheDocument();
	});

	it('should expand on toggle click', async () => {
		render(MetricsDetail, { props: { metrics: makeMetrics() } });
		const toggle = screen.getByText(/see your metrics/i);
		await fireEvent.click(toggle);
		expect(screen.getByText('Album Completion Rate')).toBeInTheDocument();
	});

	it('should display all non-null metrics with human-readable labels', async () => {
		render(MetricsDetail, { props: { metrics: makeMetrics() } });
		const toggle = screen.getByText(/see your metrics/i);
		await fireEvent.click(toggle);

		expect(screen.getByText('Album Completion Rate')).toBeInTheDocument();
		expect(screen.getByText('Artist Concentration')).toBeInTheDocument();
		expect(screen.getByText('Album Breadth')).toBeInTheDocument();
		expect(screen.getByText('Track Position Skew')).toBeInTheDocument();
		expect(screen.getByText('Repeat Intensity (Album)')).toBeInTheDocument();
		expect(screen.getByText('Repeat Intensity (Track)')).toBeInTheDocument();
		expect(screen.getByText('Scrobble Entropy')).toBeInTheDocument();
	});

	it('should hide null enrichment metrics', async () => {
		render(MetricsDetail, { props: { metrics: makeMetrics({ popularitySkew: null, genreCoherence: null }) } });
		const toggle = screen.getByText(/see your metrics/i);
		await fireEvent.click(toggle);

		expect(screen.queryByText('Popularity Skew')).not.toBeInTheDocument();
		expect(screen.queryByText('Genre Coherence')).not.toBeInTheDocument();
	});

	it('should show enrichment metrics when they have values', async () => {
		render(MetricsDetail, { props: { metrics: makeMetrics({ popularitySkew: 0.15, genreCoherence: 0.72 }) } });
		const toggle = screen.getByText(/see your metrics/i);
		await fireEvent.click(toggle);

		expect(screen.getByText('Popularity Skew')).toBeInTheDocument();
		expect(screen.getByText('Genre Coherence')).toBeInTheDocument();
	});

	it('should format values to 2 decimal places', async () => {
		render(MetricsDetail, { props: { metrics: makeMetrics({ albumCompletionRate: 0.72345 }) } });
		const toggle = screen.getByText(/see your metrics/i);
		await fireEvent.click(toggle);

		expect(screen.getByText('0.72')).toBeInTheDocument();
	});
});
