# Tarot Out My Heart

**The Bureau of Fate.** Show it a few photos of a look you love, and it issues you a full
22-card Major Arcana deck drawn in that style, from The Fool to The World.

The whole site is played as a government office: you take a number in the lobby, fill in
Form MA-22 at Window 1 (your photos are "exhibits", your style is a "declaration of
aesthetic"), a clerk drafts a case file (an image prompt) for every card at Window 2, the
deck is illustrated card by card on a "Now serving" board, and Window 3 issues the deck
with a certificate, a per-card inspection desk, and a .zip of certified copies.

Live: https://tarot-out-my-heart.vercel.app

## How it works

- **Prompts:** xAI Grok (vision) reads your reference photos and style and writes 22 prompts
  (`/api/prompts`).
- **Images:** Grok Imagine (`grok-imagine-image-2.0`) draws each card (`/api/generate/card`),
  one at a time with retries. Failed cards can be resubmitted.
- **Uploads:** Vercel Blob when configured, otherwise data URLs (`/api/upload`).
- **Cost:** about $0.10 for prompts plus about $0.10 per card, so roughly $2.30 a deck,
  paid from the site owner's xAI key.

Built with SvelteKit 2 and Svelte 5, TypeScript strict, Seam-Driven Development (contracts in
`contracts/`, mock and real services in `services/`).

## Run it

Needs Node 22.

```bash
npm install
npm run dev                      # mock services, no API key, nothing billed
VITE_USE_MOCKS=false npm run dev # real services; needs XAI_API_KEY in .env
```

Server-side env vars: `XAI_API_KEY` (required for real mode), `BLOB_READ_WRITE_TOKEN`
(optional). `VITE_USE_MOCKS=false` must be set at build time for the real services.

## Test it

```bash
npm run ci        # prettier, eslint, svelte-check, 620 unit/contract tests, build
npm run test:e2e  # 17 Playwright tests (desktop + Pixel 7), real client code, /api stubbed
```

The e2e tests stub `/api/*` so they never spend xAI credits. They cover the whole flow
(upload, prompts, 22 cards, gallery, lightbox download, zip), error display, resubmitting a
failed card, the 5-image limit, withdrawing an application, empty states, link checking and
phone layout.

## What's rough

- **Nothing is saved.** The deck lives in memory; refreshing the page loses it. Download
  the .zip before you leave.
- **The .zip needs all 22 cards.** If a card keeps failing you can still take the others
  one at a time from the inspection desk, but not as a zip.
- **A real deck costs real money** (about $2.30) on the owner's key, and there is no rate
  limit or sign-in. Anyone can spend it.
- **Generation takes a few minutes** and stops if you close the tab.
- `/test-progress` is a developer test bench; it is only served by `npm run dev`.
- ESLint reports about 260 warnings (no errors), mostly in older test files.
