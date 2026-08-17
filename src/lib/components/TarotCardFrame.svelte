<!--
/**
 * @fileoverview Tarot Card Frame Component - Interactive 3D Tarot Card Container
 * @purpose Renders a 3D tilting, flip-animating tarot card frame with gold foil border styling and standard 1:1.6 aspect ratio
 * @component TarotCardFrame
 * @updated 2026-08-07
 *
 * Features:
 * - Svelte 5 `$state` runes for 3D mouse tilt tracking (`rotateX`, `rotateY`) on mouse move
 * - Gold foil border styling with metallic gradient effect and subtle inner shine
 * - Aspect ratio 1:1.6 (standard tarot card proportion 10:16)
 * - Smooth 3D card flip animation when `isFlipped` prop is true
 * - Full support for customizable front/back content via Svelte 5 snippets or image props
 * - Accessible keyboard navigation & ARIA attributes
 *
 * @example
 * ```svelte
 * <TarotCardFrame
 *   isFlipped={isFlipped}
 *   cardName="The Fool"
 *   imageUrl="/images/cards/00-fool.png"
 *   onClick={() => isFlipped = !isFlipped}
 * />
 * ```
 */
-->

<script lang="ts">
  import type { Snippet } from 'svelte'

  /**
   * Props interface for TarotCardFrame component
   */
  export interface Props {
    /**
     * Whether the card is flipped to show the back
     * @default false
     */
    isFlipped?: boolean

    /**
     * Card name / title for ARIA label and display
     * @default 'Tarot Card'
     */
    cardName?: string

    /**
     * URL for the front card image
     */
    imageUrl?: string

    /**
     * URL for the back card pattern/image
     */
    backImageUrl?: string

    /**
     * Maximum tilt angle in degrees for 3D mouse tracking
     * @default 15
     */
    maxTilt?: number

    /**
     * Whether mouse tilt effect is enabled
     * @default true
     */
    interactive?: boolean

    /**
     * Additional CSS class name(s) to append to root container
     */
    class?: string

    /**
     * Custom click event handler
     */
    onClick?: (event: MouseEvent) => void

    /**
     * Optional Svelte snippet for front face content
     */
    front?: Snippet

    /**
     * Optional Svelte snippet for back face content
     */
    back?: Snippet

    /**
     * Default Svelte snippet for slot content (placed on front face if `front` snippet not passed)
     */
    children?: Snippet
  }

  const {
    isFlipped = false,
    cardName = 'Tarot Card',
    imageUrl,
    backImageUrl,
    maxTilt = 15,
    interactive = true,
    class: className = '',
    onClick,
    front,
    back,
    children,
  }: Props = $props()

  // ============================================================================
  // COMPONENT STATE (Svelte 5 $state runes)
  // ============================================================================

  /** 3D tilt rotation around X-axis (pitch) in degrees */
  let rotateX = $state<number>(0)

  /** 3D tilt rotation around Y-axis (yaw) in degrees */
  let rotateY = $state<number>(0)

  /** Hover state tracking for light shimmer effect */
  let isHovered = $state<boolean>(false)

  /** Glare position X percentage for interactive metallic reflection */
  let glareX = $state<number>(50)

  /** Glare position Y percentage for interactive metallic reflection */
  let glareY = $state<number>(50)

  /** Container DOM element reference */
  let cardRef = $state<HTMLDivElement | null>(null)

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  /**
   * Calculates 3D tilt rotation and glare position based on pointer location
   */
  function handleMouseMove(event: MouseEvent) {
    if (!interactive || !cardRef) return

    const rect = cardRef.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const relativeX = event.clientX - rect.left
    const relativeY = event.clientY - rect.top

    // Center offset normalized from -1 to 1
    const xPct = (relativeX / rect.width - 0.5) * 2
    const yPct = (relativeY / rect.height - 0.5) * 2

    // Rotate X is driven by vertical mouse position (pitch)
    // Rotate Y is driven by horizontal mouse position (yaw)
    rotateX = -yPct * maxTilt
    rotateY = xPct * maxTilt

    // Glare coordinates (0 to 100%)
    glareX = (relativeX / rect.width) * 100
    glareY = (relativeY / rect.height) * 100
  }

  function handleMouseEnter() {
    if (interactive) {
      isHovered = true
    }
  }

  function handleMouseLeave() {
    isHovered = false
    // Reset tilt back to flat orientation smoothly
    rotateX = 0
    rotateY = 0
    glareX = 50
    glareY = 50
  }

  function handleClick(event: MouseEvent) {
    if (onClick) {
      onClick(event)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (onClick) {
        const synthEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
        onClick(synthEvent)
      }
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="tarot-card-container {className}"
  bind:this={cardRef}
  onmousemove={handleMouseMove}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  role={onClick ? 'button' : undefined}
  tabindex={onClick ? 0 : undefined}
  aria-label={cardName}
  aria-pressed={onClick ? isFlipped : undefined}
  style="--rotate-x: {rotateX}deg; --rotate-y: {rotateY}deg; --glare-x: {glareX}%; --glare-y: {glareY}%;"
>
  <div class="tarot-card-3d-wrapper" class:is-flipped={isFlipped} class:is-hovered={isHovered}>
    <!-- Gold Foil Frame Border -->
    <div class="gold-foil-border">
      <!-- Card Front Face -->
      <div class="card-face card-front">
        {#if front}
          {@render front()}
        {:else if children}
          {@render children()}
        {:else if imageUrl}
          <img src={imageUrl} alt={cardName} class="card-image" />
        {:else}
          <div class="placeholder-face">
            <div class="card-title">{cardName}</div>
          </div>
        {/if}
        <!-- Interactive Glare / Shimmer Overlay -->
        <div class="glare-overlay"></div>
      </div>

      <!-- Card Back Face -->
      <div class="card-face card-back">
        {#if back}
          {@render back()}
        {:else if backImageUrl}
          <img src={backImageUrl} alt="{cardName} Back" class="card-image" />
        {:else}
          <div class="default-back-pattern">
            <div class="mystic-seal">
              <div class="seal-inner">✦</div>
            </div>
          </div>
        {/if}
        <!-- Interactive Glare / Shimmer Overlay -->
        <div class="glare-overlay"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .tarot-card-container {
    perspective: 1000px;
    width: 100%;
    aspect-ratio: 1 / 1.6;
    display: inline-block;
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    outline: none;
  }

  .tarot-card-container:focus-visible {
    outline: 2px solid #ffd700;
    outline-offset: 4px;
    border-radius: 12px;
  }

  .tarot-card-3d-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: rotateX(var(--rotate-x)) rotateY(var(--rotate-y));
    border-radius: 12px;
  }

  .tarot-card-3d-wrapper.is-flipped {
    transform: rotateX(var(--rotate-x)) rotateY(calc(180deg + var(--rotate-y)));
  }

  /* Gold Foil Border Styling with metallic gradient */
  .gold-foil-border {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    padding: 8px;
    background: linear-gradient(
      135deg,
      #b8860b 0%,
      #ffd700 25%,
      #fff8dc 50%,
      #d4af37 75%,
      #996515 100%
    );
    box-shadow:
      0 10px 25px rgba(0, 0, 0, 0.5),
      0 0 15px rgba(212, 175, 55, 0.3),
      inset 0 0 4px rgba(255, 255, 255, 0.6);
    transform-style: preserve-3d;
    transition: box-shadow 0.3s ease;
  }

  .tarot-card-3d-wrapper.is-hovered .gold-foil-border {
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.6),
      0 0 25px rgba(255, 215, 0, 0.6),
      inset 0 0 8px rgba(255, 255, 255, 0.8);
  }

  /* Card Faces */
  .card-face {
    position: absolute;
    inset: 6px;
    border-radius: 8px;
    backface-visibility: hidden;
    overflow: hidden;
    background-color: #1a1625;
    box-shadow: inset 0 0 0 2px #d4af37;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .card-front {
    z-index: 2;
    transform: rotateY(0deg);
  }

  .card-back {
    transform: rotateY(180deg);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .placeholder-face {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    text-align: center;
    background: radial-gradient(circle at center, #2a2238 0%, #120e1a 100%);
    color: #ffd700;
  }

  .card-title {
    font-family: serif;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  /* Ornate Default Card Back Pattern */
  .default-back-pattern {
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at center, #2e1a47 0%, #0d0614 100%),
      repeating-linear-gradient(
        45deg,
        rgba(212, 175, 55, 0.05) 0px,
        rgba(212, 175, 55, 0.05) 2px,
        transparent 2px,
        transparent 10px
      );
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(212, 175, 55, 0.4);
    box-sizing: border-box;
  }

  .mystic-seal {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid #ffd700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
  }

  .seal-inner {
    font-size: 1.5rem;
    color: #ffd700;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
  }

  /* Glare Overlay for 3D metallic feel */
  .glare-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--glare-x) var(--glare-y),
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0) 60%
    );
    mix-blend-mode: overlay;
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .tarot-card-3d-wrapper.is-hovered .glare-overlay {
    opacity: 1;
  }
</style>
