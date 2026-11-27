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

  const {
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
  const displayCost = $derived<number>(
    actualCostData?.totalCost ?? estimatedCostData?.estimatedCost ?? 0
  )

  /**
   * Whether cost exceeds warning threshold
   */
  const isOverBudget = $derived(displayCost > warningThreshold)

  /**
   * Whether cost exceeds maximum threshold
   */
  const isOverMaximum = $derived(displayCost >= COST_THRESHOLDS.maximum)

  /**
   * Whether cost exceeds high threshold
   */
  const isHigh = $derived(displayCost >= COST_THRESHOLDS.high && !isOverMaximum)

  /**
   * CSS class for cost level styling
   */
  const costLevelClass = $derived(
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
  const warningMessage = $derived<string | undefined>(
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
  const perCardCost = $derived(displayCost / 22)

  /**
   * Whether both estimate and actual costs exist
   */
  const hasBothCosts = $derived(estimatedCostData !== null && actualCostData !== null)

  /**
   * Cost difference between actual and estimate
   */
  const costDifference = $derived<number | null>(
    hasBothCosts && actualCostData && estimatedCostData
      ? actualCostData.totalCost - estimatedCostData.estimatedCost
      : null
  )

  /**
   * Whether actual cost exceeded estimate
   */
  const exceededEstimate = $derived(costDifference !== null && costDifference > 0)

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
        estimatedCost: appStore.completedCardCount * 0.02,
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
      <p>Totting up fees…</p>
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
            Actual fees
          {:else if actualCostData}
            Total fees
          {:else}
            Fee estimate
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
          <h3 class="breakdown-title">Itemized</h3>

          {#if actualCostData}
            <!-- Actual cost breakdown -->
            <table class="breakdown-table" aria-label="Detailed cost breakdown">
              <tbody>
                <tr>
                  <td>Drafting case files</td>
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
                  <td>Illustrating cards</td>
                  <td class="breakdown-value">
                    {formatCurrency(actualCostData.imageCost.totalCost)}
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="breakdown-detail">
                      ({actualCostData.imageCost.imagesGenerated} images @ $0.02 each)
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>Reading exhibits</td>
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
                  <td>Per card</td>
                  <td class="breakdown-value">{formatCurrency(perCardCost)}</td>
                </tr>
                <tr class="breakdown-total">
                  <td><strong>Total, 22 cards</strong></td>
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
                  <td>Drafting case files</td>
                  <td class="breakdown-value">
                    {formatCurrency(estimatedCostData.breakdown.promptGeneration)}
                  </td>
                </tr>
                <tr>
                  <td>Illustrating cards</td>
                  <td class="breakdown-value">
                    {formatCurrency(estimatedCostData.breakdown.imageGeneration)}
                  </td>
                </tr>
                <tr class="breakdown-divider">
                  <td colspan="2"><hr /></td>
                </tr>
                <tr class="breakdown-total">
                  <td>Per card</td>
                  <td class="breakdown-value">{formatCurrency(perCardCost)}</td>
                </tr>
                <tr class="breakdown-total">
                  <td><strong>Total, 22 cards</strong></td>
                  <td class="breakdown-value">
                    <strong>{formatCurrency(estimatedCostData.estimatedCost)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Assumptions -->
            {#if estimatedCostData.assumptions.length > 0}
              <details class="cost-assumptions">
                <summary>Fine print</summary>
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

    <p class="fee-note">Paid by the Bureau in Grok credits. You are charged nothing.</p>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- STYLES -->
<!-- ============================================================================ -->

<style>
  /* A carbon-copy fee slip clipped to the side of the intake form. */
  .cost-display {
    font-family: var(--font-body);
    color: var(--ink);
  }

  .cost-loading {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem;
    font-size: 0.85rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #c9bfa5;
    border-top-color: var(--stamp-red);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .cost-error {
    display: flex;
    gap: 0.5rem;
    padding: 0.7rem;
    border: 2px solid var(--stamp-red);
    background: var(--carbon-pink);
    color: #7d1f1c;
    font-size: 0.85rem;
  }

  .cost-card {
    position: relative;
    padding: 1rem 1rem 0.8rem;
    background: var(--carbon-yellow);
    border: 1px solid #d7c35c;
    box-shadow: 0 10px 18px -12px rgba(0, 0, 0, 0.6);
    /* Perforated top edge. */
    -webkit-mask: radial-gradient(circle 5px at 8px 0, transparent 98%, #000) -8px 0 / 16px 100%;
    mask: radial-gradient(circle 5px at 8px 0, transparent 98%, #000) -8px 0 / 16px 100%;
  }

  .cost-total {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.25rem 0.75rem;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.5rem;
    margin-bottom: 0.6rem;
  }

  .cost-label {
    width: 100%;
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .cost-amount {
    font-family: var(--font-typed);
    font-size: 2rem;
    line-height: 1;
  }

  .cost-type-badge {
    padding: 0.1rem 0.4rem;
    border: 2px solid var(--stamp-blue);
    color: var(--stamp-blue);
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transform: rotate(-4deg);
  }

  .cost-warning-badge {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem;
    margin-bottom: 0.6rem;
    border: 1px dashed #6b4a00;
    font-size: 0.8rem;
  }

  .breakdown-title,
  .comparison-title {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
  }

  .breakdown-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .breakdown-table td {
    padding: 0.2rem 0;
    border-bottom: 1px dotted rgba(0, 0, 0, 0.3);
  }

  .breakdown-value {
    text-align: right;
    font-family: var(--font-typed);
  }

  .breakdown-divider td {
    border: none;
    padding: 0;
  }

  .breakdown-divider hr {
    border: none;
    border-top: 1px solid var(--ink);
    margin: 0.2rem 0;
  }

  .breakdown-detail {
    font-size: 0.72rem;
    color: #4a3f13;
  }

  .cost-assumptions {
    margin-top: 0.6rem;
    font-size: 0.75rem;
  }

  .cost-assumptions summary {
    cursor: pointer;
    font-family: var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cost-assumptions ul {
    margin: 0.3rem 0 0;
    padding-left: 1rem;
  }

  .cost-comparison {
    margin-top: 0.6rem;
  }

  .comparison-grid {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.85rem;
  }

  .comparison-item {
    display: flex;
    justify-content: space-between;
  }

  .diff-over {
    color: var(--stamp-red);
  }

  .diff-under {
    color: #24542f;
  }

  .fee-note {
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: #d9d2b6;
  }
</style>
