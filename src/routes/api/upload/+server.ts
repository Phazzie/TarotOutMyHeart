/**
 * POST /api/upload
 * Proxies image upload to Vercel Blob Storage.
 * Keeps BLOB_READ_WRITE_TOKEN secret — never exposed to client.
 *
 * PreMortem protections:
 * - UNAUTHORIZED: No BLOB_READ_WRITE_TOKEN in env (graceful 500, not crash)
 * - INVALID_TYPE: File type validation (server-side enforcement)
 * - FILE_TOO_LARGE: Size check after parsing FormData
 * - BLOB_ERROR: Vercel Blob SDK errors
 *
 * Note: BLOB_READ_WRITE_TOKEN is optional at build time; read from dynamic env
 * so the build succeeds even before a Blob store is configured.
 *
 * Storage: Uses access: 'private' — compatible with both public and private Vercel Blob stores.
 * The returned URL is the blob's canonical URL. For browser display, the Vercel Blob store
 * should be set to public in the Vercel dashboard (Storage → tarot-cards → Settings).
 */
import { json } from '@sveltejs/kit';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export const POST: RequestHandler = async ({ request }) => {
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Blob storage not configured.' } },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(
      {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Expected multipart form data.' },
      },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No file provided.' } },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json(
      { success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG and PNG are accepted.' } },
      { status: 422 },
    );
  }

  if (file.size > MAX_SIZE) {
    return json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 10 MB limit.' } },
      { status: 422 },
    );
  }

  try {
    const blob = await put(file.name, file, {
      access: 'private',
      token: blobToken,
    });

    return json({ success: true, data: { url: blob.url } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return json(
      { success: false, error: { code: 'BLOB_ERROR', message } },
      { status: 500 },
    );
  }
};
