# DownloadComponent Usage Example

## Overview
The DownloadComponent provides a complete UI for downloading generated tarot cards, both individually and as a complete ZIP archive.

## Import and Usage

```svelte
<script lang="ts">
  import DownloadComponent from '$lib/components/DownloadComponent.svelte'
</script>

<DownloadComponent />
```

## Features Implemented

### 1. Download Options Panel
- **Deck Name Input**: Customize the filename for your ZIP download
- **Include Metadata Checkbox**: Option to include a `metadata.json` file with generation details

### 2. Download All as ZIP
- **Large Primary Button**: Eye-catching purple gradient button
- **Progress Tracking**: Real-time progress bar showing:
  - Current step (preparing, fetching, packaging, downloading, complete)
  - Progress percentage (0-100%)
  - Status message
- **Automatic Validation**: Button disabled until all 22 cards are generated

### 3. Individual Card Downloads
- **Card Grid**: Responsive grid showing all 22 Major Arcana cards
- **Card Previews**: Shows generated card images or placeholder gradients
- **Per-Card Download**: Individual download button for each card
- **Loading States**: Shows "Downloading..." with spinner on active card

### 4. Success & Error Handling
- **Success Messages**: Toast-style notification with file size
  - "Download complete! tarot-deck-1699382400000.zip (7.35 MB)"
- **Error Messages**: Clear error messages with dismiss option
  - "Incomplete deck. Please ensure all 22 cards are generated."
- **Retry Capability**: Errors are dismissable, allowing retry

### 5. Accessibility Features
- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Reader Support**: Live regions for progress updates
- **Focus Management**: Proper focus states and disabled states

### 6. Responsive Design
- **Desktop**: Multi-column card grid, wide download button
- **Tablet**: 2-3 columns, adjusted padding
- **Mobile**: 2 columns, full-width buttons, optimized spacing

## Integration with appStore

The component automatically reads from the global appStore:

```typescript
// Reads these values:
- appStore.generatedCards       // Array of 22 generated cards
- appStore.styleInputs           // User's style preferences (for metadata)
- appStore.hasAllCards           // Computed: true when 22 cards completed
- appStore.loadingStates         // Global loading state management

// Updates these values:
- appStore.setLoading('downloadingDeck', true/false)
```

## Contract Integration

Uses the Download service contract (Seam #7):

```typescript
interface DownloadDeckInput {
  generatedCards: GeneratedCard[]    // All 22 cards
  styleInputs: StyleInputs            // For metadata
  deckName?: string                   // Custom name
  format?: 'zip' | 'individual'       // Always 'zip' in this component
  includeMetadata?: boolean           // User checkbox
  onProgress?: (progress) => void     // Real-time updates
}

interface DownloadCardInput {
  card: GeneratedCard                 // Single card to download
  filename?: string                   // Optional custom name
}
```

## File Naming

### ZIP File
Pattern: `{deckName}-{timestamp}.zip`
Example: `tarot-deck-1699382400000.zip`

### Individual Cards
Pattern: `{number:02d}-{name}.png`
Examples:
- `00-the-fool.png`
- `01-the-magician.png`
- `21-the-world.png`

## Metadata JSON Structure

When "Include metadata" is checked, the ZIP includes `metadata.json`:

```json
{
  "generatedAt": "2025-11-15T10:30:00.000Z",
  "deckName": "tarot-deck",
  "styleInputs": {
    "theme": "Cyberpunk",
    "tone": "Dark",
    "description": "Neon-lit dystopian future...",
    "concept": "Technology vs humanity",
    "characters": "Androids and hackers"
  },
  "cardCount": 22,
  "version": "1.0.0"
}
```

## Service Layer

Currently uses **DownloadMock** for development:
- Simulates realistic download timing (100-500ms)
- Generates realistic file sizes (~350KB per card)
- Provides progress callbacks
- Validates input before processing

To switch to real service:
```typescript
// In component:
import { DownloadReal } from '$services/real/Download'
const downloadService = new DownloadReal()
```

## Progress Callback Flow

```typescript
onProgress: (progress) => {
  status: 'Fetching card images...',
  progress: 20,
  currentStep: 'fetching'
}
// → Updates UI progress bar and status text in real-time

// Progress steps:
1. preparing (0%)     → "Preparing download..."
2. fetching (20%)     → "Fetching card images..."
3. packaging (60-90%) → "Adding card X of 22..."
4. downloading (95%)  → "Preparing download..."
5. complete (100%)    → "Download complete!"
```

## Validation Logic

Download button is disabled when:
- Less than 22 cards generated
- Any card has status !== 'completed'
- Download already in progress

Individual card download disabled when:
- Card has no imageUrl
- That specific card is currently downloading

## Styling Theme

**Color Palette**:
- Primary gradient: `#667eea` → `#764ba2` (purple)
- Success: `#f0fdf4` background, `#166534` text
- Error: `#fef2f2` background, `#991b1b` text
- Neutral grays: `#f7fafc`, `#cbd5e0`, `#4a5568`

**Typography**:
- Headings: 1.25rem - 2.5rem, weight 600
- Body: 0.875rem - 1rem
- Hints: 0.8125rem, color `#718096`

**Shadows**:
- Cards: `0 2px 4px rgba(0,0,0,0.1)`
- Hover: `0 4px 8px rgba(0,0,0,0.1)`
- Button: `0 4px 6px rgba(102,126,234,0.3)`

## Example Page Integration

```svelte
<!-- src/routes/gallery/+page.svelte -->
<script lang="ts">
  import DownloadComponent from '$lib/components/DownloadComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
</script>

<div class="page-container">
  <header class="page-header">
    <h1>Your Tarot Deck</h1>
    <p>View and download your complete Major Arcana deck</p>
  </header>

  <main class="content">
    <!-- Other sections (deck gallery, info, etc.) -->

    <section class="download-section">
      <h2>Download Options</h2>
      <DownloadComponent />
    </section>
  </main>
</div>
```

## Testing Checklist

- [x] TypeScript compiles without errors (strict mode)
- [x] Vite build succeeds
- [x] All imports resolve correctly
- [x] Component renders without runtime errors
- [ ] Manual test: Download all as ZIP (requires generated cards)
- [ ] Manual test: Download individual card
- [ ] Manual test: Progress indicator updates
- [ ] Manual test: Success message displays
- [ ] Manual test: Error message displays
- [ ] Manual test: Responsive design on mobile
- [ ] Manual test: Keyboard navigation works
- [ ] Manual test: Screen reader announces progress

## Next Steps

1. **Replace Mock Service**: Implement real download service
2. **Add Analytics**: Track download events
3. **Add Share Feature**: Social media sharing of individual cards
4. **Add Print Layout**: Print-optimized card layout
5. **Add Format Options**: Support JPEG, SVG exports (requires contract update)

## Notes

- **SDD Compliance**: Follows contract exactly, no deviations
- **Svelte 5**: Uses `$state` and `$derived` runes correctly
- **No Emojis in Code**: Uses text emojis only in UI (⬇️, ✓, ⚠)
- **Comprehensive JSDoc**: Detailed header with fileoverview, purpose, dataFlow
- **Zero `any` Types**: Full type safety maintained
- **Accessibility First**: ARIA labels, semantic HTML, keyboard support
