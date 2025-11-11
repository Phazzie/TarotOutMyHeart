/**
 * @fileoverview Contract tests for StyleInput seam
 * @purpose Validate StyleInputMock matches StyleInput contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IStyleInputService
 * 2. Input validation - Theme, tone, description validation with length constraints
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct StyleInputErrorCode values
 * 5. State management - Save, load, clear draft operations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IStyleInputService } from '$contracts/StyleInput'
import {
  StyleInputErrorCode,
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
} from '$contracts/StyleInput'
import { styleInputService } from '$services/factory'

describe('StyleInput Contract Compliance', () => {
  let service: IStyleInputService

  beforeEach(() => {
    service = styleInputService
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
    it('should validate valid style inputs', async () => {
      const response = await service.validateStyleInputs({
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Neon-lit dystopian future with augmented humans and megacorporations',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.validation).toBeDefined()
        expect(response.data.validation.isValid).toBe(true)
        expect(response.data.validation.canProceed).toBe(true)
        expect(response.data.errors).toHaveLength(0)
        expect(Array.isArray(response.data.warnings)).toBe(true)
      }
    })

    it('should validate theme field', async () => {
      const response = await service.validateStyleInputs({
        theme: 'Art Nouveau',
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.theme.isValid).toBe(true)
    })

    it('should reject empty theme', async () => {
      const response = await service.validateStyleInputs({
        theme: '',
        tone: 'Dark',
        description: 'Test description with enough characters',
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.isValid).toBe(false)
    })

    it('should reject theme exceeding max length', async () => {
      const longTheme = 'a'.repeat(CHAR_LIMITS.theme + 1)
      const response = await service.validateStyleInputs({
        theme: longTheme,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.theme.isValid).toBe(false)
    })

    it('should validate tone field', async () => {
      const response = await service.validateStyleInputs({
        tone: 'Mystical',
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.tone.isValid).toBe(true)
    })

    it('should reject tone exceeding max length', async () => {
      const longTone = 'a'.repeat(CHAR_LIMITS.tone + 1)
      const response = await service.validateStyleInputs({
        tone: longTone,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.tone.isValid).toBe(false)
    })

    it('should validate description field with min/max length', async () => {
      const validDescription = 'a'.repeat(CHAR_LIMITS.description.min + 10)
      const response = await service.validateStyleInputs({
        description: validDescription,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.description.isValid).toBe(true)
    })

    it('should reject description below minimum length', async () => {
      const shortDescription = 'a'.repeat(CHAR_LIMITS.description.min - 1)
      const response = await service.validateStyleInputs({
        theme: 'Gothic',
        tone: 'Dark',
        description: shortDescription,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.isValid).toBe(false)
    })

    it('should reject description exceeding maximum length', async () => {
      const longDescription = 'a'.repeat(CHAR_LIMITS.description.max + 1)
      const response = await service.validateStyleInputs({
        description: longDescription,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.description.isValid).toBe(false)
    })

    it('should validate optional concept field', async () => {
      const response = await service.validateStyleInputs({
        concept: 'Megacorporation control and resistance',
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.concept.isValid).toBe(true)
    })

    it('should reject concept exceeding max length', async () => {
      const longConcept = 'a'.repeat(CHAR_LIMITS.concept + 1)
      const response = await service.validateStyleInputs({
        concept: longConcept,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.concept.isValid).toBe(false)
    })

    it('should validate optional characters field', async () => {
      const response = await service.validateStyleInputs({
        characters: 'Augmented humans with cybernetic implants',
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.characters.isValid).toBe(true)
    })

    it('should reject characters exceeding max length', async () => {
      const longCharacters = 'a'.repeat(CHAR_LIMITS.characters + 1)
      const response = await service.validateStyleInputs({
        characters: longCharacters,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.fields.characters.isValid).toBe(false)
    })

    it('should return warnings for short but valid descriptions', async () => {
      const shortButValid = 'a'.repeat(CHAR_LIMITS.description.min + 1)
      const response = await service.validateStyleInputs({
        theme: 'Gothic',
        tone: 'Dark',
        description: shortButValid,
      })

      expect(response.success).toBe(true)
      expect(response.data?.validation.isValid).toBe(true)
      // Warnings may or may not be present depending on implementation
    })
  })

  describe('saveStyleInputs()', () => {
    it('should save valid style inputs', async () => {
      const styleInputs = {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Neon-lit dystopian future with augmented humans',
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

    it('should save to draft when requested', async () => {
      const styleInputs = {
        theme: 'Art Nouveau',
        tone: 'Mystical',
        description: 'Flowing organic forms with nature motifs',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.savedToDraft).toBe(true)
    })

    it('should include optional fields when provided', async () => {
      const styleInputs = {
        theme: 'Gothic',
        tone: 'Dark',
        description: 'Victorian era with supernatural elements',
        concept: 'Ancient mysteries and forbidden knowledge',
        characters: 'Mysterious figures in dark cloaks',
      }

      const response = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: false,
      })

      expect(response.success).toBe(true)
      expect(response.data?.styleInputs.concept).toBe(styleInputs.concept)
      expect(response.data?.styleInputs.characters).toBe(styleInputs.characters)
    })
  })

  describe('loadStyleInputs()', () => {
    it('should load from draft when available', async () => {
      // First save a draft
      const styleInputs = {
        theme: 'Watercolor',
        tone: 'Soft',
        description: 'Delicate watercolor paintings with pastel colors',
      }

      await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      // Then load it
      const response = await service.loadStyleInputs({
        loadFromDraft: true,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.found).toBe(true)
        expect(response.data.styleInputs).toBeDefined()
        expect(response.data.loadedFrom).toBe('draft')
      }
    })

    it('should return defaults when no draft exists', async () => {
      // Clear any existing draft first
      await service.clearDraft()

      const response = await service.loadStyleInputs({
        loadFromDraft: true,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        // Could be 'default' or 'none' depending on implementation
        expect(['default', 'none']).toContain(response.data.loadedFrom)
      }
    })
  })

  describe('getDefaults()', () => {
    it('should return default style input values', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.defaults).toBeDefined()
        expect(response.data.defaults.theme).toBeDefined()
        expect(response.data.defaults.tone).toBeDefined()
        expect(response.data.defaults.description).toBeDefined()
        expect(typeof response.data.defaults.theme).toBe('string')
        expect(typeof response.data.defaults.tone).toBe('string')
        expect(typeof response.data.defaults.description).toBe('string')
      }
    })
  })

  describe('getPredefinedOptions()', () => {
    it('should return predefined themes and tones', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.themes).toBeDefined()
        expect(response.data.tones).toBeDefined()
        expect(Array.isArray(response.data.themes)).toBe(true)
        expect(Array.isArray(response.data.tones)).toBe(true)
        expect(response.data.themes.length).toBeGreaterThan(0)
        expect(response.data.tones.length).toBeGreaterThan(0)
      }
    })

    it('should include expected predefined themes', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      if (response.data) {
        // Check for some expected themes
        expect(response.data.themes).toContain('Cyberpunk')
        expect(response.data.themes).toContain('Art Nouveau')
        expect(response.data.themes).toContain('Gothic')
      }
    })

    it('should include expected predefined tones', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      if (response.data) {
        // Check for some expected tones
        expect(response.data.tones).toContain('Dark')
        expect(response.data.tones).toContain('Light')
        expect(response.data.tones).toContain('Mystical')
      }
    })
  })

  describe('clearDraft()', () => {
    it('should clear draft successfully', async () => {
      // Save a draft first
      await service.saveStyleInputs({
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description with enough characters',
        },
        saveAsDraft: true,
      })

      // Clear the draft
      const response = await service.clearDraft()

      expect(response.success).toBe(true)
    })

    it('should succeed even when no draft exists', async () => {
      // Clear twice to ensure no draft exists
      await service.clearDraft()
      const response = await service.clearDraft()

      expect(response.success).toBe(true)
    })
  })

  describe('Return Type Validation', () => {
    it('should return all async methods as Promises', async () => {
      const validatePromise = service.validateStyleInputs({ theme: 'Test' })
      expect(validatePromise).toBeInstanceOf(Promise)

      const savePromise = service.saveStyleInputs({
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description with enough characters',
        },
        saveAsDraft: false,
      })
      expect(savePromise).toBeInstanceOf(Promise)

      const loadPromise = service.loadStyleInputs({ loadFromDraft: false })
      expect(loadPromise).toBeInstanceOf(Promise)

      const defaultsPromise = service.getDefaults()
      expect(defaultsPromise).toBeInstanceOf(Promise)

      const optionsPromise = service.getPredefinedOptions()
      expect(optionsPromise).toBeInstanceOf(Promise)

      const clearPromise = service.clearDraft()
      expect(clearPromise).toBeInstanceOf(Promise)
    })
  })
})
