# Progress

## Morning report (2026-11-27)

| | |
|---|---|
| **App** | Tarot Out My Heart |
| **Done?** | Yes, against the definition of done (see checklist below) |
| **World** | **The Bureau of Fate**: a government office that issues your fate as a 22-card deck. Take a number, fill in Form MA-22, wait while the Now Serving board ticks through your cards, collect a certificate and certified copies. |
| **Preview** | https://tarot-out-my-heart-git-claude-project-273b95-phazzies-projects.vercel.app (opened in a browser after the last push: new Bureau lobby, real fonts load, /test-progress returns 404) (private Vercel preview of branch `claude/project-thread-iq8tzm`, PR #39) |
| **Score** | 7/10 |

**Core idea:** turn a few photos of a look you love into a full, consistent 22-card Major
Arcana deck.

**The obvious version (not built):** a dark purple mystical page with gold sparkles, a
crystal-ball loader and "Generate your deck ✨".

**Worlds pitched:**
1. **Bureau of Fate** (picked): fate as bureaucracy. Forms, windows, stamps, a ticket
   dispenser, an LED "Now serving" board, carbon-copy fee slips. Every state has a home:
   loading is "please hold", a failed card is "returned unillustrated", Start Over is
   "Withdraw application", the empty gallery is "No record found".
2. **Late-night TV psychic hotline**: VHS menus, a call-in counter, operator hold music.
   Fun, but the joke is thinner than the flow and it fights readable cards.
3. **Darkroom**: photos as negatives, cards developing in trays under a red safelight.
   Beautiful but quiet; closer to "clean and fine".

The Bureau won because the app already *is* a three-step application process, so the
world explains the flow instead of decorating it.

**What's rough:**
- Nothing is saved; a refresh loses the deck.
- The .zip needs all 22 cards (single cards can be taken from the inspection desk).
- No rate limit or sign-in; each real deck costs the owner about $2.30 in xAI credits.
- I did not run a real (paid) generation; the flow was verified end to end with the real
  client code and stubbed `/api/*`. The live site was confirmed earlier to be on the real
  services.
- Card art in my screenshots is placeholder purple from the test stubs, not real Grok art,
  so I have not seen how real cards sit in the pigeonholes.
- Three narrow edge cases from PR review, logged rather than fixed:
  - A resubmit or upload still in flight during "Withdraw application" can land in the
    next deck. The fix is a deck/session id that late responses are checked against.
  - After Cancel, cards that were never attempted aren't listed as Returned, so they can
    only be redone with "Approve all 22", not one at a time.

**Weakest / boldest:** only one site in this thread. Boldest part: the lobby ticket
dispenser and the Certificate of Issuance. Weakest part: the processing page is long on a
phone (22 case files before the Approve button).

**Choices to check:**
- I renamed the visible product to "Bureau of Fate" in the header; the repo, footer and
  README still say Tarot Out My Heart. Keep both, or pick one?
- Fee schedule on the lobby says the applicant pays $0.00 and the Bureau absorbs ~$2.30.
  That's true today but advertises the cost to anyone.
- `/test-progress` now 404s outside `npm run dev` (it was a public button that spent real
  credits). The file is kept.
- Not merged to main. PR #39 is open; merge it when you're happy.

**Blockers:** none. GitHub Actions does run on this repo (I had wrongly assumed it was
billing-locked). Its Build and "No 'any'" checks were red for two real reasons, now fixed:
the workflows pinned Node 20 while SvelteKit needs Node 22, and the any-check matched the
CSS `overflow-wrap: anywhere`.

### Definition of done

- [x] Builds and starts with no console errors (only the intentional 5xx from the
      error-path tests)
- [x] Every feature clicked through (see below)
- [x] Nothing regressed: 620 unit/contract tests + 17 e2e tests pass
- [x] No placeholders, dead links or broken images (link-checker e2e; dead
      via.placeholder.com fallback removed)
- [x] Phone and laptop screenshots reviewed after the last change (two critique passes)
- [x] Deployed to a private preview and opened (see Preview)
- [x] Committed on its own branch
- [x] README: what, how to run, what's rough

### Features clicked through

Lobby ticket dispenser → Intake: upload 1–5 photos (6th rejected), remove/withdraw all,
style presets, custom fields, file declaration, clear → Processing: draft 22 case files,
amend/embellish/copy/restore one, redraft all, approve all 22, live Now Serving board,
cancel, a returned card, resubmit one and resubmit all, error banner with dismiss →
Issuance: certificate, search/filter/sort, lightbox with prev/next, keyboard nav, full-size
view, copy case file, take a single card (.png), collect .zip, withdraw application →
empty states on Processing and Issuance → /style single-section page → mobile hamburger
menu, no sideways scroll on any page.

## Log

- Shakedown (PR #39): error banner, retry after generation, 5-image limit, Start Over
  clearing uploads, /style continue, dead links, contrast; Playwright e2e suite.
- Redesign: Bureau of Fate across every page and component state.
- Screenshot pass 1 found: resubmitted cards renamed "Card N" (real bug, fixed + e2e),
  lightbox arrow over the case file, cert stamp over text on phone, header title
  truncating on phone, off-world upload message. All fixed; pass 2 clean.
- See GRUDGES.md for everything that failed silently.
