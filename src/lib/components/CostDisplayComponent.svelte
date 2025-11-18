<!--
/**
 * @fileoverview Cost Display Component - Shows estimated and actual API costs
 * @purpose Display API cost estimates and actuals with breakdowns and warnings
 * @dataFlow appStore → CostCalculationService → formatted cost display
 * @boundary Seam #6: CostCalculationSeam - Display API costs to users
 * @updated 2025-11-15
 *
 * This component displays:
 * - Estimated cost (before generation)
 * - Actual cost (after generation)
 * - Cost breakdown (prompts, images, vision)
 * - Per-card cost
 * - Warning badges if cost exceeds thresholds
 * - Side-by-side comparison of estimate vs actual
 *
 * Integration with appStore:
 * - Reads generatedPrompts, styleInputs, generationProgress
 * - Calculates costs using CostCalculationMock service
 * - Shows real-time cost updates during generation
 *
 * @example
 * ```svelte
 * <CostDisplayComponent
 *   showEstimate={true}
 *   showActual={false}
 *   onCostCalculated={(cost) => console.log('Cost:', cost)}
 * />
 * ```
 */
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import { costCalculationService } from '$services/factory'
  import type { CostEstimate, CostSummary } from '$contracts/index'
  import { COST_THRESHOLDS } from '$contracts/CostCalculation'

  // ============================================================================
  // PROPS
  // ============================================================================

  interface Props {
    /**
     * Whether to show estimated cost
     * @default true
     */
    showEstimate?: boolean

    /**
     * Whether to show actual cost
     * @default true
     */
    showActual?: boolean

    /**
     * Whether to show detailed breakdown
     * @default true
     */
    showBreakdown?: boolean

    /**
     * Whether to show comparison when both estimate and actual exist
     * @default true
     */
    showComparison?: boolean

    /**
     * Custom cost threshold for warnings (overrides default)
     * @default COST_THRESHOLDS.warning
     */
    warningThreshold?: number

    /**
     * Callback when cost is calculated
     * @param cost - Total cost in USD
     */
    onCostCalculated?: (cost: number) => void
  }

  let {
    showEstimate = true,
    showActual = true,
    showBreakdown = true,
    showComparison = true,
    warningThreshold = COST_THRESHOLDS.warning,
    onCostCalculated,
  }: Props = $props()

  // ============================================================================
  // STATE
  // ============================================================================

  const costService = costCalculationService

  /** Estimated cost before generation */
  let estimatedCostData = $state<CostEstimate | null>(null)

  /** Actual cost after generation */
  let actualCostData = $state<CostSummary | null>(null)

  /** Loading state for cost calculation */
  let isCalculating = $state(false)

  /** Error message if calculation fails */
  let errorMessage = $state<string | null>(null)

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  /**
   * Cost to display (actual if available, otherwise estimated)
   */
  let displayCost = $derived<number>(
    actualCostData?.totalCost ?? estimatedCostData?.estimatedCost ?? 0
  )

  /**
   * Whether cost exceeds warning threshold
   */
  let isOverBudget = $derived(displayCost > warningThreshold)

  /**
   * Whether cost exceeds maximum threshold
   */
  let isOverMaximum = $derived(displayCost >= COST_THRESHOLDS.maximum)

  /**
   * Whether cost exceeds high threshold
   */
  let isHigh = $derived(displayCost >= COST_THRESHOLDS.high && !isOverMaximum)

  /**
   * CSS class for cost level styling
   */
  let costLevelClass = $derived(
    isOverMaximum
      ? 'cost-maximum'
      : isHigh
        ? 'cost-high'
        : isOverBudget
          ? 'cost-warning'
          : 'cost-normal'
  )

  /**
   * Warning message based on cost level
   */
  let warningMessage = $derived<string | undefined>(
    isOverMaximum
      ? `Cost exceeds maximum allowed ($${COST_THRESHOLDS.maximum.toFixed(2)}). Generation cannot proceed.`
      : isHigh
        ? `High cost alert: $${displayCost.toFixed(2)}. Please review before proceeding.`
        : isOverBudget
          ? `Cost of $${displayCost.toFixed(2)} is above normal range. Proceed with caution.`
          : undefined
  )

  /**
   * Per-card cost
   */
  let perCardCost = $derived(displayCost / 22)

  /**
   * Whether both estimate and actual costs exist
   */
  let hasBothCosts = $derived(estimatedCostData !== null && actualCostData !== null)

  /**
   * Cost difference between actual and estimate
   */
  let costDifference = $derived<number | null>(
    hasBothCosts && actualCostData && estimatedCostData
      ? actualCostData.totalCost - estimatedCostData.estimatedCost
      : null
  )

  /**
   * Whether actual cost exceeded estimate
   */
  let exceededEstimate = $derived(costDifference !== null && costDifference > 0)

  // ============================================================================
  // FUNCTIONS
  // ============================================================================

  /**
   * Format currency value
   * @param amount - Amount in USD
   * @returns Formatted string (e.g., "$2.34")
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  /**
   * Calculate estimated cost based on current app state
   */
  async function calculateEstimate(): Promise<void> {
    if (!showEstimate) return

    const imageCount = 22 // Major Arcana
    const referenceImageCount = appStore.uploadedImages.length

    if (referenceImageCount === 0) {
      // Can't estimate without reference images
      return
    }

    isCalculating = true
    errorMessage = null

    try {
      const result = await costService.estimateCost({
        imageCount,
        referenceImageCount,
        estimatedPromptLength: 1000, // Default estimate
      })

      if (result.success && result.data) {
        estimatedCostData = result.data.estimate
        if (onCostCalculated) {
          onCostCalculated(result.data.estimate.estimatedCost)
        }
      } else if (result.error) {
        errorMessage = result.error.message
      }
    } catch (error) {
      errorMessage = 'Failed to calculate estimated cost'
      console.error('Cost estimation error:', error)
    } finally {
      isCalculating = false
    }
  }

  /**
   * Calculate actual cost from generation results
   */
  async function calculateActual(): Promise<void> {
    if (!showActual) return

    // Need both prompt and image generation data
    if (appStore.generatedPrompts.length === 0 || appStore.generatedCards.length === 0) {
      return
    }

    isCalculating = true
    errorMessage = null

    try {
      // Mock the usage data based on app state
      // In real implementation, this would come from actual API responses
      const promptUsage = {
        promptTokens: 1200,
        completionTokens: 3500,
        totalTokens: 4700,
        estimatedCost: 0.037,
        model: 'grok-beta' as const,
      }

      const imageUsage = {
        totalImages: appStore.generatedCards.length,
        successfulImages: appStore.completedCardCount,
        failedImages: appStore.failedCardCount,
        estimatedCost: appStore.completedCardCount * 0.1,
        totalGenerationTime: 120000,
        usagePerCard: [],
      }

      const result = await costService.calculateTotalCost({
        promptUsage,
        imageUsage,
      })

      if (result.success && result.data) {
        actualCostData = result.data.summary
        if (onCostCalculated) {
          onCostCalculated(result.data.summary.totalCost)
        }
      } else if (result.error) {
        errorMessage = result.error.message
      }
    } catch (error) {
      errorMessage = 'Failed to calculate actual cost'
      console.error('Cost calculation error:', error)
    } finally {
      isCalculating = false
    }
  }

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Recalculate estimate when reference images change
   */
  $effect(() => {
    if (appStore.uploadedImages.length > 0) {
      calculateEstimate()
    }
  })

  /**
   * Recalculate actual cost when generation completes
   */
  $effect(() => {
    if (appStore.hasAllCards) {
      calculateActual()
    }
  })
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE -->
<!-- ============================================================================ -->

<div class="cost-display" role="region" aria-label="API Cost Display">
  <!-- Loading State -->
  {#if isCalculating}
    <div class="cost-loading" aria-live="polite">
      <div class="spinner"></div>
      <p>Calculating cost...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if errorMessage}
    <div class="cost-error" role="alert" aria-live="assertive">
      <span class="error-icon" aria-hidden="true">⚠</span>
      <p>{errorMessage}</p>
    </div>
  {/if}

  <!-- Cost Display (when not loading and no error) -->
  {#if !isCalculating && !errorMessage}
    <!-- Main Cost Card -->
    <div class="cost-card {costLevelClass}">
      <!-- Total Cost -->
      <div class="cost-total">
        <h2 class="cost-label">
          {#if hasBothCosts && showComparison}
            Actual Cost
          {:else if actualCostData}
            Total Cost
          {:else}
            Estimated Cost
          {/if}
        </h2>
        <p class="cost-amount" aria-label="Total cost: {formatCurrency(displayCost)}">
          {formatCurrency(displayCost)}
        </p>
        {#if actualCostData}
          <span class="cost-type-badge actual">Actual</span>
        {:else if estimatedCostData}
          <span class="cost-type-badge estimate">Estimate</span>
        {/if}
      </div>

      <!-- Warning Badge -->
      {#if warningMessage}
        <div class="cost-warning-badge" role="alert" aria-live="polite">
          <span class="warning-icon" aria-hidden="true">
            {#if isOverMaximum}
              🛑
            {:else if isHigh}
              ⚠️
            {:else}
              💡
            {/if}
          </span>
          <p class="warning-text">{warningMessage}</p>
        </div>
      {/if}

      <!-- Cost Breakdown -->
      {#if showBreakdown}
        <div class="cost-breakdown">
          <h3 class="breakdown-title">Cost Breakdown</h3>

          {#if actualCostData}
            <!-- Actual cost breakdown -->
            <table class="breakdown-table" aria-label="Detailed cost breakdown">
              <tbody>
                <tr>
                  <td>Prompt Generation:</td>
                  <td class="breakdown-value">
                    {formatCurrency(actualCostData.textCost.totalCost)}
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="breakdown-detail">
                      ({actualCostData.textCost.inputTokens.toLocaleString()} input +
                      {actualCostData.textCost.outputTokens.toLocaleString()} output tokens)
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>Image Generation:</td>
                  <td class="breakdown-value">
                    {formatCurrency(actualCostData.imageCost.totalCost)}
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="breakdown-detail">
                      ({actualCostData.imageCost.imagesGenerated} images @ $0.10 each)
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>Vision API:</td>
                  <td class="breakdown-value">
                    {formatCurrency(actualCostData.visionCost.totalCost)}
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="breakdown-detail">
                      ({actualCostData.visionCost.requestCount} requests @ $0.05 each)
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr class="breakdown-divider">
                  <td colspan="2"><hr /></td>
                </tr>
                <tr class="breakdown-total">
                  <td>Per Card:</td>
                  <td class="breakdown-value">{formatCurrency(perCardCost)}</td>
                </tr>
                <tr class="breakdown-total">
                  <td><strong>Total (22 cards):</strong></td>
                  <td class="breakdown-value">
                    <strong>{formatCurrency(actualCostData.totalCost)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          {:else if estimatedCostData}
            <!-- Estimated cost breakdown -->
            <table class="breakdown-table" aria-label="Estimated cost breakdown">
              <tbody>
                <tr>
                  <td>Prompt Generation:</td>
                  <td class="breakdown-value">
                    {formatCurrency(estimatedCostData.breakdown.promptGeneration)}
                  </td>
                </tr>
                <tr>
                  <td>Image Generation:</td>
                  <td class="breakdown-value">
                    {formatCurrency(estimatedCostData.breakdown.imageGeneration)}
                  </td>
                </tr>
                <tr class="breakdown-divider">
                  <td colspan="2"><hr /></td>
                </tr>
                <tr class="breakdown-total">
                  <td>Per Card:</td>
                  <td class="breakdown-value">{formatCurrency(perCardCost)}</td>
                </tr>
                <tr class="breakdown-total">
                  <td><strong>Total (22 cards):</strong></td>
                  <td class="breakdown-value">
                    <strong>{formatCurrency(estimatedCostData.estimatedCost)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Assumptions -->
            {#if estimatedCostData.assumptions.length > 0}
              <details class="cost-assumptions">
                <summary>Estimation Assumptions</summary>
                <ul>
                  {#each estimatedCostData.assumptions as assumption}
                    <li>{assumption}</li>
                  {/each}
                </ul>
              </details>
            {/if}
          {/if}
        </div>
      {/if}

      <!-- Comparison (if both costs exist) -->
      {#if hasBothCosts && showComparison && estimatedCostData && actualCostData}
        <div class="cost-comparison">
          <h3 class="comparison-title">Estimate vs. Actual</h3>
          <div class="comparison-grid">
            <div class="comparison-item">
              <span class="comparison-label">Estimated:</span>
              <span class="comparison-value">{formatCurrency(estimatedCostData.estimatedCost)}</span
              >
            </div>
            <div class="comparison-item">
              <span class="comparison-label">Actual:</span>
              <span class="comparison-value">{formatCurrency(actualCostData.totalCost)}</span>
            </div>
            <div class="comparison-item comparison-diff">
              <span class="comparison-label">Difference:</span>
              <span class="comparison-value {exceededEstimate ? 'diff-over' : 'diff-under'}">
                {exceededEstimate ? '+' : ''}{formatCurrency(costDifference ?? 0)}
              </span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Info Tooltip -->
    <details class="cost-info">
      <summary tabindex="0">How are costs calculated?</summary>
      <div class="info-content">
        <p>Costs are based on Grok API pricing:</p>
        <ul>
          <li><strong>Text Input:</strong> $0.002 per 1K tokens</li>
          <li><strong>Text Output:</strong> $0.010 per 1K tokens</li>
          <li><strong>Image Generation:</strong> $0.10 per image</li>
          <li><strong>Vision API:</strong> $0.05 per request</li>
        </ul>
        <p class="info-note">
          Prices current as of November 2025. Check
          <a href="https://x.ai/api/pricing" target="_blank" rel="noopener noreferrer">
            x.ai/api/pricing
          </a>
          for latest rates.
        </p>
      </div>
    </details>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- STYLES -->
<!-- ============================================================================ -->

<style>
  .cost-display {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  /* Loading State */
  .cost-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: rgba(139, 92, 246, 0.05);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(139, 92, 246, 0.2);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Error State */
  .cost-error {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #dc2626;
  }

  .error-icon {
    font-size: 1.5rem;
  }

  /* Cost Card */
  .cost-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(217, 70, 239, 0.1));
    border-radius: 16px;
    padding: 2rem;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(139, 92, 246, 0.2);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
    transition: all 0.3s ease;
  }

  .cost-card.cost-warning {
    border-color: rgba(251, 191, 36, 0.4);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(217, 70, 239, 0.1));
  }

  .cost-card.cost-high {
    border-color: rgba(249, 115, 22, 0.4);
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(217, 70, 239, 0.1));
  }

  .cost-card.cost-maximum {
    border-color: rgba(239, 68, 68, 0.4);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(217, 70, 239, 0.1));
  }

  /* Total Cost */
  .cost-total {
    text-align: center;
    margin-bottom: 1.5rem;
    position: relative;
  }

  .cost-label {
    font-size: 1rem;
    font-weight: 600;
    color: #8b5cf6;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cost-amount {
    font-size: 3rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
    line-height: 1;
  }

  .cost-type-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.5rem;
  }

  .cost-type-badge.estimate {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .cost-type-badge.actual {
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  /* Warning Badge */
  .cost-warning-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(251, 191, 36, 0.1);
    border: 2px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .cost-card.cost-high .cost-warning-badge {
    background: rgba(249, 115, 22, 0.1);
    border-color: rgba(249, 115, 22, 0.3);
  }

  .cost-card.cost-maximum .cost-warning-badge {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .warning-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .warning-text {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #92400e;
  }

  .cost-card.cost-high .warning-text {
    color: #7c2d12;
  }

  .cost-card.cost-maximum .warning-text {
    color: #7f1d1d;
  }

  /* Cost Breakdown */
  .cost-breakdown {
    margin-top: 1.5rem;
  }

  .breakdown-title {
    font-size: 1rem;
    font-weight: 600;
    color: #4b5563;
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .breakdown-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .breakdown-table td {
    padding: 0.5rem 0;
    color: #374151;
  }

  .breakdown-value {
    text-align: right;
    font-weight: 600;
    color: #1f2937;
    font-variant-numeric: tabular-nums;
  }

  .breakdown-detail {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .breakdown-divider td {
    padding: 0.75rem 0 0.5rem 0;
  }

  .breakdown-divider hr {
    border: none;
    border-top: 1px solid rgba(139, 92, 246, 0.2);
    margin: 0;
  }

  .breakdown-total td {
    padding-top: 0.75rem;
    font-size: 0.95rem;
  }

  /* Cost Assumptions */
  .cost-assumptions {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(139, 92, 246, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(139, 92, 246, 0.1);
  }

  .cost-assumptions summary {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    user-select: none;
  }

  .cost-assumptions summary:hover {
    color: #8b5cf6;
  }

  .cost-assumptions ul {
    margin: 0.75rem 0 0 0;
    padding-left: 1.5rem;
    list-style: disc;
  }

  .cost-assumptions li {
    font-size: 0.8125rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Comparison */
  .cost-comparison {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(139, 92, 246, 0.2);
  }

  .comparison-title {
    font-size: 1rem;
    font-weight: 600;
    color: #4b5563;
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .comparison-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .comparison-item.comparison-diff {
    grid-column: 1 / -1;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(139, 92, 246, 0.1);
  }

  .comparison-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .comparison-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    font-variant-numeric: tabular-nums;
  }

  .comparison-value.diff-over {
    color: #dc2626;
  }

  .comparison-value.diff-under {
    color: #16a34a;
  }

  /* Info Tooltip */
  .cost-info {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(139, 92, 246, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(139, 92, 246, 0.1);
  }

  .cost-info summary {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    user-select: none;
    list-style: none;
  }

  .cost-info summary::-webkit-details-marker {
    display: none;
  }

  .cost-info summary::before {
    content: '💡 ';
    margin-right: 0.5rem;
  }

  .cost-info summary:hover {
    color: #8b5cf6;
  }

  .cost-info[open] summary {
    margin-bottom: 0.75rem;
    color: #8b5cf6;
  }

  .info-content {
    font-size: 0.8125rem;
    color: #4b5563;
  }

  .info-content p {
    margin: 0 0 0.5rem 0;
  }

  .info-content ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    list-style: disc;
  }

  .info-content li {
    margin-top: 0.25rem;
  }

  .info-note {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .info-note a {
    color: #8b5cf6;
    text-decoration: none;
  }

  .info-note a:hover {
    text-decoration: underline;
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .cost-amount {
      font-size: 2.5rem;
    }

    .comparison-grid {
      grid-template-columns: 1fr;
    }

    .comparison-item.comparison-diff {
      grid-column: 1;
    }
  }

  /* Accessibility: Focus States */
  .cost-info summary:focus,
  .cost-assumptions summary:focus {
    outline: 2px solid #8b5cf6;
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Dark mode support (if needed) */
  @media (prefers-color-scheme: dark) {
    .cost-amount,
    .breakdown-value,
    .comparison-value {
      color: #f3f4f6;
    }

    .cost-label,
    .breakdown-title,
    .comparison-title {
      color: #d1d5db;
    }

    .warning-text {
      color: #fcd34d;
    }

    .cost-card.cost-high .warning-text {
      color: #fb923c;
    }

    .cost-card.cost-maximum .warning-text {
      color: #fca5a5;
    }
  }
</style>
