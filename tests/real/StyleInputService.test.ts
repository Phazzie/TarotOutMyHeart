/**
 * @fileoverview TDD tests for StyleInputService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StyleInputService } from '../../services/real/StyleInputService'
import { DEFAULT_STYLE_INPUTS } from '$contracts/StyleInput'

describe('StyleInputService', () => {
  let svc: StyleInputService

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    svc = new StyleInputService()
  })

  describe('validateStyleInputs', () => {
    it('validates theme, tone, and description', async () => {
      const result = await svc.validateStyleInputs({
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Neon dystopian setting with high contrast visual details.',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.validation.canProceed).toBe(true)
      }
    })

    it('flags invalid inputs', async () => {
      const result = await svc.validateStyleInputs({
        theme: '',
        tone: '',
        description: 'short',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.validation.canProceed).toBe(false)
      }
    })
  })

  describe('saveStyleInputs', () => {
    it('saves valid inputs', async () => {
      const inputs = {
        theme: 'Gothic',
        tone: 'Dark',
        description: 'Victorian era gothic aesthetic with supernatural elements.',
      }
      const result = await svc.saveStyleInputs({ styleInputs: inputs, saveAsDraft: true })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.saved).toBe(true)
      }
    })
  })

  describe('loadStyleInputs', () => {
    it('returns empty draft when none exists', async () => {
      const result = await svc.loadStyleInputs({ loadFromDraft: true })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.found).toBe(false)
      }
    })

    it('loads saved draft successfully', async () => {
      const inputs = {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Neon-lit city streets with rain reflections.',
      }
      await svc.saveStyleInputs({ styleInputs: inputs, saveAsDraft: true })

      const result = await svc.loadStyleInputs({ loadFromDraft: true })
      expect(result.success).toBe(true)
      if (result.success && result.data && result.data.styleInputs) {
        expect(result.data.found).toBe(true)
        expect(result.data.styleInputs.theme).toBe('Cyberpunk')
      }
    })

    it('handles localStorage throwing SecurityError/DOMException gracefully', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      const result = await svc.loadStyleInputs({ loadFromDraft: true })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.found).toBe(false)
        expect(result.data.loadedFrom).toBe('default')
      }
    })
  })

  describe('clearDraft', () => {
    it('clears saved draft and allows loading defaults', async () => {
      const inputs = {
        theme: 'Fantasy',
        tone: 'Light',
        description: 'Enchanted forest with glowing flora.',
      }
      await svc.saveStyleInputs({ styleInputs: inputs, saveAsDraft: true })

      const clearResult = await svc.clearDraft()
      expect(clearResult.success).toBe(true)

      const loadResult = await svc.loadStyleInputs({ loadFromDraft: true })
      expect(loadResult.success).toBe(true)
      if (loadResult.success && loadResult.data) {
        expect(loadResult.data.found).toBe(false)
      }
    })

    it('does not throw when localStorage removeItem throws', async () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('QuotaExceeded', 'QuotaExceededError')
      })

      const clearResult = await svc.clearDraft()
      expect(clearResult.success).toBe(true)
    })
  })

  describe('getDefaults & getPredefinedOptions', () => {
    it('returns default style values and predefined options', async () => {
      const defaultsRes = await svc.getDefaults()
      expect(defaultsRes.success).toBe(true)
      if (defaultsRes.success && defaultsRes.data) {
        expect(defaultsRes.data.defaults.theme).toBe(DEFAULT_STYLE_INPUTS.theme)
      }

      const optionsRes = await svc.getPredefinedOptions()
      expect(optionsRes.success).toBe(true)
      if (optionsRes.success && optionsRes.data) {
        expect(optionsRes.data.themes.length).toBeGreaterThan(0)
      }
    })
  })
})
