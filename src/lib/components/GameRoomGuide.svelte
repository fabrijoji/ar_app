<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { base } from '$app/paths';
	import ARView from '$lib/components/ARView.svelte';

	const videoSrc = `${base}/videos/target-video-audio.mp4`;
	let fullscreen = $state(false);
	let settled = $state(false);
	let player = $state<HTMLVideoElement>();
	let showAR = $state(true);
	let arSession = $state(0);
	let flight: Animation | undefined;
	let playbackError = $state('');
	let soundEnabled = $state(false);
	let generation = 0;

	async function ensurePlayback() {
		if (!player || !fullscreen) return;
		try {
			await player.play();
			playbackError = '';
		} catch {
			playbackError = '재생 버튼을 눌러 영상을 시작해주세요.';
		}
	}

	async function showVideo(origin: {
		x: number;
		y: number;
		width: number;
		height: number;
		angle: number;
	}) {
		if (!player || fullscreen) return;
		const request = ++generation;
		const width = window.innerWidth;
		const height = window.innerHeight;
		const ratio = player.videoWidth / player.videoHeight || 16 / 9;
		const fitWidth = Math.min(width, height * ratio);
		const fitHeight = fitWidth / ratio;
		const start = `translate(${origin.x - width / 2}px, ${origin.y - height / 2}px) rotate(${origin.angle}deg) scale(${origin.width / fitWidth}, ${origin.height / fitHeight})`;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Animate the same playing element used by the AR texture, from its projected position.
		flight = player.animate(
			reducedMotion
				? [{ opacity: 0 }, { opacity: 1 }]
				: [
						{ transform: start, filter: 'drop-shadow(0 0 12px #64faff)', offset: 0 },
						{
							transform: 'translate(0, 0) rotate(0deg) scale(1.025)',
							filter: 'drop-shadow(0 18px 35px #64faff66)',
							offset: 0.82
						},
						{
							transform: 'translate(0, 0) rotate(0deg) scale(1)',
							filter: 'drop-shadow(0 0 0 transparent)',
							offset: 1
						}
					],
			{
				duration: reducedMotion ? 150 : 1100,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
				fill: 'both'
			}
		);
		fullscreen = true;
		settled = false;
		player.muted = true;
		soundEnabled = false;
		await tick();
		void ensurePlayback();
		try {
			await flight.finished;
		} catch {
			return;
		}
		if (request !== generation) return;
		showAR = false;
		settled = true;
		await tick();
		// Keep playback running after the camera and AR renderer release their resources.
		void ensurePlayback();
	}

	function toggleSound() {
		if (!player) return;
		soundEnabled = !soundEnabled;
		player.muted = !soundEnabled;
		void ensurePlayback();
	}

	function returnToAR() {
		generation++;
		flight?.cancel();
		player?.pause();
		fullscreen = false;
		settled = false;
		arSession += 1;
		showAR = true;
	}

	onDestroy(() => {
		generation++;
		flight?.cancel();
		player?.pause();
	});
</script>

<svelte:head>
	<title>게임룸 | 이용 가이드</title>
	<meta
		name="description"
		content="게임룸에 입장하고 안내 이미지를 비춰보세요. 이용 방법을 영상으로 간편하게 안내합니다."
	/>
</svelte:head>

{#if showAR}
	{#key arSession}
		<ARView {videoSrc} mediaElement={player} onVideoPlaying={showVideo} />
	{/key}
{/if}

<div
	class="fullscreen-video"
	class:active={fullscreen}
	inert={!fullscreen}
	aria-hidden={!fullscreen}
>
	<div class="backdrop"></div>
	<video
		bind:this={player}
		src={videoSrc}
		controls={settled}
		autoplay={fullscreen}
		muted
		playsinline
		preload="auto"
		onerror={() => (playbackError = '영상을 불러오지 못했습니다. 연결 상태를 확인해주세요.')}
		onplaying={() => (playbackError = '')}
	>
		<track kind="captions" />
	</video>
	{#if fullscreen}
		<div class="toolbar">
			<button type="button" onclick={returnToAR}>← 안내 다시 찾기</button>
			<button type="button" onclick={toggleSound}>{soundEnabled ? '소리 끄기' : '소리 켜기'}</button
			>
		</div>
	{/if}
	{#if playbackError && fullscreen}
		<div class="playback-message" role="status">
			<p>{playbackError}</p>
			<button type="button" onclick={ensurePlayback}>재생</button>
		</div>
	{/if}
</div>

<style>
	.fullscreen-video {
		position: fixed;
		inset: 0;
		z-index: 10;
		pointer-events: none;
	}
	.fullscreen-video.active {
		pointer-events: auto;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: var(--surface-black);
		opacity: 0;
		transition: opacity 1100ms ease;
	}
	.active .backdrop {
		opacity: 1;
	}
	video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		opacity: 0;
		transform-origin: center;
	}
	.active video {
		opacity: 1;
	}
	.toolbar {
		position: absolute;
		top: max(1rem, env(safe-area-inset-top));
		left: max(1rem, env(safe-area-inset-left));
		right: 1rem;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	button {
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 0.5rem;
		background: var(--surface-dark);
		color: var(--primary-on-dark);
		font: inherit;
		cursor: pointer;
	}
	.playback-message {
		position: absolute;
		top: calc(max(1rem, env(safe-area-inset-top)) + 3rem);
		left: 1rem;
		right: 1rem;
		color: var(--on-dark);
	}
	@media (prefers-reduced-motion: reduce) {
		.backdrop {
			transition-duration: 150ms;
		}
	}
</style>
