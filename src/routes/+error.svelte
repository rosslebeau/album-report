<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="text-center py-16 animate-[fade-in_0.4s_ease-out]">
	<h1 class="text-6xl font-bold text-text-faint mb-4">{$page.status}</h1>
	<p class="text-text-secondary text-lg mb-8">{$page.error?.message ?? 'Something went wrong.'}</p>
	<a
		href="/"
		class="inline-block px-6 py-3 min-h-[44px] rounded-lg bg-base-light text-text-primary hover:bg-base-lighter transition-colors"
	>
		Go back home
	</a>
</div>
