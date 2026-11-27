# Grudges

Things that failed silently or lied. Check this list before every deploy.

1. **Errors were swallowed.** Every page called `appStore.setError()`, but nothing rendered it.
   A failed prompt or image request looked like a dead button. (Fixed: ErrorBanner.)
2. **The upload limit lied.** The UI said 10 images; the service and contract cap at 5, so
   images 6 to 10 failed. (Fixed: one `MAX_IMAGES` from the contract.)
3. **Start Over didn't.** It cleared the store but not the upload service's own list, so the
   old deck's photos counted against the new deck's limit. (Fixed.)
4. **/style "Continue" went nowhere.** It set an unused store field. (Fixed.)
5. **A resubmitted card lost its name.** `ImageGenerationService.regenerateImage` named every
   retried card "Card N", so The Empress came back as "Card 3" in the gallery and in
   filenames. Found in the screenshot pass. (Fixed, and covered by e2e.)
6. **/test-progress was a public "spend $2.20" button.** It runs a full real generation with
   fake prompts, and it was served on the live site. (Fixed: dev server only, e2e checks 404.)
7. **The progress panel printed source code.** A `statusIcon` derived function was rendered
   as text instead of being called. (Fixed in the redesign.)
8. **The lightbox claimed "Grok 2 Image Alpha" and "1024 × 1024 px".** Neither was true.
   (Fixed: shows the real model id; resolution line removed.)
9. **Broken image fallback.** Cards with no image pointed at via.placeholder.com, a dead
   service. (Fixed: a "Returned unillustrated" slip.)
10. **I believed GitHub Actions was billing-locked. It wasn't.** The red checks were real:
    every workflow pinned Node 20 while SvelteKit's prerender needs Node 22
    (`Promise.withResolvers is not a function`), and the "No 'any'" grep for `: any` matched
    the CSS `overflow-wrap: anywhere`. Both fixed. Read the job log before blaming the
    platform.
11. **Retry-all could bill twice.** While "Resubmit all" ran, single Resubmit buttons stayed
    enabled, so a queued card could be generated twice. A Cancel also left a service-wide flag
    set that silently blocked every later resubmit. (Fixed, from PR review.)
12. **The Start Over e2e test proved nothing.** It used full page loads, which reset memory
    anyway. It now navigates inside the app and fails if the clear is removed (checked).
