/**
 * POST /api/prompts
 * Sends reference images to xAI Grok (vision) and returns 22 card prompts.
 * Keeps XAI_API_KEY secret — never exposed to client.
 */
import { json } from '@sveltejs/kit'
import OpenAI from 'openai'
import {
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  PromptGenerationErrorCode,
  GROK_MODELS,
} from '$contracts/PromptGeneration'
import { isRawPromptArray, createPromptId, isCardNumber } from '$lib/utils/types'
import type { RequestHandler } from './$types'

export const config = { maxDuration: 90 }

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = process.env['XAI_API_KEY']
  if (!apiKey || apiKey.includes('your_xai')) {
    return json(
      {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_KEY_MISSING,
          message: 'API key not configured.',
        },
      },
      { status: 500 }
    )
  }

  let body: {
    referenceImageUrls: string[]
    styleInputs: { theme: string; tone: string; description: string }
  }
  try {
    body = await request.json()
  } catch {
    return json(
      {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: 'Expected JSON body.',
        },
      },
      { status: 400 }
    )
  }

  const { referenceImageUrls, styleInputs } = body
  const rawModel =
    typeof body === 'object' && body !== null && 'model' in body ? body.model : undefined
  const modelToUse =
    typeof rawModel === 'string' && rawModel
      ? rawModel
      : process.env['GROK_TEXT_MODEL'] || GROK_MODELS.vision

  if (!referenceImageUrls?.length || !styleInputs?.theme) {
    return json(
      {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'referenceImageUrls and styleInputs.theme are required.',
        },
      },
      { status: 422 }
    )
  }

  const client = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey })

  const styleDescription = [
    `Theme: ${styleInputs.theme}`,
    `Tone: ${styleInputs.tone}`,
    styleInputs.description ? `Style notes: ${styleInputs.description}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const systemPrompt = `You are an expert tarot deck artist and prompt engineer.
Generate image generation prompts for a custom tarot deck based on reference images provided.
The style should be: ${styleDescription}
For each card, output a detailed image generation prompt in JSON format.`

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: 'text', text: systemPrompt },
    ...referenceImageUrls.map(url => ({
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
  ]

  try {
    const response = await client.chat.completions.create({
      model: modelToUse,
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.7,
    })

    const rawContent = response.choices[0]?.message?.content ?? ''

    const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return json(
        {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Could not extract JSON from model response.',
          },
        },
        { status: 502 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return json(
        {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Failed to parse JSON from model response.',
          },
        },
        { status: 502 }
      )
    }

    if (!isRawPromptArray(parsed)) {
      return json(
        {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Model response JSON structure does not match expected prompt format.',
          },
        },
        { status: 502 }
      )
    }

    const prompts = []
    for (const p of parsed) {
      const cardIndex = p.cardNumber
      const traditionalMeaning = isCardNumber(cardIndex) ? MAJOR_ARCANA_MEANINGS[cardIndex] : ''

      prompts.push({
        id: createPromptId(crypto.randomUUID()),
        cardNumber: p.cardNumber,
        cardName: p.cardName,
        traditionalMeaning,
        generatedPrompt: p.generatedPrompt,
        confidence: 0.9,
        generatedAt: new Date().toISOString(),
      })
    }

    return json({ success: true, data: { prompts } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'xAI API call failed.'
    return json(
      { success: false, error: { code: PromptGenerationErrorCode.API_ERROR, message } },
      { status: 502 }
    )
  }
}
