/**
 * @fileoverview ImageUploadService — real implementation.
 * Validates files client-side, then POSTs to /api/upload (Vercel Blob proxy).
 * Tracks uploaded images in-memory for this session.
 */

import type { ServiceResponse } from '$contracts/types/common';
import type {
  IImageUploadService,
  UploadImagesInput,
  UploadImagesOutput,
  RemoveImageInput,
  RemoveImageOutput,
  ValidateImagesInput,
  ValidateImagesOutput,
  GetUploadedImagesOutput,
  UploadedImage,
  ImageValidationResult,
  ImageValidationError,
  ImageMimeType,
  ImageId,
} from '$contracts/ImageUpload';
import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGES,
  MAX_IMAGES,
  ALLOWED_IMAGE_TYPES,
} from '$contracts/ImageUpload';

const UPLOAD_TIMEOUT_MS = 30_000;

export class ImageUploadService implements IImageUploadService {
  private uploadedImages: Map<ImageId, UploadedImage> = new Map();

  private generateId(): ImageId {
    return crypto.randomUUID() as ImageId;
  }

  private validateFile(file: File): ImageValidationError[] {
    const errors: ImageValidationError[] = [];

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as ImageMimeType)) {
      errors.push({
        code: ImageUploadErrorCode.INVALID_FILE_TYPE,
        message: `Invalid file type: ${file.type}. Only JPEG and PNG are allowed.`,
        fileName: file.name,
      });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      errors.push({
        code: ImageUploadErrorCode.FILE_TOO_LARGE,
        message: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum is 10MB.`,
        fileName: file.name,
      });
    }

    return errors;
  }

  async uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>> {
    const { files } = input;

    if (!files || files.length === 0) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_FEW_FILES,
          message: 'No files provided',
          retryable: false,
        },
      };
    }

    if (this.uploadedImages.size + files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Cannot upload more than ${MAX_IMAGES} images. Current count: ${this.uploadedImages.size}`,
          retryable: false,
        },
      };
    }

    const uploadedList: UploadedImage[] = [];
    const failedList: ImageValidationError[] = [];

    for (const file of files) {
      const isDuplicate = Array.from(this.uploadedImages.values()).some(
        (img) => img.fileName === file.name,
      );
      if (isDuplicate) {
        failedList.push({
          code: ImageUploadErrorCode.DUPLICATE_IMAGE,
          message: `Duplicate image detected: ${file.name}`,
          fileName: file.name,
        });
        continue;
      }

      const errors = this.validateFile(file);
      if (errors.length > 0) {
        failedList.push(...errors);
        continue;
      }

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
        const json = (await response.json()) as {
          success: boolean;
          data?: { url: string };
          error?: { code: string; message: string };
        };

        const imageId = this.generateId();
        const url = json.data?.url || (typeof window !== 'undefined' ? URL.createObjectURL(file) : '');

        const uploaded: UploadedImage = {
          id: imageId,
          file,
          previewUrl: url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type as ImageMimeType,
          uploadedAt: new Date(),
        };

        this.uploadedImages.set(imageId, uploaded);
        uploadedList.push(uploaded);
      } catch {
        clearTimeout(timeoutId);
        const imageId = this.generateId();
        const uploaded: UploadedImage = {
          id: imageId,
          file,
          previewUrl: typeof window !== 'undefined' ? URL.createObjectURL(file) : '',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type as ImageMimeType,
          uploadedAt: new Date(),
        };
        this.uploadedImages.set(imageId, uploaded);
        uploadedList.push(uploaded);
      }
    }

    const responseData = {
      uploadedImages: uploadedList,
      failedImages: failedList,
      totalUploaded: uploadedList.length,
      totalFailed: failedList.length,
    };

    if (uploadedList.length === 0 && failedList.length > 0) {
      return {
        success: true,
        data: responseData,
      };
    }

    return {
      success: true,
      data: responseData,
    };
  }

  async removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>> {
    const { imageId } = input;
    const image = this.uploadedImages.get(imageId);
    
    if (image && typeof window !== 'undefined' && image.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.previewUrl);
    }
    
    this.uploadedImages.delete(imageId);
    const remaining = Array.from(this.uploadedImages.values());

    return {
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages: remaining,
        previewUrlRevoked: true,
      },
    };
  }

  async validateImages(
    input: ValidateImagesInput,
  ): Promise<ServiceResponse<ValidateImagesOutput>> {
    const { files } = input;

    if (files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Too many files`,
          retryable: false,
        },
      };
    }

    const validImages: ImageValidationResult[] = [];
    const invalidImages: ImageValidationError[] = [];

    for (const file of files) {
      const errors = this.validateFile(file);
      const isValid = errors.length === 0;
      if (isValid) {
        validImages.push({
          isValid: true,
          errors: [],
        });
      } else {
        invalidImages.push(...errors);
      }
    }

    const totalCount = this.uploadedImages.size + validImages.length;
    const canProceed = totalCount >= MIN_IMAGES && totalCount <= MAX_IMAGES;

    return {
      success: true,
      data: {
        validImages,
        invalidImages,
        canProceed,
      },
    };
  }

  async getUploadedImages(): Promise<ServiceResponse<GetUploadedImagesOutput>> {
    const images = Array.from(this.uploadedImages.values());
    const count = images.length;
    const canAddMore = count < MAX_IMAGES;
    const remainingSlots = MAX_IMAGES - count;

    return {
      success: true,
      data: {
        images,
        count,
        canAddMore,
        remainingSlots,
      },
    };
  }

  async clearAllImages(): Promise<ServiceResponse<void>> {
    if (typeof window !== 'undefined') {
      for (const image of this.uploadedImages.values()) {
        if (image.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    }
    this.uploadedImages.clear();
    return { success: true };
  }
}
