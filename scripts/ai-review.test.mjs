/**
 * @fileoverview Unit tests for the Depot AI review skip and prompt rules.
 * @purpose Lock the "missing key exits through reviewDecision" behavior without calling xAI.
 * @dataFlow Imports pure helpers from scripts/ai-review.mjs. No network and no Origin writes.
 * @boundary scripts/ai-review.mjs
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clipDiff,
  commentDestination,
  originCliAvailable,
  reviewDecision,
  reviewPrompt,
} from './ai-review.mjs'

describe('ai review', () => {
  it('skips when the key is missing and reviews when it is set', () => {
    assert.equal(reviewDecision({}).action, 'skip')
    assert.equal(reviewDecision({ XAI_API_KEY: '  ' }).action, 'skip')
    assert.equal(reviewDecision({ XAI_API_KEY: 'xai-test' }).action, 'review')
  })

  it('clips a huge diff and keeps a short one', () => {
    assert.equal(clipDiff('small'), 'small')
    const huge = 'a'.repeat(20_000)
    const clipped = clipDiff(huge)
    assert.equal(clipped.endsWith('[diff truncated]'), true)
    assert.equal(clipped.length < huge.length, true)
  })

  it('comments on Origin when a pull request number is present', () => {
    assert.equal(commentDestination({ PR_NUMBER: '8' }), 'origin')
    assert.equal(commentDestination({}), 'stdout')
    assert.equal(
      commentDestination({
        PR_NUMBER: '8',
        GITHUB_TOKEN: 'ghs',
        GITHUB_REPOSITORY: 'Phazzie/TarotOutMyHeart',
      }),
      'origin'
    )
  })

  it('treats a missing origin binary as unavailable', () => {
    assert.equal(
      originCliAvailable(() => {
        throw new Error('not found')
      }),
      false
    )
    assert.equal(
      originCliAvailable(() => undefined),
      true
    )
  })

  it('asks for bugs rather than style notes', () => {
    const prompt = reviewPrompt('diff --git a/src/routes/api/prompts/+server.ts')
    assert.match(prompt, /security|contracts|secret/i)
    assert.match(prompt, /diff --git a\/src\/routes\/api\/prompts\/\+server\.ts/)
  })
})
