<script lang="ts">
	import { asset } from '$app/paths';
	let {
		onenter,
		busy = false,
		error = ''
	}: {
		onenter: () => void;
		busy?: boolean;
		error?: string;
	} = $props();
	let howTo: HTMLElement;
	function showInstructions(event: MouseEvent) {
		event.preventDefault();
		howTo.scrollIntoView({
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
				? 'instant'
				: 'smooth',
			block: 'start'
		});
	}
</script>

<div class="welcome">
	<header>
		<div class="global-nav">
			<div class="nav-content">
				<span class="brand">
					<svg viewBox="0 0 28 20" fill="none" aria-hidden="true"
						><path
							d="M8 3h12c3 0 4 2 5 6l1 5c.6 4-3 5-5 2l-2-2H9l-2 2c-2 3-5.6 2-5-2l1-5c1-4 2-6 5-6Z"
							stroke="currentColor"
							stroke-width="1.5"
						/><path d="M8 7v5M5.5 9.5h5" stroke="currentColor" stroke-width="1.5" /><circle
							cx="19"
							cy="8"
							r="1"
							fill="currentColor"
						/><circle cx="22" cy="11" r="1" fill="currentColor" /></svg
					>
					GAME ROOM
				</span>
				<span>당신을 위한 플레이 가이드</span>
			</div>
		</div>
		<nav class="sub-nav" aria-label="게임룸 안내">
			<strong>게임룸</strong>
			<a href="#room-how-to" onclick={showInstructions}
				>이용 방법 <span aria-hidden="true">⌄</span></a
			>
		</nav>
	</header>

	<main>
		<section class="hero" aria-labelledby="welcome-title">
			<div class="hero-copy">
				<p class="eyebrow">WELCOME TO YOUR PLAYTIME</p>
				<h1 id="welcome-title">게임룸에 오신 것을<br />환영합니다.</h1>
				<p class="intro">
					즐거운 시간의 시작, 더 간편하게.<br />카메라로 이용 방법을 알아보세요.
				</p>
				<button class="primary" onclick={onenter} disabled={busy} aria-busy={busy}>
					{busy ? '게임룸에 입장하는 중…' : error ? '다시 입장하기' : '게임룸 입장하기'}
					{#if !busy}<span aria-hidden="true">→</span>{/if}
				</button>
				<p class="permission" role="status">
					{busy
						? '카메라 권한을 허용하면 안내가 시작됩니다.'
						: '입장 후 카메라 접근을 허용해주세요.'}
				</p>
				{#if error}<p class="error" role="alert">{error}</p>{/if}
			</div>
			<figure>
				<img
					src={asset('/images/game-room-hero.jpg')}
					srcset={`${asset('/images/game-room-hero-mobile.jpg')} 640w, ${asset('/images/game-room-hero.jpg')} 1200w`}
					sizes="(max-width: 1440px) 100vw, 1440px"
					width="1200"
					height="800"
					alt="게임 컨트롤러와 편안한 소파가 놓인 게임룸 콘셉트 이미지"
					fetchpriority="high"
				/>
				<figcaption>게임룸의 분위기를 표현한 이미지입니다.</figcaption>
			</figure>
		</section>

		<section class="how-to" id="room-how-to" aria-labelledby="how-to-title" bind:this={howTo}>
			<p class="eyebrow">A SIMPLE WAY TO PLAY</p>
			<h2 id="how-to-title">설명은 간단하게.<br />플레이는 즐겁게.</h2>
			<p class="section-intro">세 단계면 이용 준비가 끝나요.</p>
			<ol>
				<li>
					<span class="number">01</span>
					<div>
						<h3>게임룸에 입장하세요.</h3>
						<p>입장 버튼을 누르고 카메라를 허용해주세요.</p>
					</div>
				</li>
				<li>
					<span class="number">02</span>
					<div>
						<h3>안내 이미지를 비춰보세요.</h3>
						<p>게임룸의 지정된 안내 이미지를 화면에 담아주세요.</p>
					</div>
				</li>
				<li>
					<span class="number">03</span>
					<div>
						<h3>영상으로 편하게 알아보세요.</h3>
						<p>이미지를 인식하면 이용 안내 영상이 자동으로 펼쳐집니다.</p>
					</div>
				</li>
			</ol>
			<button class="primary" onclick={onenter} disabled={busy}
				>{busy ? '입장하는 중…' : '게임룸 입장하기'} <span aria-hidden="true">→</span></button
			>
			{#if error}<p role="alert">{error}</p>{/if}
		</section>
		<section class="help" aria-label="카메라 이용 도움말">
			<details>
				<summary>카메라가 열리지 않나요?<span aria-hidden="true">＋</span></summary>
				<p>
					브라우저의 사이트 설정에서 카메라 접근을 허용한 뒤 다시 입장해주세요. 메신저 안에서
					열었다면 Safari 또는 Chrome에서 접속해주세요.
				</p>
			</details>
		</section>
	</main>
	<footer><span>GAME ROOM</span><span>공간을 이해하는 가장 쉬운 방법.</span></footer>
</div>

<style>
	.welcome {
		word-break: keep-all;
		position: relative;
		z-index: 2;
		color: var(--ink);
		background: var(--canvas);
		min-height: 100svh;
	}
	.global-nav {
		background: var(--surface-black);
		color: var(--on-dark);
		padding: env(safe-area-inset-top) var(--space-lg) 0;
	}
	.nav-content {
		min-height: 44px;
		max-width: 1100px;
		margin: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		font-size: 12px;
		letter-spacing: -0.12px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-weight: 600;
		letter-spacing: 1.5px;
	}
	.brand svg {
		width: 25px;
		height: 20px;
	}
	.nav-content > span:last-child {
		color: var(--body-muted);
	}
	.sub-nav {
		height: 52px;
		padding: 0 max(var(--space-lg), calc((100vw - 1100px) / 2));
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--canvas-parchment);
	}
	.sub-nav strong {
		font-size: 21px;
		font-weight: 600;
	}
	a {
		color: var(--primary);
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 14px;
	}
	.hero {
		text-align: center;
	}
	.hero-copy {
		padding: 64px var(--space-lg) var(--space-xxl);
	}
	.eyebrow {
		margin: 0 0 var(--space-lg);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 2px;
		color: var(--ink-muted);
	}
	h1,
	h2 {
		font-family: var(--font-display);
		font-weight: 600;
		letter-spacing: -0.374px;
	}
	h1 {
		margin: 0;
		font-size: 56px;
		line-height: 1.15;
	}
	.intro {
		margin: var(--space-lg) 0;
		font-size: 17px;
		line-height: 1.47;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg);
		min-height: 48px;
		padding: 11px 24px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--on-dark);
		background: var(--primary);
		font-size: 17px;
		font-weight: 400;
		cursor: pointer;
		transition: transform 150ms;
	}
	.permission {
		margin: var(--space-sm) 0 0;
		font-size: 12px;
		color: var(--ink-muted);
	}
	.error {
		max-width: 450px;
		margin: var(--space-lg) auto 0;
		font-size: 14px;
		color: var(--ink);
	}
	figure {
		margin: 0 auto;
		max-width: 1440px;
		background: var(--canvas-parchment);
	}
	img {
		display: block;
		width: 100%;
		height: min(48vw, 560px);
		object-fit: cover;
		object-position: center 62%;
	}
	figcaption {
		padding: var(--space-xs) var(--space-lg);
		font-size: 10px;
		color: var(--ink-muted);
		text-align: right;
	}
	.how-to {
		padding: var(--space-section) var(--space-lg);
		background: var(--surface-dark);
		color: var(--on-dark);
		text-align: center;
		scroll-margin-top: var(--space-lg);
	}
	.how-to .eyebrow {
		color: var(--body-muted);
	}
	h2 {
		font-size: 40px;
		line-height: 1.15;
		margin: 0;
	}
	.section-intro {
		color: var(--body-muted);
		margin: var(--space-lg) 0 0;
	}
	ol {
		list-style: none;
		padding: 0;
		margin: var(--space-xxl) auto;
		max-width: 980px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		text-align: left;
	}
	li {
		display: flex;
		gap: var(--space-lg);
	}
	.number {
		color: var(--body-muted);
		font-size: 14px;
		padding-top: 3px;
	}
	h3 {
		font-size: 17px;
		font-weight: 600;
		margin: 0 0 var(--space-xs);
	}
	li p {
		font-size: 17px;
		color: var(--body-muted);
		line-height: 1.47;
		margin: 0;
	}
	.help {
		padding: var(--space-xxl) var(--space-lg);
		background: var(--canvas-parchment);
	}
	details {
		max-width: 720px;
		margin: auto;
	}
	summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg);
		cursor: pointer;
		font-weight: 600;
		color: var(--primary);
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	details p {
		margin: var(--space-lg) 0 0;
	}
	footer {
		padding: var(--space-lg) var(--space-lg) max(var(--space-lg), env(safe-area-inset-bottom));
		background: var(--canvas-parchment);
		display: flex;
		justify-content: space-between;
		gap: var(--space-lg);
		font-size: 12px;
		color: var(--ink-muted);
	}
	@media (max-width: 1068px) {
		h1 {
			font-size: 40px;
		}
	}
	@media (max-width: 640px) {
		.hero-copy {
			padding-top: var(--space-xxl);
			padding-bottom: var(--space-xl);
		}
		h1 {
			font-size: 34px;
		}
		h2 {
			font-size: 28px;
		}
		.eyebrow {
			margin-bottom: var(--space-lg);
			font-size: 10px;
			letter-spacing: 1.8px;
		}
		img {
			height: auto;
			aspect-ratio: 4 / 3;
			object-position: center;
		}
		.how-to {
			padding: 64px var(--space-lg);
		}
		ol {
			grid-template-columns: 1fr;
			max-width: 360px;
		}
	}
	@media (max-width: 419px) {
		h1 {
			font-size: 28px;
		}
		.nav-content > span:last-child {
			font-size: 10px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.primary {
			transition: none;
		}
	}
</style>
