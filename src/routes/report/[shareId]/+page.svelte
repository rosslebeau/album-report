<script lang="ts">
	import ResultsView from '$lib/components/ResultsView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="text-center animate-[fade-in_0.5s_ease-out]">
	<h1
		class="text-4xl sm:text-5xl font-bold mb-2 text-text-primary"
		style="font-family: var(--font-family-display);"
	>
		The Album Report
	</h1>
	<h2 class="text-xl mb-8 text-text-secondary">
		Results for <span class="text-gold">{data.result.username}</span>
	</h2>

	<ResultsView result={data.result} showShare={false} />

	<p class="mt-8 text-text-faint text-xs">
		Analyzed on {new Date(data.result.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})}
	</p>

	<a
		href="/"
		class="inline-block mt-6 px-6 py-3 min-h-[44px] rounded-lg bg-gold text-base font-semibold hover:bg-gold-light transition-all active:scale-95 text-sm"
	>
		Generate your own Album Report
	</a>
</div>
