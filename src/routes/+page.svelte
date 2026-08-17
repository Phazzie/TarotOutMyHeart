<script lang="ts">
  /**
   * @fileoverview Home Page - Welcome and Interactive Altar Showcase
   * @purpose Landing page that introduces TarotOutMyHeart with an interactive 3D Major Arcana showcase card
   * @dataFlow User clicks "Begin Your Deck Creation" → navigate to /upload
   * @updated 2026-08-08
   */
  import TarotCardFrame from '$lib/components/TarotCardFrame.svelte'

  interface ArcanaShowcase {
    number: string
    title: string
    fullName: string
    arcana: string
    element: string
    keywords: string
    quote: string
    symbol: string
  }

  // Interactive 3D Showcase Card State
  let isFlipped = $state<boolean>(false)
  let cardIndex = $state<number>(0)

  const foolCard: ArcanaShowcase = {
    number: '0',
    title: 'The Fool',
    fullName: '0. The Fool',
    arcana: 'Major Arcana',
    element: 'Air 💨',
    keywords: 'Innocence • Beginnings • Pure Potential',
    quote: 'A leap into the cosmic unknown, trusting the universe to guide your spirit.',
    symbol: '🃏',
  }

  const worldCard: ArcanaShowcase = {
    number: 'XXI',
    title: 'The World',
    fullName: 'XXI. The World',
    arcana: 'Major Arcana',
    element: 'Earth 🌍',
    keywords: 'Completion • Integration • Cosmic Harmony',
    quote: 'The grand cycle reaches full realization, uniting all elements in divine wholeness.',
    symbol: '✨',
  }

  function toggleFlip() {
    isFlipped = !isFlipped
  }

  function switchCard(event: MouseEvent) {
    event.stopPropagation()
    cardIndex = cardIndex === 0 ? 1 : 0
  }

  const activeCard = $derived<ArcanaShowcase>(cardIndex === 0 ? foolCard : worldCard)
  const nextCardTitle = $derived<string>(cardIndex === 0 ? worldCard.title : foolCard.title)
</script>

<div class="page-container">
  <!-- Hero Section with Altar Showcase & Arcane Floating Badges -->
  <header class="hero glass-panel">
    <div class="hero-content">
      <!-- Floating Glowing Arcane Symbol Badges -->
      <div class="arcane-badges" aria-label="Arcane Symbol Badges">
        <span class="arcane-badge badge-1" title="Orb of Sight">🔮</span>
        <span class="arcane-badge badge-2" title="Arcana Card">🃏</span>
        <span class="arcane-badge badge-3" title="Ancient Scroll">📜</span>
        <span class="arcane-badge badge-4" title="Celestial Spark">✨</span>
        <span class="arcane-badge badge-5" title="Lunar Energy">🌙</span>
      </div>

      <h1 class="title font-tarot text-gold-gradient">TarotOutMyHeart</h1>
      <p class="subtitle font-tarot">AI-Powered Major Arcana Deck Generator</p>
      <p class="description">
        Forge your bespoke 22-card Major Arcana tarot deck. Harness AI generation, upload reference
        aesthetics, and bring your mystical vision to physical reality.
      </p>

      <div class="cta">
        <a href="/upload" class="gold-cta-button"> ✨ Begin Your Deck Creation → </a>
      </div>
    </div>

    <!-- Altar Showcase with Interactive 3D Tarot Card -->
    <div class="altar-showcase glass-panel">
      <div class="altar-header">
        <span class="altar-tag font-tarot">Altar Showcase</span>
        <button type="button" class="switch-card-btn" onclick={switchCard}>
          Switch to {nextCardTitle} ↻
        </button>
      </div>

      <div class="card-display-container">
        <TarotCardFrame
          {isFlipped}
          cardName={activeCard.fullName}
          onClick={toggleFlip}
          class="hero-card-frame"
        >
          {#snippet front()}
            <div class="card-face-content front-face">
              <div class="card-corner top-left font-tarot">{activeCard.number}</div>
              <div class="card-corner top-right">{activeCard.symbol}</div>

              <div class="card-illustration">
                <div class="mystic-orb">
                  <span class="center-symbol">{activeCard.symbol}</span>
                  <span class="orb-glow"></span>
                </div>
                <div class="illustration-details">
                  <span class="arcane-tag">{activeCard.arcana}</span>
                  <span class="element-tag">{activeCard.element}</span>
                </div>
              </div>

              <div class="card-footer-info">
                <h3 class="card-face-title font-tarot">{activeCard.fullName}</h3>
                <p class="card-keywords">{activeCard.keywords}</p>
              </div>
            </div>
          {/snippet}

          {#snippet back()}
            <div class="card-face-content back-face">
              <div class="back-pattern-inner">
                <div class="mystic-emblem">✦</div>
                <p class="back-title font-tarot">TarotOutMyHeart</p>
                <p class="back-quote">"{activeCard.quote}"</p>
                <span class="back-flip-hint font-tarot">Click to flip face</span>
              </div>
            </div>
          {/snippet}
        </TarotCardFrame>
      </div>

      <div class="altar-footer">
        <p class="altar-hint">
          <span class="sparkle">✨</span> Hover to tilt in 3D • Click to flip card
        </p>
      </div>
    </div>
  </header>

  <!-- How It Works Section with Glass Panel Cards -->
  <section class="how-it-works">
    <h2 class="font-tarot text-gold-gradient">How It Works</h2>
    <div class="steps">
      <div class="step glass-panel">
        <div class="step-number font-tarot">1</div>
        <h3 class="font-tarot">Upload & Style</h3>
        <p>
          Upload 1-5 reference images and define your deck's visual style (theme, tone, concept, and
          description).
        </p>
      </div>
      <div class="step glass-panel">
        <div class="step-number font-tarot">2</div>
        <h3 class="font-tarot">Generate</h3>
        <p>
          AI generates unique prompts for all 22 Major Arcana cards, then creates high-quality
          images based on your style.
        </p>
      </div>
      <div class="step glass-panel">
        <div class="step-number font-tarot">3</div>
        <h3 class="font-tarot">Download</h3>
        <p>
          View your complete deck in a gallery and download individual cards or the entire deck as a
          ZIP file.
        </p>
      </div>
    </div>
  </section>

  <!-- Features Section with Glass Panel Cards -->
  <section class="features">
    <h2 class="font-tarot text-gold-gradient">Features</h2>
    <div class="feature-grid">
      <div class="feature glass-panel">
        <span class="feature-icon">🎨</span>
        <h3 class="font-tarot">Custom Styling</h3>
        <p>Define your unique visual style with detailed inputs and reference imagery</p>
      </div>
      <div class="feature glass-panel">
        <span class="feature-icon">🤖</span>
        <h3 class="font-tarot">AI-Powered</h3>
        <p>Powered by advanced AI image generation for high-fidelity Arcana art</p>
      </div>
      <div class="feature glass-panel">
        <span class="feature-icon">🃏</span>
        <h3 class="font-tarot">22 Cards</h3>
        <p>Complete Major Arcana deck covering 0. The Fool to XXI. The World</p>
      </div>
      <div class="feature glass-panel">
        <span class="feature-icon">💰</span>
        <h3 class="font-tarot">Cost Transparency</h3>
        <p>See estimated generation costs before embarking on deck creation</p>
      </div>
      <div class="feature glass-panel">
        <span class="feature-icon">📥</span>
        <h3 class="font-tarot">Easy Download</h3>
        <p>Download individual cards or entire deck bundle ready for print</p>
      </div>
      <div class="feature glass-panel">
        <span class="feature-icon">✨</span>
        <h3 class="font-tarot">High Quality</h3>
        <p>Professional-grade 1:1.6 aspect ratio artwork with gold foil frames</p>
      </div>
    </div>
  </section>

  <!-- Development Status / Info Section -->
  <section class="info glass-panel">
    <h2 class="font-tarot text-gold-gradient">Development Status</h2>
    <p class="status-text">
      This application is built using Seam-Driven Development (SDD) methodology. Interactive Major
      Arcana showcase and component integration active.
    </p>
    <div class="links">
      <a href="https://github.com/Phazzie/TarotUpMyHeart" target="_blank" rel="noopener noreferrer">
        GitHub Repository
      </a>
      <span class="separator">•</span>
      <a href="/upload" class="gold-link"> Get Started → </a>
    </div>
  </section>
</div>

<style>
  .page-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1rem 1rem 3rem;
  }

  /* Hero Section Split Layout */
  .hero {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2.5rem;
    padding: 3rem 2rem;
    margin-bottom: 4rem;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  @media (min-width: 900px) {
    .hero {
      grid-template-columns: 1.1fr 0.9fr;
      padding: 4rem 3rem;
    }
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  /* Floating Glowing Arcane Badges */
  .arcane-badges {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .arcane-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 1.4rem;
    background: rgba(20, 18, 33, 0.85);
    border: 1px solid rgba(212, 175, 55, 0.35);
    border-radius: 50%;
    box-shadow:
      0 0 12px rgba(212, 175, 55, 0.25),
      inset 0 0 8px rgba(212, 175, 55, 0.15);
    animation: floatBadge 4s ease-in-out infinite alternate;
    transition:
      transform 0.3s ease,
      border-color 0.3s ease,
      box-shadow 0.3s ease;
    cursor: default;
  }

  .arcane-badge:hover {
    transform: scale(1.2) translateY(-4px) !important;
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
  }

  .badge-1 {
    animation-delay: 0s;
  }
  .badge-2 {
    animation-delay: 0.8s;
  }
  .badge-3 {
    animation-delay: 1.6s;
  }
  .badge-4 {
    animation-delay: 2.4s;
  }
  .badge-5 {
    animation-delay: 3.2s;
  }

  @keyframes floatBadge {
    0% {
      transform: translateY(0px) rotate(0deg);
    }
    100% {
      transform: translateY(-8px) rotate(6deg);
    }
  }

  .title {
    font-size: 3.25rem;
    line-height: 1.1;
    margin-bottom: 0.75rem;
    letter-spacing: 0.02em;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-secondary-light, #fef08a);
    margin-bottom: 1.25rem;
    letter-spacing: 0.05em;
    opacity: 0.9;
  }

  .description {
    font-size: 1.125rem;
    color: var(--color-text-secondary, #a7a9be);
    line-height: 1.7;
    margin-bottom: 2rem;
    max-width: 580px;
  }

  .cta {
    margin-top: 0.5rem;
  }

  /* Metallic Gold CTA Button */
  .gold-cta-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.15rem 2.25rem;
    font-family: var(--font-heading, serif);
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #0b0a12;
    background: linear-gradient(135deg, #ffe082 0%, #d4af37 40%, #aa771c 100%);
    border: 1px solid #fff8dc;
    border-radius: 9999px;
    text-decoration: none;
    box-shadow:
      0 4px 20px rgba(212, 175, 55, 0.4),
      0 0 10px rgba(255, 224, 130, 0.3),
      inset 0 1px 1px rgba(255, 255, 255, 0.8);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }

  .gold-cta-button:hover {
    color: #000;
    transform: translateY(-3px) scale(1.03);
    box-shadow:
      0 8px 30px rgba(212, 175, 55, 0.7),
      0 0 20px rgba(255, 224, 130, 0.6),
      inset 0 1px 2px rgba(255, 255, 255, 1);
  }

  /* Altar Showcase Container */
  .altar-showcase {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    background: rgba(14, 12, 24, 0.85);
    border: 1px solid rgba(212, 175, 55, 0.3);
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.6),
      inset 0 0 20px rgba(212, 175, 55, 0.08);
  }

  .altar-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  }

  .altar-tag {
    font-size: 0.95rem;
    color: #ffd700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .switch-card-btn {
    font-family: var(--font-heading, serif);
    font-size: 0.85rem;
    color: var(--color-text-secondary, #a7a9be);
    background: rgba(212, 175, 55, 0.1);
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 9999px;
    padding: 0.4rem 0.9rem;
    transition: all 0.2s ease;
  }

  .switch-card-btn:hover {
    color: #ffd700;
    background: rgba(212, 175, 55, 0.2);
    border-color: #ffd700;
  }

  .card-display-container {
    width: 100%;
    max-width: 270px;
    margin: 0 auto;
  }

  /* Hero Card Inner Styles */
  .card-face-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.85rem;
    box-sizing: border-box;
    position: relative;
  }

  .front-face {
    background: radial-gradient(circle at center, #231a33 0%, #100b19 100%);
    color: #fff;
  }

  .card-corner {
    position: absolute;
    font-size: 0.9rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
  }

  .top-left {
    top: 10px;
    left: 12px;
  }
  .top-right {
    top: 10px;
    right: 12px;
  }

  .card-illustration {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 1.25rem;
  }

  .mystic-orb {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #764ba2 0%, #2b1055 100%);
    border: 2px solid #ffd700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 20px rgba(118, 75, 162, 0.7);
  }

  .center-symbol {
    font-size: 2.2rem;
    z-index: 2;
  }

  .orb-glow {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
    animation: pulseOrb 2.5s ease-in-out infinite alternate;
  }

  @keyframes pulseOrb {
    0% {
      transform: scale(0.95);
      opacity: 0.5;
    }
    100% {
      transform: scale(1.15);
      opacity: 1;
    }
  }

  .illustration-details {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.85rem;
  }

  .arcane-tag,
  .element-tag {
    font-size: 0.725rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(212, 175, 55, 0.15);
    border: 1px solid rgba(212, 175, 55, 0.3);
    color: #ffe082;
  }

  .card-footer-info {
    text-align: center;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(212, 175, 55, 0.25);
  }

  .card-face-title {
    font-size: 1.15rem;
    color: #ffd700;
    margin-bottom: 0.25rem;
  }

  .card-keywords {
    font-size: 0.75rem;
    color: #a7a9be;
    line-height: 1.3;
  }

  /* Back Face Inner Styles */
  .back-face {
    background: radial-gradient(circle at center, #2e1a47 0%, #0d0614 100%);
    padding: 1rem;
  }

  .back-pattern-inner {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(212, 175, 55, 0.4);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1rem 0.75rem;
    box-sizing: border-box;
    background: repeating-linear-gradient(
      45deg,
      rgba(212, 175, 55, 0.03) 0px,
      rgba(212, 175, 55, 0.03) 2px,
      transparent 2px,
      transparent 12px
    );
  }

  .mystic-emblem {
    font-size: 2rem;
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    margin-bottom: 0.5rem;
  }

  .back-title {
    font-size: 1rem;
    color: #ffd700;
    margin-bottom: 0.75rem;
  }

  .back-quote {
    font-size: 0.85rem;
    font-style: italic;
    color: #e2e8f0;
    line-height: 1.4;
    margin-bottom: 1rem;
  }

  .back-flip-hint {
    font-size: 0.725rem;
    color: #a7a9be;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .altar-footer {
    margin-top: 1rem;
  }

  .altar-hint {
    font-size: 0.85rem;
    color: var(--color-text-secondary, #a7a9be);
  }

  .sparkle {
    color: #ffd700;
  }

  /* How It Works & Features Sections */
  .how-it-works,
  .features,
  .info {
    margin-bottom: 4rem;
  }

  h2 {
    font-size: 2.25rem;
    margin-bottom: 2rem;
    text-align: center;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }

  .step {
    padding: 2rem;
    text-align: center;
    transition:
      transform 0.3s ease,
      border-color 0.3s ease;
  }

  .step:hover {
    transform: translateY(-4px);
    border-color: rgba(212, 175, 55, 0.4);
  }

  .step-number {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);
    color: #0b0a12;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 auto 1.25rem;
    box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
  }

  .step h3 {
    font-size: 1.35rem;
    margin-bottom: 0.85rem;
    color: #fff;
  }

  .step p {
    color: var(--color-text-secondary, #a7a9be);
    line-height: 1.6;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .feature {
    padding: 2rem;
    text-align: center;
    transition:
      transform 0.3s ease,
      border-color 0.3s ease;
  }

  .feature:hover {
    transform: translateY(-4px);
    border-color: rgba(212, 175, 55, 0.4);
  }

  .feature-icon {
    font-size: 2.75rem;
    display: block;
    margin-bottom: 1rem;
  }

  .feature h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: #fff;
  }

  .feature p {
    color: var(--color-text-secondary, #a7a9be);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .info {
    text-align: center;
    padding: 3rem 2rem;
  }

  .status-text {
    color: var(--color-text-secondary, #a7a9be);
    font-size: 1.125rem;
    margin-bottom: 1.5rem;
    max-width: 650px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .links a {
    color: var(--color-secondary, #d4af37);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  .links a:hover {
    color: var(--color-secondary-light, #fef08a);
    text-decoration: underline;
  }

  .gold-link {
    color: #ffd700 !important;
  }

  .separator {
    color: rgba(212, 175, 55, 0.4);
  }

  @media (max-width: 768px) {
    .hero {
      padding: 2rem 1.25rem;
    }

    .title {
      font-size: 2.5rem;
    }

    .subtitle {
      font-size: 1.1rem;
    }

    .description {
      font-size: 1rem;
    }

    .gold-cta-button {
      padding: 1rem 1.75rem;
      font-size: 1.05rem;
      width: 100%;
    }

    .steps,
    .feature-grid {
      grid-template-columns: 1fr;
    }

    h2 {
      font-size: 1.75rem;
    }
  }
</style>
