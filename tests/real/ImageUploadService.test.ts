/**
 * @fileoverview TDD tests for ImageUploadService (real implementation).
 * Written BEFORE implementation — red phase.
 * PreMortem coverage: file type validation, size limits, fetch failure, max image count.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageUploadService } from '../../services/real/ImageUploadService';
import { MAX_IMAGES, MAX_IMAGE_SIZE_BYTES } from '../../contracts/index';

const makeFile = (name: string, type: string, sizeBytes: number): File => {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
};

describe('ImageUploadService', () => {
  let svc: ImageUploadService;

  beforeEach(() => {
    svc = new ImageUploadService();
    vi.restoreAllMocks();
  });

  describe('uploadImage — validation (client-side, no fetch needed)', () => {
    it('rejects non-JPEG/PNG files', async () => {
      const result = await svc.uploadImage(makeFile('test.gif', 'image/gif', 100));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INVALID_TYPE');
    });

    it('rejects files over MAX_IMAGE_SIZE_BYTES', async () => {
      const result = await svc.uploadImage(makeFile('big.jpg', 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('FILE_TOO_LARGE');
    });

    it('accepts JPEG files within size limit', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
      }));
      const result = await svc.uploadImage(makeFile('photo.jpg', 'image/jpeg', 1024));
      expect(result.success).toBe(true);
    });

    it('accepts PNG files', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.png' } }),
      }));
      const result = await svc.uploadImage(makeFile('art.png', 'image/png', 1024));
      expect(result.success).toBe(true);
    });

    it('rejects upload when MAX_IMAGES already uploaded', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
      }));
      for (let i = 0; i < MAX_IMAGES; i++) {
        await svc.uploadImage(makeFile(`photo${i}.jpg`, 'image/jpeg', 1024));
      }
      const result = await svc.uploadImage(makeFile('one-too-many.jpg', 'image/jpeg', 1024));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('MAX_IMAGES_REACHED');
    });
  });

  describe('uploadImage — server failure (PreMortem #4)', () => {
    it('returns error when /api/upload returns non-success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Blob unavailable' } }),
      }));
      const result = await svc.uploadImage(makeFile('photo.jpg', 'image/jpeg', 100));
      expect(result.success).toBe(false);
    });

    it('returns error when fetch throws (network failure)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await svc.uploadImage(makeFile('photo.jpg', 'image/jpeg', 100));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('removeImage', () => {
    it('removes a previously uploaded image', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
      }));
      const uploadResult = await svc.uploadImage(makeFile('photo.jpg', 'image/jpeg', 100));
      expect(uploadResult.success).toBe(true);
      if (!uploadResult.success) return;
      await svc.removeImage(uploadResult.data.id);
      const imagesResult = await svc.getImages();
      expect(imagesResult.success).toBe(true);
      if (imagesResult.success) expect(imagesResult.data).toHaveLength(0);
    });

    it('does not throw when removing non-existent id', async () => {
      const result = await svc.removeImage('non-existent-id');
      expect(result.success).toBe(true);
    });
  });

  describe('clearImages', () => {
    it('removes all images', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
      }));
      await svc.uploadImage(makeFile('a.jpg', 'image/jpeg', 100));
      await svc.uploadImage(makeFile('b.jpg', 'image/jpeg', 100));
      await svc.clearImages();
      const result = await svc.getImages();
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toHaveLength(0);
    });
  });
});
