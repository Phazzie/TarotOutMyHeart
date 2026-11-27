<!--
/**
 * @fileoverview Root layout - the Bureau of Fate building: sign, service windows, footer
 * @purpose The app's world is a government office that issues tarot decks. Every page is
 *   a form or a service window inside it; this layout is the building around them.
 * @dataFlow Wraps all pages via children(); reads route from page.url.pathname and the
 *   card count / generation progress from appStore for the Now Serving board
 * @updated 2026-11-27
 */
-->

<script lang="ts">
  import '../app.css'
  import type { Snippet } from 'svelte'
  import { page } from '$app/state'
  import { afterNavigate } from '$app/navigation'
  import ErrorBanner from '$lib/components/ErrorBanner.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'

  const { children }: { children: Snippet } = $props()

  // Open only for the path where the user toggled the menu. A route change closes it.
  let menuPath = $state<string | null>(null)
  const mobileMenuOpen = $derived(menuPath === page.url.pathname)

  // Navigation items with step numbers
  // The app is the Bureau of Fate: each step is a service window.
  const navItems = [
    { href: '/', label: 'Lobby', step: '' },
    { href: '/upload', label: 'Intake', step: '1' },
    { href: '/generate', label: 'Processing', step: '2' },
    { href: '/gallery', label: 'Issuance', step: '3' },
  ]

  // The "Now Serving" board shows the card being processed, or the deck's progress.
  const nowServing = $derived.by(() => {
    const progress = appStore.generationProgress
    if (appStore.isGenerating && progress) return String(progress.current).padStart(2, '0')
    const done = appStore.completedCardCount
    return done > 0 ? String(done).padStart(2, '0') : '--'
  })

  // Check if current route matches nav item
  function isActive(href: string, pathname: string): boolean {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // An error belongs to the page it happened on; drop it when the user moves on.
  afterNavigate(({ from, to }) => {
    if (from && to && from.url.pathname !== to.url.pathname) appStore.clearError()
  })

  // Close mobile menu when route changes
  function toggleMobileMenu() {
    menuPath = mobileMenuOpen ? null : page.url.pathname
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Oswald:wght@400;500;600;700&family=Special+Elite&family=VT323&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app">
  <header class="building">
    <div class="sign-row">
      <a href="/" class="sign" aria-label="Bureau of Fate, lobby">
        <svg class="seal" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="2" />
          <circle
            cx="32"
            cy="32"
            r="25"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            stroke-dasharray="2 3"
          />
          <path d="M32 13 L50 45 H14 Z" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M22 36 Q32 28 42 36 Q32 44 22 36 Z" fill="currentColor" opacity="0.25" />
          <circle cx="32" cy="36" r="3.5" fill="currentColor" />
        </svg>
        <span class="sign-text">
          <span class="sign-title">Bureau of Fate</span>
          <span class="sign-sub">Office of Major Arcana Issuance</span>
        </span>
      </a>

      <div class="now-serving" aria-label="Now serving card {nowServing}">
        <span class="ns-label">Now serving</span>
        <span class="ns-digits" aria-hidden="true">{nowServing}</span>
      </div>

      <button
        class={['hamburger', { open: mobileMenuOpen }]}
        onclick={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <span></span><span></span><span></span>
      </button>
    </div>

    <nav aria-label="Service windows">
      <ul class="windows desktop-nav">
        {#each navItems as item (item.href)}
          <li>
            <a
              href={item.href}
              class={['window', { active: isActive(item.href, page.url.pathname) }]}
              aria-current={isActive(item.href, page.url.pathname) ? 'page' : undefined}
            >
              {#if item.step}<span class="window-no">Window {item.step}</span>{/if}
              <span class="window-label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>

      {#if mobileMenuOpen}
        <ul class="windows mobile-nav">
          {#each navItems as item (item.href)}
            <li>
              <a
                href={item.href}
                class={['window', { active: isActive(item.href, page.url.pathname) }]}
              >
                {#if item.step}<span class="window-no">Window {item.step}</span>{/if}
                <span class="window-label">{item.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </nav>
    <!-- Inside the sticky header so an error stays on screen wherever the page is scrolled. -->
    <ErrorBanner />
  </header>

  <main>
    {@render children()}
  </main>

  <footer class="baseboard">
    <p class="form-no">Form BF-0 (Rev. 11/2026) · Bureau of Fate, a Skeptical Wombat facility</p>
    <p class="disclaimer">
      This office is not responsible for prophecies that come true. Decks are illustrated by Grok.
      Reference photos you submit are kept only as long as it takes to read them.
    </p>
    <a
      class="footer-link"
      href="https://github.com/Phazzie/TarotOutMyHeart"
      target="_blank"
      rel="noopener noreferrer">Public records (GitHub)</a
    >
  </footer>
</div>

<style>
  /* Bureau palette: institutional green walls, manila, form paper, carbon copies, ink. */
  :global(:root) {
    --wall: #24382d;
    --wall-dark: #172219;
    --wall-line: rgba(255, 255, 255, 0.05);
    --manila: #e6cf98;
    --manila-dark: #c9ad6c;
    --paper: #f5f0e1;
    --paper-rule: #b7c6d8;
    --carbon-pink: #f6d0d4;
    --carbon-yellow: #f7e68f;
    --ink: #22201c;
    --ink-soft: #57524a;
    --stamp-red: #b8312f;
    --stamp-blue: #1f4f9a;
    --led: #ff4b2b;

    /* Names the existing components already use, mapped onto the bureau. */
    --color-primary: #1f4f9a;
    --color-primary-light: #3d6fbf;
    --color-primary-dark: #163a72;
    --color-secondary: #b8312f;
    --color-secondary-light: #f7e68f;
    --color-accent: #1f4f9a;
    --color-gold-leaf: #b8862b;
    --color-bg: #f5f0e1;
    --color-bg-secondary: #efe8d4;
    --color-bg-tertiary: #e7dec5;
    --color-bg-light: #faf7ee;
    --color-text: #22201c;
    --color-text-primary: #22201c;
    --color-text-secondary: #4a463f;
    --color-text-muted: #6b665c;
    --glass-bg: #faf7ee;
    --glass-border: #c8bea4;
    --glass-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);

    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-xxl: 3rem;
    --radius-sm: 2px;
    --radius-md: 3px;
    --radius-lg: 4px;
    --radius-full: 9999px;
    --transition-fast: 120ms ease-out;
    --transition-normal: 220ms ease-out;
    --transition-slow: 400ms ease-out;

    --font-tarot: 'Cinzel Decorative', 'Cinzel', serif;
    --font-heading: 'Oswald', 'Arial Narrow', sans-serif;
    --font-body: 'Courier Prime', 'Courier New', monospace;
    --font-typed: 'Special Elite', 'Courier New', monospace;
    --font-led: 'VT323', monospace;
    --font-system: 'Courier Prime', 'Courier New', monospace;

    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;
    --text-4xl: 2.25rem;
  }

  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;
    /* Painted cinder-block wall. */
    background-color: var(--wall);
    background-image:
      linear-gradient(var(--wall-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--wall-line) 1px, transparent 1px),
      linear-gradient(180deg, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.25));
    background-size:
      100% 48px,
      96px 48px,
      100% 100%;
    -webkit-font-smoothing: antialiased;
  }

  :global(h1),
  :global(h2),
  :global(h3),
  :global(h4) {
    font-family: var(--font-heading);
    letter-spacing: 0.02em;
    margin: 0;
  }

  :global(p) {
    margin: 0;
  }

  :global(button) {
    font-family: var(--font-heading);
  }

  :global(:focus-visible) {
    outline: 3px solid var(--carbon-yellow);
    outline-offset: 2px;
  }

  /* A sheet of form paper. Pages and components use this for their panels. */
  :global(.sheet) {
    position: relative;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid #d8cfb6;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.12),
      0 18px 30px -18px rgba(0, 0, 0, 0.6);
  }

  /* The big rubber-stamp button every window uses for its main action. */
  /* Pages that are service windows get a brass window plate and a sign. */
  :global(.window-head) {
    color: #ece5cb;
  }

  :global(.window-plate) {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    background: linear-gradient(180deg, #d9b766, #a98431);
    color: #2a2210;
    font-family: var(--font-heading);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.85rem;
    border-radius: 3px;
    box-shadow: 0 2px 0 #6e561e;
  }

  :global(.window-head h1) {
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    text-transform: uppercase;
    line-height: 1;
    margin: 0.4rem 0 0.4rem;
  }

  :global(.window-head .subtitle) {
    max-width: 60ch;
    color: #c9c3a8;
  }

  :global(.stamp-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.5rem;
    border: 3px solid var(--stamp-red);
    border-radius: 6px;
    background: transparent;
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transform: rotate(-1.2deg);
    transition:
      transform var(--transition-fast),
      background var(--transition-fast),
      color var(--transition-fast);
  }

  :global(.stamp-btn:hover:not(:disabled)) {
    background: var(--stamp-red);
    color: var(--paper);
  }

  :global(.stamp-btn:active:not(:disabled)) {
    transform: rotate(-1.2deg) scale(0.96);
  }

  :global(.stamp-btn:disabled) {
    border-color: #a8a093;
    color: #a8a093;
    cursor: not-allowed;
    transform: none;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ---------- Building sign + windows ---------- */
  .building {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--wall-dark);
    border-bottom: 4px solid #0e150f;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  }

  .sign-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.75rem 1rem;
  }

  .sign {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #e9e2c9;
    text-decoration: none;
    min-width: 0;
  }

  .seal {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    color: var(--manila);
  }

  .sign-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sign-title {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1.1;
  }

  .sign-sub {
    font-family: var(--font-body);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--manila);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .now-serving {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.6rem 0.3rem 0.8rem;
    background: #0a0a0a;
    border: 2px solid #3a3a3a;
    border-radius: 4px;
  }

  .ns-label {
    font-family: var(--font-heading);
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a9a9a;
    max-width: 4.5em;
    line-height: 1.1;
  }

  .ns-digits {
    font-family: var(--font-led);
    font-size: 2.4rem;
    line-height: 1;
    color: var(--led);
    text-shadow: 0 0 8px rgba(255, 75, 43, 0.7);
    min-width: 2ch;
    text-align: right;
  }

  nav {
    background: #101a12;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .windows {
    list-style: none;
    margin: 0 auto;
    padding: 0 1rem;
    max-width: 1200px;
    display: flex;
    gap: 0.5rem;
  }

  .window {
    display: flex;
    flex-direction: column;
    padding: 0.45rem 0.9rem 0.4rem;
    border: 1px solid transparent;
    border-bottom: none;
    color: #b9b39c;
    text-decoration: none;
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.15;
  }

  .window-no {
    font-size: 0.65rem;
    color: #7f8a7c;
  }

  .window-label {
    font-size: 0.95rem;
  }

  .window:hover {
    color: #fff6d8;
  }

  .window.active {
    background: var(--manila);
    color: var(--ink);
    border-color: var(--manila-dark);
  }

  .window.active .window-no {
    color: var(--ink-soft);
  }

  .hamburger {
    display: none;
    width: 44px;
    height: 44px;
    padding: 10px;
    background: transparent;
    border: 1px solid #4b5a4d;
    border-radius: 4px;
    cursor: pointer;
    flex-direction: column;
    justify-content: space-between;
  }

  .hamburger span {
    display: block;
    height: 3px;
    background: #e9e2c9;
  }

  .mobile-nav {
    flex-direction: column;
    padding: 0.5rem 1rem 1rem;
  }

  /* ---------- Content + footer ---------- */
  main {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem 3rem;
  }

  .baseboard {
    padding: 1.25rem 1rem 1.5rem;
    background: #101a12;
    border-top: 6px solid #0b110c;
    color: #a7a58f;
    font-size: 0.8rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-items: center;
  }

  .form-no {
    font-family: var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .disclaimer {
    max-width: 60ch;
  }

  .footer-link {
    color: var(--manila);
  }

  @media (max-width: 720px) {
    .sign-title {
      font-size: 1.15rem;
      letter-spacing: 0.08em;
    }

    .sign-sub {
      font-size: 0.6rem;
      white-space: normal;
    }

    .desktop-nav {
      display: none;
    }

    .hamburger {
      display: flex;
    }

    .now-serving {
      padding: 0.2rem 0.45rem;
    }

    .ns-label {
      display: none;
    }

    .ns-digits {
      font-size: 1.9rem;
    }

    .sign-title {
      font-size: 1.15rem;
      letter-spacing: 0.1em;
    }

    .sign-sub {
      font-size: 0.62rem;
    }

    .seal {
      width: 36px;
      height: 36px;
    }

    main {
      padding: 1.25rem 0.75rem 2rem;
    }
  }
</style>
