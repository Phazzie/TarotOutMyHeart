/**
 * POST /api/generate/card
 * Generates a single tarot card image via xAI grok-image-generator.
 * Called once per card by ImageGenerationService (per-card approach avoids serverless timeout).
 *
 * PreMortem protections:
 *   - UNAUTHORIZED:   No XAI_API_KEY
 *   - INVALID_INPUT:  Missing cardNumber, cardName, or generatedPrompt
 *   - API_ERROR:      xAI returns non-200
 *   - TIMEOUT:        Image gen takes 15–45s; each call must fit within Vercel function limit
 *                     Requires vercel.json maxDuration: 60 (Pro) or 120 (Pro upgrade)
 *
 * Note: Vercel Hobby plan has 10s limit — this WILL timeout on Hobby.
 *       Upgrade to Vercel Pro and set maxDuration: 60 in vercel.json.
 */
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { XAI_API_KEY, BLOB_READ_WRITE_TOKEN } from '$env/static/private';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 }; // Vercel Pro required

export const POST: RequestHandler = async ({ request }) => {
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
      { success: false, error: { code: 'INVALID_INPUT', message: 'cardNumber, cardName, and generatedPrompt are required.' } },
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

    // Images come back as base64 — store in Vercel Blob for persistent URLs
    if (imageData.b64_json && BLOB_READ_WRITE_TOKEN) {
      const imageBuffer = Buffer.from(imageData.b64_json, 'base64');
      const paddedNum = String(cardNumber).padStart(2, '0');
      const safeName = cardName.replace(/\s+/g, '_');
      const blobFileName = `cards/${paddedNum}_${safeName}.png`;

      const blob = await put(blobFileName, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
        token: BLOB_READ_WRITE_TOKEN,
      });

      return json({ success: true, data: { imageUrl: blob.url } });
    }

    // Fallback: return URL directly if available
    if (imageData.url) {
      return json({ success: true, data: { imageUrl: imageData.url } });
    }

    return json(
      { success: false, error: { code: 'NO_URL', message: 'Image generated but no URL could be produced.' } },
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
