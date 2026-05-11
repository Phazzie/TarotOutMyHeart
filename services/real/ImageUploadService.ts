/**
 * ImageUploadService — real implementation.
 * Validates files client-side, then POSTs to /api/upload (Vercel Blob proxy).
 * Tracks uploaded images in-memory for this session.
 *
 * PreMortem protections:
 *   - INVALID_TYPE:        Reject non-JPEG/PNG
 *   - FILE_TOO_LARGE:      Reject files over MAX_IMAGE_SIZE_BYTES
 *   - MAX_IMAGES_REACHED:  Reject uploads past MAX_IMAGES
 *   - NETWORK_ERROR:       fetch() throws (no network)
 *   - API_ERROR:           /api/upload returns success: false
 */
import { MAX_IMAGES, MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '../../contracts/ImageUpload';

const UPLOAD_TIMEOUT_MS = 30_000;

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface UploadedImageInfo {
  id: string;
  url: string;
  fileName: string;
}

export class ImageUploadService {
  private images: UploadedImageInfo[] = [];

  async uploadImage(file: File): Promise<ServiceResult<UploadedImageInfo>> {
    // --- client-side validation ---
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return {
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Only JPEG and PNG images are accepted.' },
      };
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds the ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB limit.`,
        },
      };
    }

    if (this.images.length >= MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: 'MAX_IMAGES_REACHED',
          message: `You can upload at most ${MAX_IMAGES} reference images.`,
        },
      };
    }

    // --- network call ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = (await response.json()) as { success: boolean; data?: { url: string }; error?: { code: string; message: string } };

      if (!json.success || !json.data?.url) {
        return {
          success: false,
          error: json.error ?? { code: 'API_ERROR', message: 'Upload failed.' },
        };
      }

      const uploaded: UploadedImageInfo = {
        id: crypto.randomUUID(),
        url: json.data.url,
        fileName: file.name,
      };
      this.images.push(uploaded);
      return { success: true, data: uploaded };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        success: false,
        error: {
          code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isAbort ? 'Upload timed out.' : 'Network error during upload.',
        },
      };
    }
  }

  async removeImage(id: string): Promise<ServiceResult<void>> {
    this.images = this.images.filter((img) => img.id !== id);
    return { success: true, data: undefined };
  }

  async getImages(): Promise<ServiceResult<UploadedImageInfo[]>> {
    return { success: true, data: [...this.images] };
  }

  async clearImages(): Promise<ServiceResult<void>> {
    this.images = [];
    return { success: true, data: undefined };
  }
}
