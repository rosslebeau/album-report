<script lang="ts">
	const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

	interface Props {
		onsubmit: (username: string) => void;
		disabled?: boolean;
	}

	let { onsubmit, disabled = false }: Props = $props();
	let username = $state('');
	let error = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();

		const trimmed = username.trim();

		if (!trimmed) {
			error = 'Please enter a last.fm username.';
			return;
		}

		if (!USERNAME_PATTERN.test(trimmed)) {
			error = 'Username must be 1-100 characters (letters, numbers, hyphens, underscores).';
			return;
		}

		error = '';
		onsubmit(trimmed);
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-md mx-auto">
	<div class="flex flex-col sm:flex-row gap-3">
		<input
			type="text"
			bind:value={username}
			placeholder="Enter your last.fm username"
			{disabled}
			class="flex-1 px-4 py-3 min-h-[44px] rounded-lg bg-base-light text-text-primary placeholder-text-muted border border-base-lighter focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors"
		/>
		<button
			type="submit"
			{disabled}
			class="px-6 py-3 min-h-[44px] rounded-lg bg-gold text-base font-semibold hover:bg-gold-light focus:outline-none focus:ring-2 focus:ring-gold/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
		>
			Analyze
		</button>
	</div>
	{#if error}
		<p class="mt-2 text-red text-sm">{error}</p>
	{/if}
</form>
