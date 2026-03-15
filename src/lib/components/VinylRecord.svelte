<script lang="ts">
	interface Props {
		size?: number;
		spinning?: boolean;
	}

	let { size = 200, spinning = false }: Props = $props();
</script>

<div
	class="inline-block"
	style="width: {size}px; height: {size}px;"
>
	<svg
		viewBox="0 0 200 200"
		class="w-full h-full transition-transform duration-700 ease-out"
		class:animate-[spin-slow_8s_linear_infinite]={spinning}
		style="filter: drop-shadow(0 4px 24px rgba(0, 0, 0, 0.4));"
	>
		<!-- Outer disc -->
		<circle cx="100" cy="100" r="98" fill="#1a1a1e" stroke="#2a2a2e" stroke-width="1" />

		<!-- Grooves -->
		{#each Array(12) as _, i}
			<circle
				cx="100"
				cy="100"
				r={30 + i * 5.5}
				fill="none"
				stroke="rgba(255, 255, 255, 0.04)"
				stroke-width="0.5"
			/>
		{/each}

		<!-- Highlight reflection -->
		<ellipse
			cx="70"
			cy="60"
			rx="40"
			ry="30"
			fill="none"
			stroke="rgba(255, 255, 255, 0.03)"
			stroke-width="20"
			transform="rotate(-30 70 60)"
		/>

		<!-- Label area -->
		<circle cx="100" cy="100" r="28" fill="var(--color-gold-dim)" />
		<circle cx="100" cy="100" r="26" fill="var(--color-gold)" />

		<!-- Label detail rings -->
		<circle cx="100" cy="100" r="22" fill="none" stroke="var(--color-gold-dim)" stroke-width="0.5" />
		<circle cx="100" cy="100" r="18" fill="none" stroke="var(--color-gold-dim)" stroke-width="0.5" />

		<!-- Label text -->
		<text
			x="100"
			y="96"
			text-anchor="middle"
			fill="var(--color-base)"
			font-size="7"
			font-weight="bold"
			font-family="var(--font-family-display)"
		>
			ALBUM
		</text>
		<text
			x="100"
			y="107"
			text-anchor="middle"
			fill="var(--color-base)"
			font-size="5.5"
			font-family="var(--font-family-body)"
		>
			REPORT
		</text>

		<!-- Center hole -->
		<circle cx="100" cy="100" r="4" fill="var(--color-base)" />
		<circle cx="100" cy="100" r="3" fill="#1a1a1e" />
	</svg>
</div>
