<!--
/**
 * @fileoverview Root layout - App shell with navigation and global styles
 * @purpose Provides consistent header/footer/navigation across all pages
 * @dataFlow Wraps all page content via <slot />; reads current route from $page.url.pathname
 * @updated 2025-11-15
 *
 * Features:
 * - Responsive navigation with mobile hamburger menu
 * - Dark mystical theme (purple/gold color scheme)
 * - Global CSS reset and custom properties
 * - Current route highlighting
 * - Glassmorphism effects
 * - Google Fonts integration (Cinzel for headings, Cormorant for body)
 */
-->

<script lang="ts">
	import { page } from '$app/stores';

	// Mobile menu toggle state
	let mobileMenuOpen = false;

	// Navigation items
	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/upload', label: 'Upload' },
		{ href: '/generate', label: 'Generate' },
		{ href: '/gallery', label: 'Gallery' }
	];

	// Check if current route matches nav item
	function isActive(href: string, pathname: string): boolean {
		if (href === '/') {
			return pathname === '/';
		}
		return pathname.startsWith(href);
	}

	// Close mobile menu when route changes
	$: if ($page.url.pathname) {
		mobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app">
	<header>
		<nav>
			<div class="nav-container">
				<!-- Logo/Title -->
				<a href="/" class="logo">
					<span class="logo-icon">🔮</span>
					<span class="logo-text">TarotOutMyHeart</span>
				</a>

				<!-- Desktop Navigation -->
				<ul class="nav-links desktop-nav">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class:active={isActive(item.href, $page.url.pathname)}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>

				<!-- Mobile Hamburger Button -->
				<button
					class="hamburger"
					class:open={mobileMenuOpen}
					on:click={toggleMobileMenu}
					aria-label="Toggle menu"
					aria-expanded={mobileMenuOpen}
				>
					<span class="hamburger-line"></span>
					<span class="hamburger-line"></span>
					<span class="hamburger-line"></span>
				</button>
			</div>

			<!-- Mobile Navigation -->
			{#if mobileMenuOpen}
				<ul class="nav-links mobile-nav">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class:active={isActive(item.href, $page.url.pathname)}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</nav>
	</header>

	<main>
		<slot />
	</main>

	<footer>
		<div class="footer-container">
			<div class="footer-content">
				<p class="copyright">
					&copy; {new Date().getFullYear()} TarotOutMyHeart. All rights reserved.
				</p>
				<div class="footer-links">
					<a href="/docs" class="footer-link">Documentation</a>
					<span class="separator">•</span>
					<a href="/about" class="footer-link">About</a>
					<span class="separator">•</span>
					<a
						href="https://github.com/Phazzie/TarotUpMyHeart"
						target="_blank"
						rel="noopener noreferrer"
						class="footer-link"
					>
						GitHub
					</a>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	/* ===============================================
	   GLOBAL STYLES & CSS RESET
	   =============================================== */
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(:root) {
		/* Color Palette - Mystical Theme */
		--color-primary: #6b46c1; /* Deep Purple */
		--color-primary-light: #805ad5; /* Light Purple */
		--color-primary-dark: #553c9a; /* Dark Purple */
		--color-secondary: #f6ad55; /* Gold */
		--color-secondary-light: #fbd38d; /* Light Gold */
		--color-accent: #b794f4; /* Lavender */

		/* Background Colors */
		--color-bg: #0f0e17; /* Very Dark Background */
		--color-bg-secondary: #1a1826; /* Dark Background */
		--color-bg-tertiary: #2d2b3e; /* Medium Dark Background */

		/* Text Colors */
		--color-text: #fffffe; /* Off-White */
		--color-text-secondary: #a7a9be; /* Gray Text */
		--color-text-muted: #72757e; /* Muted Gray */

		/* Glass Effect */
		--glass-bg: rgba(139, 92, 246, 0.1);
		--glass-border: rgba(139, 92, 246, 0.2);
		--glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);

		/* Spacing */
		--spacing-xs: 0.25rem;
		--spacing-sm: 0.5rem;
		--spacing-md: 1rem;
		--spacing-lg: 1.5rem;
		--spacing-xl: 2rem;
		--spacing-xxl: 3rem;

		/* Border Radius */
		--radius-sm: 0.25rem;
		--radius-md: 0.5rem;
		--radius-lg: 1rem;

		/* Transitions */
		--transition-fast: 150ms ease;
		--transition-normal: 300ms ease;
		--transition-slow: 500ms ease;

		/* Typography */
		--font-heading: 'Cinzel', serif;
		--font-body: 'Cormorant Garamond', serif;
		--font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, sans-serif;

		/* Font Sizes */
		--text-xs: 0.75rem;
		--text-sm: 0.875rem;
		--text-base: 1rem;
		--text-lg: 1.125rem;
		--text-xl: 1.25rem;
		--text-2xl: 1.5rem;
		--text-3xl: 1.875rem;
		--text-4xl: 2.25rem;
	}

	:global(body) {
		font-family: var(--font-body);
		font-size: var(--text-lg);
		line-height: 1.6;
		color: var(--color-text);
		background-color: var(--color-bg);
		background-image: radial-gradient(
				circle at 20% 50%,
				rgba(107, 70, 193, 0.1) 0%,
				transparent 50%
			),
			radial-gradient(circle at 80% 80%, rgba(246, 173, 85, 0.05) 0%, transparent 50%);
		background-attachment: fixed;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		font-family: var(--font-heading);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-text);
	}

	:global(h1) {
		font-size: var(--text-4xl);
	}
	:global(h2) {
		font-size: var(--text-3xl);
	}
	:global(h3) {
		font-size: var(--text-2xl);
	}

	:global(a) {
		color: var(--color-secondary);
		text-decoration: none;
		transition: color var(--transition-fast);
	}

	:global(a:hover) {
		color: var(--color-secondary-light);
	}

	:global(button) {
		font-family: var(--font-body);
		cursor: pointer;
		border: none;
		background: none;
	}

	:global(input, textarea, select) {
		font-family: var(--font-body);
		font-size: var(--text-base);
	}

	/* ===============================================
	   APP LAYOUT
	   =============================================== */
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	/* ===============================================
	   HEADER & NAVIGATION
	   =============================================== */
	header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--glass-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--glass-border);
		box-shadow: var(--glass-shadow);
	}

	nav {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
	}

	.nav-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md) var(--spacing-lg);
	}

	/* Logo */
	.logo {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
		transition: transform var(--transition-fast);
	}

	.logo:hover {
		transform: scale(1.05);
		color: var(--color-text);
	}

	.logo-icon {
		font-size: var(--text-2xl);
		filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
	}

	.logo-text {
		background: linear-gradient(135deg, var(--color-primary-light), var(--color-secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* Navigation Links */
	.nav-links {
		display: flex;
		list-style: none;
		gap: var(--spacing-lg);
	}

	.nav-links li {
		list-style: none;
	}

	.nav-links a {
		position: relative;
		display: block;
		padding: var(--spacing-sm) var(--spacing-md);
		font-family: var(--font-heading);
		font-size: var(--text-base);
		font-weight: 400;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: color var(--transition-fast);
	}

	.nav-links a::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 50%;
		width: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
		transform: translateX(-50%);
		transition: width var(--transition-normal);
	}

	.nav-links a:hover,
	.nav-links a.active {
		color: var(--color-text);
	}

	.nav-links a.active::after {
		width: 100%;
	}

	.nav-links a:hover::after {
		width: 100%;
	}

	/* Desktop Navigation */
	.desktop-nav {
		display: none;
	}

	@media (min-width: 768px) {
		.desktop-nav {
			display: flex;
		}
	}

	/* Mobile Navigation */
	.mobile-nav {
		flex-direction: column;
		gap: 0;
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--glass-border);
		animation: slideDown var(--transition-normal);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.mobile-nav a {
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-bg-tertiary);
	}

	.mobile-nav li:last-child a {
		border-bottom: none;
	}

	@media (min-width: 768px) {
		.mobile-nav {
			display: none;
		}
	}

	/* Hamburger Menu */
	.hamburger {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: var(--spacing-sm);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: transform var(--transition-fast);
	}

	.hamburger:hover {
		transform: scale(1.1);
	}

	.hamburger-line {
		width: 24px;
		height: 2px;
		background: var(--color-text);
		border-radius: 2px;
		transition: all var(--transition-normal);
	}

	.hamburger.open .hamburger-line:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}

	.hamburger.open .hamburger-line:nth-child(2) {
		opacity: 0;
	}

	.hamburger.open .hamburger-line:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}

	@media (min-width: 768px) {
		.hamburger {
			display: none;
		}
	}

	/* ===============================================
	   FOOTER
	   =============================================== */
	footer {
		margin-top: auto;
		background: var(--glass-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-top: 1px solid var(--glass-border);
	}

	.footer-container {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		text-align: center;
	}

	.copyright {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-link {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: color var(--transition-fast);
	}

	.footer-link:hover {
		color: var(--color-secondary);
	}

	.separator {
		color: var(--color-text-muted);
		user-select: none;
	}

	@media (min-width: 768px) {
		.footer-content {
			flex-direction: row;
			justify-content: space-between;
		}
	}

	/* ===============================================
	   RESPONSIVE BREAKPOINTS
	   =============================================== */
	@media (min-width: 768px) {
		main {
			padding: var(--spacing-xxl) var(--spacing-xl);
		}
	}

	@media (min-width: 1024px) {
		.nav-container {
			padding: var(--spacing-lg) var(--spacing-xl);
		}
	}
</style>
