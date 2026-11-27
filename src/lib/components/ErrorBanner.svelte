<!--
/**
 * @fileoverview Global error banner - shows appStore.currentError to the user
 * @purpose Pages and components report failures with appStore.setError(); before this
 *   component nothing rendered that state, so API failures (missing key, timeouts,
 *   canceled generation) were invisible and buttons just appeared to do nothing.
 * @dataFlow appStore.currentError → banner (role="alert"); Dismiss → appStore.clearError()
 * @boundary UI layer, mounted once inside the sticky header in +layout.svelte
 * @example
 * appStore.setError('API key not configured.', 'API_KEY_MISSING')
 */
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'

  const error = $derived(appStore.currentError)
</script>

{#if error}
  <div class="error-banner" role="alert" aria-live="assertive">
    <span class="error-icon" aria-hidden="true">⚠️</span>
    <p class="error-text">{error.message}</p>
    {#if error.dismissable}
      <button
        type="button"
        class="dismiss"
        aria-label="Dismiss error"
        onclick={() => appStore.clearError()}
      >
        ✕
      </button>
    {/if}
  </div>
{/if}

<style>
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 900px;
    margin: 0 auto var(--spacing-sm, 0.5rem);
    width: calc(100% - 2rem);
    padding: 0.875rem 1rem;
    border: 1px solid rgba(248, 113, 113, 0.55);
    border-radius: 10px;
    background: rgba(60, 14, 20, 0.92);
    color: #fde2e2;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  .error-text {
    flex: 1;
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.4;
    overflow-wrap: break-word;
  }

  .dismiss {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgba(253, 226, 226, 0.4);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .dismiss:hover,
  .dismiss:focus-visible {
    background: rgba(253, 226, 226, 0.12);
  }
</style>
