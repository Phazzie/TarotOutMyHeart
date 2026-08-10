# SvelteKit Conventions

This project uses SvelteKit 2.x and enforces specific conventions for routing and data loading.

## The Rules
1. **Use Path Aliases:** Always use absolute path aliases (e.g., `import { formatDate } from '$lib/utils/date'`). You are strictly forbidden from using relative pathing (e.g., `../../lib`).
2. **Server-Side vs Client-Side:**
   - Server-only logic (database queries, secret API keys) MUST go in `+page.server.ts`.
   - Client-side logic MUST go in `+page.svelte` (e.g., `<script lang="ts"> export let data; </script>`).
3. **Do not mix boundaries:** Do not attempt to call a server-only API directly from a Svelte component script block.
