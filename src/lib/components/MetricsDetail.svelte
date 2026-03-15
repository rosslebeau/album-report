<script lang="ts">
	import type { ListeningMetrics } from '$lib/types';

	interface Props {
		metrics: ListeningMetrics;
	}

	let { metrics }: Props = $props();
	let expanded = $state(false);

	interface MetricDisplay {
		key: keyof ListeningMetrics;
		label: string;
		isEnrichment: boolean;
	}

	const metricDisplays: MetricDisplay[] = [
		{ key: 'albumCompletionRate', label: 'Album Completion Rate', isEnrichment: false },
		{ key: 'artistConcentration', label: 'Artist Concentration', isEnrichment: false },
		{ key: 'albumBreadth', label: 'Album Breadth', isEnrichment: false },
		{ key: 'trackPositionSkew', label: 'Track Position Skew', isEnrichment: false },
		{ key: 'repeatIntensityAlbum', label: 'Repeat Intensity (Album)', isEnrichment: false },
		{ key: 'repeatIntensityTrack', label: 'Repeat Intensity (Track)', isEnrichment: false },
		{ key: 'scrobbleEntropy', label: 'Scrobble Entropy', isEnrichment: false },
		{ key: 'popularitySkew', label: 'Popularity Skew', isEnrichment: true },
		{ key: 'genreCoherence', label: 'Genre Coherence', isEnrichment: true }
	];

	function formatValue(value: number): string {
		return value.toFixed(2);
	}
</script>

<div class="mt-2">
	<button
		onclick={() => (expanded = !expanded)}
		class="min-h-[44px] px-4 py-2 text-text-muted hover:text-text-secondary text-sm transition-colors flex items-center gap-2 mx-auto"
	>
		<span class="transform transition-transform {expanded ? 'rotate-90' : ''}">&rsaquo;</span>
		See your metrics
	</button>

	{#if expanded}
		<div class="mt-3 space-y-2 text-left animate-[fade-in_0.3s_ease-out]">
			{#each metricDisplays as display}
				{@const value = metrics[display.key]}
				{#if value !== null}
					<div class="flex items-center justify-between gap-3 py-1.5">
						<span class="text-text-secondary text-sm">{display.label}</span>
						<div class="flex items-center gap-3 shrink-0">
							<div class="w-24 h-1.5 bg-base-lighter rounded-full overflow-hidden">
								<div
									class="h-full bg-gold rounded-full transition-all"
									style="width: {Math.min(Math.max(value as number, 0), 1) * 100}%"
								></div>
							</div>
							<span class="text-text-primary text-sm font-mono w-10 text-right">
								{formatValue(value as number)}
							</span>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
