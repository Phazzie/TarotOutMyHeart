/**
 * POST /api/upload
 * Proxies image upload to Vercel Blob Storage.
 * Keeps BLOB_READ_WRITE_TOKEN secret — never exposed to client.
 *
 * PreMortem protections:
 * - UNAUTHORIZED: No BLOB_READ_WRITE_TOKEN in env (graceful 500, not crash)
 * - INVALID_TYPE: File type validation (server-side enforcement)
 * - FILE_TOO_LARGE: Size check after parsing FormData
 * - BLOB_ERROR: Falls back to data URL so the app remains functional
 *
 * Storage strategy:
 * 1. Vercel Blob (public access) — persistent, fast; requires store to be public
 *    in Vercel Dashboard (Storage → tarot-cards → Settings → Enable Public Access)
 * 2. Data URL fallback — works when blob store is private or unavailable;
 *    URL is returned inline (base64); larger than a blob URL but fully functional.
 *
 * Note: BLOB_READ_WRITE_TOKEN is optional at build time; read from dynamic env
 * so the build succeeds even before a Blob store is configured.
 */
import { json } from '@sveltejs/kit';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export const POST: RequestHandler = async ({ request }) => {
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

  // Read file bytes once (needed for both blob and data URL paths)
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Strategy 1: Vercel Blob (requires public store in Vercel dashboard)
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const blob = await put(file.name, fileBuffer, {
        access: 'public',
        contentType: file.type,
        token: blobToken,
      });
      return json({ success: true, data: { url: blob.url } }, { status: 200 });
    } catch (blobErr) {
      // Blob failed — log and fall through to data URL
      console.warn(
        'Blob upload failed, using data URL fallback:',
        blobErr instanceof Error ? blobErr.message : blobErr,
      );
    }
  }

  // Strategy 2: Data URL — always works; stored in app state
  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;
  return json({ success: true, data: { url: dataUrl } }, { status: 200 });
};
