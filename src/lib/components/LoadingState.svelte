<script lang="ts">
	import VinylRecord from './VinylRecord.svelte';

	interface Props {
		message?: string;
	}

	let { message = 'Analyzing your listening history...' }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 gap-8">
	<VinylRecord size={120} spinning />

	<p class="text-text-secondary text-lg animate-pulse">{message}</p>
</div>
