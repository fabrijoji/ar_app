<script lang="ts">
	import { onMount } from 'svelte';
	import { base, asset } from '$app/paths';
	import GameRoomWelcome from './GameRoomWelcome.svelte';
	import type { MindARThree } from '$lib/vendor/mindar/mindar-image-three.prod.js';

	let {
		imageTargetSrc = `${base}/targets/card.mind`,
		smoothingMs = 80,
		videoSrc = `${base}/videos/target-video-audio.mp4`,
		cues = [],
		onNext,
		mediaElement,
		onVideoPlaying
	}: {
		imageTargetSrc?: string;
		smoothingMs?: number;
		videoSrc?: string;
		/** Seconds and target-local coordinates: origin is the target center, width = 1. */
		cues?: { start: number; end: number; x: number; y: number; label?: string }[];
		onNext?: () => void;
		mediaElement?: HTMLVideoElement;
		onVideoPlaying?: (origin: {
			x: number;
			y: number;
			width: number;
			height: number;
			angle: number;
		}) => void;
	} = $props();
	let container: HTMLDivElement;
	let starting = $state(false);
	let running = $state(false);
	let found = $state(false);
	let error = $state('');
	let videoError = $state('');
	let playbackBlocked = $state(false);
	let soundEnabled = $state(false);
	let video: HTMLVideoElement | undefined;
	let handedOff = false;
	let getVideoOrigin:
		(() => { x: number; y: number; width: number; height: number; angle: number }) | undefined;
	let phase = $state<'idle' | 'reveal' | 'playing' | 'ended'>('idle');
	let cueLabel = $state('');
	let revealAgain: (() => void) | undefined;

	function replay() {
		if (!video || !found) return;
		video.currentTime = 0;
		revealAgain?.();
	}

	function toggleSound() {
		if (!video || !found || phase !== 'playing') return;
		soundEnabled = !soundEnabled;
		video.muted = !soundEnabled;
		// Call play directly from the tap so Safari permits audible playback.
		void playVideo();
	}

	async function playVideo() {
		const current = video;
		if (!current || !mounted || !found || phase !== 'playing' || document.hidden) return;
		playbackBlocked = false;
		try {
			await current.play();
			// A pending play request can resolve after target loss or navigation.
			if (
				!handedOff &&
				(video !== current || !mounted || !found || phase !== 'playing' || document.hidden)
			)
				current.pause();
			else if (!handedOff && onVideoPlaying && getVideoOrigin) {
				handedOff = true;
				onVideoPlaying(getVideoOrigin());
			}
		} catch (cause) {
			if (video !== current || !mounted || !found || phase !== 'playing') return;
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
			playbackBlocked = true;
		}
	}
	let mounted = false;
	let mindar: MindARThree | undefined;
	let disposeObject: (() => void) | undefined;

	function stop() {
		mindar?.renderer.setAnimationLoop(null);
		mindar?.stop();
		disposeObject?.();
		disposeObject = undefined;
		mindar?.renderer.dispose();
		mindar?.renderer.forceContextLoss();
		mindar?.renderer.domElement.remove();
		mindar?.cssRenderer.domElement.remove();
		mindar = undefined;
		found = false;
		phase = 'idle';
		cueLabel = '';
		revealAgain = undefined;
		running = false;
		playbackBlocked = false;
		videoError = '';
		soundEnabled = false;
	}

	onMount(() => {
		mounted = true;
		const leave = () => {
			mounted = false;
			stop();
		};
		const restore = () => {
			mounted = true;
		};
		const visibilityChanged = () => {
			if (handedOff) return;
			if (document.hidden) video?.pause();
			else if (found) void playVideo();
		};
		document.addEventListener('visibilitychange', visibilityChanged);
		window.addEventListener('pagehide', leave);
		window.addEventListener('pageshow', restore);
		return () => {
			leave();
			document.removeEventListener('visibilitychange', visibilityChanged);
			window.removeEventListener('pagehide', leave);
			window.removeEventListener('pageshow', restore);
		};
	});

	async function start() {
		if (!mounted || starting || running) return;
		starting = true;
		error = '';
		try {
			if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
				throw new Error('카메라를 사용할 수 없습니다. 보안 연결(HTTPS)에서 다시 접속해주세요.');
			}
			// Runtime imports happen only after a client-side button click, never during SSR.
			const [{ MindARThree }, THREE] = await Promise.all([
				import('$lib/vendor/mindar/mindar-image-three.prod.js'),
				import('three')
			]);
			if (!mounted) return;
			const ar = new MindARThree({
				container,
				imageTargetSrc,
				maxTrack: 1,
				uiLoading: 'no',
				uiScanning: 'no',
				uiError: 'no'
			});
			mindar = ar;
			const anchor = ar.addAnchor(0);
			const clip = mediaElement ?? document.createElement('video');
			handedOff = false;
			video = clip;
			clip.muted = true;
			clip.defaultMuted = true;
			clip.loop = false;
			clip.playsInline = true;
			clip.setAttribute('playsinline', '');
			clip.preload = 'auto';
			const texture = new THREE.VideoTexture(clip);
			texture.colorSpace = THREE.SRGBColorSpace;
			const geometry = new THREE.PlaneGeometry(1, 1);
			const material = new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				opacity: 0,
				side: THREE.DoubleSide,
				toneMapped: false
			});
			const screen = new THREE.Mesh(geometry, material);
			getVideoOrigin = () => {
				ar.scene.updateMatrixWorld(true);
				ar.camera.updateMatrixWorld(true);
				const bounds = ar.renderer.domElement.getBoundingClientRect();
				const project = (x: number, y: number) => {
					const point = screen.localToWorld(new THREE.Vector3(x, y, 0)).project(ar.camera);
					return {
						x: bounds.left + ((point.x + 1) * bounds.width) / 2,
						y: bounds.top + ((1 - point.y) * bounds.height) / 2
					};
				};
				const center = project(0, 0);
				const left = project(-0.5, 0.5);
				const right = project(0.5, 0.5);
				const bottom = project(-0.5, -0.5);
				return {
					...center,
					width: Math.max(1, Math.hypot(right.x - left.x, right.y - left.y)),
					height: Math.max(1, Math.hypot(bottom.x - left.x, bottom.y - left.y)),
					angle: (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI
				};
			};
			screen.position.z = 0.16;
			screen.scale.y = 9 / 16;
			const updateAspect = () => {
				if (clip.videoWidth && clip.videoHeight) {
					screen.scale.y = clip.videoHeight / clip.videoWidth;
				}
			};
			const mediaFailed = () => {
				videoError = '안내 영상을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 입장해주세요.';
			};
			clip.addEventListener('loadedmetadata', updateAspect);
			clip.addEventListener('error', mediaFailed);
			// Keep MindAR's measured pose separate from the displayed pose.
			const content = new THREE.Group();
			content.visible = false;
			// All effects share the tracked target pose, so they stay attached to the object.
			const panel = new THREE.Group();
			panel.add(screen);
			content.add(panel);
			const glowMaterial = new THREE.MeshBasicMaterial({
				color: 0x64faff,
				transparent: true,
				opacity: 0,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide
			});
			const portal = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.43, 64), glowMaterial);
			portal.position.z = 0.025;
			content.add(portal);
			const spark = new THREE.Mesh(new THREE.CircleGeometry(0.08, 32), glowMaterial.clone());
			spark.position.z = 0.03;
			content.add(spark);
			const halo = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.55, 64), glowMaterial.clone());
			halo.position.z = 0.015;
			content.add(halo);
			const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.035, 1), glowMaterial.clone());
			frame.position.z = 0.15;
			panel.add(frame);
			const scan = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.003), glowMaterial.clone());
			scan.position.z = 0.165;
			panel.add(scan);
			const arrow = new THREE.ArrowHelper(
				new THREE.Vector3(0, -1, 0),
				new THREE.Vector3(),
				0.22,
				0xffdc75,
				0.075,
				0.055
			);
			arrow.visible = false;
			content.add(arrow);
			let revealMs = 0;
			let revealed = false;
			const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const revealDuration = reducedMotion ? 150 : 850;
			revealAgain = () => {
				clip.pause();
				revealMs = 0;
				revealed = false;
				phase = 'reveal';
				panel.visible = false;
				arrow.visible = false;
				cueLabel = '';
				playbackBlocked = false;
			};
			const ended = () => {
				phase = 'ended';
				arrow.visible = false;
				cueLabel = '';
			};
			clip.addEventListener('ended', ended);
			ar.scene.add(content);
			const targetPosition = new THREE.Vector3();
			const targetRotation = new THREE.Quaternion();
			const targetScale = new THREE.Vector3();
			let resetPose = true;
			let previousTime: number | undefined;
			disposeObject = () => {
				anchor.onTargetFound = null;
				anchor.onTargetLost = null;
				ar.scene.remove(content);
				clip.removeEventListener('loadedmetadata', updateAspect);
				clip.removeEventListener('error', mediaFailed);
				if (!handedOff) {
					clip.pause();
					if (!mediaElement) {
						clip.removeAttribute('src');
						clip.load();
					}
				}
				video = undefined;
				clip.removeEventListener('ended', ended);
				for (const mesh of [portal, spark, halo, frame, scan]) {
					mesh.geometry.dispose();
					mesh.material.dispose();
				}
				arrow.dispose();
				texture.dispose();
				geometry.dispose();
				material.dispose();
			};
			anchor.onTargetFound = () => {
				if (handedOff) return;
				resetPose = true;
				found = true;
				if (!revealed) revealAgain?.();
				else if (phase === 'playing') void playVideo();
			};
			anchor.onTargetLost = () => {
				if (handedOff) return;
				content.visible = false;
				resetPose = true;
				found = false;
				cueLabel = '';
				clip.pause();
				playbackBlocked = false;
			};
			clip.src = videoSrc;
			clip.load();
			// MindAR image tracking defaults to facingMode: 'environment' (rear camera).
			await ar.start();
			if (!mounted || mindar !== ar) {
				ar.stop();
				return;
			}
			running = true;
			ar.renderer.setAnimationLoop((time) => {
				const elapsed = previousTime === undefined ? 0 : Math.max(0, time - previousTime);
				previousTime = time;
				content.visible = found && anchor.group.visible && !document.hidden;
				if (content.visible) {
					anchor.group.matrix.decompose(targetPosition, targetRotation, targetScale);
					// Snap on acquisition/resume, never glide from a stale or invisible pose.
					const amount =
						resetPose || elapsed > 250 || smoothingMs <= 0
							? 1
							: 1 - Math.exp(-elapsed / smoothingMs);
					content.position.lerp(targetPosition, amount);
					content.quaternion.slerp(targetRotation, amount);
					content.scale.lerp(targetScale, amount);
					resetPose = false;
					if (phase === 'reveal') revealMs += Math.min(elapsed, 50);
					const progress = Math.min(1, revealMs / revealDuration);
					const expansion = THREE.MathUtils.smoothstep(progress, 0.35, 1);
					portal.scale.setScalar(0.08 + 1.15 * THREE.MathUtils.smoothstep(progress, 0.1, 0.65));
					portal.material.opacity = progress < 0.65 ? progress * 1.3 : (1 - progress) * 1.8;
					spark.scale.setScalar(0.3 + Math.sin(progress * Math.PI) * 1.4);
					spark.material.opacity = Math.max(0, 1 - progress * 1.8);
					halo.material.opacity = 0.12 + 0.08 * Math.sin(time / 650);
					panel.visible = progress > 0.35;
					panel.scale.setScalar(0.08 + 0.92 * expansion);
					panel.position.z = expansion * 0.09;
					material.opacity = THREE.MathUtils.smoothstep(progress, 0.65, 1);
					frame.scale.y = screen.scale.y + 0.035;
					frame.material.opacity = 0.3;
					scan.material.opacity = reducedMotion ? 0 : 0.12;
					scan.position.y = (((time / 2800) % 1) - 0.5) * screen.scale.y;
					if (phase === 'reveal' && progress === 1) {
						revealed = true;
						phase = 'playing';
						void playVideo();
					}
					const cue =
						phase === 'playing'
							? cues.find((item) => clip.currentTime >= item.start && clip.currentTime < item.end)
							: undefined;
					arrow.visible = !!cue;
					cueLabel = cue?.label ?? '';
					if (cue) arrow.position.set(cue.x, cue.y + 0.22, 0.04);
				} else {
					resetPose = true;
				}
				ar.renderer.render(ar.scene, ar.camera);
			});
		} catch (cause) {
			stop();
			if (mounted) {
				error =
					cause instanceof Error && cause.name === 'NotAllowedError'
						? '카메라 접근이 허용되지 않았어요. 브라우저의 사이트 설정에서 카메라를 허용한 뒤 다시 입장해주세요.'
						: cause instanceof Error && cause.name === 'NotFoundError'
							? '카메라를 찾을 수 없어요. 카메라가 있는 기기에서 접속해주세요.'
							: '카메라를 열지 못했어요. 다른 앱의 카메라를 닫고 Safari 또는 Chrome에서 다시 시도해주세요.';
			}
		} finally {
			starting = false;
		}
	}
</script>

<div class="ar-view" class:lobby={!running}>
	<div class="camera" bind:this={container}></div>
	{#if !running}
		<GameRoomWelcome onenter={start} busy={starting} {error} />
	{:else}
		<div class="controls">
			<div class="scan-header">
				<button
					class="utility"
					type="button"
					onclick={stop}
					aria-label="게임룸 입장 화면으로 돌아가기">← 게임룸</button
				>
				<span>이용 가이드</span>
			</div>
			<h1>{found ? '이용 안내를 찾았어요.' : '안내 이미지를 비춰주세요.'}</h1>
			<p role="status" aria-live="polite">
				{!found
					? '이미지가 화면에 잘 보이도록 카메라를 맞춰주세요.'
					: phase === 'reveal'
						? '이용 안내를 여는 중…'
						: phase === 'ended'
							? '안내 영상이 끝났습니다.'
							: '잠시 후 영상이 화면 가득 펼쳐집니다.'}
			</p>
			{#if playbackBlocked && found}
				<button type="button" onclick={playVideo}>안내 영상 재생하기</button>
			{/if}
			{#if running && found && phase === 'playing'}
				<button type="button" onclick={toggleSound} aria-pressed={soundEnabled}
					>{soundEnabled ? '소리 끄기' : '소리 켜기'}</button
				>
			{/if}
			{#if running && found && phase === 'ended'}
				<div class="completion" role="group" aria-label="영상 종료">
					<button type="button" onclick={replay}>다시 보기</button>
					{#if onNext}<button type="button" onclick={() => onNext?.()}>다음 단계</button>{/if}
				</div>
			{/if}
			{#if found && cueLabel}<p class="cue" role="status">{cueLabel}</p>{/if}
			{#if videoError}<p role="alert">{videoError}</p>{/if}
		</div>
		{#if !found}
			<div class="scan-frame" aria-hidden="true">
				<span></span><span></span><span></span><span></span>
			</div>
			<div class="scan-tip">
				<p>안내 이미지를 인식하면 영상이 자동으로 시작됩니다.</p>
				<a href={asset('/targets/card.png')} target="_blank" rel="noreferrer"
					>인식할 이미지 보기 ↗</a
				>
			</div>
		{/if}
	{/if}
</div>

<style>
	.ar-view {
		position: fixed;
		inset: 0;
		overflow: hidden;
		isolation: isolate;
		background: var(--surface-black);
		color: var(--on-dark);
		font-family: var(--font-body);
	}
	.ar-view.lobby {
		overflow-y: auto;
		background: var(--canvas);
	}
	.camera {
		position: fixed;
		inset: 0;
		overflow: hidden;
		isolation: isolate;
	}
	.controls {
		position: relative;
		z-index: 1;
		padding: max(var(--space-lg), env(safe-area-inset-top)) var(--space-lg) var(--space-lg);
		background: var(--surface-dark);
	}
	.scan-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--body-muted);
	}
	h1 {
		margin: var(--space-lg) 0 var(--space-xs);
		font-size: 21px;
		font-family: var(--font-display);
		font-weight: 600;
	}
	p {
		margin: 0;
		font-size: 17px;
		line-height: 1.47;
	}
	button {
		min-height: 44px;
		padding: 11px 22px;
		font: inherit;
		font-weight: 400;
		border: 0;
		border-radius: var(--radius-pill);
		cursor: pointer;
		background: var(--primary);
		color: var(--on-dark);
		margin-top: var(--space-sm);
	}
	button.utility {
		padding: 0 var(--space-sm) 0 0;
		margin: 0;
		color: var(--primary-on-dark);
		background: transparent;
		border-radius: var(--radius-sm);
	}
	.scan-frame {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -35%);
		width: min(68vw, 320px);
		aspect-ratio: 1;
		pointer-events: none;
	}
	.scan-frame span {
		position: absolute;
		width: 28px;
		height: 28px;
		border: 2px solid var(--on-dark);
	}
	.scan-frame span:nth-child(1) {
		top: 0;
		left: 0;
		border-right: 0;
		border-bottom: 0;
		border-top-left-radius: var(--radius-sm);
	}
	.scan-frame span:nth-child(2) {
		top: 0;
		right: 0;
		border-left: 0;
		border-bottom: 0;
		border-top-right-radius: var(--radius-sm);
	}
	.scan-frame span:nth-child(3) {
		bottom: 0;
		left: 0;
		border-right: 0;
		border-top: 0;
		border-bottom-left-radius: var(--radius-sm);
	}
	.scan-frame span:nth-child(4) {
		bottom: 0;
		right: 0;
		border-left: 0;
		border-top: 0;
		border-bottom-right-radius: var(--radius-sm);
	}
	.scan-tip {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-lg) var(--space-lg) max(var(--space-lg), env(safe-area-inset-bottom));
		text-align: center;
		background: var(--surface-dark);
	}
	.scan-tip p {
		font-size: 14px;
		color: var(--body-muted);
	}
	.scan-tip a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--primary-on-dark);
		font-size: 14px;
		text-decoration: none;
	}
	[role='alert'] {
		padding-top: var(--space-sm);
	}
	@media (max-height: 560px) {
		.scan-frame {
			width: min(28vw, 140px);
			left: 75%;
		}
		.controls {
			max-width: 60%;
		}
		.scan-tip {
			padding: var(--space-xs);
		}
	}
</style>
