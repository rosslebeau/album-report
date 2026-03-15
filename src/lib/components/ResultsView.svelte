<script lang="ts">
	import type { AnalysisResult } from '$lib/types';
	import ShareButton from './ShareButton.svelte';

	interface Props {
		result: AnalysisResult;
		showShare?: boolean;
	}

	let { result, showShare = true }: Props = $props();
</script>

<div class="max-w-lg mx-auto text-center space-y-8">
	<div class="animate-[count-up_0.6s_ease-out]">
		<p class="text-text-muted text-sm uppercase tracking-widest mb-2">Album Quotient</p>
		<p class="text-6xl sm:text-7xl font-bold text-gold">
			{result.albumQuotient.toFixed(1)}<span class="text-3xl sm:text-4xl text-gold-dim">%</span>
		</p>
		<p class="text-text-faint text-sm mt-2">
			of your recent {result.totalScrobbles} tracks were part of album listening
		</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-[fade-in_0.5s_ease-out_0.2s_both]">
		<div class="bg-base-light rounded-xl p-5">
			<p class="text-3xl font-bold text-text-primary">{result.totalAlbumsAsUnit}</p>
			<p class="text-text-muted text-sm mt-1">Albums as a unit</p>
		</div>

		<div class="bg-base-light rounded-xl p-5">
			{#if result.topAlbum}
				<p class="text-lg font-semibold text-text-primary truncate" title={result.topAlbum.name}>
					{result.topAlbum.name}
				</p>
				<p class="text-text-muted text-sm mt-1 truncate" title={result.topAlbum.artist}>
					{result.topAlbum.artist}
				</p>
			{:else}
				<p class="text-text-faint text-lg">&mdash;</p>
				<p class="text-text-muted text-sm mt-1">No top album</p>
			{/if}
		</div>
	</div>

	{#if result.albumQuotient === 0}
		<p class="text-text-faint text-sm animate-[fade-in_0.5s_ease-out_0.4s_both]">
			No album listening patterns were detected in your recent history.
			Try listening to a few albums front-to-back!
		</p>
	{/if}

	{#if showShare}
		<div class="pt-4 animate-[fade-in_0.5s_ease-out_0.4s_both]">
			<ShareButton {result} />
		</div>
	{/if}
</div>
