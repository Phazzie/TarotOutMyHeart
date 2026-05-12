/**
 * @fileoverview TDD tests for StyleInputService (real implementation).
 * Written BEFORE implementation — red phase.
 * PreMortem #8: StyleInputService must NOT crash when localStorage is undefined (SSR).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StyleInputService, STORAGE_KEY } from '../../services/real/StyleInputService';
import { DEFAULT_STYLE_INPUTS } from '../../contracts/StyleInput';

describe('StyleInputService', () => {
  let svc: StyleInputService;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    svc = new StyleInputService();
  });

  describe('saveStyleInputs', () => {
    it('saves valid inputs and returns them', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: 'Gothic', tone: 'Dark' };
      const result = await svc.saveStyleInputs(inputs);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.theme).toBe('Gothic');
    });

    it('persists to localStorage', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: 'Cosmic' };
      await svc.saveStyleInputs(inputs);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).theme).toBe('Cosmic');
    });

    it('rejects empty theme', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: '' };
      const result = await svc.saveStyleInputs(inputs);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('THEME_REQUIRED');
    });

    it('rejects theme with only whitespace', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: '   ' };
      const result = await svc.saveStyleInputs(inputs);
      expect(result.success).toBe(false);
    });

    it('rejects description exceeding char limit', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: 'Valid', description: 'x'.repeat(10000) };
      const result = await svc.saveStyleInputs(inputs);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('DESCRIPTION_TOO_LONG');
    });
  });

  describe('loadStyleInputs', () => {
    it('returns DEFAULT_STYLE_INPUTS when nothing saved', async () => {
      const result = await svc.loadStyleInputs();
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(DEFAULT_STYLE_INPUTS);
    });

    it('returns previously saved inputs', async () => {
      const inputs = { ...DEFAULT_STYLE_INPUTS, theme: 'Oceanic' };
      await svc.saveStyleInputs(inputs);
      const result = await svc.loadStyleInputs();
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.theme).toBe('Oceanic');
    });

    it('returns DEFAULT_STYLE_INPUTS if localStorage contains corrupt JSON', async () => {
      localStorage.setItem(STORAGE_KEY, 'this is not json {{{');
      const result = await svc.loadStyleInputs();
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(DEFAULT_STYLE_INPUTS);
    });
  });

  describe('SSR safety (PreMortem #8)', () => {
    it('does not crash if localStorage is unavailable (simulated SSR)', async () => {
      // Simulate SSR by removing localStorage
      const original = global.localStorage;
      // @ts-expect-error intentionally breaking localStorage for SSR simulation
      delete global.localStorage;
      const ssrSvc = new StyleInputService();
      const result = await ssrSvc.loadStyleInputs();
      expect(result.success).toBe(true);
      global.localStorage = original;
    });
  });

  describe('clearStyleInputs', () => {
    it('removes saved inputs', async () => {
      await svc.saveStyleInputs({ ...DEFAULT_STYLE_INPUTS, theme: 'Temp' });
      await svc.clearStyleInputs();
      const result = await svc.loadStyleInputs();
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(DEFAULT_STYLE_INPUTS);
    });
  });
});
