/**
 * Service factory — wires up either real or mock implementations.
 *
 * CRITICAL FIX (PreMortem #6):
 *   process.env is undefined in Vite client bundles.
 *   Must use import.meta.env['VITE_USE_MOCKS'] (Vite inlines this at build time).
 *   Set VITE_USE_MOCKS=false in Vercel env vars BEFORE running a production build.
 *   If the env var is missing at build time, the bundle defaults to mocks.
 *
 * Usage:
 *   In Vite/SvelteKit:       import.meta.env['VITE_USE_MOCKS']
 *   In Vercel dashboard:     set VITE_USE_MOCKS = false
 *   For local dev with real: VITE_USE_MOCKS=false vite dev
 */

import type { IImageUploadService } from '$contracts/ImageUpload'
import type { IStyleInputService } from '$contracts/StyleInput'
import type { IPromptGenerationService } from '$contracts/PromptGeneration'
import type { IImageGenerationService } from '$contracts/ImageGeneration'
import type { IDeckDisplayService } from '$contracts/DeckDisplay'
import type { ICostCalculationService } from '$contracts/CostCalculation'
import type { IDownloadService } from '$contracts/Download'

// Mock implementations
import { ImageUploadMockService } from './mock/ImageUploadMock'
import { StyleInputMockService } from './mock/StyleInputMock'
import { PromptGenerationMockService } from './mock/PromptGenerationMock'
import { ImageGenerationMockService } from './mock/ImageGenerationMock'
import { DeckDisplayMockService } from './mock/DeckDisplayMock'
import { CostCalculationMockService } from './mock/CostCalculationMock'
import { DownloadMockService } from './mock/DownloadMock'

// Real implementations
import { StyleInputService } from './real/StyleInputService'
import { ImageUploadService } from './real/ImageUploadService'
import { PromptGenerationService } from './real/PromptGenerationService'
import { ImageGenerationService } from './real/ImageGenerationService'
import { DeckDisplayService } from './real/DeckDisplayService'
import { CostCalculationService } from './real/CostCalculationService'
import { DownloadService } from './real/DownloadService'

// Vite inlines this at build time — resolves to literal true/false in the bundle.
// Default: true (mocks) so development never accidentally bills the xAI API.
const USE_MOCKS = import.meta.env['VITE_USE_MOCKS'] !== 'false'

// ── Mock singletons ──────────────────────────────────────────────────────────
const imageUploadMockService = new ImageUploadMockService()
const styleInputMockService = new StyleInputMockService()
const promptGenerationMockService = new PromptGenerationMockService()
const imageGenerationMockService = new ImageGenerationMockService()
const deckDisplayMockService = new DeckDisplayMockService()
const costCalculationMockService = new CostCalculationMockService()
const downloadMockService = new DownloadMockService()

// ── Real singletons ──────────────────────────────────────────────────────────
const imageUploadRealService = new ImageUploadService()
const styleInputRealService = new StyleInputService()
const promptGenerationRealService = new PromptGenerationService()
const imageGenerationRealService = new ImageGenerationService()
const deckDisplayRealService = new DeckDisplayService()
const costCalculationRealService = new CostCalculationService()
const downloadRealService = new DownloadService()

// ── Exports — typed as interfaces, fully aligned with contracts ───────────────
export const imageUploadService: IImageUploadService = USE_MOCKS
  ? imageUploadMockService
  : imageUploadRealService

export const styleInputService: IStyleInputService = USE_MOCKS
  ? styleInputMockService
  : styleInputRealService

export const promptGenerationService: IPromptGenerationService = USE_MOCKS
  ? promptGenerationMockService
  : promptGenerationRealService

export const imageGenerationService: IImageGenerationService = USE_MOCKS
  ? imageGenerationMockService
  : imageGenerationRealService

export const deckDisplayService: IDeckDisplayService = USE_MOCKS
  ? deckDisplayMockService
  : deckDisplayRealService

export const costCalculationService: ICostCalculationService = USE_MOCKS
  ? costCalculationMockService
  : costCalculationRealService

export const downloadService: IDownloadService = USE_MOCKS
  ? downloadMockService
  : downloadRealService

export function getAllServices() {
  return {
    imageUploadService,
    styleInputService,
    promptGenerationService,
    imageGenerationService,
    deckDisplayService,
    costCalculationService,
    downloadService,
  }
}

export function isUsingMocks(): boolean {
  return USE_MOCKS
}

export function getFactoryConfig() {
  return {
    useMocks: USE_MOCKS,
    environment: import.meta.env.MODE ?? 'development',
  }
}

export type Services = ReturnType<typeof getAllServices>
export type ServiceKey = keyof Services
