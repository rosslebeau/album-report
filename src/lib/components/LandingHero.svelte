<script lang="ts">
	import VinylRecord from './VinylRecord.svelte';
	import UsernameForm from './UsernameForm.svelte';

	interface Props {
		onsubmit: (username: string) => void;
	}

	let { onsubmit }: Props = $props();
</script>

<div class="flex flex-col items-center gap-8 animate-[fade-in_0.6s_ease-out]">
	<h1
		class="text-5xl sm:text-6xl font-bold text-text-primary tracking-tight"
		style="font-family: var(--font-family-display);"
	>
		The Album Report
	</h1>

	<div class="transition-transform duration-500 hover:scale-105">
		<VinylRecord size={180} />
	</div>

	<p class="text-text-secondary text-lg max-w-md text-center leading-relaxed">
		How much of your music listening is <em class="text-gold not-italic font-medium">album listening</em>?
		Enter your last.fm username to find out.
	</p>

	<UsernameForm {onsubmit} />
</div>
