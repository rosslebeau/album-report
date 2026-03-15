<script lang="ts">
	import LandingHero from '$lib/components/LandingHero.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import ResultsView from '$lib/components/ResultsView.svelte';
	import type { AnalysisResult, ApiError } from '$lib/types';

	type PageState = 'landing' | 'loading' | 'results' | 'error';

	let pageState: PageState = $state('landing');
	let result: AnalysisResult | null = $state(null);
	let errorMessage = $state('');

	async function handleSubmit(username: string) {
		pageState = 'loading';
		errorMessage = '';

		try {
			const response = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username })
			});

			if (!response.ok) {
				const data: ApiError = await response.json();
				errorMessage = data.message;
				pageState = 'error';
				return;
			}

			result = await response.json();
			pageState = 'results';
		} catch {
			errorMessage = 'Something went wrong. Please check your connection and try again.';
			pageState = 'error';
		}
	}

	function handleReset() {
		pageState = 'landing';
		result = null;
		errorMessage = '';
	}
</script>

<div class="text-center">
	{#if pageState === 'landing'}
		<LandingHero onsubmit={handleSubmit} />

	{:else if pageState === 'loading'}
		<div class="animate-[fade-in_0.3s_ease-out]">
			<LoadingState />
		</div>

	{:else if pageState === 'results' && result}
		<div class="animate-[fade-in_0.5s_ease-out]">
			<h2 class="text-2xl font-bold mb-6 text-text-primary">
				Results for <span class="text-gold">{result.username}</span>
			</h2>
			<ResultsView {result} />
			<button
				onclick={handleReset}
				class="mt-8 text-text-muted hover:text-text-secondary transition-colors text-sm underline"
			>
				Analyze another username
			</button>
		</div>

	{:else if pageState === 'error'}
		<div class="animate-[fade-in_0.3s_ease-out]">
			<h2 class="text-2xl font-bold mb-4 text-text-primary">Something went wrong</h2>
			<p class="text-red mb-6">{errorMessage}</p>
			<button
				onclick={handleReset}
				class="px-6 py-3 rounded-lg bg-base-light text-text-primary hover:bg-base-lighter transition-colors min-h-[44px]"
			>
				Try again
			</button>
		</div>
	{/if}
</div>
