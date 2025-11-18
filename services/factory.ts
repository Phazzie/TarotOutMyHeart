/**
 * @fileoverview Service Factory - Provides mock or real service instances
 * @purpose Central factory for dependency injection with USE_MOCKS toggle
 * @dataFlow Environment Config → Factory → Service Instances → Application
 * @updated 2025-11-07
 *
 * @example
 * ```typescript
 * import { imageUploadService, styleInputService } from '$services/factory'
 *
 * // Service automatically uses mock or real based on USE_MOCKS flag
 * const result = await imageUploadService.uploadImages({ files })
 * ```
 */

import type { IImageUploadService } from '$contracts/ImageUpload'
import type { IStyleInputService } from '$contracts/StyleInput'
import type { IPromptGenerationService } from '$contracts/PromptGeneration'
import type { IImageGenerationService } from '$contracts/ImageGeneration'
import type { IDeckDisplayService } from '$contracts/DeckDisplay'
import type { ICostCalculationService } from '$contracts/CostCalculation'
import type { IDownloadService } from '$contracts/Download'

// Import mock services (singleton instances)
import { imageUploadMockService } from './mock/ImageUploadMock'
import { styleInputMockService } from './mock/StyleInputMock'
import { promptGenerationMockService } from './mock/PromptGenerationMock'
import { imageGenerationMockService } from './mock/ImageGenerationMock'
import { deckDisplayMockService } from './mock/DeckDisplayMock'
import { costCalculationMockService } from './mock/CostCalculationMock'
import { downloadMockService } from './mock/DownloadMock'

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Singleton mock service instances (imported from mock modules)
 *
 * NOTE: These singletons share state across all usages in the application.
 *
 * For testing:
 * - Tests that need isolated state should call the service's reset/cleanup methods
 *   between test runs to avoid test pollution
 * - Each mock service implements methods to clear its internal state
 * - Example: imageUploadMockService.clearAllImages() resets uploaded images
 *
 * For production:
 * - Real services will be instantiated here when implemented
 * - Real services will likely use external state management (database, API)
 *   instead of in-memory state
 *
 * Singleton instances are already created and exported from the mock files
 */

// TODO: Import real services when implemented
// import { ImageUploadService } from './real/ImageUploadService'
// import { StyleInputService } from './real/StyleInputService'
// import { PromptGenerationService } from './real/PromptGenerationService'
// import { ImageGenerationService } from './real/ImageGenerationService'
// import { DeckDisplayService } from './real/DeckDisplayService'
// import { CostCalculationService } from './real/CostCalculationService'
// import { DownloadService } from './real/DownloadService'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Toggle between mock and real services
 *
 * - true: Use mock services (for development without API keys)
 * - false: Use real services (for production with real Grok API)
 *
 * Can be overridden by environment variable USE_MOCKS
 */
const USE_MOCKS = process.env['USE_MOCKS'] !== 'false' // Default to true

/**
 * Log which services are being used
 */
if (typeof window !== 'undefined') {
  console.log(`🔧 Service Factory: Using ${USE_MOCKS ? 'MOCK' : 'REAL'} services`)
}

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

/**
 * Image Upload Service
 *
 * Handles reference image uploads, validation, and storage.
 * Mock: In-memory storage with mock preview URLs
 * Real: Vercel Blob storage with real preview URLs
 */
export const imageUploadService: IImageUploadService = USE_MOCKS
  ? imageUploadMockService
  : imageUploadMockService // TODO: Replace with real service
// : new ImageUploadService(process.env.VERCEL_BLOB_TOKEN!)

/**
 * Style Input Service
 *
 * Handles style parameter validation and persistence.
 * Mock: localStorage with mock validation
 * Real: localStorage with real validation (same as mock for this service)
 */
export const styleInputService: IStyleInputService = USE_MOCKS
  ? styleInputMockService
  : styleInputMockService // TODO: Replace with real service
// : new StyleInputService()

/**
 * Prompt Generation Service
 *
 * Generates 22 card prompts using Grok vision API.
 * Mock: Simulated AI generation with realistic delays
 * Real: Actual Grok vision API calls
 */
export const promptGenerationService: IPromptGenerationService = USE_MOCKS
  ? promptGenerationMockService
  : promptGenerationMockService // TODO: Replace with real service
// : new PromptGenerationService(process.env.XAI_API_KEY!)

/**
 * Image Generation Service
 *
 * Generates 22 card images using Grok image API.
 * Mock: Simulated image generation with placeholder images
 * Real: Actual Grok image API calls
 */
export const imageGenerationService: IImageGenerationService = USE_MOCKS
  ? imageGenerationMockService
  : imageGenerationMockService // TODO: Replace with real service
// : new ImageGenerationService(process.env.XAI_API_KEY!)

/**
 * Deck Display Service
 *
 * Manages gallery display state and interactions.
 * Mock: In-memory state management
 * Real: In-memory state management (same as mock for this service)
 */
export const deckDisplayService: IDeckDisplayService = USE_MOCKS
  ? deckDisplayMockService
  : deckDisplayMockService // TODO: Replace with real service
// : new DeckDisplayService()

/**
 * Cost Calculation Service
 *
 * Calculates and formats API usage costs.
 * Mock: Mock cost calculations with Grok pricing
 * Real: Real cost calculations with Grok pricing (same logic as mock)
 */
export const costCalculationService: ICostCalculationService = USE_MOCKS
  ? costCalculationMockService
  : costCalculationMockService // TODO: Replace with real service
// : new CostCalculationService()

/**
 * Download Service
 *
 * Packages and downloads deck as ZIP file.
 * Mock: Simulated download without actual file creation
 * Real: Real JSZip creation and browser download
 */
export const downloadService: IDownloadService = USE_MOCKS
  ? downloadMockService
  : downloadMockService // TODO: Replace with real service
// : new DownloadService()

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Get all services as an object
 *
 * Useful for passing services as props or context.
 *
 * @returns Object with all service instances
 *
 * @example
 * ```typescript
 * const services = getAllServices()
 * // { imageUploadService, styleInputService, ... }
 * ```
 */
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

/**
 * Check if currently using mock services
 *
 * @returns true if using mocks, false if using real services
 *
 * @example
 * ```typescript
 * if (isUsingMocks()) {
 *   console.log('Development mode with mock data')
 * }
 * ```
 */
export function isUsingMocks(): boolean {
  return USE_MOCKS
}

/**
 * Get service factory configuration
 *
 * @returns Configuration object with service modes
 *
 * @example
 * ```typescript
 * const config = getFactoryConfig()
 * // { useMocks: true, environment: 'development', ... }
 * ```
 */
export function getFactoryConfig() {
  return {
    useMocks: USE_MOCKS,
    environment: process.env['NODE_ENV'] || 'development',
    hasApiKey: !!process.env['XAI_API_KEY'],
    hasBlobToken: !!process.env['VERCEL_BLOB_TOKEN'],
  }
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Log all available services
 *
 * Development helper to verify service availability.
 */
export function logAvailableServices() {
  const services = getAllServices()
  const config = getFactoryConfig()

  console.group('📦 Available Services')
  console.log('Mode:', config.useMocks ? 'MOCK' : 'REAL')
  console.log('Environment:', config.environment)
  console.log('Services:', Object.keys(services))
  console.groupEnd()
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type for the services object
 * Useful for TypeScript typing in components
 */
export type Services = ReturnType<typeof getAllServices>

/**
 * Type for individual service keys
 */
export type ServiceKey = keyof Services
