/**
 * POST /api/generate/card
 * Generates a single tarot card image via xAI grok-image-generator.
 * Called once per card by ImageGenerationService (per-card approach avoids serverless timeout).
 *
 * PreMortem protections:
 * - UNAUTHORIZED: No XAI_API_KEY
 * - INVALID_INPUT: Missing cardNumber, cardName, or generatedPrompt
 * - API_ERROR: xAI returns non-200
 * - TIMEOUT: Image gen takes 15–45s; each call must fit within Vercel function limit
 *
 * Storage strategy (in priority order):
 * 1. Vercel Blob (public access) — persistent, fast; requires store to be public
 *    in Vercel Dashboard (Storage → tarot-cards → Settings → Enable Public Access)
 * 2. xAI URL — if xAI returns a direct URL instead of base64
 * 3. Data URL — always works; stored in app state, used for zip download
 *
 * Note: XAI_API_KEY and BLOB_READ_WRITE_TOKEN are read from dynamic env at runtime
 * so the build succeeds even when they're not set at build time.
 */
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 }; // Vercel Pro required

export const POST: RequestHandler = async ({ request }) => {
  const XAI_API_KEY = env.XAI_API_KEY;
  if (!XAI_API_KEY) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'API key not configured.' } },
      { status: 500 },
    );
  }

  let body: { cardNumber: number; cardName: string; generatedPrompt: string };
  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Expected JSON body.' } },
      { status: 400 },
    );
  }

  const { cardNumber, cardName, generatedPrompt } = body;

  if (cardNumber === undefined || !cardName || !generatedPrompt) {
    return json(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'cardNumber, cardName, and generatedPrompt are required.',
        },
      },
      { status: 422 },
    );
  }

  const client = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: XAI_API_KEY });

  // Build final image prompt with tarot framing
  const prompt = [
    generatedPrompt,
    `Tarot card illustration for "${cardName}" (Major Arcana #${cardNumber}).`,
    'Square format, highly detailed, professional tarot artwork.',
  ].join(' ');

  try {
    const response = await client.images.generate({
      model: 'grok-2-image-generation',
      prompt,
      n: 1,
    });

    const imageData = response.data?.[0];
    if (!imageData) {
      return json(
        { success: false, error: { code: 'NO_IMAGE', message: 'xAI returned no image data.' } },
        { status: 502 },
      );
    }

    // Strategy 1: Store in Vercel Blob (requires public store in Vercel dashboard).
    const blobToken = env.BLOB_READ_WRITE_TOKEN;
    if (imageData.b64_json && blobToken) {
      try {
        const imageBuffer = Buffer.from(imageData.b64_json, 'base64');
        const paddedNum = String(cardNumber).padStart(2, '0');
        const safeName = cardName.replace(/\s+/g, '_');
        const blobFileName = `cards/${paddedNum}_${safeName}.png`;

        const blob = await put(blobFileName, imageBuffer, {
          access: 'public',
          contentType: 'image/png',
          token: blobToken,
        });

        return json({ success: true, data: { imageUrl: blob.url } });
      } catch (blobErr) {
        // Blob failed — fall through to next strategy
        console.warn(
          'Blob storage failed, using fallback:',
          blobErr instanceof Error ? blobErr.message : blobErr,
        );
      }
    }

    // Strategy 2: Return xAI URL directly (if provided)
    if (imageData.url) {
      return json({ success: true, data: { imageUrl: imageData.url } });
    }

    // Strategy 3: Return as data URL — works in browser img tags and for zip download
    if (imageData.b64_json) {
      const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
      return json({ success: true, data: { imageUrl: dataUrl } });
    }

    return json(
      {
        success: false,
        error: { code: 'NO_URL', message: 'Image generated but no URL could be produced.' },
      },
      { status: 502 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed.';
    return json(
      { success: false, error: { code: 'API_ERROR', message } },
      { status: 502 },
    );
  }
};
