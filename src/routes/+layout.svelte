<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-base text-text-primary">
	<main class="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
		{@render children()}
	</main>
</div>
