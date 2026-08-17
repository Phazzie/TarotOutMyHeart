# PreMortem API Resilience & Error Handling Rule

## Overview
Every live API service and server route (e.g. xAI Grok, OpenAI, Vercel Blob) in **TarotOutMyHeart** must anticipate and gracefully handle standard failure modes prior to deployment.

---

## 🛡️ Standard Required Failure Modes

Every real service implementation (`services/real/`) and server endpoint (`src/routes/api/`) must explicitly implement error handling for:

1. `UNAUTHORIZED` / `MISSING_API_KEY`:
   - Triggered when `XAI_API_KEY` or environment tokens are undefined.
   - Return clean, safe error message without exposing server secrets.

2. `INVALID_INPUT` / `VALIDATION_ERROR`:
   - Triggered when client payload violates input constraints (e.g. missing reference images, theme string too short/long).

3. `API_ERROR` / `UPSTREAM_FAILURE`:
   - Triggered when external LLM/Vision APIs return 5xx errors, rate-limit 429s, or malformed JSON payloads.
   - Implement exponential backoff retry for transient 429 / 503 status codes.

4. `TIMEOUT` / `CANCELLED`:
   - Configure explicit AbortController timeouts (e.g., 90s for Grok reasoning models).
   - Allow user-initiated cancellation for long-running batch calls.

---

## 🔒 Security & Secret Protection
- Never expose API keys (`XAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`) to the client bundle.
- All external API calls MUST be routed through server endpoints (`src/routes/api/`) using `$env/dynamic/private`.
