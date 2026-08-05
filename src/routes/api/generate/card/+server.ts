/**
 * POST /api/generate/card
 * Generates a single tarot card image via xAI grok-image-generator.
 * Called once per card by ImageGenerationService (per-card approach avoids serverless timeout).
 */
import { json } from '@sveltejs/kit'
import OpenAI from 'openai'
import { put } from '@vercel/blob'
import { ImageGenerationErrorCode, GROK_IMAGE_MODEL } from '$contracts/ImageGeneration'
import type { RequestHandler } from './$types'

export const config = { maxDuration: 60 }

export const POST: RequestHandler = async ({ request }) => {
  const XAI_API_KEY = process.env['XAI_API_KEY']
  if (!XAI_API_KEY) {
    return json(
      {
        success: false,
        error: {
          code: ImageGenerationErrorCode.API_KEY_MISSING,
          message: 'API key not configured.',
        },
      },
      { status: 500 }
    )
  }

  let body: { cardNumber: number; cardName: string; generatedPrompt: string }
  try {
    body = await request.json()
  } catch {
    return json(
      {
        success: false,
        error: { code: ImageGenerationErrorCode.INVALID_PROMPTS, message: 'Expected JSON body.' },
      },
      { status: 400 }
    )
  }

  const { cardNumber, cardName, generatedPrompt } = body

  if (cardNumber === undefined || !cardName || !generatedPrompt) {
    return json(
      {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'cardNumber, cardName, and generatedPrompt are required.',
        },
      },
      { status: 422 }
    )
  }

  const rawModel =
    typeof body === 'object' && body !== null && 'model' in body ? body.model : undefined
  const modelToUse = typeof rawModel === 'string' && rawModel ? rawModel : GROK_IMAGE_MODEL

  const client = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: XAI_API_KEY })

  const prompt = [
    generatedPrompt,
    `Tarot card illustration for "${cardName}" (Major Arcana #${cardNumber}).`,
    'Square format, highly detailed, professional tarot artwork.',
  ].join(' ')

  try {
    const response = await client.images.generate({
      model: modelToUse,
      prompt,
      n: 1,
    })

    const imageData = response.data?.[0]
    if (!imageData) {
      return json(
        {
          success: false,
          error: {
            code: ImageGenerationErrorCode.GENERATION_FAILED,
            message: 'xAI returned no image data.',
          },
        },
        { status: 502 }
      )
    }

    const blobToken = process.env['BLOB_READ_WRITE_TOKEN']
    if (imageData.b64_json && blobToken) {
      try {
        const imageBuffer = Buffer.from(imageData.b64_json, 'base64')
        const paddedNum = String(cardNumber).padStart(2, '0')
        const safeName = cardName.replace(/\s+/g, '_')
        const blobFileName = `cards/${paddedNum}_${safeName}.png`

        const blob = await put(blobFileName, imageBuffer, {
          access: 'public',
          contentType: 'image/png',
          token: blobToken,
        })

        return json({ success: true, data: { imageUrl: blob.url } })
      } catch (blobErr) {
        console.warn(
          'Blob storage failed, using fallback:',
          blobErr instanceof Error ? blobErr.message : blobErr
        )
      }
    }

    if (imageData.url) {
      return json({ success: true, data: { imageUrl: imageData.url } })
    }

    if (imageData.b64_json) {
      const dataUrl = `data:image/png;base64,${imageData.b64_json}`
      return json({ success: true, data: { imageUrl: dataUrl } })
    }

    return json(
      {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_IMAGE_DATA,
          message: 'Image generated but no URL could be produced.',
        },
      },
      { status: 502 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed.'
    return json(
      { success: false, error: { code: ImageGenerationErrorCode.API_ERROR, message } },
      { status: 502 }
    )
  }
}
