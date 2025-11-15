<!--
/**
 * @fileoverview Image Upload Component - Drag-and-drop interface for reference images
 * @purpose Collect 1-10 reference images to define tarot deck visual style
 * @dataFlow User selects/drops files → Validation → ImageUploadMock → appStore.uploadedImages
 * @boundary Seam #1: ImageUploadSeam - UI for browser file upload and preview
 * @updated 2025-11-15
 *
 * Features:
 * - Drag-and-drop zone with visual feedback on dragover
 * - File browser fallback (hidden input)
 * - Image preview thumbnails with filename, size, and remove button
 * - Validation: max 10 images, max 10MB each, JPEG/PNG only
 * - Upload progress indicators
 * - Display upload count (X/10 images)
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
	import { appStore } from '$lib/stores/appStore.svelte';
	import { ImageUploadMock } from '$services/mock/ImageUploadMock';
	import type { ImageValidationError } from '../../../contracts/index';

	// ==========================================================================
	// SERVICE INITIALIZATION
	// ==========================================================================

	const uploadService = new ImageUploadMock();

	// ==========================================================================
	// STATE MANAGEMENT (Svelte 5 runes)
	// ==========================================================================

	/**
	 * Whether drag is currently over the drop zone
	 */
	let isDragOver = $state(false);

	/**
	 * Whether an upload operation is in progress
	 */
	let isUploading = $state(false);

	/**
	 * Current validation/upload errors to display
	 */
	let errors = $state<ImageValidationError[]>([]);

	/**
	 * Reference to hidden file input element
	 */
	let fileInputRef = $state<HTMLInputElement | null>(null);

	/**
	 * Success message after upload (temporary)
	 */
	let successMessage = $state<string | null>(null);

	// ==========================================================================
	// COMPUTED VALUES ($derived)
	// ==========================================================================

	/**
	 * Current uploaded images from store
	 */
	const uploadedImages = $derived(appStore.uploadedImages);

	/**
	 * Current count of uploaded images
	 */
	const imageCount = $derived(uploadedImages.length);

	/**
	 * Whether user can upload more images
	 */
	const canUploadMore = $derived(imageCount < appStore.MAX_IMAGES);

	/**
	 * How many more images can be uploaded
	 */
	const remainingSlots = $derived(appStore.MAX_IMAGES - imageCount);

	/**
	 * Whether to show the upload zone
	 */
	const showUploadZone = $derived(canUploadMore);

	// ==========================================================================
	// EVENT HANDLERS
	// ==========================================================================

	/**
	 * Handle drag enter event
	 */
	function handleDragEnter(event: DragEvent): void {
		event.preventDefault();
		isDragOver = true;
	}

	/**
	 * Handle drag over event
	 */
	function handleDragOver(event: DragEvent): void {
		event.preventDefault();
		isDragOver = true;
	}

	/**
	 * Handle drag leave event
	 */
	function handleDragLeave(event: DragEvent): void {
		event.preventDefault();
		// Only set to false if leaving the drop zone itself, not child elements
		const target = event.target as HTMLElement;
		const currentTarget = event.currentTarget as HTMLElement;
		if (target === currentTarget) {
			isDragOver = false;
		}
	}

	/**
	 * Handle file drop event
	 */
	async function handleDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			await processFiles(Array.from(files));
		}
	}

	/**
	 * Handle file input change event
	 */
	async function handleFileInputChange(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const files = input.files;

		if (files && files.length > 0) {
			await processFiles(Array.from(files));
			// Reset input so same file can be selected again
			input.value = '';
		}
	}

	/**
	 * Open file browser dialog
	 */
	function openFileBrowser(): void {
		fileInputRef?.click();
	}

	/**
	 * Handle keyboard activation of file browser
	 */
	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFileBrowser();
		}
	}

	/**
	 * Remove an uploaded image
	 */
	async function removeImage(imageId: string): Promise<void> {
		// Use the service to remove the image
		const result = await uploadService.removeImage({ imageId: imageId as any });

		if (result.success && result.data) {
			// Update store with remaining images
			appStore.setUploadedImages(result.data.remainingImages);

			// Revoke the object URL to free memory
			const removedImage = uploadedImages.find((img) => img.id === imageId);
			if (removedImage) {
				URL.revokeObjectURL(removedImage.previewUrl);
			}
		} else if (result.error) {
			errors = [
				{
					code: result.error.code as any,
					message: result.error.message,
					fileName: ''
				}
			];
		}
	}

	/**
	 * Clear all images
	 */
	async function clearAllImages(): Promise<void> {
		// Revoke all object URLs
		uploadedImages.forEach((img) => {
			URL.revokeObjectURL(img.previewUrl);
		});

		// Clear from service and store
		await uploadService.clearAllImages();
		appStore.clearUploadedImages();

		// Clear any errors
		errors = [];
		successMessage = null;
	}

	// ==========================================================================
	// CORE UPLOAD LOGIC
	// ==========================================================================

	/**
	 * Process selected/dropped files
	 */
	async function processFiles(files: File[]): Promise<void> {
		// Clear previous errors and success message
		errors = [];
		successMessage = null;

		// Check if adding would exceed limit
		if (imageCount + files.length > appStore.MAX_IMAGES) {
			errors = [
				{
					code: 'TOO_MANY_FILES' as any,
					message: `Can only add ${remainingSlots} more image(s). Maximum is ${appStore.MAX_IMAGES} images.`,
					fileName: ''
				}
			];
			return;
		}

		// Set uploading state
		isUploading = true;

		try {
			// Call upload service
			const result = await uploadService.uploadImages({ files });

			if (result.success && result.data) {
				const { uploadedImages: newImages, failedImages, totalUploaded } = result.data;

				// Update store with newly uploaded images
				if (newImages.length > 0) {
					appStore.setUploadedImages([...uploadedImages, ...newImages]);

					// Show success message
					successMessage = `Successfully uploaded ${totalUploaded} image(s)`;

					// Auto-hide success message after 3 seconds
					setTimeout(() => {
						successMessage = null;
					}, 3000);
				}

				// Show validation errors if any
				if (failedImages.length > 0) {
					errors = failedImages;
				}
			} else if (result.error) {
				// Handle service error
				errors = [
					{
						code: result.error.code as any,
						message: result.error.message,
						fileName: ''
					}
				];
			} else if (result.data && result.data.failedImages.length > 0) {
				// All uploads failed
				errors = result.data.failedImages;
			}
		} catch (error) {
			// Handle unexpected errors
			errors = [
				{
					code: 'UPLOAD_FAILED' as any,
					message: error instanceof Error ? error.message : 'An unexpected error occurred',
					fileName: ''
				}
			];
		} finally {
			isUploading = false;
		}
	}

	/**
	 * Format file size for display
	 */
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
</script>

<div class="upload-container">
	<!-- Header with count -->
	<div class="upload-header">
		<h2 class="upload-title">Reference Images</h2>
		<div class="image-counter">
			<span class="count-current">{imageCount}</span>
			<span class="count-separator">/</span>
			<span class="count-max">{appStore.MAX_IMAGES}</span>
			<span class="count-label">images</span>
		</div>
	</div>

	<p class="upload-description">
		Upload 1-{appStore.MAX_IMAGES} reference images to define your deck's visual style. JPEG or PNG,
		max 10MB each.
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
					<p class="drop-zone-title">Uploading...</p>
				</div>
			{:else}
				<div class="drop-zone-content">
					<div class="drop-zone-icon" aria-hidden="true">
						{isDragOver ? '⬇' : '📁'}
					</div>
					<p class="drop-zone-title">
						{isDragOver ? 'Drop images here' : 'Drag and drop images'}
					</p>
					<p class="drop-zone-subtitle">or click to browse</p>
					<p class="drop-zone-details">
						JPEG or PNG • Max 10MB each • {remainingSlots} slot{remainingSlots !== 1
							? 's'
							: ''} remaining
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
				<h3 class="preview-title">Uploaded Images</h3>
				<button class="clear-all-btn" onclick={clearAllImages} aria-label="Clear all images">
					Clear All
				</button>
			</div>

			<div class="preview-grid">
				{#each uploadedImages as image (image.id)}
					<div class="preview-card">
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
			<p class="empty-state-text">No images uploaded yet. Add your first reference image above.</p>
		</div>
	{/if}

	<!-- Max capacity message -->
	{#if !canUploadMore}
		<div class="message message-info" role="status">
			<span class="message-icon">ℹ</span>
			<span class="message-text">
				Maximum of {appStore.MAX_IMAGES} images reached. Remove an image to upload more.
			</span>
		</div>
	{/if}
</div>

<style>
	/* ===============================================
	   CONTAINER & LAYOUT
	   =============================================== */
	.upload-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	/* ===============================================
	   HEADER SECTION
	   =============================================== */
	.upload-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.upload-title {
		margin: 0;
		font-size: var(--text-2xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.image-counter {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.count-current {
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--color-secondary);
		font-family: var(--font-heading);
	}

	.count-separator {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
	}

	.count-max {
		font-size: var(--text-lg);
		color: var(--color-text-secondary);
	}

	.count-label {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-left: var(--spacing-xs);
	}

	.upload-description {
		margin: 0;
		font-size: var(--text-base);
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	/* ===============================================
	   MESSAGES (Success, Error, Info)
	   =============================================== */
	.message {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		line-height: 1.5;
		animation: slideIn var(--transition-normal);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.message-icon {
		font-size: var(--text-xl);
		flex-shrink: 0;
	}

	.message-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.message-text {
		flex: 1;
	}

	.message-success {
		background: rgba(72, 187, 120, 0.1);
		border: 1px solid rgba(72, 187, 120, 0.3);
		color: #9ae6b4;
	}

	.message-error {
		background: rgba(245, 101, 101, 0.1);
		border: 1px solid rgba(245, 101, 101, 0.3);
		color: #fc8181;
	}

	.message-info {
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		color: var(--color-text-secondary);
	}

	.error-item {
		margin-bottom: var(--spacing-xs);
	}

	.error-item:last-child {
		margin-bottom: 0;
	}

	/* ===============================================
	   DROP ZONE
	   =============================================== */
	.drop-zone {
		position: relative;
		min-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xxl);
		background: var(--glass-bg);
		border: 2px dashed var(--glass-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-normal);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		outline: none;
	}

	.drop-zone:hover:not(.uploading) {
		border-color: var(--color-primary-light);
		background: rgba(139, 92, 246, 0.15);
		transform: scale(1.01);
	}

	.drop-zone:focus-visible {
		border-color: var(--color-secondary);
		box-shadow: 0 0 0 3px rgba(246, 173, 85, 0.2);
	}

	.drop-zone.drag-over {
		border-color: var(--color-secondary);
		background: rgba(246, 173, 85, 0.1);
		border-style: solid;
		transform: scale(1.02);
	}

	.drop-zone.uploading {
		cursor: wait;
		opacity: 0.8;
	}

	.drop-zone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		text-align: center;
		pointer-events: none;
	}

	.drop-zone-icon {
		font-size: 4rem;
		filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4));
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.drop-zone-title {
		margin: 0;
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.drop-zone-subtitle {
		margin: 0;
		font-size: var(--text-base);
		color: var(--color-text-secondary);
	}

	.drop-zone-details {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	/* Upload spinner */
	.upload-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--glass-border);
		border-top-color: var(--color-secondary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Hidden file input */
	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* ===============================================
	   PREVIEW SECTION
	   =============================================== */
	.preview-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
	}

	.preview-title {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text);
	}

	.clear-all-btn {
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-text-secondary);
		background: transparent;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.clear-all-btn:hover {
		color: var(--color-text);
		border-color: var(--color-primary-light);
		background: var(--glass-bg);
	}

	.clear-all-btn:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	/* Preview Grid */
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--spacing-md);
	}

	@media (max-width: 640px) {
		.preview-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 641px) and (max-width: 1024px) {
		.preview-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1025px) {
		.preview-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Preview Card */
	.preview-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition: all var(--transition-normal);
		animation: fadeIn var(--transition-normal);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.preview-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 24px rgba(31, 38, 135, 0.3);
		border-color: var(--color-primary-light);
	}

	.preview-image-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-bg-tertiary);
	}

	.preview-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Remove button */
	.remove-btn {
		position: absolute;
		top: var(--spacing-sm);
		right: var(--spacing-sm);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		cursor: pointer;
		opacity: 0;
		transition: all var(--transition-fast);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.preview-card:hover .remove-btn {
		opacity: 1;
	}

	.remove-btn:hover {
		background: rgba(245, 101, 101, 0.9);
		border-color: rgba(245, 101, 101, 1);
		transform: scale(1.1);
	}

	.remove-btn:focus-visible {
		opacity: 1;
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.remove-icon {
		font-size: var(--text-2xl);
		line-height: 1;
		color: white;
		font-weight: 300;
	}

	/* Preview info */
	.preview-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.preview-filename {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preview-filesize {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}

	/* ===============================================
	   EMPTY STATE
	   =============================================== */
	.empty-state {
		padding: var(--spacing-xl);
		text-align: center;
		color: var(--color-text-muted);
	}

	.empty-state-text {
		margin: 0;
		font-size: var(--text-base);
		font-style: italic;
	}

	/* ===============================================
	   RESPONSIVE ADJUSTMENTS
	   =============================================== */
	@media (max-width: 640px) {
		.drop-zone {
			min-height: 200px;
			padding: var(--spacing-lg);
		}

		.drop-zone-icon {
			font-size: 3rem;
		}

		.upload-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.image-counter {
			width: 100%;
			justify-content: center;
		}
	}
</style>
