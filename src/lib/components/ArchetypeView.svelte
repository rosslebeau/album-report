<script lang="ts">
	import type { ArchetypeResult } from '$lib/types';
	import MetricsDetail from './MetricsDetail.svelte';

	interface Props {
		archetypeResult: ArchetypeResult;
	}

	let { archetypeResult }: Props = $props();

	const badgeColors: Record<string, string> = {
		high: 'bg-green-600/20 text-green-400 border-green-600/30',
		medium: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
		low: 'bg-gray-600/20 text-gray-400 border-gray-600/30'
	};
</script>

<div class="max-w-lg mx-auto text-center space-y-6">
	<div class="animate-[fade-in_0.5s_ease-out]">
		<p class="text-text-muted text-sm uppercase tracking-widest mb-2">Listening Archetype</p>
		<h3
			class="text-4xl sm:text-5xl font-bold text-text-primary"
			style="font-family: var(--font-family-display);"
		>
			{archetypeResult.archetype}
		</h3>

		<span
			class="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium border {badgeColors[archetypeResult.confidenceLevel]}"
		>
			{archetypeResult.confidenceLevel} confidence
		</span>
	</div>

	<p class="text-text-secondary text-base leading-relaxed animate-[fade-in_0.5s_ease-out_0.1s_both]">
		{archetypeResult.description}
	</p>

	{#if archetypeResult.secondaryArchetype}
		<p class="text-text-muted text-sm italic animate-[fade-in_0.5s_ease-out_0.15s_both]">
			with <span class="text-text-secondary font-medium">{archetypeResult.secondaryArchetype}</span> tendencies
		</p>
	{/if}

	{#if archetypeResult.confidenceLevel === 'low'}
		<p class="text-text-faint text-sm animate-[fade-in_0.5s_ease-out_0.2s_both]">
			This is our best guess based on limited listening data. Keep scrobbling for a more confident result!
		</p>
	{/if}

	<div class="grid grid-cols-2 gap-3 animate-[fade-in_0.5s_ease-out_0.2s_both]">
		{#each archetypeResult.interestingStats as stat}
			<div class="bg-base-light rounded-xl p-4 text-left">
				<p class="text-lg font-semibold text-text-primary">{stat.value}</p>
				<p class="text-text-muted text-xs mt-1">{stat.label}</p>
			</div>
		{/each}
	</div>

	<div class="animate-[fade-in_0.5s_ease-out_0.3s_both]">
		<MetricsDetail metrics={archetypeResult.metrics} />
	</div>
</div>
