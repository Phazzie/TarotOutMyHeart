/**
 * POST /api/prompts
 * Sends reference images to xAI Grok (vision) and returns 22 card prompts.
 * Keeps XAI_API_KEY secret — never exposed to client.
 *
 * PreMortem protections:
 *   - UNAUTHORIZED:   No XAI_API_KEY
 *   - INVALID_INPUT:  Missing/empty referenceImageUrls or styleInputs
 *   - API_ERROR:      xAI returns non-200 or malformed JSON
 *   - TIMEOUT:        xAI reasoning model is slow; 90s function timeout via vercel.json
 *
 * Note: This route uses Vercel `maxDuration: 90` — set in vercel.json.
 */
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { XAI_API_KEY } from '$env/static/private';
import { MAJOR_ARCANA_NAMES, MAJOR_ARCANA_MEANINGS } from '$contracts/PromptGeneration';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 90 }; // Vercel Pro: up to 300s

export const POST: RequestHandler = async ({ request }) => {
  if (!XAI_API_KEY) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'API key not configured.' } },
      { status: 500 },
    );
  }

  let body: { referenceImageUrls: string[]; styleInputs: { theme: string; tone: string; description: string } };
  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Expected JSON body.' } },
      { status: 400 },
    );
  }

  const { referenceImageUrls, styleInputs } = body;

  if (!referenceImageUrls?.length || !styleInputs?.theme) {
    return json(
      { success: false, error: { code: 'INVALID_INPUT', message: 'referenceImageUrls and styleInputs.theme are required.' } },
      { status: 422 },
    );
  }

  const client = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: XAI_API_KEY });

  // Build the vision prompt — describe the style once, then ask for all 22 card prompts
  const styleDescription = [
    `Theme: ${styleInputs.theme}`,
    `Tone: ${styleInputs.tone}`,
    styleInputs.description ? `Style notes: ${styleInputs.description}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are an expert tarot deck artist and prompt engineer.
Generate image generation prompts for a custom tarot deck based on reference images provided.
The style should be: ${styleDescription}
For each card, output a detailed image generation prompt in JSON format.`;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: 'text', text: systemPrompt },
    ...referenceImageUrls.map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
    {
      type: 'text',
      text: `Generate one image prompt for each of the 22 Major Arcana cards.
Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {
    "cardNumber": 0,
    "cardName": "The Fool",
    "generatedPrompt": "detailed image prompt here"
  }
]
Cards to generate (0–21): ${MAJOR_ARCANA_NAMES.join(', ')}`,
    },
  ];

  try {
    const response = await client.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.7,
    });

    const rawContent = response.choices[0]?.message?.content ?? '';

    // Parse the JSON array from the response
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return json(
        { success: false, error: { code: 'PARSE_ERROR', message: 'Could not extract JSON from model response.' } },
        { status: 502 },
      );
    }

    const rawPrompts = JSON.parse(jsonMatch[0]) as Array<{ cardNumber: number; cardName: string; generatedPrompt: string }>;

    const prompts = rawPrompts.map((p) => ({
      id: crypto.randomUUID(),
      cardNumber: p.cardNumber,
      cardName: p.cardName,
      traditionalMeaning: MAJOR_ARCANA_MEANINGS[p.cardNumber as keyof typeof MAJOR_ARCANA_MEANINGS] ?? '',
      generatedPrompt: p.generatedPrompt,
      confidence: 0.9,
      generatedAt: new Date().toISOString(),
    }));

    return json({ success: true, data: { prompts } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'xAI API call failed.';
    return json(
      { success: false, error: { code: 'API_ERROR', message } },
      { status: 502 },
    );
  }
};
