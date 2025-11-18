<script lang="ts">
  /**
   * @fileoverview Home Page - Welcome and navigation to deck generation
   * @purpose Landing page that introduces the app and starts the workflow
   * @dataFlow User clicks "Start Creating" → navigate to /upload
   * @updated 2025-11-15
   *
   * This page provides:
   * - App introduction and description
   * - Overview of the generation process
   * - Navigation to start deck creation
   * - Link to documentation
   */
  // appStore will be used when components are added in Wave 2
  // import { appStore } from '$lib/stores/appStore.svelte'
</script>

<div class="page-container">
  <header class="hero">
    <h1 class="title">TarotOutMyHeart</h1>
    <p class="subtitle">AI-Powered Major Arcana Deck Generator</p>
    <p class="description">
      Create your own unique 22-card Major Arcana tarot deck using AI image generation. Upload
      reference images, define your style, and let AI bring your vision to life.
    </p>
    <div class="cta">
      <a href="/upload" class="primary-button"> Start Creating Your Deck </a>
    </div>
  </header>

  <section class="how-it-works">
    <h2>How It Works</h2>
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <h3>Upload & Style</h3>
        <p>
          Upload 1-5 reference images and define your deck's visual style (theme, tone, concept, and
          description).
        </p>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <h3>Generate</h3>
        <p>
          AI generates unique prompts for all 22 Major Arcana cards, then creates high-quality
          images based on your style.
        </p>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <h3>Download</h3>
        <p>
          View your complete deck in a gallery and download individual cards or the entire deck as a
          ZIP file.
        </p>
      </div>
    </div>
  </section>

  <section class="features">
    <h2>Features</h2>
    <div class="feature-grid">
      <div class="feature">
        <span class="feature-icon">🎨</span>
        <h3>Custom Styling</h3>
        <p>Define your unique visual style with detailed inputs</p>
      </div>
      <div class="feature">
        <span class="feature-icon">🤖</span>
        <h3>AI-Powered</h3>
        <p>Powered by advanced AI image generation technology</p>
      </div>
      <div class="feature">
        <span class="feature-icon">🃏</span>
        <h3>22 Cards</h3>
        <p>Complete Major Arcana deck with all traditional cards</p>
      </div>
      <div class="feature">
        <span class="feature-icon">💰</span>
        <h3>Cost Transparency</h3>
        <p>See estimated costs before generation begins</p>
      </div>
      <div class="feature">
        <span class="feature-icon">📥</span>
        <h3>Easy Download</h3>
        <p>Download individual cards or entire deck as ZIP</p>
      </div>
      <div class="feature">
        <span class="feature-icon">✨</span>
        <h3>High Quality</h3>
        <p>Professional-grade images ready for printing</p>
      </div>
    </div>
  </section>

  <section class="info">
    <h2>Development Status</h2>
    <p class="status-text">
      This application is built using Seam-Driven Development (SDD) methodology. Sprint 2 is in
      progress: UI components are being developed.
    </p>
    <div class="links">
      <a href="https://github.com/Phazzie/TarotUpMyHeart" target="_blank" rel="noopener noreferrer">
        GitHub Repository
      </a>
      <span class="separator">•</span>
      <a href="/upload"> Get Started </a>
    </div>
  </section>
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .hero {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    margin-bottom: 4rem;
  }

  .title {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    opacity: 0.9;
  }

  .description {
    font-size: 1.125rem;
    max-width: 700px;
    margin: 0 auto 2rem;
    line-height: 1.6;
    opacity: 0.95;
  }

  .cta {
    margin-top: 2rem;
  }

  .primary-button {
    display: inline-block;
    padding: 1.25rem 2.5rem;
    font-size: 1.25rem;
    background: white;
    color: #667eea;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .how-it-works,
  .features,
  .info {
    margin-bottom: 4rem;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: #1a1a1a;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }

  .step {
    background: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .step-number {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 auto 1rem;
  }

  .step h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #2d3748;
  }

  .step p {
    color: #666;
    line-height: 1.6;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .feature {
    background: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    text-align: center;
    transition: transform 0.2s;
  }

  .feature:hover {
    transform: translateY(-4px);
  }

  .feature-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .feature h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: #2d3748;
  }

  .feature p {
    color: #666;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .info {
    text-align: center;
    background: #f7fafc;
    padding: 3rem 2rem;
    border-radius: 8px;
  }

  .status-text {
    color: #4a5568;
    font-size: 1.125rem;
    margin-bottom: 1.5rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .links a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  .links a:hover {
    color: #764ba2;
    text-decoration: underline;
  }

  .separator {
    color: #cbd5e0;
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .hero {
      padding: 3rem 1.5rem;
    }

    .title {
      font-size: 2.5rem;
    }

    .subtitle {
      font-size: 1.25rem;
    }

    .description {
      font-size: 1rem;
    }

    .primary-button {
      padding: 1rem 2rem;
      font-size: 1.125rem;
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
