# DeckGalleryComponent Usage Guide

## Overview

The `DeckGalleryComponent` is a comprehensive gallery viewer for displaying generated tarot cards with advanced filtering, sorting, and lightbox functionality.

## Features

- ✅ Responsive grid layout (4 cols desktop, 3 tablet, 2 mobile)
- ✅ Card thumbnails with hover effects and status badges
- ✅ Full-screen lightbox modal with navigation
- ✅ Keyboard navigation (Arrow keys, ESC, Tab)
- ✅ Filter by status (all, completed, failed)
- ✅ Sort by card number, name, or generation date
- ✅ Search/filter by card name, number, or prompt
- ✅ Loading skeletons for pending cards
- ✅ Accessibility (ARIA labels, focus management, keyboard navigation)
- ✅ Glassmorphism design matching app theme

## Basic Usage

```svelte
<script lang="ts">
  import DeckGalleryComponent from '$lib/components/DeckGalleryComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
</script>

<DeckGalleryComponent cards={appStore.generatedCards} />
```

## Integration with Mock Service

The component automatically initializes the `DeckDisplayMock` service and manages all display state internally.

```typescript
// The component handles:
// - initializeDisplay() on mount
// - openLightbox() when card clicked
// - closeLightbox() when ESC pressed or close button clicked
// - navigateLightbox() when arrow keys pressed
// - sortCards() when sort changed
// - filterCards() when search applied
```

## Keyboard Shortcuts

| Key                | Action                         |
| ------------------ | ------------------------------ |
| `Enter` or `Space` | Open lightbox for focused card |
| `ESC`              | Close lightbox                 |
| `←` Arrow Left     | Previous card in lightbox      |
| `→` Arrow Right    | Next card in lightbox          |
| `Tab`              | Navigate between cards in grid |

## Example with Custom Cards

```svelte
<script lang="ts">
  import DeckGalleryComponent from '$lib/components/DeckGalleryComponent.svelte'
  import type { GeneratedCard } from '$contracts'

  // Example: Custom generated cards
  const customCards: GeneratedCard[] = [
    {
      id: 'card-0' as GeneratedCardId,
      cardNumber: 0,
      cardName: 'The Fool',
      prompt: 'A mystical fool standing at cliff edge...',
      imageUrl: 'https://example.com/fool.png',
      generationStatus: 'completed',
      generatedAt: new Date(),
      retryCount: 0,
    },
    // ... more cards
  ]
</script>

<DeckGalleryComponent cards={customCards} />
```

## Styling

The component uses CSS custom properties from the global theme:

```css
/* Key variables used: */
--color-primary: #6b46c1 --color-secondary: #f6ad55 --color-bg: #0f0e17
  --glass-bg: rgba(139, 92, 246, 0.1) --glass-border: rgba(139, 92, 246, 0.2)
  --spacing- *: /* responsive spacing */ --transition- *: /* animation timing */;
```

## State Management

The component maintains its own internal state:

```typescript
// Display state
layout: 'grid' | 'list' | 'carousel'
cardSize: 'small' | 'medium' | 'large'
sortBy: 'number' | 'name' | 'generated-date'
sortAscending: boolean
filterTerm: string
statusFilter: 'all' | 'completed' | 'failed'

// Lightbox state
lightboxState: LightboxState | null
lightboxCard: DisplayCard | null
```

## Integration Points

### With appStore

```svelte
<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import DeckGalleryComponent from '$lib/components/DeckGalleryComponent.svelte'
</script>

<!-- Reactive: updates when appStore.generatedCards changes -->
<DeckGalleryComponent cards={appStore.generatedCards} />
```

### With Real Service (Future)

When implementing the real `DeckDisplayService`:

1. Replace `DeckDisplayMock` import with real service
2. All service calls remain identical (same contract interface)
3. No template changes needed

```typescript
// Change this line:
import { DeckDisplayMock } from '../../../services/mock/DeckDisplayMock'

// To this (when real service ready):
import { DeckDisplayReal } from '../../../services/real/DeckDisplayReal'

// Update instantiation:
const displayService = new DeckDisplayReal()
```

## Accessibility Features

- ✅ Semantic HTML (`role="grid"`, `role="dialog"`, etc.)
- ✅ ARIA labels for all interactive elements
- ✅ Keyboard navigation throughout
- ✅ Focus trap in lightbox modal
- ✅ Screen reader announcements for status changes
- ✅ Skip links and focus management
- ✅ High contrast text and borders

## Performance Optimizations

- ✅ Lazy loading images (`loading="lazy"`)
- ✅ Computed values cached with `$derived`
- ✅ Minimal re-renders with Svelte 5 reactivity
- ✅ Event delegation for card clicks
- ✅ CSS animations (GPU-accelerated)

## Error Handling

The component gracefully handles:

- Empty card array (shows empty state)
- Failed card generations (status badge)
- Service errors (displays error message with retry)
- Loading states (skeleton placeholders)

## Future Enhancements

Potential additions for v2:

- [ ] Virtual scrolling for large decks
- [ ] Drag-and-drop reordering
- [ ] Bulk selection and actions
- [ ] Export selected cards
- [ ] Favorites/bookmarking
- [ ] Card comparison view
- [ ] Animation on card reveal

## Testing

Example test cases:

```typescript
import { render, fireEvent } from '@testing-library/svelte'
import DeckGalleryComponent from './DeckGalleryComponent.svelte'

test('renders card grid', () => {
  const { getByRole } = render(DeckGalleryComponent, {
    props: { cards: mockCards },
  })
  expect(getByRole('grid')).toBeInTheDocument()
})

test('opens lightbox on card click', async () => {
  const { getByLabelText, getByRole } = render(DeckGalleryComponent, {
    props: { cards: mockCards },
  })

  await fireEvent.click(getByLabelText('The Fool, card 0'))
  expect(getByRole('dialog')).toBeInTheDocument()
})
```

## Contract Compliance

The component fully implements the `IDeckDisplayService` contract (Seam #5):

- ✅ `initializeDisplay()` - Initialize gallery
- ✅ `changeLayout()` - Switch layouts (grid/list/carousel)
- ✅ `changeCardSize()` - Adjust card size
- ✅ `sortCards()` - Sort by option
- ✅ `filterCards()` - Search/filter
- ✅ `selectCard()` - Select card
- ✅ `openLightbox()` - Open modal
- ✅ `closeLightbox()` - Close modal
- ✅ `navigateLightbox()` - Navigate cards

## File Locations

```
/src/lib/components/
  └── DeckGalleryComponent.svelte       # Main component
      └── DeckGalleryComponent.example.md   # This file
```

## Related Files

- `/contracts/DeckDisplay.ts` - Contract definition
- `/services/mock/DeckDisplayMock.ts` - Mock service implementation
- `/src/lib/stores/appStore.svelte.ts` - App state management
- `/src/routes/gallery/+page.svelte` - Gallery page integration

---

**Last Updated**: 2025-11-15
**Component Version**: 1.0.0
**Contract**: DeckDisplaySeam (Seam #5)
