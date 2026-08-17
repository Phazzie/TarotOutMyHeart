<!--
/**
 * @fileoverview Root layout - App shell with navigation and global styles
 * @purpose Provides consistent header/footer/navigation across all pages
 * @dataFlow Wraps all page content via <slot />; reads current route from $page.url.pathname
 * @updated 2026-08-07
 *
 * Features:
 * - Glowing ambient logo title with gold leaf text gradient and .font-tarot
 * - Polished top step navigation tabs (Upload -> Generate -> Gallery) with active route underline & hover animations
 * - Responsive navigation with mobile hamburger menu drawer
 * - Dark mystical theme (purple/gold color scheme)
 * - Glassmorphism header & footer
 */
-->

<script lang="ts">
  import { page } from '$app/stores'

  // Mobile menu toggle state
  let mobileMenuOpen = false

  // Navigation items with step numbers
  const navItems = [
    { href: '/', label: 'Home', step: '' },
    { href: '/upload', label: 'Upload', step: '1' },
    { href: '/generate', label: 'Generate', step: '2' },
    { href: '/gallery', label: 'Gallery', step: '3' },
  ]

  // Check if current route matches nav item
  function isActive(href: string, pathname: string): boolean {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Close mobile menu when route changes
  $: if ($page.url.pathname) {
    mobileMenuOpen = false
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Outfit:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app">
  <!-- Ambient Celestial Background & Stardust Orbs (TICK-007) -->
  <div class="celestial-background" aria-hidden="true">
    <!-- Slow-rotating Zodiac Wheel SVG -->
    <svg
      class="zodiac-wheel-svg"
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
    >
      <!-- Outer Decorative Rings -->
      <circle cx="500" cy="500" r="480" stroke-width="1.5" stroke-dasharray="4 8" />
      <circle cx="500" cy="500" r="460" stroke-width="2" />
      <circle cx="500" cy="500" r="440" stroke-width="1" stroke-dasharray="12 6" />
      <circle cx="500" cy="500" r="360" stroke-width="1.5" />
      <circle cx="500" cy="500" r="280" stroke-width="1" />
      <circle cx="500" cy="500" r="180" stroke-width="1.5" stroke-dasharray="2 4" />
      <circle cx="500" cy="500" r="100" stroke-width="2" />

      <!-- 12 Zodiac Sector Spokes (every 30 deg) -->
      <line x1="500" y1="40" x2="500" y2="960" stroke-width="1" />
      <line x1="40" y1="500" x2="960" y2="500" stroke-width="1" />
      <line x1="110" y1="275" x2="890" y2="725" stroke-width="1" />
      <line x1="275" y1="110" x2="725" y2="890" stroke-width="1" />
      <line x1="725" y1="110" x2="275" y2="890" stroke-width="1" />
      <line x1="890" y1="275" x2="110" y2="725" stroke-width="1" />

      <!-- Celestial Constellation Stars & Glyphs Motif -->
      <circle cx="500" cy="500" r="40" fill="currentColor" opacity="0.3" />
      <polygon points="500,430 512,488 570,500 512,512 500,570 488,512 430,500 488,488" fill="currentColor" />
      <polygon points="500,450 508,492 550,500 508,508 500,550 492,508 450,500 492,492" fill="currentColor" transform="rotate(45 500 500)" opacity="0.6" />

      <!-- Ring Astrological Constellation Markers -->
      <circle cx="500" cy="80" r="6" fill="currentColor" />
      <circle cx="500" cy="920" r="6" fill="currentColor" />
      <circle cx="80" cy="500" r="6" fill="currentColor" />
      <circle cx="920" cy="500" r="6" fill="currentColor" />
      <circle cx="210" cy="210" r="5" fill="currentColor" />
      <circle cx="790" cy="790" r="5" fill="currentColor" />
      <circle cx="790" cy="210" r="5" fill="currentColor" />
      <circle cx="210" cy="790" r="5" fill="currentColor" />

      <g opacity="0.7">
        <circle cx="500" cy="140" r="3" fill="currentColor" />
        <circle cx="680" cy="188" r="3" fill="currentColor" />
        <circle cx="812" cy="320" r="3" fill="currentColor" />
        <circle cx="860" cy="500" r="3" fill="currentColor" />
        <circle cx="812" cy="680" r="3" fill="currentColor" />
        <circle cx="680" cy="812" r="3" fill="currentColor" />
        <circle cx="500" cy="860" r="3" fill="currentColor" />
        <circle cx="320" cy="812" r="3" fill="currentColor" />
        <circle cx="188" cy="680" r="3" fill="currentColor" />
        <circle cx="140" cy="500" r="3" fill="currentColor" />
        <circle cx="188" cy="320" r="3" fill="currentColor" />
        <circle cx="320" cy="188" r="3" fill="currentColor" />
      </g>
    </svg>

    <!-- Floating Glowing Stardust Orbs -->
    <div class="orb orb-gold orb-1"></div>
    <div class="orb orb-purple orb-2"></div>
    <div class="orb orb-gold orb-3"></div>
    <div class="orb orb-purple orb-4"></div>
  </div>

  <header>
    <nav>
      <div class="nav-container">
        <!-- Logo / Title with Ambient Glow & Gold Leaf Gradient -->
        <a href="/" class="logo" aria-label="TarotOutMyHeart Home">
          <div class="logo-icon-wrapper">
            <span class="logo-icon">🔮</span>
            <span class="ambient-glow"></span>
          </div>
          <div class="logo-brand">
            <span class="logo-text font-tarot">TarotOutMyHeart</span>
            <span class="logo-subtitle">Major Arcana Deck Generator</span>
          </div>
        </a>

        <!-- Desktop Step Navigation Tabs -->
        <ul class="nav-links step-tabs desktop-nav">
          {#each navItems as item, index}
            <li class="nav-item">
              <a
                href={item.href}
                class="step-tab"
                class:active={isActive(item.href, $page.url.pathname)}
              >
                {#if item.step}
                  <span class="step-badge">{item.step}</span>
                {/if}
                <span class="tab-label">{item.label}</span>
                <span class="active-indicator"></span>
              </a>
              {#if index > 0 && index < navItems.length - 1}
                <span class="step-arrow" aria-hidden="true">›</span>
              {/if}
            </li>
          {/each}
        </ul>

        <!-- Mobile Hamburger Button -->
        <button
          class="hamburger"
          class:open={mobileMenuOpen}
          onclick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>

      <!-- Mobile Navigation Drawer -->
      {#if mobileMenuOpen}
        <div class="mobile-nav-wrapper">
          <ul class="nav-links mobile-nav">
            {#each navItems as item}
              <li>
                <a
                  href={item.href}
                  class="mobile-step-tab"
                  class:active={isActive(item.href, $page.url.pathname)}
                >
                  {#if item.step}
                    <span class="step-badge">{item.step}</span>
                  {/if}
                  <span class="tab-label">{item.label}</span>
                  <span class="active-indicator"></span>
                </a>
              </li>
            {/each}
          </ul>
        </div>
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
    /* Color Palette - Mystical Gold & Purple Theme */
    --color-primary: #6b46c1; /* Deep Purple */
    --color-primary-light: #9f7aea; /* Light Purple */
    --color-primary-dark: #4c1d95; /* Dark Purple */
    --color-secondary: #d4af37; /* Gold Metallic */
    --color-secondary-light: #fef08a; /* Light Gold / Pale Yellow */
    --color-gold-leaf-start: #ffe082;
    --color-gold-leaf-mid: #d4af37;
    --color-gold-leaf-end: #aa771c;
    --color-accent: #b794f4; /* Lavender */

    /* Background Colors */
    --color-bg: #0b0a12; /* Very Dark Mystical Background */
    --color-bg-secondary: #141221; /* Dark Background */
    --color-bg-tertiary: #221e36; /* Medium Dark Background */

    /* Text Colors */
    --color-text: #fffffe; /* Off-White */
    --color-text-secondary: #a7a9be; /* Gray Text */
    --color-text-muted: #72757e; /* Muted Gray */

    /* Glass Effect */
    --glass-bg: rgba(20, 18, 33, 0.75);
    --glass-border: rgba(212, 175, 55, 0.2);
    --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);

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
    --radius-full: 9999px;

    /* Transitions */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);

    /* Typography */
    --font-tarot: 'Cinzel Decorative', 'Cinzel', serif;
    --font-heading: 'Cinzel', serif;
    --font-body: 'Cormorant Garamond', serif;
    --font-system:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;

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
    background-image:
      radial-gradient(circle at 15% 20%, rgba(107, 70, 193, 0.15) 0%, transparent 45%),
      radial-gradient(circle at 85% 75%, rgba(212, 175, 55, 0.08) 0%, transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0.1) 0%, transparent 60%);
    background-attachment: fixed;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Utility Font Class explicitly requested */
  :global(.font-tarot),
  .font-tarot {
    font-family: var(--font-tarot);
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
    position: relative;
    z-index: 1;
    flex: 1;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
  }

  /* ===============================================
	   AMBIENT CELESTIAL BACKGROUND & STARDUST ORBS
	   =============================================== */
  .celestial-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .zodiac-wheel-svg {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 110vmax;
    height: 110vmax;
    transform: translate(-50%, -50%);
    color: var(--color-secondary);
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
    animation: rotateZodiac 160s linear infinite;
  }

  @keyframes rotateZodiac {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  /* Floating Glowing Stardust Orbs */
  .orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(70px);
    mix-blend-mode: screen;
    will-change: transform;
  }

  .orb-gold {
    background: radial-gradient(
      circle,
      rgba(212, 175, 55, 0.35) 0%,
      rgba(254, 240, 138, 0.15) 45%,
      transparent 70%
    );
  }

  .orb-purple {
    background: radial-gradient(
      circle,
      rgba(159, 122, 234, 0.35) 0%,
      rgba(107, 70, 193, 0.15) 45%,
      transparent 70%
    );
  }

  .orb-1 {
    top: 10%;
    left: 15%;
    width: 350px;
    height: 350px;
    animation: orbDrift1 22s ease-in-out infinite alternate;
  }

  .orb-2 {
    bottom: 15%;
    right: 10%;
    width: 420px;
    height: 420px;
    animation: orbDrift2 28s ease-in-out infinite alternate;
  }

  .orb-3 {
    top: 60%;
    left: 8%;
    width: 300px;
    height: 300px;
    animation: orbDrift3 25s ease-in-out infinite alternate;
  }

  .orb-4 {
    top: 20%;
    right: 20%;
    width: 380px;
    height: 380px;
    animation: orbDrift4 30s ease-in-out infinite alternate;
  }

  @keyframes orbDrift1 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(60px, 40px) scale(1.1);
    }
    100% {
      transform: translate(-30px, 80px) scale(0.95);
    }
  }

  @keyframes orbDrift2 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(-70px, -50px) scale(1.15);
    }
    100% {
      transform: translate(40px, -90px) scale(0.9);
    }
  }

  @keyframes orbDrift3 {
    0% {
      transform: translate(0, 0) scale(0.95);
    }
    50% {
      transform: translate(50px, -60px) scale(1.2);
    }
    100% {
      transform: translate(-40px, 30px) scale(1);
    }
  }

  @keyframes orbDrift4 {
    0% {
      transform: translate(0, 0) scale(1.1);
    }
    50% {
      transform: translate(-80px, 60px) scale(0.9);
    }
    100% {
      transform: translate(30px, -40px) scale(1.05);
    }
  }

  /* ===============================================
	   HEADER & NAVIGATION
	   =============================================== */
  header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--glass-bg);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
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
    gap: var(--spacing-md);
  }

  /* ===============================================
	   AMBIENT LOGO TITLE & GOLD LEAF TEXT GRADIENT
	   =============================================== */
  .logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    text-decoration: none;
    transition: transform var(--transition-normal);
  }

  .logo:hover {
    transform: scale(1.02);
  }

  .logo-icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
  }

  .logo-icon {
    font-size: 1.75rem;
    z-index: 2;
    filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.8));
    transition: transform var(--transition-normal);
  }

  .logo:hover .logo-icon {
    transform: rotate(12deg) scale(1.1);
  }

  .ambient-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 38px;
    height: 38px;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      rgba(212, 175, 55, 0.6) 0%,
      rgba(159, 122, 234, 0.4) 50%,
      transparent 75%
    );
    border-radius: var(--radius-full);
    filter: blur(8px);
    animation: ambient-pulse 3s infinite ease-in-out;
  }

  @keyframes ambient-pulse {
    0%,
    100% {
      opacity: 0.6;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.3);
    }
  }

  .logo-brand {
    display: flex;
    flex-direction: column;
  }

  .logo-text {
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    background: linear-gradient(
      135deg,
      #ffe082 0%,
      #d4af37 25%,
      #fff3a0 50%,
      #aa771c 75%,
      #fef08a 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.4));
    transition: filter var(--transition-normal);
  }

  .logo:hover .logo-text {
    filter: drop-shadow(0 0 18px rgba(254, 240, 138, 0.75));
  }

  .logo-subtitle {
    font-family: var(--font-heading);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-secondary);
    opacity: 0.75;
    margin-top: -3px;
  }

  /* ===============================================
	   TOP STEP NAVIGATION TABS (DESKTOP)
	   =============================================== */
  .step-tabs {
    display: none;
    align-items: center;
    gap: 0.35rem;
    list-style: none;
    background: rgba(11, 10, 18, 0.6);
    padding: 6px 10px;
    border-radius: var(--radius-full);
    border: 1px solid rgba(212, 175, 55, 0.2);
    box-shadow:
      inset 0 0 12px rgba(0, 0, 0, 0.5),
      0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .step-arrow {
    color: var(--color-secondary);
    font-size: var(--text-base);
    opacity: 0.35;
    user-select: none;
    padding: 0 2px;
  }

  .step-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: var(--radius-full);
    text-decoration: none;
    transition: all var(--transition-normal);
  }

  .step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 0.725rem;
    font-weight: 700;
    background: rgba(34, 30, 54, 0.8);
    color: var(--color-text-muted);
    border: 1px solid rgba(212, 175, 55, 0.25);
    transition: all var(--transition-normal);
  }

  /* Desktop Hover Animations */
  .step-tab:hover {
    color: var(--color-secondary-light);
    background: rgba(212, 175, 55, 0.12);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .step-tab:hover .step-badge {
    background: rgba(212, 175, 55, 0.25);
    color: var(--color-secondary-light);
    border-color: var(--color-secondary);
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
  }

  /* Desktop Active Tab Styling */
  .step-tab.active {
    color: var(--color-text);
    font-weight: 600;
    background: linear-gradient(
      135deg,
      rgba(107, 70, 193, 0.35) 0%,
      rgba(212, 175, 55, 0.15) 100%
    );
    box-shadow: 0 0 16px rgba(107, 70, 193, 0.4);
  }

  .step-tab.active .step-badge {
    background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);
    color: #0b0a12;
    border-color: #ffe082;
    box-shadow: 0 0 10px rgba(212, 175, 55, 0.7);
  }

  /* Active Route Indicator Underline */
  .active-indicator {
    position: absolute;
    bottom: 2px;
    left: 12px;
    right: 12px;
    height: 2.5px;
    background: linear-gradient(90deg, transparent, #ffe082, #d4af37, #ffe082, transparent);
    border-radius: var(--radius-full);
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.9);
    opacity: 0;
    transform: scaleX(0);
    transition:
      transform var(--transition-normal),
      opacity var(--transition-normal);
  }

  .step-tab.active .active-indicator {
    opacity: 1;
    transform: scaleX(1);
  }

  .step-tab:hover:not(.active) .active-indicator {
    opacity: 0.5;
    transform: scaleX(0.5);
  }

  @media (min-width: 768px) {
    .desktop-nav {
      display: flex;
    }
  }

  /* ===============================================
	   MOBILE NAVIGATION & HAMBURGER DRAWER
	   =============================================== */
  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 40px;
    height: 40px;
    padding: var(--spacing-xs);
    background: rgba(212, 175, 55, 0.08);
    border: 1px solid rgba(212, 175, 55, 0.25);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .hamburger:hover {
    background: rgba(212, 175, 55, 0.18);
    border-color: var(--color-secondary);
    transform: scale(1.05);
  }

  .hamburger-line {
    width: 22px;
    height: 2px;
    background: var(--color-secondary-light);
    border-radius: 2px;
    transition: all var(--transition-normal);
  }

  .hamburger.open .hamburger-line:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
    background: var(--color-secondary);
  }

  .hamburger.open .hamburger-line:nth-child(2) {
    opacity: 0;
  }

  .hamburger.open .hamburger-line:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
    background: var(--color-secondary);
  }

  @media (min-width: 768px) {
    .hamburger {
      display: none;
    }
  }

  .mobile-nav-wrapper {
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

  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--glass-border);
    list-style: none;
  }

  .mobile-step-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    font-family: var(--font-heading);
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: var(--radius-md);
    text-decoration: none;
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .mobile-step-tab:hover {
    color: var(--color-secondary-light);
    background: rgba(212, 175, 55, 0.1);
    border-color: rgba(212, 175, 55, 0.2);
  }

  .mobile-step-tab.active {
    color: #fff;
    background: linear-gradient(
      90deg,
      rgba(107, 70, 193, 0.3) 0%,
      rgba(212, 175, 55, 0.15) 100%
    );
    border-color: rgba(212, 175, 55, 0.35);
  }

  .mobile-step-tab.active .step-badge {
    background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);
    color: #0b0a12;
    border-color: #ffe082;
  }

  .mobile-step-tab .active-indicator {
    left: 0;
    right: auto;
    top: 8px;
    bottom: 8px;
    width: 3px;
    height: auto;
    background: linear-gradient(180deg, #ffe082, #d4af37);
  }

  .mobile-step-tab.active .active-indicator {
    opacity: 1;
    transform: scaleY(1);
  }

  @media (min-width: 768px) {
    .mobile-nav-wrapper {
      display: none;
    }
  }

  /* ===============================================
	   FOOTER
	   =============================================== */
  footer {
    margin-top: auto;
    background: var(--glass-bg);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
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

