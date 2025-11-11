/**
 * @fileoverview Contract tests for StyleInput seam
 * @purpose Validate StyleInputMock matches StyleInput contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. State management - Save/load operations work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  IStyleInputService,
  StyleInputs,
} from '$contracts/StyleInput'
import {
  StyleInputErrorCode,
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
  DEFAULT_STYLE_INPUTS,
} from '$contracts/StyleInput'
import { styleInputMockService } from '$services/mock/StyleInputMock'

describe('StyleInput Contract Compliance', () => {
  let service: IStyleInputService

  beforeEach(async () => {
    service = styleInputMockService
    // Clear draft before each test
    await service.clearDraft()
  })

  describe('Interface Implementation', () => {
    it('should implement IStyleInputService interface', () => {
      expect(service).toBeDefined()
      expect(service.validateStyleInputs).toBeDefined()
      expect(typeof service.validateStyleInputs).toBe('function')
      expect(service.saveStyleInputs).toBeDefined()
      expect(typeof service.saveStyleInputs).toBe('function')
      expect(service.loadStyleInputs).toBeDefined()
      expect(typeof service.loadStyleInputs).toBe('function')
      expect(service.getDefaults).toBeDefined()
      expect(typeof service.getDefaults).toBe('function')
      expect(service.getPredefinedOptions).toBeDefined()
      expect(typeof service.getPredefinedOptions).toBe('function')
      expect(service.clearDraft).toBeDefined()
      expect(typeof service.clearDraft).toBe('function')
    })
  })

  describe('validateStyleInputs()', () => {
    it('should validate complete valid inputs', async () => {
      const validInputs = {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'A neon-lit dystopian future with cybernetic enhancements',
      }

      const response = await service.validateStyleInputs(validInputs)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.validation.isValid).toBe(true)
        expect(response.data.validation.canProceed).toBe(true)
        expect(response.data.errors).toHaveLength(0)
      }
    })

    it('should validate theme (not empty, <= 50 chars)', async () => {
      // Empty theme
      const emptyTheme = await service.validateStyleInputs({ theme: '' })
      expect(emptyTheme.data?.errors.length).toBeGreaterThan(0)

      // Too long theme
      const longTheme = 'x'.repeat(CHAR_LIMITS.theme + 1)
      const tooLongTheme = await service.validateStyleInputs({ theme: longTheme })
      expect(tooLongTheme.data?.errors.length).toBeGreaterThan(0)

      // Valid theme
      const validTheme = await service.validateStyleInputs({ theme: 'Cyberpunk' })
      expect(validTheme.success).toBe(true)
    })

    it('should validate tone (not empty, <= 50 chars)', async () => {
      // Empty tone
      const emptyTone = await service.validateStyleInputs({ tone: '' })
      expect(emptyTone.data?.errors.length).toBeGreaterThan(0)

      // Too long tone
      const longTone = 'x'.repeat(CHAR_LIMITS.tone + 1)
      const tooLongTone = await service.validateStyleInputs({ tone: longTone })
      expect(tooLongTone.data?.errors.length).toBeGreaterThan(0)

      // Valid tone
      const validTone = await service.validateStyleInputs({ tone: 'Dark' })
      expect(validTone.success).toBe(true)
    })

    it('should validate description (10-500 chars)', async () => {
      // Too short
      const shortDesc = await service.validateStyleInputs({ description: 'short' })
      expect(shortDesc.data?.errors.length).toBeGreaterThan(0)

      // Too long
      const longDesc = 'x'.repeat(CHAR_LIMITS.description.max + 1)
      const tooLongDesc = await service.validateStyleInputs({ description: longDesc })
      expect(tooLongDesc.data?.errors.length).toBeGreaterThan(0)

      // Valid description
      const validDesc = 'A detailed description that meets the minimum length requirement'
      const validResponse = await service.validateStyleInputs({ description: validDesc })
      expect(validResponse.success).toBe(true)
    })

    it('should validate optional concept (<= 200 chars)', async () => {
      // Valid concept
      const validConcept = await service.validateStyleInputs({
        concept: 'A cyberpunk world',
      })
      expect(validConcept.success).toBe(true)

      // Too long concept
      const longConcept = 'x'.repeat(CHAR_LIMITS.concept + 1)
      const tooLongConcept = await service.validateStyleInputs({ concept: longConcept })
      expect(tooLongConcept.data?.errors.length).toBeGreaterThan(0)

      // Empty concept is valid (optional)
      const emptyConceptResponse = await service.validateStyleInputs({ concept: '' })
      expect(emptyConceptResponse.success).toBe(true)
    })

    it('should validate optional characters (<= 200 chars)', async () => {
      // Valid characters
      const validChars = await service.validateStyleInputs({
        characters: 'Augmented humans',
      })
      expect(validChars.success).toBe(true)

      // Too long characters
      const longChars = 'x'.repeat(CHAR_LIMITS.characters + 1)
      const tooLongChars = await service.validateStyleInputs({ characters: longChars })
      expect(tooLongChars.data?.errors.length).toBeGreaterThan(0)

      // Empty characters is valid (optional)
      const emptyCharsResponse = await service.validateStyleInputs({ characters: '' })
      expect(emptyCharsResponse.success).toBe(true)
    })

    it('should return validation with field-level details', async () => {
      const response = await service.validateStyleInputs({
        theme: 'Valid',
        tone: '', // Invalid
        description: 'This is a valid description with enough characters',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.validation.isValid).toBe(false)
        expect(response.data.validation.fields.theme.isValid).toBe(true)
        expect(response.data.validation.fields.tone.isValid).toBe(false)
        expect(response.data.errors.length).toBeGreaterThan(0)
      }
    })

    it('should return correct error codes', async () => {
      const response = await service.validateStyleInputs({
        theme: '',
        tone: '',
        description: 'short',
      })

      expect(response.data?.errors.length).toBeGreaterThan(0)
      if (response.data) {
        const errorCodes = response.data.errors.map(e => e.code)
        expect(errorCodes.length).toBeGreaterThan(0)
      }
    })
  })

  describe('saveStyleInputs()', () => {
    it('should save valid style inputs', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'A neon-lit dystopian future with cybernetic enhancements',
        concept: 'Megacorporation control',
        characters: 'Augmented humans',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: false,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.saved).toBe(true)
        expect(response.data.styleInputs).toEqual(styleInputs)
        expect(response.data.savedAt).toBeInstanceOf(Date)
        expect(response.data.savedToDraft).toBe(false)
      }
    })

    it('should save to draft when saveAsDraft is true', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Gothic',
        tone: 'Dark',
        description: 'Victorian era with supernatural elements and mystery',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.savedToDraft).toBe(true)
    })

    it('should validate inputs before saving', async () => {
      const invalidInputs: StyleInputs = {
        theme: '',
        tone: '',
        description: 'short',
      }

      const response = await service.saveStyleInputs({
        styleInputs: invalidInputs,
        saveAsDraft: false,
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should return all fields in saved data', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Art Nouveau',
        tone: 'Mystical',
        description: 'Flowing organic forms with nature motifs and elegant curves',
        concept: 'Natural world connections',
        characters: 'Ethereal beings',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: false,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.styleInputs.theme).toBe(styleInputs.theme)
        expect(response.data.styleInputs.tone).toBe(styleInputs.tone)
        expect(response.data.styleInputs.description).toBe(styleInputs.description)
        expect(response.data.styleInputs.concept).toBe(styleInputs.concept)
        expect(response.data.styleInputs.characters).toBe(styleInputs.characters)
      }
    })
  })

  describe('loadStyleInputs()', () => {
    it('should return null when no input saved', async () => {
      const response = await service.loadStyleInputs({ loadFromDraft: true })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.found).toBe(false)
        expect(response.data.styleInputs).toBeNull()
        expect(response.data.loadedFrom).toBe('none')
      }
    })

    it('should return saved input after save', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Watercolor',
        tone: 'Soft',
        description: 'Gentle flowing watercolor effects with pastel tones',
      }

      await service.saveStyleInputs({ styleInputs, saveAsDraft: true })
      const response = await service.loadStyleInputs({ loadFromDraft: true })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.found).toBe(true)
        expect(response.data.styleInputs).toEqual(styleInputs)
        expect(response.data.loadedFrom).toBe('draft')
      }
    })

    it('should load from draft when available', async () => {
      const draftInputs: StyleInputs = {
        theme: 'Minimalist',
        tone: 'Modern',
        description: 'Clean lines and simple geometric forms with negative space',
      }

      await service.saveStyleInputs({ styleInputs: draftInputs, saveAsDraft: true })
      const response = await service.loadStyleInputs({ loadFromDraft: true })

      expect(response.success).toBe(true)
      expect(response.data?.found).toBe(true)
      expect(response.data?.loadedFrom).toBe('draft')
    })
  })

  describe('getDefaults()', () => {
    it('should return default style inputs', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.defaults).toBeDefined()
        expect(response.data.defaults.theme).toBe(DEFAULT_STYLE_INPUTS.theme)
        expect(response.data.defaults.tone).toBe(DEFAULT_STYLE_INPUTS.tone)
        expect(response.data.defaults.description).toBe(DEFAULT_STYLE_INPUTS.description)
        expect(response.data.defaults.concept).toBe(DEFAULT_STYLE_INPUTS.concept)
        expect(response.data.defaults.characters).toBe(DEFAULT_STYLE_INPUTS.characters)
      }
    })

    it('should return tarot-appropriate defaults', async () => {
      const response = await service.getDefaults()

      expect(response.data?.defaults.theme).toBeTruthy()
      expect(response.data?.defaults.tone).toBeTruthy()
    })
  })

  describe('getPredefinedOptions()', () => {
    it('should return all predefined themes and tones', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.themes).toBeDefined()
        expect(response.data.tones).toBeDefined()
        expect(Array.isArray(response.data.themes)).toBe(true)
        expect(Array.isArray(response.data.tones)).toBe(true)
      }
    })

    it('should include "Custom" option in themes', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.data?.themes).toContain('Custom')
    })

    it('should include "Custom" option in tones', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.data?.tones).toContain('Custom')
    })

    it('should match predefined constants', async () => {
      const response = await service.getPredefinedOptions()

      if (response.data) {
        expect(response.data.themes.length).toBe(PREDEFINED_THEMES.length)
        expect(response.data.tones.length).toBe(PREDEFINED_TONES.length)
      }
    })
  })

  describe('clearDraft()', () => {
    it('should clear saved draft', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Fantasy',
        tone: 'Whimsical',
        description: 'Magical realm with fantastical creatures and enchanted forests',
      }

      await service.saveStyleInputs({ styleInputs, saveAsDraft: true })
      const clearResponse = await service.clearDraft()

      expect(clearResponse.success).toBe(true)

      const loadResponse = await service.loadStyleInputs({ loadFromDraft: true })
      expect(loadResponse.data?.found).toBe(false)
    })

    it('should not error when clearing non-existent draft', async () => {
      const response = await service.clearDraft()
      expect(response.success).toBe(true)
    })

    it('should allow saving after clear', async () => {
      await service.clearDraft()

      const styleInputs: StyleInputs = {
        theme: 'Digital Art',
        tone: 'Bold',
        description: 'Sharp digital rendering with vibrant colors and crisp edges',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      expect(response.success).toBe(true)
    })
  })

  describe('Return Types', () => {
    it('should match contract types exactly', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Art Deco',
        tone: 'Bold',
        description: 'Geometric patterns and luxurious metallic accents with symmetry',
      }

      const validateResponse = await service.validateStyleInputs(styleInputs)
      expect(validateResponse).toHaveProperty('success')
      if (validateResponse.data) {
        expect(validateResponse.data).toHaveProperty('validation')
        expect(validateResponse.data).toHaveProperty('errors')
        expect(validateResponse.data).toHaveProperty('warnings')
      }

      const saveResponse = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: false,
      })
      if (saveResponse.data) {
        expect(saveResponse.data).toHaveProperty('saved')
        expect(saveResponse.data).toHaveProperty('styleInputs')
        expect(saveResponse.data).toHaveProperty('savedAt')
        expect(saveResponse.data).toHaveProperty('savedToDraft')
      }

      const loadResponse = await service.loadStyleInputs({ loadFromDraft: false })
      if (loadResponse.data) {
        expect(loadResponse.data).toHaveProperty('found')
        expect(loadResponse.data).toHaveProperty('styleInputs')
        expect(loadResponse.data).toHaveProperty('loadedFrom')
      }

      const defaultsResponse = await service.getDefaults()
      if (defaultsResponse.data) {
        expect(defaultsResponse.data).toHaveProperty('defaults')
      }

      const optionsResponse = await service.getPredefinedOptions()
      if (optionsResponse.data) {
        expect(optionsResponse.data).toHaveProperty('themes')
        expect(optionsResponse.data).toHaveProperty('tones')
      }
    })
  })

  describe('Async Behavior', () => {
    it('should return promises for all methods', () => {
      const styleInputs: StyleInputs = {
        theme: 'Test',
        tone: 'Test',
        description: 'This is a test description with sufficient length',
      }

      expect(service.validateStyleInputs(styleInputs)).toBeInstanceOf(Promise)
      expect(service.saveStyleInputs({ styleInputs, saveAsDraft: false })).toBeInstanceOf(
        Promise
      )
      expect(service.loadStyleInputs({ loadFromDraft: false })).toBeInstanceOf(Promise)
      expect(service.getDefaults()).toBeInstanceOf(Promise)
      expect(service.getPredefinedOptions()).toBeInstanceOf(Promise)
      expect(service.clearDraft()).toBeInstanceOf(Promise)
    })
  })
})
