# GenerationProgressComponent

**File**: `/src/lib/components/GenerationProgressComponent.svelte`
**Purpose**: Real-time progress tracking for 22-card image generation
**Sprint**: Sprint 2, Component 4
**Updated**: 2025-11-15

---

## Overview

The GenerationProgressComponent provides real-time visual feedback during the image generation process. It displays progress bars, stats, current card status, time estimates, and handles failed cards with retry functionality.

---

## Features

### Core Features
- ✅ **Progress Bar**: Animated gradient bar (0-100%) with smooth transitions
- ✅ **Stats Display**: "X/22 cards completed (Y%)" with large, readable text
- ✅ **Current Card**: Shows which card is being generated with animated spinner
- ✅ **Time Estimate**: Displays estimated time remaining in human-readable format
- ✅ **Failed Cards**: Lists failed cards with individual retry buttons
- ✅ **Cancel Button**: Allows user to stop generation in progress
- ✅ **Completion Message**: Celebration animation when all 22 cards complete

### Accessibility
- ✅ **ARIA Live Region**: Screen reader announcements for progress updates
- ✅ **Progress Role**: Proper semantic markup with aria-valuenow/min/max
- ✅ **Keyboard Accessible**: All interactive elements keyboard-navigable
- ✅ **Screen Reader Friendly**: Status updates announced automatically

### Design
- ✅ **Purple/Gold Theme**: Matches app branding (gradient #667eea → #764ba2)
- ✅ **Responsive**: Mobile-friendly layout (stacks on small screens)
- ✅ **Smooth Animations**: Pulsing progress bar, spinning loader, celebration effects
- ✅ **Color Coding**: Blue (in progress), Green (complete), Red (failed)

---

## Usage

### Basic Usage

```svelte
<script lang="ts">
  import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'

  function handleCancel() {
    // Cancel generation logic
    console.log('Generation canceled')
  }

  function handleRetry(cardNumber: number) {
    // Retry failed card logic
    console.log(`Retry card ${cardNumber}`)
  }
</script>

<GenerationProgressComponent
  onCancel={handleCancel}
  onRetryFailed={handleRetry}
/>
```

### With Image Generation Service

```svelte
<script lang="ts">
  import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { ImageGenerationMock } from '$services/mock/ImageGenerationMock'

  const generationService = new ImageGenerationMock()

  async function startGeneration() {
    appStore.setLoading('generatingImages', true)

    const result = await generationService.generateImages({
      prompts: appStore.generatedPrompts,
      onProgress: (progress) => {
        // Update appStore with progress
        appStore.updateGenerationProgress(progress)
      }
    })

    if (result.success && result.data) {
      appStore.setGeneratedCards(result.data.generatedCards)
    }

    appStore.setLoading('generatingImages', false)
  }

  function cancelGeneration() {
    // Cancel logic here
    appStore.setLoading('generatingImages', false)
    appStore.clearGenerationProgress()
  }
</script>

<button onclick={startGeneration}>Start Generation</button>

<GenerationProgressComponent onCancel={cancelGeneration} />
```

---

## Props

### `onCancel?: () => void`
**Optional callback when user clicks "Cancel Generation" button**

- Called when user wants to stop generation
- Component doesn't handle cancellation logic - that's the parent's responsibility
- Parent should clear progress and loading states in appStore

**Example**:
```typescript
function handleCancel() {
  // Stop API calls
  sessionManager.cancel()

  // Update appStore
  appStore.setLoading('generatingImages', false)
  appStore.clearGenerationProgress()
}
```

### `onRetryFailed?: (cardNumber: number) => void`
**Optional callback when user clicks "Retry" on a failed card**

- Called with the card number (0-21) to retry
- Component doesn't handle retry logic - that's the parent's responsibility
- Parent should trigger regeneration for that specific card

**Example**:
```typescript
async function handleRetryFailed(cardNumber: number) {
  const prompt = appStore.generatedPrompts.find(p => p.cardNumber === cardNumber)

  if (prompt) {
    const result = await imageService.regenerateImage({
      cardNumber,
      prompt: prompt.generatedPrompt
    })

    if (result.success && result.data) {
      appStore.updateGeneratedCard(cardNumber, result.data.generatedCard)
    }
  }
}
```

---

## Data Flow

### Input (from appStore)

The component reads reactive state from `appStore.generationProgress`:

```typescript
interface ImageGenerationProgress {
  total: number              // Total cards (always 22)
  completed: number          // Cards completed successfully
  failed: number             // Cards that failed
  current: number            // Current card being generated (0-21)
  percentComplete: number    // Progress percentage (0-100)
  estimatedTimeRemaining: number  // Seconds remaining
  status: string             // Status message (e.g., "Generating The Fool...")
}
```

### Example Progress Updates

**Starting**:
```json
{
  "total": 22,
  "completed": 0,
  "failed": 0,
  "current": 0,
  "percentComplete": 0,
  "estimatedTimeRemaining": 220,
  "status": "Starting generation..."
}
```

**Mid-Generation**:
```json
{
  "total": 22,
  "completed": 10,
  "failed": 0,
  "current": 10,
  "percentComplete": 45,
  "estimatedTimeRemaining": 120,
  "status": "Generating Wheel of Fortune..."
}
```

**Complete**:
```json
{
  "total": 22,
  "completed": 22,
  "failed": 0,
  "current": 22,
  "percentComplete": 100,
  "estimatedTimeRemaining": 0,
  "status": "Complete"
}
```

**With Failures**:
```json
{
  "total": 22,
  "completed": 20,
  "failed": 2,
  "current": 22,
  "percentComplete": 100,
  "estimatedTimeRemaining": 0,
  "status": "Complete (2 failed)"
}
```

---

## UI States

### 1. **Idle State** (not generating)
- Progress bar at 0%
- No current card shown
- No time estimate
- No cancel button

### 2. **Generating State** (in progress)
- Progress bar animating (pulsing effect)
- Current card displayed with spinner
- Time estimate shown
- Cancel button visible
- Stats updating in real-time

### 3. **Complete State** (all done)
- Progress bar at 100%
- Celebration message with animation
- No current card or time estimate
- No cancel button

### 4. **Failed State** (some cards failed)
- Failed cards section visible
- Warning icon and count
- List of failed cards with retry buttons
- Completion message mentions failures

---

## Styling

### Theme Colors

```css
--color-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--color-success: #48bb78  /* Green for completion */
--color-warning: #ed8936  /* Orange for partial failure */
--color-danger: #f56565   /* Red for errors */
--color-text-primary: #1a1a1a
--color-text-secondary: #666
```

### Key Animations

**Progress Bar Pulse** (while generating):
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

**Spinner Rotation**:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Celebration Icon**:
```css
@keyframes celebrate {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.2) rotate(-10deg); }
  75% { transform: scale(1.2) rotate(10deg); }
}
```

### Responsive Breakpoints

**Mobile (< 768px)**:
- Smaller text sizes
- Vertical layout for current card section
- Full-width retry buttons
- Stacked stats display

---

## Testing

### Test Page

Visit `/test-progress` for an interactive demo:

```bash
npm run dev
# Navigate to http://localhost:5173/test-progress
```

**Test Page Features**:
- Start/Stop generation
- Mock service with realistic delays
- All component states visible
- Interactive controls

### Manual Testing Checklist

- [ ] Progress bar animates smoothly from 0% to 100%
- [ ] Stats update correctly (count and percentage)
- [ ] Current card name displays during generation
- [ ] Time estimate counts down and formats correctly
- [ ] Failed cards appear in failed section
- [ ] Retry button works for failed cards
- [ ] Cancel button stops generation
- [ ] Completion message appears when done
- [ ] Responsive on mobile (< 768px)
- [ ] Keyboard navigation works (Tab through buttons)
- [ ] Screen reader announces progress updates

### Unit Tests (Future)

```typescript
// Test: Progress bar updates
test('progress bar reflects completion percentage', () => {
  appStore.updateGenerationProgress({
    total: 22,
    completed: 11,
    failed: 0,
    current: 11,
    percentComplete: 50,
    estimatedTimeRemaining: 110,
    status: 'Generating...'
  })

  expect(progressBar.width).toBe('50%')
  expect(statsText).toContain('11/22')
  expect(statsPercent).toContain('50%')
})

// Test: Failed cards display
test('failed cards section appears when cards fail', () => {
  // Add failed card to appStore
  appStore.updateGeneratedCard(13, {
    id: 'card-13',
    cardNumber: 13,
    cardName: 'Death',
    generationStatus: 'failed',
    error: 'API timeout'
  })

  expect(failedCardsSection).toBeVisible()
  expect(failedCardsList).toContain('Death')
  expect(retryButton).toBeEnabled()
})
```

---

## Integration

### Required Contracts
- `ImageGenerationProgress` from `contracts/ImageGeneration.ts`
- `GeneratedCard` from `contracts/ImageGeneration.ts`

### Required Services
- `IImageGenerationService` (mock or real)

### appStore Methods Used
```typescript
// Read (reactive)
appStore.generationProgress      // Current progress
appStore.isGenerating           // Loading state
appStore.generatedCards         // All cards (for failed list)

// Write (in parent component)
appStore.updateGenerationProgress(progress)  // Update progress
appStore.setLoading('generatingImages', true/false)
appStore.clearGenerationProgress()
```

---

## Accessibility

### ARIA Attributes

**Progress Bar**:
```html
<div
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="45"
  aria-label="Generation progress: 45% complete"
>
```

**Live Region** (stats):
```html
<div aria-live="polite">
  10/22 cards completed (45%)
</div>
```

**Status Updates**:
```html
<div role="status" aria-live="polite">
  All cards generated!
</div>
```

**Alert** (failures):
```html
<div role="alert">
  2 cards failed
</div>
```

### Screen Reader Experience

1. **Progress updates**: Announced automatically every few seconds
2. **Milestones**: 25%, 50%, 75%, 100% announced
3. **Current card**: "Currently generating: The Fool"
4. **Failures**: "Warning: 2 cards failed"
5. **Completion**: "Success: All cards generated!"

---

## Performance

### Optimization Strategies

1. **Derived State**: Uses `$derived` for computed values (Svelte 5)
2. **Minimal Re-renders**: Only updates when appStore.generationProgress changes
3. **CSS Animations**: Hardware-accelerated (transform, opacity)
4. **Conditional Rendering**: Sections only render when needed

### Bundle Impact

- **Component Size**: ~15 KB (with styles)
- **Dependencies**: Only appStore (no external deps)
- **Runtime**: Negligible performance impact

---

## Future Enhancements

### Potential Features (v2)

- [ ] **Pause/Resume**: Pause generation and continue later
- [ ] **Card Previews**: Show thumbnail as each card generates
- [ ] **Detailed Stats**: Tokens used, cost per card, generation times
- [ ] **Export Progress**: Download progress report as JSON
- [ ] **Sound Effects**: Optional audio feedback on completion/failure
- [ ] **Dark Mode**: Theme variant for dark backgrounds
- [ ] **Animation Preferences**: Respect `prefers-reduced-motion`

---

## Troubleshooting

### Common Issues

**Progress not updating**:
```typescript
// Ensure onProgress callback updates appStore
onProgress: (progress) => {
  appStore.updateGenerationProgress(progress)  // ✅ Correct
}

// Don't forget to set this!
```

**Time estimate incorrect**:
```typescript
// Mock service uses fast delays (10ms per image)
// Real service will have realistic times (~10s per image)
// Estimate adjusts based on actual generation time
```

**Cancel button not appearing**:
```typescript
// Must provide onCancel prop
<GenerationProgressComponent onCancel={handleCancel} />  // ✅

// Without it, cancel button won't render
<GenerationProgressComponent />  // ❌ No cancel button
```

**Failed cards not showing retry**:
```typescript
// Must provide onRetryFailed prop
<GenerationProgressComponent onRetryFailed={handleRetry} />  // ✅

// Without it, retry buttons won't appear
<GenerationProgressComponent />  // ❌ No retry buttons
```

---

## Related Documentation

- **Contract**: `/contracts/ImageGeneration.ts` - ImageGenerationProgress type
- **Service**: `/services/mock/ImageGenerationMock.ts` - Mock implementation
- **Store**: `/src/lib/stores/appStore.svelte.ts` - Global state
- **PRD**: `/prd.MD` - Sprint 2 requirements
- **Test Page**: `/src/routes/test-progress/+page.svelte` - Interactive demo

---

## Change Log

### 2025-11-15 - Initial Implementation
- ✅ Created GenerationProgressComponent.svelte
- ✅ Implemented progress bar with gradient and animation
- ✅ Added stats display with percentage
- ✅ Created current card section with spinner
- ✅ Implemented time estimate formatting
- ✅ Added failed cards section with retry
- ✅ Created cancel button functionality
- ✅ Implemented completion celebration
- ✅ Added full accessibility support (ARIA)
- ✅ Made responsive for mobile
- ✅ Created test page (/test-progress)
- ✅ Documented component thoroughly
