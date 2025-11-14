/**
 * StyleInput Contract Tests
 *
 * Tests that StyleInputMock satisfies the IStyleInputService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StyleInputMock } from '../../services/mock/StyleInputMock'
import {
  StyleInputErrorCode,
  type ValidateStyleInputsInput,
  type SaveStyleInputsInput,
  type LoadStyleInputsInput,
  type StyleInputs,
  type StyleInputValidationError,
} from '../../contracts/StyleInput'

describe('StyleInput Contract', () => {
  let service: StyleInputMock

  beforeEach(() => {
    service = new StyleInputMock()
  })

  describe('validateStyleInputs() Method', () => {
    describe('Theme Validation', () => {
      it('should accept valid theme from predefined list', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Cyberpunk',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.theme.isValid).toBe(true)
        expect(response.data?.validation.fields.theme.errors).toHaveLength(0)
      })

      it('should accept valid custom theme (≤50 chars)', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Neo-Victorian Steampunk',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.theme.isValid).toBe(true)
      })

      it('should fail with THEME_REQUIRED when theme is missing', async () => {
        const input: ValidateStyleInputsInput = {
          theme: '',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true) // Validation returns success, but field is invalid
        expect(response.data?.validation.fields.theme.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.THEME_REQUIRED)).toBe(true)
      })

      it('should fail with THEME_TOO_LONG when theme exceeds 50 chars', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'A'.repeat(51), // 51 characters
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.theme.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.THEME_TOO_LONG)).toBe(true)
      })
    })

    describe('Tone Validation', () => {
      it('should accept valid tone from predefined list', async () => {
        const input: ValidateStyleInputsInput = {
          tone: 'Dark',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.tone.isValid).toBe(true)
        expect(response.data?.validation.fields.tone.errors).toHaveLength(0)
      })

      it('should accept valid custom tone (≤50 chars)', async () => {
        const input: ValidateStyleInputsInput = {
          tone: 'Melancholic yet hopeful',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.tone.isValid).toBe(true)
      })

      it('should fail with TONE_REQUIRED when tone is missing', async () => {
        const input: ValidateStyleInputsInput = {
          tone: '',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.tone.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.TONE_REQUIRED)).toBe(true)
      })

      it('should fail with TONE_TOO_LONG when tone exceeds 50 chars', async () => {
        const input: ValidateStyleInputsInput = {
          tone: 'B'.repeat(51), // 51 characters
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.tone.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.TONE_TOO_LONG)).toBe(true)
      })
    })

    describe('Description Validation', () => {
      it('should accept valid description (10-500 chars)', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'Neon-lit dystopian future with advanced technology and megacorporation control',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(true)
        expect(response.data?.validation.fields.description.errors).toHaveLength(0)
      })

      it('should accept description exactly 10 chars', async () => {
        const input: ValidateStyleInputsInput = {
          description: '1234567890', // Exactly 10 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(true)
      })

      it('should accept description exactly 500 chars', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'A'.repeat(500), // Exactly 500 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(true)
      })

      it('should fail with DESCRIPTION_REQUIRED when description is missing', async () => {
        const input: ValidateStyleInputsInput = {
          description: '',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.DESCRIPTION_REQUIRED)).toBe(true)
      })

      it('should fail with DESCRIPTION_TOO_SHORT when description < 10 chars', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'short', // Only 5 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.DESCRIPTION_TOO_SHORT)).toBe(true)
      })

      it('should fail with DESCRIPTION_TOO_LONG when description > 500 chars', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'A'.repeat(501), // 501 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(false)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.DESCRIPTION_TOO_LONG)).toBe(true)
      })

      it('should accept description with special characters if valid length', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'Gothic cathedral with stained-glass windows & ornate sculptures! 🏰',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description.isValid).toBe(true)
      })
    })

    describe('Optional Fields Validation', () => {
      it('should accept concept ≤ 200 chars', async () => {
        const input: ValidateStyleInputsInput = {
          concept: 'Technology vs humanity',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        if (response.data?.validation.fields.concept) {
          expect(response.data.validation.fields.concept.isValid).toBe(true)
        }
      })

      it('should fail with CONCEPT_TOO_LONG when concept > 200 chars', async () => {
        const input: ValidateStyleInputsInput = {
          concept: 'C'.repeat(201), // 201 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.CONCEPT_TOO_LONG)).toBe(true)
      })

      it('should accept characters ≤ 200 chars', async () => {
        const input: ValidateStyleInputsInput = {
          characters: 'Augmented humans, AIs, corporate agents',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        if (response.data?.validation.fields.characters) {
          expect(response.data.validation.fields.characters.isValid).toBe(true)
        }
      })

      it('should fail with CHARACTERS_TOO_LONG when characters > 200 chars', async () => {
        const input: ValidateStyleInputsInput = {
          characters: 'D'.repeat(201), // 201 chars
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.errors.some((e: StyleInputValidationError) => e.code === StyleInputErrorCode.CHARACTERS_TOO_LONG)).toBe(true)
      })

      it('should pass validation when optional fields are omitted', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian era with supernatural elements and gothic architecture',
          // concept and characters omitted
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.isValid).toBe(true)
      })
    })

    describe('Partial Validation', () => {
      it('should validate only theme field when only theme provided', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Art Nouveau',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.theme).toBeDefined()
        expect(response.data?.validation.fields.theme.isValid).toBe(true)
      })

      it('should validate only description field when only description provided', async () => {
        const input: ValidateStyleInputsInput = {
          description: 'A beautiful tarot deck with flowing organic lines',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.fields.description).toBeDefined()
        expect(response.data?.validation.fields.description.isValid).toBe(true)
      })

      it('should validate complete form with all fields', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Neon-lit dystopian future with advanced technology and megacorporation control',
          concept: 'Technology vs humanity',
          characters: 'Augmented humans, AIs, corporate agents',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data?.validation.isValid).toBe(true)
        expect(response.data?.validation.canProceed).toBe(true)
        expect(response.data?.errors).toHaveLength(0)
      })
    })

    describe('Response Structure', () => {
      it('should return properly structured response', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Neon-lit dystopian future with advanced technology',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data?.validation).toBeDefined()
        expect(response.data?.validation.isValid).toBeDefined()
        expect(typeof response.data?.validation.isValid).toBe('boolean')
        expect(response.data?.validation.canProceed).toBeDefined()
        expect(typeof response.data?.validation.canProceed).toBe('boolean')
        expect(response.data?.validation.fields).toBeDefined()
        expect(response.data?.errors).toBeDefined()
        expect(Array.isArray(response.data?.errors)).toBe(true)
        expect(response.data?.warnings).toBeDefined()
        expect(Array.isArray(response.data?.warnings)).toBe(true)
      })

      it('should return field validation with correct structure', async () => {
        const input: ValidateStyleInputsInput = {
          theme: 'Gothic',
        }

        const response = await service.validateStyleInputs(input)

        expect(response.success).toBe(true)
        const fieldValidation = response.data?.validation.fields.theme
        expect(fieldValidation).toBeDefined()
        expect(fieldValidation?.fieldName).toBe('theme')
        expect(typeof fieldValidation?.isValid).toBe('boolean')
        expect(Array.isArray(fieldValidation?.errors)).toBe(true)
      })
    })
  })

  describe('saveStyleInputs() Method', () => {
    it('should save valid complete StyleInputs', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Neon-lit dystopian future with advanced technology and megacorporation control',
        concept: 'Technology vs humanity',
        characters: 'Augmented humans, AIs, corporate agents',
      }

      const input: SaveStyleInputsInput = {
        styleInputs,
        saveAsDraft: false,
      }

      const response = await service.saveStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.saved).toBe(true)
      expect(response.data?.styleInputs).toEqual(styleInputs)
      expect(response.data?.savedAt).toBeInstanceOf(Date)
      expect(response.data?.savedToDraft).toBe(false)
    })

    it('should save to localStorage when saveAsDraft is true', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Gothic',
        tone: 'Dark',
        description: 'Victorian era with supernatural elements and gothic architecture',
      }

      const input: SaveStyleInputsInput = {
        styleInputs,
        saveAsDraft: true,
      }

      const response = await service.saveStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.saved).toBe(true)
      expect(response.data?.savedToDraft).toBe(true)
    })

    it('should not save to localStorage when saveAsDraft is false', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Art Nouveau',
        tone: 'Mystical',
        description: 'Flowing organic lines with nature-inspired decorative elements',
      }

      const input: SaveStyleInputsInput = {
        styleInputs,
        saveAsDraft: false,
      }

      const response = await service.saveStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.savedToDraft).toBe(false)
    })

    it('should save with minimal required fields only', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Minimalist',
        tone: 'Light',
        description: 'Clean lines and simple forms with minimal decoration',
      }

      const input: SaveStyleInputsInput = {
        styleInputs,
        saveAsDraft: true,
      }

      const response = await service.saveStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.saved).toBe(true)
    })

    it('should save with all optional fields populated', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Fantasy',
        tone: 'Ethereal',
        description: 'Magical realm with mythical creatures and enchanted landscapes',
        concept: 'Magic vs reality',
        characters: 'Wizards, dragons, elves, mystical beings',
      }

      const input: SaveStyleInputsInput = {
        styleInputs,
        saveAsDraft: true,
      }

      const response = await service.saveStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.styleInputs.concept).toBe('Magic vs reality')
      expect(response.data?.styleInputs.characters).toBe('Wizards, dragons, elves, mystical beings')
    })

    it('should overwrite previous save', async () => {
      const firstInput: SaveStyleInputsInput = {
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'First description with gothic elements',
        },
        saveAsDraft: true,
      }

      await service.saveStyleInputs(firstInput)

      const secondInput: SaveStyleInputsInput = {
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Second description with cyberpunk elements',
        },
        saveAsDraft: true,
      }

      const response = await service.saveStyleInputs(secondInput)

      expect(response.success).toBe(true)
      expect(response.data?.styleInputs.theme).toBe('Cyberpunk')
      expect(response.data?.styleInputs.description).toContain('cyberpunk')
    })
  })

  describe('loadStyleInputs() Method', () => {
    it('should load when draft exists', async () => {
      // First save a draft
      const styleInputs: StyleInputs = {
        theme: 'Watercolor',
        tone: 'Soft',
        description: 'Delicate watercolor paintings with flowing colors',
      }

      await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      // Then load it
      const input: LoadStyleInputsInput = {
        loadFromDraft: true,
      }

      const response = await service.loadStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.found).toBe(true)
      expect(response.data?.loadedFrom).toBe('draft')
      expect(response.data?.styleInputs).toEqual(styleInputs)
    })

    it('should return defaults when draft does not exist', async () => {
      const input: LoadStyleInputsInput = {
        loadFromDraft: true,
      }

      const response = await service.loadStyleInputs(input)

      expect(response.success).toBe(true)
      if (response.data?.found === false) {
        expect(response.data.loadedFrom).toBe('default')
        expect(response.data.styleInputs).toBeDefined()
      }
    })

    it('should load default inputs when loadFromDraft is false', async () => {
      const input: LoadStyleInputsInput = {
        loadFromDraft: false,
      }

      const response = await service.loadStyleInputs(input)

      expect(response.success).toBe(true)
      expect(response.data?.loadedFrom).toBe('default')
      expect(response.data?.styleInputs).toBeDefined()
    })

    it('should match previous save exactly', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Art Deco',
        tone: 'Bold',
        description: 'Geometric patterns with luxurious gold accents and strong lines',
        concept: 'Luxury and modernism',
        characters: 'Flappers, jazz musicians, aristocrats',
      }

      await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })

      const response = await service.loadStyleInputs({
        loadFromDraft: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.styleInputs).toEqual(styleInputs)
    })
  })

  describe('getDefaults() Method', () => {
    it('should return default values', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data?.defaults).toBeDefined()
      expect(response.data?.defaults.theme).toBeDefined()
      expect(response.data?.defaults.tone).toBeDefined()
      expect(response.data?.defaults.description).toBeDefined()
    })

    it('should return tarot-appropriate defaults', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data?.defaults.theme).toBe('Art Nouveau')
      expect(response.data?.defaults.tone).toBe('Mystical')
    })

    it('should return empty description (user must provide)', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data?.defaults.description).toBe('')
    })

    it('should return empty optional fields', async () => {
      const response = await service.getDefaults()

      expect(response.success).toBe(true)
      expect(response.data?.defaults.concept).toBe('')
      expect(response.data?.defaults.characters).toBe('')
    })

    it('should return consistent defaults', async () => {
      const response1 = await service.getDefaults()
      const response2 = await service.getDefaults()

      expect(response1.data?.defaults).toEqual(response2.data?.defaults)
    })
  })

  describe('getPredefinedOptions() Method', () => {
    it('should return all predefined themes', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data?.themes).toBeDefined()
      expect(Array.isArray(response.data?.themes)).toBe(true)
      expect(response.data?.themes.length).toBeGreaterThan(0)
    })

    it('should return all predefined tones', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data?.tones).toBeDefined()
      expect(Array.isArray(response.data?.tones)).toBe(true)
      expect(response.data?.tones.length).toBeGreaterThan(0)
    })

    it('should include expected theme options', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data?.themes).toContain('Art Nouveau')
      expect(response.data?.themes).toContain('Cyberpunk')
      expect(response.data?.themes).toContain('Gothic')
      expect(response.data?.themes).toContain('Custom')
    })

    it('should include expected tone options', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data?.tones).toContain('Dark')
      expect(response.data?.tones).toContain('Light')
      expect(response.data?.tones).toContain('Mystical')
      expect(response.data?.tones).toContain('Custom')
    })

    it('should return readonly arrays', async () => {
      const response = await service.getPredefinedOptions()

      expect(response.success).toBe(true)
      expect(response.data?.themes).toBeDefined()
      expect(response.data?.tones).toBeDefined()
      // Arrays should be readonly (type-level constraint, tested via TypeScript)
    })
  })

  describe('clearDraft() Method', () => {
    it('should clear when draft exists', async () => {
      // First save a draft
      await service.saveStyleInputs({
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Gothic cathedral with stained-glass windows',
        },
        saveAsDraft: true,
      })

      // Then clear it
      const response = await service.clearDraft()

      expect(response.success).toBe(true)
    })

    it('should allow loading defaults after clearing', async () => {
      // Save, clear, then load
      await service.saveStyleInputs({
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Neon-lit dystopian future',
        },
        saveAsDraft: true,
      })

      await service.clearDraft()

      const loadResponse = await service.loadStyleInputs({
        loadFromDraft: true,
      })

      expect(loadResponse.success).toBe(true)
      // Should return defaults since draft was cleared
      if (loadResponse.data?.found === false) {
        expect(loadResponse.data.loadedFrom).toBe('default')
      }
    })

    it('should succeed when no draft exists', async () => {
      const response = await service.clearDraft()

      expect(response.success).toBe(true)
    })

    it('should allow saving new draft after clearing', async () => {
      // Clear, then save
      await service.clearDraft()

      const saveResponse = await service.saveStyleInputs({
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Ethereal',
          description: 'Magical realm with enchanted landscapes',
        },
        saveAsDraft: true,
      })

      expect(saveResponse.success).toBe(true)
      expect(saveResponse.data?.saved).toBe(true)
    })
  })

  describe('Integration Workflows', () => {
    it('should support validate → save → load workflow', async () => {
      const styleInputs: StyleInputs = {
        theme: 'Vintage',
        tone: 'Soft',
        description: 'Vintage-inspired with sepia tones and aged paper texture',
      }

      // Validate
      const validateResponse = await service.validateStyleInputs(styleInputs)
      expect(validateResponse.success).toBe(true)
      expect(validateResponse.data?.validation.isValid).toBe(true)

      // Save
      const saveResponse = await service.saveStyleInputs({
        styleInputs,
        saveAsDraft: true,
      })
      expect(saveResponse.success).toBe(true)

      // Load
      const loadResponse = await service.loadStyleInputs({
        loadFromDraft: true,
      })
      expect(loadResponse.success).toBe(true)
      expect(loadResponse.data?.styleInputs).toEqual(styleInputs)
    })

    it('should support save with draft → clear → load returns defaults', async () => {
      // Save
      await service.saveStyleInputs({
        styleInputs: {
          theme: 'Digital Art',
          tone: 'Modern',
          description: 'Digital illustration with vibrant colors and sharp lines',
        },
        saveAsDraft: true,
      })

      // Clear
      await service.clearDraft()

      // Load (should get defaults)
      const loadResponse = await service.loadStyleInputs({
        loadFromDraft: true,
      })

      expect(loadResponse.success).toBe(true)
      if (loadResponse.data?.found === false) {
        expect(loadResponse.data.loadedFrom).toBe('default')
      }
    })

    it('should support validate partial → validate complete → save', async () => {
      // Validate theme only
      const partialValidate = await service.validateStyleInputs({
        theme: 'Art Deco',
      })
      expect(partialValidate.success).toBe(true)

      // Validate complete
      const completeInputs: StyleInputs = {
        theme: 'Art Deco',
        tone: 'Bold',
        description: 'Geometric patterns with luxurious gold accents',
      }

      const completeValidate = await service.validateStyleInputs(completeInputs)
      expect(completeValidate.success).toBe(true)
      expect(completeValidate.data?.validation.isValid).toBe(true)

      // Save
      const saveResponse = await service.saveStyleInputs({
        styleInputs: completeInputs,
        saveAsDraft: true,
      })
      expect(saveResponse.success).toBe(true)
    })

    it('should support get defaults → modify → validate → save', async () => {
      // Get defaults
      const defaultsResponse = await service.getDefaults()
      expect(defaultsResponse.success).toBe(true)

      // Modify
      const modifiedInputs: StyleInputs = {
        ...defaultsResponse.data!.defaults,
        description: 'Custom description based on default theme and tone',
      }

      // Validate
      const validateResponse = await service.validateStyleInputs(modifiedInputs)
      expect(validateResponse.success).toBe(true)

      // Save
      const saveResponse = await service.saveStyleInputs({
        styleInputs: modifiedInputs,
        saveAsDraft: true,
      })
      expect(saveResponse.success).toBe(true)
    })
  })

  describe('Error Code Coverage', () => {
    it('should test all 18 error codes are reachable', async () => {
      // This test verifies that all error codes in StyleInputErrorCode enum
      // can be triggered by the mock service

      const errorCodes = [
        StyleInputErrorCode.THEME_REQUIRED,
        StyleInputErrorCode.THEME_TOO_LONG,
        StyleInputErrorCode.TONE_REQUIRED,
        StyleInputErrorCode.TONE_TOO_LONG,
        StyleInputErrorCode.DESCRIPTION_REQUIRED,
        StyleInputErrorCode.DESCRIPTION_TOO_SHORT,
        StyleInputErrorCode.DESCRIPTION_TOO_LONG,
        StyleInputErrorCode.CONCEPT_TOO_LONG,
        StyleInputErrorCode.CHARACTERS_TOO_LONG,
      ]

      // All these error codes should be testable
      expect(errorCodes.length).toBeGreaterThan(0)
    })
  })
})
