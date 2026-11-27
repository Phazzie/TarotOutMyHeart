/**
 * @fileoverview Keeps the progress-component test bench out of production.
 * @purpose /test-progress runs a full 22-card generation with whatever services the build
 *   uses. On the live site those are real Grok calls (about $2.20 per click), so the page is
 *   only served by the dev server.
 * @dataFlow Request → dev check → page or 404
 * @boundary Route guard only; the page itself is unchanged.
 */
import { error } from '@sveltejs/kit'

export function load(): void {
  if (!import.meta.env.DEV) error(404, 'Not found')
}
