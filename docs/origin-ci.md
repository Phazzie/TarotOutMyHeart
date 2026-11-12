# Origin CI (Depot)

GitHub Actions on this account is stopped by a billing lock. Continuous integration moves to [Cursor Origin](https://cursor.com/docs/origin), which runs GitHub Actions-syntax workflows from `.depot/workflows/` via the Depot app on `depot-ubuntu-24.04`. Those workflows start after this repository is detached from GitHub.

`.github/workflows/` stays in the tree so the old definitions remain readable. They will not run once the GitHub connection is gone.

The reference shape is [Phazzie/streetroyalty `.depot/workflows/ci.yml`](https://github.com/Phazzie/streetroyalty/blob/main/.depot/workflows/ci.yml) and `scripts/ai-review.mjs`.

## What Depot runs

File: `.depot/workflows/ci.yml`

Triggers:

- every pull request
- every push to the default branch (`main`)

Runner: `depot-ubuntu-24.04`. Node.js **20** (this repo's `.nvmrc` and `engines`).

| Job | Commands |
| --- | --- |
| `verify` | `npm ci`, then `npm run ci` (`lint`, `check`, `test:all`, `build`), then `node --test scripts/ai-review.test.mjs` |
| `sdd-compliance` | Contract immutability and SEAMSLIST checks on pull requests. `any` escapes, manual-transform warning, and mock coverage on every run |
| `npm-audit` | `npm ci`, then `npm audit --audit-level=moderate` |
| `ai-review` | Pull requests only. `npm ci`, then `node scripts/ai-review.mjs` |

`npm run ci` is stricter than the old GitHub `ci.yml` jobs. That workflow used `npm install` and marked `svelte-check` and `prettier` as `continue-on-error`. Depot does not.

## Workflow map

| GitHub workflow | Depot equivalent | What happens to it |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Job `verify` | Ported as `npm ci` + `npm run ci`. The split lint / contract / mock / build jobs and the `all-checks` gate are one command. `actions/upload-artifact` for `build/` is not ported. |
| `.github/workflows/ci.yml` job `integration-tests` | Covered by `npm run ci` → `test:all` | The old job ran only on `main` and `develop`, with `USE_MOCKS=false` and `XAI_API_KEY`. `test:integration` and `test:real` in this repo are mock and unit tests; they do not call xAI. There is no separate live-API job on Depot. |
| `.github/workflows/sdd-compliance.yml` | Job `sdd-compliance` | Ported. Same checks: contract immutability, no `any`, new contracts update `SEAMSLIST.md`, manual-transform warning (does not fail), mock file coverage. |
| `.github/workflows/security.yml` job `security-audit` | Job `npm-audit` | Ported. `npm ci` + `npm audit --audit-level=moderate`. |
| `.github/workflows/security.yml` job `dependency-check` | Not ported | `npm outdated` was informational and wrote a GitHub step output. It is not a merge gate. |
| `.github/workflows/security.yml` job `codeql` | Not ported | GitHub CodeQL (`github/codeql-action`) stays on GitHub. |
| `.github/workflows/security.yml` schedule and `workflow_dispatch` | Not ported | The Monday 00:00 UTC cron and the manual dispatch button are GitHub-only. Depot runs the audit on pull requests and on pushes to `main`. |
| `.github/workflows/deploy-preview.yml` | Not ported | Preview deploys stay on Vercel. The `actions/github-script` pull-request comment is GitHub-only and is dropped. |
| `.github/workflows/deploy-production.yml` | Not ported | Production deploys stay on Vercel (`https://tarot-out-my-heart.vercel.app`). The GitHub environment, `GITHUB_STEP_SUMMARY`, and the duplicate lint/test/build steps are dropped. Depot `verify` is the build check. |
| `.github/workflows/release.yml` | Not ported | Tag pushes, `softprops/action-gh-release`, and `GITHUB_TOKEN` release notes stay on GitHub. |

Pushes to `develop` were part of the GitHub CI triggers. Depot follows the default branch only (`main`), matching the Origin pattern.

## AI review

`scripts/ai-review.mjs` runs on pull requests.

- `XAI_API_KEY` set and the `origin` CLI present: the diff goes to `https://api.x.ai/v1/chat/completions` (`grok-4.5`). The note is posted with `origin pr comment <PR_NUMBER> --body-file <file> --edit-last --create-if-none`.
- `XAI_API_KEY` missing or blank: logs `AI review skipped: XAI_API_KEY is not set` and exits 0.
- Pull request number present but `origin` is not on `PATH`: logs `AI review skipped: origin CLI is not installed` and exits 0. It does not call xAI.
- `origin pr comment` fails after a review was produced: the note is printed to the job log and the step still exits 0.

The job sets `GITHUB_TOKEN` to an empty string so a leftover Actions token cannot retarget the comment at GitHub. `PR_NUMBER` comes from `github.event.pull_request.number`. The diff base is `github.base_ref`.

## Secrets to enter in Depot

Enter this on the Depot / Origin CI secret store for the repository. It is not read from `.env`.

| Secret | Used by | Required for a green run? |
| --- | --- | --- |
| `XAI_API_KEY` | `ai-review` (Grok). The old GitHub `integration-tests` job also read this secret. | No. The review job skips cleanly when it is unset. Set it when you want a Grok comment on pull requests. |

No other Depot secrets are required for `verify`, `sdd-compliance`, or `npm-audit`.

These stay where they already are. Depot CI does not deploy.

| Name | Where it stays | Why |
| --- | --- | --- |
| `XAI_API_KEY` | Vercel project env (production / preview) | Runtime Grok calls from the SvelteKit server |
| `BLOB_READ_WRITE_TOKEN` | Vercel project env | Vercel Blob uploads. Not referenced by any workflow file |
| `USE_MOCKS` | Vercel project env | Production should be `false`. Depot `npm run build` does not need it |
| `GITHUB_TOKEN` | GitHub, automatic | Only `release.yml` uses it. Not a Depot secret |

## Known local audit result

`npm audit --audit-level=moderate` exits non-zero on the current lockfile (moderate, high, and critical advisories). `npm audit fix` without `--force` does not clear the job. The remaining fixes that audit itself marks as semver-major are `vitest@5`, `@sveltejs/adapter-vercel@7`, and `@vercel/blob@2`. Those upgrades are not part of this CI move.

The Depot `npm-audit` job runs the same command the GitHub workflow used and fails when the command fails. That matches `.github/workflows/security.yml`, which reported the audit and then exited 1.

## Local commands

```bash
npm ci
npm run ci
node --test scripts/ai-review.test.mjs
node scripts/ai-review.mjs   # exits 0 when XAI_API_KEY is unset
npm audit --audit-level=moderate
```

SDD shell checks live in `.depot/workflows/ci.yml` under the `sdd-compliance` job. On a pull request they diff `origin/<base>...HEAD`.
