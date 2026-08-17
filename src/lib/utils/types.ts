/**
 * @fileoverview Type Guard and Nominal Type Utility Module
 * @purpose Provides strict, zero-dependency runtime type guards and brand constructors for nominal types.
 * @dataFlow Raw strings/numbers/objects -> Type Guard Validation -> Strictly typed branded values
 * @boundary All components and services consuming untrusted data or constructing branded IDs
 */

import type { ImageId, ImageMimeType } from '$contracts/ImageUpload'
import { ImageUploadErrorCode } from '$contracts/ImageUpload'
import type { PromptId, CardNumber } from '$contracts/PromptGeneration'
import type { GeneratedCardId } from '$contracts/ImageGeneration'
import type { PredefinedTheme, PredefinedTone } from '$contracts/StyleInput'
import { ALLOWED_IMAGE_TYPES } from '$contracts/ImageUpload'
import { PREDEFINED_THEMES, PREDEFINED_TONES } from '$contracts/StyleInput'

// ============================================================================
// BRAND CONSTRUCTORS (Isolated Nominal Type Construction)
// ============================================================================

/**
 * Construct a branded ImageId safely.
 */
export function createImageId(id: string): ImageId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return id as ImageId
}

/**
 * Construct a branded PromptId safely.
 */
export function createPromptId(id: string): PromptId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return id as PromptId
}

/**
 * Construct a branded GeneratedCardId safely.
 */
export function createGeneratedCardId(id: string): GeneratedCardId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return id as GeneratedCardId
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Validates if a number is a valid Major Arcana CardNumber (0 to 21).
 */
export function isCardNumber(num: number): num is CardNumber {
  return Number.isInteger(num) && num >= 0 && num <= 21
}

/**
 * Validates if a string is an allowed ImageMimeType.
 */
export function isImageMimeType(mime: string): mime is ImageMimeType {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return ALLOWED_IMAGE_TYPES.includes(mime as ImageMimeType)
}

/**
 * Validates if a string is a PredefinedTheme.
 */
export function isPredefinedTheme(theme: string): theme is PredefinedTheme {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return PREDEFINED_THEMES.includes(theme as PredefinedTheme)
}

/**
 * Validates if a string is a PredefinedTone.
 */
export function isPredefinedTone(tone: string): tone is PredefinedTone {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return PREDEFINED_TONES.includes(tone as PredefinedTone)
}

/**
 * Raw structure returned from AI for a generated prompt card.
 */
export interface RawPromptItem {
  cardNumber: number
  cardName: string
  generatedPrompt: string
}

/**
 * Type guard to check if an unknown object matches the RawPromptItem structure.
 */
export function isRawPromptItem(obj: unknown): obj is RawPromptItem {
  if (typeof obj !== 'object' || obj === null) return false
  const record = obj as Record<string, unknown> // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const cardNumber = record['cardNumber']
  return (
    typeof cardNumber === 'number' &&
    isCardNumber(cardNumber) &&
    typeof record['cardName'] === 'string' &&
    typeof record['generatedPrompt'] === 'string'
  )
}

/**
 * Type guard to check if an unknown value is an array of RawPromptItems.
 */
export function isRawPromptArray(data: unknown): data is RawPromptItem[] {
  return Array.isArray(data) && data.every(isRawPromptItem)
}

/**
 * Type guard to check if an unknown object is a valid StyleInputs object.
 */
export function isStyleInputs(obj: unknown): obj is import('$contracts/StyleInput').StyleInputs {
  if (typeof obj !== 'object' || obj === null) return false
  const rec = obj as Record<string, unknown> // eslint-disable-line @typescript-eslint/consistent-type-assertions
  return (
    typeof rec['theme'] === 'string' &&
    typeof rec['tone'] === 'string' &&
    typeof rec['description'] === 'string' &&
    (rec['concept'] === undefined || typeof rec['concept'] === 'string') &&
    (rec['characters'] === undefined || typeof rec['characters'] === 'string')
  )
}

/**
 * Type guard for record/object.
 */
export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

/**
 * Type guard for key of StyleInputs.
 */
export function isKeyOfStyleInputs(
  key: string
): key is keyof import('$contracts/StyleInput').StyleInputs {
  return ['theme', 'tone', 'description', 'concept', 'characters'].includes(key)
}

export function isImageUploadErrorCode(code: string): code is ImageUploadErrorCode {
  return Object.values(ImageUploadErrorCode).includes(
    code as ImageUploadErrorCode // eslint-disable-line @typescript-eslint/consistent-type-assertions
  )
}

/**
 * Safely map string code to ImageUploadErrorCode without type casting.
 */
export function toImageUploadErrorCode(code: string): ImageUploadErrorCode {
  if (isImageUploadErrorCode(code)) {
    return code
  }
  return ImageUploadErrorCode.UPLOAD_FAILED
}
