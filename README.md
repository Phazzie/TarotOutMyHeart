# TarotOutMyHeart

An AI-powered tarot card generation web application built with SvelteKit, powered by Grok AI. Generate unique tarot decks using custom artistic styles and reference images.

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- X.AI API key (get at https://x.ai/api)

### Local Development

1. **Clone and setup**:
   ```bash
   git clone https://github.com/yourusername/TarotOutMyHeart.git
   cd TarotOutMyHeart
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual X.AI API key
   # For local development, USE_MOCKS=true is recommended (free, fast)
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in your browser.

4. **Run tests**:
   ```bash
   npm run test:all      # All tests (contracts, mocks, integration)
   npm run test:contracts # Type contracts only
   npm run test:mocks    # Mock service tests
   npm run test:integration # Real API tests (requires XAI_API_KEY)
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm run preview
   ```

## Deployment

### Vercel Deployment Guide

TarotOutMyHeart is optimized for deployment on [Vercel](https://vercel.com) using the SvelteKit Vercel adapter.

#### Prerequisites for Deployment
- GitHub repository (public or private)
- Vercel account (free tier available)
- X.AI API key for production use

#### Step 1: Create Vercel Project

1. Sign up at https://vercel.com (or log in)
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Choose your TarotOutMyHeart repository
5. Click "Import"

The project will be created and Vercel will auto-detect SvelteKit configuration.

#### Step 2: Configure Environment Variables

After project import, configure environment variables in Vercel:

1. In Vercel dashboard, navigate to your TarotOutMyHeart project
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

**Production Environment Variables** (required for real API calls):

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `XAI_API_KEY` | Your API key from https://x.ai/api | Production | Keep secret - never expose to client |
| `GROK_TEXT_MODEL` | `grok-4-fast-reasoning` | All | For prompt generation |
| `GROK_IMAGE_MODEL` | `grok-image-generator` | All | For image generation |
| `NODE_ENV` | `production` | Production | Enables production optimizations |
| `USE_MOCKS` | `false` | Production | Use real API (incurs costs) |
| `PUBLIC_APP_URL` | Your production domain | Production | e.g., `https://tarot-up-my-heart.vercel.app` |

**Preview Environment Variables** (optional, recommended to save costs):

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `USE_MOCKS` | `true` | Preview | Use mock services (free) |
| `NODE_ENV` | `development` | Preview | Helpful for debugging |

**Optional Variables** (both environments):

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `SENTRY_DSN` | Your Sentry DSN | Production | Error tracking (recommended) |
| `SENTRY_ENVIRONMENT` | `production` | Production | Error tracking |
| `PUBLIC_ANALYTICS_ID` | Your GA/Plausible ID | All | Analytics tracking |

#### Step 3: Verify Build Configuration

Vercel automatically detects SvelteKit and uses the default build command:

- **Build Command**: `npm run build`
- **Output Directory**: `.svelte-kit`
- **Install Command**: `npm install`

These should be pre-configured. Verify in **Settings** → **Build & Development Settings**.

#### Step 4: Deploy Preview Environment

Test your deployment before going live:

1. Create a feature branch:
   ```bash
   git checkout -b test-deployment
   ```

2. Make a small change and commit:
   ```bash
   git add .
   git commit -m "test deployment"
   git push origin test-deployment
   ```

3. Open a Pull Request on GitHub

4. Vercel will automatically create a preview deployment
   - Look for a comment from Vercel in the PR
   - Click preview URL to test the deployment
   - Check that the application loads and works correctly

5. Verify the build succeeded:
   - All checks should be green (✅)
   - No deployment errors in Vercel logs

#### Step 5: Deploy to Production

When ready to deploy to production:

1. **Final verification**:
   - All tests passing: `npm run test:all`
   - Build succeeds locally: `npm run build`
   - Preview deployment works (from Step 4)
   - Review cost implications of real API usage

2. **Merge to main**:
   ```bash
   git checkout main
   git merge test-deployment
   git push origin main
   ```

3. **Monitor deployment**:
   - Vercel automatically starts production deployment
   - Wait for build to complete
   - Visit production URL in Vercel dashboard

4. **Verify production**:
   - Open your production URL
   - Test the complete flow:
     1. Upload reference images
     2. Fill in style preferences
     3. Generate prompts (uses real API)
     4. Generate images (uses real API)
     5. View gallery and download cards
   - Check browser console for any errors (should be none)

#### Step 6: Monitor Production

After deployment, monitor your application:

1. **Vercel Monitoring**:
   - Check Vercel Analytics for traffic and performance
   - Monitor function execution times
   - Set up Vercel alerts for deployment failures

2. **API Cost Monitoring**:
   - Check X.AI account usage at https://x.ai/api
   - Monitor monthly costs
   - Set up spending alerts
   - Review which features cost the most

3. **Error Tracking** (if enabled):
   - Check Sentry dashboard for errors
   - Set up alerts for critical errors
   - Review error trends

4. **Performance Monitoring**:
   - Check Vercel analytics for page speed
   - Monitor API response times
   - Identify and fix performance bottlenecks

### Environment Variables Reference

Detailed explanation of each environment variable:

#### Required Variables

**XAI_API_KEY**
- Your X.AI API key for accessing Grok services
- Get from: https://x.ai/api
- Store in: Vercel dashboard (Production) + `.env.local` (local dev)
- Never commit to version control

**GROK_TEXT_MODEL** & **GROK_IMAGE_MODEL**
- Specifies which Grok models to use
- `GROK_TEXT_MODEL=grok-4-fast-reasoning` (analyzes images, generates prompts)
- `GROK_IMAGE_MODEL=grok-image-generator` (generates artwork)
- Same across all environments

**NODE_ENV**
- `development` (local dev, preview) - enables debugging, slower build
- `production` (production) - optimizations, minimal logging

**USE_MOCKS**
- `true` - use synthetic mock data (no API calls, free, instant)
- `false` - use real Grok API (costs money, real responses)
- Set to `true` for preview (save costs), `false` for production

**PUBLIC_APP_URL**
- Base URL of your application
- Local dev: `http://localhost:5173`
- Preview: `https://[branch-name].vercel.app`
- Production: `https://tarot-up-my-heart.vercel.app`

#### Optional Variables

See `.env.production.example` for full documentation of optional variables including analytics, error tracking, rate limiting, and file upload configuration.

### Build Command Verification

Verify the build process locally before deploying:

```bash
# Clean build
npm run build

# Preview the built application
npm run preview

# Check TypeScript and Svelte
npm run check

# Run all tests
npm run test:all

# Run linter
npm run lint

# Full CI check (what GitHub Actions runs)
npm run ci
```

### Troubleshooting Deployment

#### Build Fails with TypeScript Errors

1. **Error**: "Type error in service file"
   - Run locally: `npm run check`
   - Fix type issues in the reported file
   - Ensure all services implement contracts correctly

2. **Error**: "Module not found"
   - Verify path aliases in `svelte.config.js`
   - Check import paths use `$contracts`, `$services`, `$lib`

3. **Error**: "Adapter not found"
   - Ensure `@sveltejs/adapter-vercel` is installed
   - Run: `npm install`

#### Production API Calls Fail

1. **Check environment variables**:
   - Verify `XAI_API_KEY` is set in Vercel dashboard
   - Verify `USE_MOCKS=false` in production
   - Verify API key is valid (test in Vercel logs)

2. **Check X.AI account**:
   - Verify account has sufficient credit
   - Check usage at https://x.ai/api
   - Verify API key hasn't been revoked

3. **Check logs**:
   - View Vercel function logs in dashboard
   - Look for timeout errors (increase timeout if needed)
   - Check for rate limiting errors

#### High API Costs

1. **Review usage**:
   - Check X.AI dashboard for API calls
   - Identify which feature costs most
   - Review error rates (failed calls still cost money)

2. **Reduce costs**:
   - Implement caching for generated prompts
   - Use cheaper model for text analysis
   - Implement rate limiting in Vercel dashboard
   - Use mock services in preview environment

#### Slow Performance

1. **Check metrics**:
   - Review Vercel analytics for page speed
   - Monitor function execution time (aim for <3s)

2. **Optimize**:
   - Check image size (use compression)
   - Use CDN caching headers
   - Implement progressive loading
   - Review database queries (if applicable)

### Rollback Procedures

If something goes wrong in production:

1. **Quick Rollback** (revert to previous deployment):
   - Vercel dashboard → Deployments
   - Find previous working deployment
   - Click three dots → Promote to Production
   - Takes effect immediately

2. **Code Rollback** (revert code changes):
   ```bash
   git revert HEAD
   git push origin main
   # Vercel automatically redeploys
   ```

3. **Emergency Disable Real API**:
   - Go to Vercel dashboard → Environment Variables
   - Change `USE_MOCKS` to `true` (production environment)
   - Vercel redeploys with mock services
   - No more API costs until fixed

### Monitoring Checklist

- [ ] Vercel deployment completed successfully
- [ ] Production URL responds (no 404/500)
- [ ] Application loads in browser
- [ ] All features work (upload, generate, download)
- [ ] Browser console has no errors
- [ ] X.AI API key is working
- [ ] Analytics configured (if using)
- [ ] Error tracking configured (if using)
- [ ] Cost monitoring alerts set up
- [ ] Backup plan in case of issues

## Development Documentation

For more information about the development process, see:

- **CLAUDE.md** - Claude AI instructions for this project
- **AGENTS.md** - Universal AI agent instructions
- **seam-driven-development.md** - Development methodology
- **prd.MD** - Product requirements and sprint details
- **SEAMSLIST.md** - Architecture seams and boundaries

## Architecture

This project uses **Seam-Driven Development (SDD)** methodology:

- **Contracts** (`/contracts`) - TypeScript interfaces defining service boundaries
- **Mock Services** (`/services/mock`) - Realistic synthetic implementations
- **Real Services** (`/services/real`) - Live API integrations
- **Components** (`/src/lib/components`) - SvelteKit UI components
- **Tests** (`/tests`) - Contract, mock, and integration tests

See `seam-driven-development.md` for full methodology details.

## License

MIT License - See LICENSE file for details.
