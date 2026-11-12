#!/usr/bin/env node
/**
 * @fileoverview Pull-request review via the xAI chat API for Depot CI.
 * @purpose Post one Grok note on an Origin pull request, or print it and exit 0
 *   when XAI_API_KEY or the origin CLI is missing so CI stays green.
 * @dataFlow Diff against the base branch goes to api.x.ai. The note is posted
 *   with `origin pr comment`, or written to the job log when that cannot run.
 * @boundary CI job `ai-review` in `.depot/workflows/ci.yml`. No app seam.
 *
 * @example
 * XAI_API_KEY=… PR_NUMBER=12 node scripts/ai-review.mjs
 */
/* eslint-disable no-console -- the job log is the product when posting is unavailable */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const MARKER = '<!-- tarot-up-my-heart-ai-review -->'
const DIFF_CAP = 14_000

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ action: 'skip', reason: string } | { action: 'review' }}
 */
export function reviewDecision(env) {
  if (!env.XAI_API_KEY?.trim()) return { action: 'skip', reason: 'XAI_API_KEY is not set' }
  return { action: 'review' }
}

/**
 * @param {string} diff
 * @returns {string}
 */
export function clipDiff(diff) {
  const text = diff.trim()
  if (text.length <= DIFF_CAP) return text
  return `${text.slice(0, DIFF_CAP)}\n\n[diff truncated]`
}

/**
 * @param {string} diff
 * @returns {string}
 */
export function reviewPrompt(diff) {
  return [
    'You are reviewing a pull request for TarotOutMyHeart, a SvelteKit app that generates a 22-card Major Arcana deck from reference images and style inputs.',
    'Comment only on real bugs, security issues, broken seams or contracts, or secret leaks.',
    'Skip style nits. Use short paragraphs. If nothing is wrong, say so in one sentence.',
    '',
    clipDiff(diff),
  ].join('\n')
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function pullRequestNumber(env) {
  if (env.PR_NUMBER) return String(env.PR_NUMBER)
  if (!env.GITHUB_EVENT_PATH) return ''
  try {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
    return event.pull_request?.number ? String(event.pull_request.number) : ''
  } catch {
    return ''
  }
}

/**
 * Origin receives the review whenever a pull request number is known.
 * GitHub credentials are ignored so a Depot runner cannot post to a detached GitHub repo.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {'origin' | 'stdout'}
 */
export function commentDestination(env) {
  if (pullRequestNumber(env)) return 'origin'
  return 'stdout'
}

/**
 * @param {typeof execFileSync} [runner]
 * @returns {boolean}
 */
export function originCliAvailable(runner = execFileSync) {
  try {
    runner('which', ['origin'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function diffAgainstBase(env) {
  const base = env.GITHUB_BASE_REF || env.BASE_REF || 'main'
  try {
    execFileSync('git', ['fetch', 'origin', base, '--depth', '50'], { stdio: 'ignore' })
  } catch {
    // The checkout may already contain the base.
  }
  try {
    return execFileSync('git', ['diff', `origin/${base}...HEAD`], {
      encoding: 'utf8',
      maxBuffer: 8_000_000,
    })
  } catch {
    return execFileSync('git', ['diff', 'HEAD~1'], {
      encoding: 'utf8',
      maxBuffer: 8_000_000,
    })
  }
}

/**
 * @param {string} apiKey
 * @param {string} diff
 * @returns {Promise<string>}
 */
async function askGrok(apiKey, diff) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-4.5',
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'You review code diffs. Be specific and brief.' },
        { role: 'user', content: reviewPrompt(diff) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`xAI review failed (${res.status})`)
  const body = await res.json()
  const text = body?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('xAI review returned an empty note')
  return text
}

/**
 * @param {string} number
 * @param {string} body
 */
function publishOnOrigin(number, body) {
  const file = execFileSync('mktemp', { encoding: 'utf8' }).trim()
  try {
    writeFileSync(file, body)
    execFileSync(
      'origin',
      ['pr', 'comment', String(number), '--body-file', file, '--edit-last', '--create-if-none'],
      { stdio: 'inherit' }
    )
  } finally {
    try {
      execFileSync('rm', ['-f', file])
    } catch {
      // The temp file only holds the review text.
    }
  }
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {string} body
 */
async function publish(env, body) {
  const number = pullRequestNumber(env)
  const destination = commentDestination(env)
  if (destination === 'stdout') {
    console.log(body)
    console.log('AI review printed locally. Set PR_NUMBER to comment on the Origin pull request.')
    return
  }
  if (!originCliAvailable()) {
    console.log(body)
    console.log('AI review printed to the log. origin CLI is not installed.')
    return
  }
  try {
    publishOnOrigin(number, body)
  } catch (error) {
    console.log(body)
    console.error(error instanceof Error ? error.message : error)
    console.log('Origin comment failed. The review is in the log above.')
  }
}

async function main() {
  const decision = reviewDecision(process.env)
  if (decision.action === 'skip') {
    console.log(`AI review skipped: ${decision.reason}`)
    return
  }
  if (commentDestination(process.env) === 'origin' && !originCliAvailable()) {
    console.log('AI review skipped: origin CLI is not installed')
    return
  }
  const diff = diffAgainstBase(process.env)
  if (!diff.trim()) {
    console.log('AI review skipped: empty diff')
    return
  }
  const note = await askGrok(process.env.XAI_API_KEY.trim(), diff)
  const body = `${MARKER}\n**Grok review**\n\n${note}`
  await publish(process.env, body)
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirect) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
