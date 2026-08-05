<!--
  @fileoverview Test page for GenerationProgressComponent
  @purpose Demo and test the GenerationProgressComponent with mock data
  @updated 2025-11-15
-->

<script lang="ts">
  import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { imageGenerationService } from '$services/factory'
  import type { CardPrompt } from '$contracts/PromptGeneration'

  // Mock service
  const generationService = imageGenerationService

  // Mock prompts for testing
  const mockPrompts: CardPrompt[] = Array.from({ length: 22 }, (_, i) => ({
    id: `prompt-${i}` as import('../../../contracts/PromptGeneration').PromptId,
    cardNumber: i as import('../../../contracts/PromptGeneration').CardNumber,
    cardName:
      [
        'The Fool',
        'The Magician',
        'The High Priestess',
        'The Empress',
        'The Emperor',
        'The Hierophant',
        'The Lovers',
        'The Chariot',
        'Strength',
        'The Hermit',
        'Wheel of Fortune',
        'Justice',
        'The Hanged Man',
        'Death',
        'Temperance',
        'The Devil',
        'The Tower',
        'The Star',
        'The Moon',
        'The Sun',
        'Judgement',
        'The World',
      ][i] || `Card ${i}`,
    traditionalMeaning: 'Sample meaning',
    generatedPrompt: `A tarot card illustration for card ${i}...`,
    confidence: 0.95,
    generatedAt: new Date(),
  }))

  // Test functions
  async function startGeneration() {
    appStore.setGeneratedPrompts(mockPrompts)
    appStore.setLoading('generatingImages', true)

    try {
      const result = await generationService.generateImages({
        prompts: mockPrompts,
        saveToStorage: true,
        onProgress: (
          progress: import('../../../contracts/ImageGeneration').ImageGenerationProgress
        ) => {
          appStore.updateGenerationProgress(progress)
        },
      })

      if (result.success && result.data) {
        appStore.setGeneratedCards(result.data.generatedCards)
      }
    } finally {
      appStore.setLoading('generatingImages', false)
    }
  }

  function cancelGeneration() {
    appStore.setLoading('generatingImages', false)
    appStore.clearGenerationProgress()
    console.log('Generation canceled!')
  }

  function retryFailed(cardNumber: number) {
    console.log(`Retry card ${cardNumber}`)
  }

  function resetState() {
    appStore.clearGenerationProgress()
    appStore.clearGeneratedCards()
    appStore.setLoading('generatingImages', false)
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>GenerationProgressComponent Test</h1>
    <p>Demo of real-time progress tracking for image generation</p>
  </header>

  <div class="controls">
    <button class="start-button" onclick={startGeneration} disabled={appStore.isGenerating}>
      Start Generation
    </button>
    <button class="reset-button" onclick={resetState}> Reset </button>
  </div>

  <div class="component-demo">
    <GenerationProgressComponent onCancel={cancelGeneration} onRetryFailed={retryFailed} />
  </div>

  <div class="info">
    <h2>Component Features</h2>
    <ul>
      <li>✅ Real-time progress bar (0-100%)</li>
      <li>✅ Stats display (X/22 cards completed)</li>
      <li>✅ Current card being generated with spinner</li>
      <li>✅ Estimated time remaining</li>
      <li>✅ Failed cards list with retry functionality</li>
      <li>✅ Cancel button during generation</li>
      <li>✅ Completion celebration message</li>
      <li>✅ Fully accessible (ARIA labels, keyboard navigation)</li>
      <li>✅ Responsive design</li>
      <li>✅ Purple/gold theme</li>
    </ul>
  </div>
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .page-header p {
    font-size: 1.125rem;
    color: #666;
  }

  .controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .start-button,
  .reset-button {
    padding: 1rem 2rem;
    font-size: 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .start-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .start-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }

  .start-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .reset-button {
    background: #e2e8f0;
    color: #2d3748;
  }

  .reset-button:hover {
    background: #cbd5e0;
  }

  .component-demo {
    margin-bottom: 3rem;
  }

  .info {
    background: #f7fafc;
    padding: 2rem;
    border-radius: 8px;
  }

  .info h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .info ul {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }

  .info li {
    font-size: 1rem;
    color: #4a5568;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .controls {
      flex-direction: column;
    }

    .start-button,
    .reset-button {
      width: 100%;
    }
  }
</style>
