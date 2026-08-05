# Component Documentation

This directory contains detailed documentation for all Svelte components in the TarotOutMyHeart application.

---

## Available Components

### GenerationProgressComponent ✅

**Status**: Complete
**File**: `/src/lib/components/GenerationProgressComponent.svelte`
**Documentation**: [GenerationProgressComponent.md](./GenerationProgressComponent.md)

Real-time progress tracking for the 22-card image generation process.

**Key Features**:

- Animated progress bar with gradient
- Live stats (X/22 cards, percentage)
- Current card display with spinner
- Time remaining estimate
- Failed cards list with retry
- Cancel generation button
- Completion celebration

**Demo**: Visit `/test-progress` to see it in action

---

## Component Standards

All components in this project follow these standards:

### 1. File Documentation

Every component must have comprehensive top-level comments:

```svelte
<!--
  @fileoverview Brief description
  @purpose Why this component exists
  @dataFlow How data enters and exits
  @boundary What seam/boundary this implements
  @requirement PRD reference
  @updated YYYY-MM-DD

  [Detailed description]

  @example
  [Usage example]
-->
```

### 2. TypeScript Strict Mode

- All components use `<script lang="ts">`
- Type all props with TypeScript
- No `any` types allowed
- Use Svelte 5 runes (`$state`, `$derived`, `$props`)

### 3. Accessibility

- Semantic HTML elements
- ARIA attributes where needed
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance (WCAG AA)

### 4. Responsive Design

- Mobile-first approach
- Media queries for tablet/desktop
- Touch-friendly interactive elements
- Readable text sizes on all devices

### 5. Styling

- Scoped component styles (no global leakage)
- CSS custom properties for theming
- Consistent with app branding (purple/gold)
- Smooth transitions and animations
- `prefers-reduced-motion` respect (future)

### 6. Testing

- Test page for interactive demo
- Unit tests (future)
- Integration tests (future)
- Manual QA checklist

### 7. Documentation

- Component-specific markdown file in `/docs/components/`
- Usage examples
- Props documentation
- Data flow diagrams (if complex)
- Troubleshooting section

---

## Component Development Workflow

### Step 1: Plan

1. Review PRD requirements
2. Identify data contracts needed
3. Sketch component structure
4. Define props interface
5. Plan accessibility features

### Step 2: Build

1. Create `.svelte` file in `/src/lib/components/`
2. Add comprehensive file header comments
3. Import contracts and types
4. Define props with TypeScript
5. Implement reactive state with `$derived`
6. Build template with semantic HTML
7. Add scoped styles

### Step 3: Test

1. Create test page in `/src/routes/test-[name]/`
2. Test all states (idle, loading, success, error)
3. Test responsive design (mobile, tablet, desktop)
4. Test keyboard navigation
5. Test screen reader (NVDA/VoiceOver)
6. Run `npm run check` (no errors)

### Step 4: Document

1. Create markdown file in `/docs/components/`
2. Document all props
3. Show usage examples
4. Explain data flow
5. Add troubleshooting section
6. Update this README

### Step 5: Integrate

1. Import into page components
2. Wire up appStore integration
3. Test with real services
4. Update CHANGELOG.md
5. Create PR (if using version control)

---

## Svelte 5 Patterns

### Reactive State

```svelte
<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'

  // Derived from appStore (auto-updates)
  let isLoading = $derived(appStore.isLoading)
  let progress = $derived(appStore.generationProgress)

  // Computed values
  let percentComplete = $derived(
    progress ? Math.round((progress.completed / progress.total) * 100) : 0
  )
</script>
```

### Props

```svelte
<script lang="ts">
  interface Props {
    title: string
    count?: number // Optional with default
    onSubmit: (data: FormData) => void
  }

  // Destructure with defaults
  let { title, count = 0, onSubmit }: Props = $props()
</script>
```

### Event Handlers

```svelte
<script lang="ts">
  function handleClick() {
    console.log('Clicked!')
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    // Handle form submission
  }
</script>

<button onclick={handleClick}>Click Me</button><form onsubmit={handleSubmit}>...</form>
```

### Conditional Rendering

```svelte
{#if isLoading}
  <Spinner />
{:else if hasError}
  <Error message={errorMessage} />
{:else}
  <Content {data} />
{/if}
```

### List Rendering

```svelte
{#each items as item (item.id)}
  <Card data={item} />
{/each}
```

---

## Theming

### Color Palette

```css
:root {
  /* Primary (Purple/Blue gradient) */
  --color-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --color-primary-light: #8b9cf6;
  --color-primary-dark: #5a67d8;

  /* Status Colors */
  --color-success: #48bb78; /* Green */
  --color-warning: #ed8936; /* Orange */
  --color-danger: #f56565; /* Red */
  --color-info: #4299e1; /* Blue */

  /* Neutrals */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666;
  --color-border: #e2e8f0;
  --color-bg-light: #f7fafc;
  --color-bg-white: #ffffff;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.15);

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

### Typography

```css
:root {
  /* Font Families */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Courier New', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 2rem; /* 32px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## Component Checklist

Before marking a component as "complete", ensure:

- [ ] File has comprehensive header comments
- [ ] All props have TypeScript types
- [ ] Uses Svelte 5 runes (`$derived`, `$props`)
- [ ] Integrates with appStore (if needed)
- [ ] Semantic HTML elements used
- [ ] ARIA attributes added where appropriate
- [ ] Keyboard navigation works
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Color contrast meets WCAG AA
- [ ] Animations are smooth and purposeful
- [ ] Test page created
- [ ] Component documentation written
- [ ] No TypeScript errors (`npm run check`)
- [ ] CHANGELOG.md updated
- [ ] Manual QA completed

---

## Related Documentation

- **PRD**: `/prd.MD` - Product requirements and sprint checklists
- **Contracts**: `/contracts/` - Data type definitions
- **AppStore**: `/src/lib/stores/appStore.svelte.ts` - Global state
- **Blueprints**: `/docs/blueprints/` - Component templates
- **CLAUDE.md**: Project-specific AI instructions

---

## Questions?

For component development questions:

1. Check this README
2. Review existing components
3. Read component-specific docs
4. Consult PRD Sprint requirements
5. Reference contract definitions
