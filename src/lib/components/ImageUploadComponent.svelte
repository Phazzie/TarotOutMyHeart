<!--
/**
 * @fileoverview Image Upload Component - Drag-and-drop interface for reference images
 * @purpose Collect 1-5 reference images to define tarot deck visual style
 * @dataFlow User selects/drops files → Validation → ImageUploadMock → appStore.uploadedImages
 * @boundary Seam #1: ImageUploadSeam - UI for browser file upload and preview
 * @updated 2025-11-15
 *
 * Features:
 * - Drag-and-drop zone with visual feedback on dragover
 * - File browser fallback (hidden input)
 * - Image preview thumbnails with filename, size, and remove button
 * - Validation: max 5 images, max 10MB each, JPEG/PNG only
 * - Upload progress indicators
 * - Display upload count (X/5 images)
 * - Inline error messages
 * - Glassmorphism card design matching mystical theme
 * - Fully accessible (ARIA labels, keyboard navigation)
 * - Mobile responsive grid layout
 *
 * @example
 * ```svelte
 * <ImageUploadComponent />
 * ```
 */
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import { imageUploadService } from '$services/factory'
  import type { ImageValidationError } from '$contracts/index'
  import { ImageUploadErrorCode } from '$contracts/index'
  import { createImageId, toImageUploadErrorCode } from '$lib/utils/types'

  // ==========================================================================
  // SERVICE INITIALIZATION
  // ==========================================================================

  const uploadService = imageUploadService

  // ==========================================================================
  // STATE MANAGEMENT (Svelte 5 runes)
  // ==========================================================================

  /**
   * Whether drag is currently over the drop zone
   */
  let isDragOver = $state(false)

  /**
   * Whether an upload operation is in progress
   */
  let isUploading = $state(false)

  /**
   * Current validation/upload errors to display
   */
  let errors = $state<ImageValidationError[]>([])

  /**
   * Reference to hidden file input element
   */
  let fileInputRef = $state<HTMLInputElement | null>(null)

  /**
   * Success message after upload (temporary)
   */
  let successMessage = $state<string | null>(null)

  // ==========================================================================
  // COMPUTED VALUES ($derived)
  // ==========================================================================

  /**
   * Current uploaded images from store
   */
  const uploadedImages = $derived(appStore.uploadedImages)

  /**
   * Current count of uploaded images
   */
  const imageCount = $derived(uploadedImages.length)

  /**
   * Whether user can upload more images
   */
  const canUploadMore = $derived(imageCount < appStore.MAX_IMAGES)

  /**
   * How many more images can be uploaded
   */
  const remainingSlots = $derived(appStore.MAX_IMAGES - imageCount)

  /**
   * Whether to show the upload zone
   */
  const showUploadZone = $derived(canUploadMore)

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle drag enter event
   */
  function handleDragEnter(event: DragEvent): void {
    event.preventDefault()
    isDragOver = true
  }

  /**
   * Handle drag over event
   */
  function handleDragOver(event: DragEvent): void {
    event.preventDefault()
    isDragOver = true
  }

  /**
   * Handle drag leave event
   */
  function handleDragLeave(event: DragEvent): void {
    event.preventDefault()
    // Only set to false if leaving the drop zone itself, not child elements
    const target = event.target
    const currentTarget = event.currentTarget
    if (
      target instanceof HTMLElement &&
      currentTarget instanceof HTMLElement &&
      target === currentTarget
    ) {
      isDragOver = false
    }
  }

  /**
   * Handle file drop event
   */
  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault()
    isDragOver = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      await processFiles(Array.from(files))
    }
  }

  /**
   * Handle file input change event
   */
  async function handleFileInputChange(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLInputElement)) return
    const input = event.target
    const files = input.files

    if (files && files.length > 0) {
      await processFiles(Array.from(files))
      // Reset input so same file can be selected again
      input.value = ''
    }
  }

  /**
   * Open file browser dialog
   */
  function openFileBrowser(): void {
    fileInputRef?.click()
  }

  /**
   * Handle keyboard activation of file browser
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFileBrowser()
    }
  }

  /**
   * Remove an uploaded image
   */
  async function removeImage(imageId: string): Promise<void> {
    // Use the service to remove the image
    const result = await uploadService.removeImage({ imageId: createImageId(imageId) })

    if (result.success && result.data) {
      // Update store with remaining images
      appStore.setUploadedImages(result.data.remainingImages)

      // Revoke the object URL to free memory
      const removedImage = uploadedImages.find(img => img.id === imageId)
      if (removedImage) {
        URL.revokeObjectURL(removedImage.previewUrl)
      }
    } else if (result.error) {
      errors = [
        {
          code: toImageUploadErrorCode(result.error.code),
          message: result.error.message,
          fileName: '',
        },
      ]
    }
  }

  /**
   * Clear all images
   */
  async function clearAllImages(): Promise<void> {
    // Revoke all object URLs
    uploadedImages.forEach(img => {
      URL.revokeObjectURL(img.previewUrl)
    })

    // Clear from service and store
    await uploadService.clearAllImages()
    appStore.clearUploadedImages()

    // Clear any errors
    errors = []
    successMessage = null
  }

  // ==========================================================================
  // CORE UPLOAD LOGIC
  // ==========================================================================

  /**
   * Process selected/dropped files
   */
  async function processFiles(files: File[]): Promise<void> {
    // Clear previous errors and success message
    errors = []
    successMessage = null

    // Check if adding would exceed limit
    if (imageCount + files.length > appStore.MAX_IMAGES) {
      errors = [
        {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Can only add ${remainingSlots} more image(s). Maximum is ${appStore.MAX_IMAGES} images.`,
          fileName: '',
        },
      ]
      return
    }

    // Set uploading state
    isUploading = true

    try {
      // Call upload service
      const epoch = appStore.deckEpoch
      const result = await uploadService.uploadImages({ files })
      // Withdrawn while uploading: these exhibits belong to the old deck.
      if (epoch !== appStore.deckEpoch) return

      if (result.success && result.data) {
        const { uploadedImages: newImages, failedImages, totalUploaded } = result.data

        // Update store with newly uploaded images
        if (newImages.length > 0) {
          appStore.setUploadedImages([...uploadedImages, ...newImages])

          // Show success message
          successMessage =
            totalUploaded === 1 ? `1 exhibit received.` : `${totalUploaded} exhibits received.`

          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            successMessage = null
          }, 3000)
        }

        // Show validation errors if any
        if (failedImages.length > 0) {
          errors = failedImages
        }
      } else if (result.error) {
        // Handle service error
        errors = [
          {
            code: toImageUploadErrorCode(result.error.code),
            message: result.error.message,
            fileName: '',
          },
        ]
      } else if (result.data && result.data.failedImages.length > 0) {
        // All uploads failed
        errors = result.data.failedImages
      }
    } catch (error) {
      // Handle unexpected errors
      errors = [
        {
          code: ImageUploadErrorCode.UPLOAD_FAILED,
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          fileName: '',
        },
      ]
    } finally {
      isUploading = false
    }
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
</script>

<div class="upload-container">
  <!-- Header with count -->
  <div class="upload-header">
    <h2 class="upload-title"><span class="section-tag">Section A</span> Supporting evidence</h2>
    <div class="image-counter" aria-label="{imageCount} of {appStore.MAX_IMAGES} exhibits">
      <span class="count-label">Exhibits</span>
      <span class="count-current">{imageCount}</span>
      <span class="count-separator">/</span>
      <span class="count-max">{appStore.MAX_IMAGES}</span>
    </div>
  </div>

  <p class="upload-description">
    Attach 1 to {appStore.MAX_IMAGES} photos of the look you want your deck to have. Each one is filed
    as an exhibit and shown to the clerk. JPEG or PNG, 10 MB max each.
  </p>

  <!-- Success Message -->
  {#if successMessage}
    <div class="message message-success" role="status">
      <span class="message-icon">✓</span>
      <span class="message-text">{successMessage}</span>
    </div>
  {/if}

  <!-- Error Messages -->
  {#if errors.length > 0}
    <div class="message message-error" role="alert">
      <span class="message-icon">⚠</span>
      <div class="message-content">
        {#each errors as error}
          <div class="error-item">
            <strong>{error.fileName ? `${error.fileName}: ` : ''}</strong>
            {error.message}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Upload Zone (shown when can upload more) -->
  {#if showUploadZone}
    <div
      class="drop-zone"
      class:drag-over={isDragOver}
      class:uploading={isUploading}
      role="button"
      tabindex="0"
      aria-label="Upload reference images. Click to browse files or drag and drop images here."
      onclick={openFileBrowser}
      onkeydown={handleKeyDown}
      ondragenter={handleDragEnter}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      {#if isUploading}
        <div class="drop-zone-content">
          <div class="upload-spinner" aria-label="Uploading"></div>
          <p class="drop-zone-title">Stamping received…</p>
        </div>
      {:else}
        <div class="drop-zone-content">
          <div class="drop-zone-icon" aria-hidden="true">IN</div>
          <p class="drop-zone-title">
            {isDragOver ? 'Let go. The tray has it.' : 'Drop photos in the tray'}
          </p>
          <p class="drop-zone-subtitle">or click to choose files</p>
          <p class="drop-zone-details">
            {remainingSlots} exhibit slot{remainingSlots !== 1 ? 's' : ''} open
          </p>
        </div>
      {/if}
    </div>

    <!-- Hidden file input -->
    <input
      bind:this={fileInputRef}
      type="file"
      accept="image/jpeg,image/png"
      multiple
      onchange={handleFileInputChange}
      aria-label="File input for uploading reference images"
      class="file-input"
    />
  {/if}

  <!-- Preview Grid -->
  {#if uploadedImages.length > 0}
    <div class="preview-section">
      <div class="preview-header">
        <h3 class="preview-title">Exhibits on file</h3>
        <button class="clear-all-btn" onclick={clearAllImages} aria-label="Clear all images">
          Withdraw all
        </button>
      </div>

      <div class="preview-grid">
        {#each uploadedImages as image, i (image.id)}
          <div class="preview-card" style="--tilt: {(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))}deg">
            <span class="exhibit-tag">Exhibit {String.fromCharCode(65 + i)}</span>
            <!-- Image preview -->
            <div class="preview-image-wrapper">
              <img
                src={image.previewUrl}
                alt={image.fileName}
                class="preview-image"
                loading="lazy"
              />
              <button
                class="remove-btn"
                onclick={() => removeImage(image.id)}
                aria-label={`Remove ${image.fileName}`}
              >
                <span class="remove-icon" aria-hidden="true">×</span>
              </button>
            </div>

            <!-- Image info -->
            <div class="preview-info">
              <p class="preview-filename" title={image.fileName}>
                {image.fileName}
              </p>
              <p class="preview-filesize">
                {formatFileSize(image.fileSize)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if uploadedImages.length === 0 && !isUploading}
    <div class="empty-state">
      <p class="empty-state-text">No exhibits on file. The clerk can't work from nothing.</p>
    </div>
  {/if}

  <!-- Max capacity message -->
  {#if !canUploadMore}
    <div class="message message-info" role="status">
      <span class="message-icon">ℹ</span>
      <span class="message-text">
        All {appStore.MAX_IMAGES} exhibit slots are full. Withdraw one to add another.
      </span>
    </div>
  {/if}
</div>

<style>
  .upload-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .upload-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.4rem;
  }

  .upload-title {
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .section-tag {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background: var(--ink);
    color: var(--paper);
    letter-spacing: 0.1em;
  }

  .image-counter {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    font-family: var(--font-typed);
    white-space: nowrap;
  }

  .count-label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-right: 0.3rem;
    color: var(--ink-soft);
  }

  .count-current {
    font-size: 1.5rem;
    color: var(--stamp-red);
  }

  .count-separator,
  .count-max {
    font-size: 1rem;
  }

  .upload-description {
    font-size: 0.95rem;
    color: var(--ink-soft);
  }

  .message {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    padding: 0.6rem 0.8rem;
    border: 2px solid;
    font-size: 0.9rem;
  }

  .message-icon {
    font-weight: 700;
  }

  .message-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .message-success {
    border-color: #2f6b3d;
    color: #24542f;
    background: #e3efdd;
  }

  .message-error {
    border-color: var(--stamp-red);
    color: #7d1f1c;
    background: var(--carbon-pink);
  }

  .message-info {
    border-color: var(--stamp-blue);
    color: #173d78;
    background: #e3eaf6;
  }

  /* The in-tray. */
  .drop-zone {
    position: relative;
    padding: 1.5rem 1rem 1.25rem;
    border: 3px dashed #8f8670;
    background:
      repeating-linear-gradient(135deg, transparent 0 14px, rgba(0, 0, 0, 0.03) 14px 15px), #ece4cd;
    text-align: center;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
  }

  .drop-zone:hover:not(.uploading),
  .drop-zone.drag-over {
    border-color: var(--stamp-blue);
    background-color: #e3eaf6;
  }

  .drop-zone.uploading {
    cursor: progress;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .drop-zone-icon {
    padding: 0.2rem 0.7rem;
    border: 3px solid var(--ink);
    font-family: var(--font-heading);
    font-weight: 700;
    letter-spacing: 0.2em;
    font-size: 1.1rem;
    margin-bottom: 0.3rem;
  }

  .drop-zone-title {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .drop-zone-subtitle,
  .drop-zone-details {
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .upload-spinner {
    width: 36px;
    height: 36px;
    border: 4px solid #c9bfa5;
    border-top-color: var(--stamp-red);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preview-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .clear-all-btn {
    padding: 0.3rem 0.7rem;
    background: transparent;
    border: 1px solid var(--ink-soft);
    color: var(--ink);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
  }

  .clear-all-btn:hover {
    border-color: var(--stamp-red);
    color: var(--stamp-red);
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1.25rem 1rem;
    padding: 0.5rem 0.25rem;
  }

  /* Each exhibit is a photo paper-clipped to the form. */
  .preview-card {
    position: relative;
    padding: 8px 8px 6px;
    background: #fff;
    box-shadow: 0 6px 12px -6px rgba(0, 0, 0, 0.45);
    transform: rotate(var(--tilt, 0deg));
    transition: transform var(--transition-fast);
  }

  .preview-card:hover {
    transform: rotate(0deg) scale(1.03);
  }

  .preview-card::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 18px;
    width: 12px;
    height: 30px;
    border: 2px solid #8d949b;
    border-radius: 6px;
  }

  .exhibit-tag {
    position: absolute;
    top: 12px;
    right: -6px;
    z-index: 2;
    padding: 0.1rem 0.4rem;
    background: var(--carbon-yellow);
    border: 1px solid #c6b14e;
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .preview-image-wrapper {
    position: relative;
    aspect-ratio: 1;
    background: #ddd;
    overflow: hidden;
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .remove-btn {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 30px;
    height: 30px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--stamp-red);
    color: #fff;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }

  .remove-icon {
    display: block;
    line-height: 1;
  }

  .preview-info {
    padding-top: 0.35rem;
  }

  .preview-filename {
    font-family: var(--font-typed);
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-filesize {
    font-size: 0.7rem;
    color: var(--ink-soft);
  }

  .empty-state-text {
    font-size: 0.9rem;
    font-style: italic;
    color: var(--ink-soft);
  }
</style>
