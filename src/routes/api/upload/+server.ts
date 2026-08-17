/**
 * POST /api/upload
 * Proxies image upload to Vercel Blob Storage.
 * Keeps BLOB_READ_WRITE_TOKEN secret — never exposed to client.
 */
import { json } from '@sveltejs/kit'
import { put } from '@vercel/blob'
import type { RequestHandler } from './$types'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export const POST: RequestHandler = async ({ request }) => {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json(
      {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Expected multipart form data.' },
      },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No file provided.' } },
      { status: 400 }
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json(
      {
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Only JPEG and PNG are accepted.' },
      },
      { status: 422 }
    )
  }

  if (file.size > MAX_SIZE) {
    return json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 10 MB limit.' } },
      { status: 422 }
    )
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const blobToken = process.env['BLOB_READ_WRITE_TOKEN']
  if (blobToken) {
    try {
      const blob = await put(file.name, fileBuffer, {
        access: 'public',
        contentType: file.type,
        token: blobToken,
      })
      return json({ success: true, data: { url: blob.url } }, { status: 200 })
    } catch (blobErr) {
      console.warn(
        'Blob upload failed, using data URL fallback:',
        blobErr instanceof Error ? blobErr.message : blobErr
      )
    }
  }

  const base64 = fileBuffer.toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`
  return json({ success: true, data: { url: dataUrl } }, { status: 200 })
}
