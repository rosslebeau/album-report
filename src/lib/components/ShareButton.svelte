<script lang="ts">
	import type { AnalysisResult } from '$lib/types';

	interface Props {
		result: AnalysisResult;
	}

	let { result }: Props = $props();

	let state: 'idle' | 'sharing' | 'shared' | 'error' = $state('idle');
	let shareUrl = $state('');
	let copied = $state(false);

	async function handleShare() {
		state = 'sharing';

		try {
			const response = await fetch('/api/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(result)
			});

			if (!response.ok) {
				state = 'error';
				return;
			}

			const data: { shareId: string; url: string } = await response.json();
			shareUrl = `${window.location.origin}${data.url}`;
			state = 'shared';
		} catch {
			state = 'error';
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			const input = document.createElement('input');
			input.value = shareUrl;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}
</script>

{#if state === 'idle'}
	<button
		onclick={handleShare}
		class="px-5 py-2.5 min-h-[44px] rounded-lg bg-base-light text-text-secondary hover:bg-base-lighter hover:text-text-primary transition-all active:scale-95 text-sm font-medium"
	>
		Share your results
	</button>
{:else if state === 'sharing'}
	<button
		disabled
		class="px-5 py-2.5 min-h-[44px] rounded-lg bg-base-light text-text-faint text-sm font-medium cursor-not-allowed"
	>
		Saving...
	</button>
{:else if state === 'shared'}
	<div class="flex items-center gap-2 bg-base-light rounded-lg p-3 animate-[fade-in_0.3s_ease-out]">
		<input
			type="text"
			readonly
			value={shareUrl}
			class="flex-1 bg-transparent text-text-secondary text-sm border-none outline-none min-w-0"
		/>
		<button
			onclick={copyToClipboard}
			class="px-4 py-1.5 min-h-[44px] sm:min-h-0 rounded bg-gold text-base text-sm font-medium hover:bg-gold-light transition-all active:scale-95 shrink-0"
		>
			{copied ? 'Copied!' : 'Copy'}
		</button>
	</div>
{:else if state === 'error'}
	<div class="text-center">
		<p class="text-red text-sm mb-2">Failed to generate share link.</p>
		<button
			onclick={handleShare}
			class="text-text-muted hover:text-text-secondary text-sm underline transition-colors"
		>
			Try again
		</button>
	</div>
{/if}
