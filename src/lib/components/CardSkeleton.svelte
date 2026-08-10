<!--
/**
 * @fileoverview Card Skeleton Loader Component - Shimmer loader for tarot card generation
 * @purpose Renders a tarot-proportioned skeleton frame (1:1.6 aspect ratio) with ambient CSS shimmer pulse animation
 * @dataFlow Receives cardName and cardNumber props -> Displays loading status text and card skeleton frame
 * @boundary UI Component - Presents shimmer skeleton loading state during card AI generation
 * @updated 2026-08-07
 *
 * Features:
 * - Tarot card proportion (1:1.6 aspect ratio)
 * - Ambient CSS shimmer pulse animation representing AI generation
 * - Optional status text display (e.g. "Rendering The Fool...")
 * - Svelte 5 $props() pattern
 * - Accessible ARIA attributes for loading state
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import CardSkeleton from '$lib/components/CardSkeleton.svelte'
 * </script>
 *
 * <CardSkeleton cardNumber={0} cardName="The Fool" />
 * ```
 */
-->

<script lang="ts">
  /**
   * Props interface for CardSkeleton component
   */
  interface Props {
    /** Optional tarot card number */
    cardNumber?: number
    /** Optional tarot card name (e.g., "The Fool", "The Magician") */
    cardName?: string
    /** Optional explicit loading status text */
    statusText?: string
  }

  const { cardNumber, cardName, statusText }: Props = $props()

  /**
   * Derived loading status text based on provided props
   */
  const displayStatus = $derived.by(() => {
    if (statusText) {
      return statusText
    }
    if (cardName) {
      return `Rendering ${cardName}...`
    }
    if (cardNumber !== undefined) {
      return `Rendering Card #${cardNumber}...`
    }
    return 'Rendering Tarot Card...'
  })
</script>

<div
  class="card-skeleton"
  role="status"
  aria-busy="true"
  aria-label={displayStatus}
>
  <!-- Background shimmer overlay -->
  <div class="skeleton-shimmer"></div>

  <!-- Inner card frame -->
  <div class="card-inner-frame">
    {#if cardNumber !== undefined}
      <div class="card-number-badge">
        <span>#{cardNumber}</span>
      </div>
    {/if}

    <!-- Central AI Generation Icon -->
    <div class="skeleton-icon-container">
      <div class="icon-glow-ring"></div>
      <div class="skeleton-icon">
        <span class="sparkle-symbol" aria-hidden="true">✨</span>
      </div>
    </div>

    <!-- Status Text & Pulse Dots -->
    <div class="status-container">
      <p class="status-text">{displayStatus}</p>
      <div class="pulse-indicator" aria-hidden="true">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</div>

<style>
  .card-skeleton {
    position: relative;
    width: 100%;
    max-width: 320px;
    /* Aspect ratio matching tarot card proportions (1:1.6) */
    aspect-ratio: 1 / 1.6;
    border-radius: var(--radius-lg, 1rem);
    background: var(--color-bg-secondary, #1a1826);
    border: 1px solid var(--glass-border, rgba(139, 92, 246, 0.2));
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: var(--glass-shadow, 0 8px 32px 0 rgba(31, 38, 135, 0.37));
    transition: transform var(--transition-normal, 300ms ease);
  }

  /* Shimmer gradient moving across the card */
  .skeleton-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(139, 92, 246, 0.08) 25%,
      rgba(246, 173, 85, 0.18) 50%,
      rgba(139, 92, 246, 0.08) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmerSweep 2.5s infinite linear;
    pointer-events: none;
  }

  /* Inner ornate frame layout */
  .card-inner-frame {
    position: relative;
    z-index: 1;
    width: calc(100% - 1.5rem);
    height: calc(100% - 1.5rem);
    border: 1px dashed var(--glass-border, rgba(139, 92, 246, 0.3));
    border-radius: var(--radius-md, 0.5rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md, 1rem);
    background: rgba(15, 14, 23, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: ambientGlowPulse 3s infinite ease-in-out;
  }

  /* Card number badge at top */
  .card-number-badge {
    align-self: flex-end;
    font-family: var(--font-heading, 'Cinzel', serif);
    font-size: var(--text-xs, 0.75rem);
    font-weight: 600;
    color: var(--color-secondary, #f6ad55);
    background: var(--glass-bg, rgba(139, 92, 246, 0.1));
    border: 1px solid var(--glass-border, rgba(139, 92, 246, 0.2));
    border-radius: var(--radius-sm, 0.25rem);
    padding: 0.2rem 0.5rem;
    letter-spacing: 0.05em;
  }

  /* Central glowing AI generation icon wrapper */
  .skeleton-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: auto 0;
  }

  .icon-glow-ring {
    position: absolute;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(246, 173, 85, 0.25) 0%,
      rgba(107, 70, 193, 0.15) 60%,
      transparent 100%
    );
    animation: ringExpandPulse 2s infinite ease-in-out;
  }

  .skeleton-icon {
    position: relative;
    z-index: 2;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-bg-tertiary, #2d2b3e);
    border: 1px solid var(--color-primary-light, #805ad5);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(107, 70, 193, 0.4);
  }

  .sparkle-symbol {
    font-size: var(--text-2xl, 1.5rem);
    filter: drop-shadow(0 0 8px rgba(246, 173, 85, 0.8));
    animation: sparkleRotate 4s infinite linear;
  }

  /* Status text & animation dots container */
  .status-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
    text-align: center;
    width: 100%;
  }

  .status-text {
    font-family: var(--font-heading, 'Cinzel', serif);
    font-size: var(--text-sm, 0.875rem);
    font-weight: 600;
    color: var(--color-secondary-light, #fbd38d);
    letter-spacing: 0.05em;
    text-shadow: 0 0 8px rgba(246, 173, 85, 0.3);
    word-break: break-word;
  }

  .pulse-indicator {
    display: flex;
    gap: 5px;
    align-items: center;
    justify-content: center;
    margin-top: 0.25rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-primary-light, #805ad5);
    animation: dotScale 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  /* Keyframe animations */
  @keyframes shimmerSweep {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes ambientGlowPulse {
    0%,
    100% {
      border-color: rgba(139, 92, 246, 0.25);
      box-shadow: inset 0 0 12px rgba(107, 70, 193, 0.1);
    }
    50% {
      border-color: rgba(246, 173, 85, 0.4);
      box-shadow: inset 0 0 24px rgba(246, 173, 85, 0.15);
    }
  }

  @keyframes ringExpandPulse {
    0%,
    100% {
      transform: scale(0.85);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.15);
      opacity: 0.9;
    }
  }

  @keyframes sparkleRotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dotScale {
    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.4;
    }
    40% {
      transform: scale(1.1);
      opacity: 1;
      background-color: var(--color-secondary, #f6ad55);
    }
  }
</style>
