# TarotOutMyHeart - Product Requirements Document & Roadmap

**Version**: 1.0  
**Last Updated**: 2025-11-07  
**Status**: 🚀 Ready for Sprint 1

---

## Quick Reference

- [Product Vision](#product-vision)
- [Development Checklist](#development-checklist) ⭐ **START HERE**
- [Core User Flow](#core-user-flow)
- [Feature Requirements](#feature-requirements)
- [Technical Architecture](#technical-architecture-seams-sdd)
- [Development Roadmap](#development-roadmap)
- [Success Metrics](#success-metrics)
- [Risk Assessment](#risk-assessment)

---

## Development Checklist

### ⚡ Quick Start (Do This First)

- [x] Repository created and cloned
- [x] Scaffolding complete (SDD structure, docs, configs)
- [x] All documentation reviewed and aligned
- [x] Environment variables configured (`.env` from `.env.example`)
- [x] Dependencies installed (`npm install`)
- [ ] Grok API key obtained and added to `.env`
- [ ] Development server runs (`npm run dev`)
- [ ] Type checking passes (`npm run check`)

---

### 📋 Sprint-by-Sprint Checklist

#### Sprint 0: Scaffolding ✅ COMPLETE

- [x] Project structure with SDD methodology
- [x] Documentation (AGENTS.md, SDD guide, SEAMSLIST.md, etc.)
- [x] CI/CD pipeline configurations
- [x] Code quality tools (ESLint, Prettier, TypeScript)
- [x] Testing infrastructure (Vitest)
- [x] AI agent instructions
- [x] PRD created (this file)

---

#### Sprint 1: Contracts & Mocks (Week 1)

**Goal**: Define all seam contracts and build complete mock services

##### Contract Definition Phase
- [ ] **Seam 1: Image Upload**
  - [ ] Define `IImageUploadService` contract
  - [ ] Define `UploadedImage` type
  - [ ] Define error cases (InvalidFormat, SizeExceeded, UploadFailed)
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 2: Style Input**
  - [ ] Define `IStyleInputService` contract
  - [ ] Define `StyleInputs` type (theme, tone, description, concept, characters)
  - [ ] Define `ValidatedStyleInputs` type
  - [ ] Define validation rules
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 3: Prompt Generation**
  - [ ] Define `IPromptGenerationService` contract
  - [ ] Define `CardPrompt` type (22 prompts with metadata)
  - [ ] Define `MajorArcanaCard` type
  - [ ] Define error cases (APIError, RateLimited, InvalidInput)
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 4: Image Generation**
  - [ ] Define `IImageGenerationService` contract
  - [ ] Define `GeneratedCard` type
  - [ ] Define batch processing contract
  - [ ] Define retry/rate limit handling
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 5: Gallery Display**
  - [ ] Define `IGalleryService` contract
  - [ ] Define gallery view options (grid/list)
  - [ ] Define card display metadata
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 6: Cost Calculation**
  - [ ] Define `ICostCalculatorService` contract
  - [ ] Define `EstimatedCost` type
  - [ ] Define pricing constants
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

- [ ] **Seam 7: Download**
  - [ ] Define `IDownloadService` contract
  - [ ] Define download formats (PNG, ZIP)
  - [ ] Document in SEAMSLIST.md
  - [ ] Export from `contracts/index.ts`

##### Contract Validation Phase
- [ ] All contracts compile (`npm run check` passes)
- [ ] No `any` types in contracts (`git grep "as any" contracts/` returns nothing)
- [ ] All contracts documented in SEAMSLIST.md
- [ ] All contracts have JSDoc comments
- [ ] All contracts trace to requirements (use `@requirement` tags)

##### Mock Service Implementation Phase
- [ ] **Mock Image Upload Service**
  - [ ] Create `services/mock/ImageUploadMock.ts`
  - [ ] Implement contract interface
  - [ ] Return realistic mock data (fake URLs, metadata)
  - [ ] Simulate upload delay (200-500ms)
  - [ ] Handle error cases (validate file size/format)
  - [ ] Add to service factory

- [ ] **Mock Style Input Service**
  - [ ] Create `services/mock/StyleInputMock.ts`
  - [ ] Implement contract interface
  - [ ] Validate inputs (required fields, character limits)
  - [ ] Return validated data
  - [ ] Add to service factory

- [ ] **Mock Prompt Generation Service**
  - [ ] Create `services/mock/PromptGenerationMock.ts`
  - [ ] Implement contract interface
  - [ ] Generate 22 realistic prompts (one per Major Arcana card)
  - [ ] Include card names (The Fool, The Magician, etc.)
  - [ ] Simulate API delay (1-2 seconds)
  - [ ] Add to service factory

- [ ] **Mock Image Generation Service**
  - [ ] Create `services/mock/ImageGenerationMock.ts`
  - [ ] Implement contract interface
  - [ ] Return placeholder images (use Lorem Picsum or similar)
  - [ ] Simulate generation delay (3-5 seconds per card)
  - [ ] Handle batch processing
  - [ ] Add to service factory

- [ ] **Mock Gallery Service**
  - [ ] Create `services/mock/GalleryMock.ts`
  - [ ] Implement contract interface
  - [ ] Handle grid/list view options
  - [ ] Add to service factory

- [ ] **Mock Cost Calculator Service**
  - [ ] Create `services/mock/CostCalculatorMock.ts`
  - [ ] Implement contract interface
  - [ ] Calculate realistic costs
  - [ ] Add to service factory

- [ ] **Mock Download Service**
  - [ ] Create `services/mock/DownloadMock.ts`
  - [ ] Implement contract interface
  - [ ] Simulate file generation
  - [ ] Add to service factory

##### Testing Phase
- [ ] **Contract Tests** (`tests/contracts/`)
  - [ ] Test ImageUpload mock matches contract
  - [ ] Test StyleInput mock matches contract
  - [ ] Test PromptGeneration mock matches contract
  - [ ] Test ImageGeneration mock matches contract
  - [ ] Test Gallery mock matches contract
  - [ ] Test CostCalculator mock matches contract
  - [ ] Test Download mock matches contract
  - [ ] All contract tests pass (`npm run test:contracts`)

- [ ] **Mock Tests** (`tests/mocks/`)
  - [ ] Test ImageUpload mock behavior
  - [ ] Test StyleInput validation logic
  - [ ] Test PromptGeneration returns 22 prompts
  - [ ] Test ImageGeneration batch processing
  - [ ] Test Gallery view options
  - [ ] Test CostCalculator pricing accuracy
  - [ ] Test Download file generation
  - [ ] All mock tests pass (`npm run test:mocks`)

##### Sprint 1 Completion Criteria
- [ ] All 7 seams documented in SEAMSLIST.md
- [ ] All contracts compile without errors
- [ ] All mock services implemented
- [ ] All tests passing (`npm run test:all`)
- [ ] No `any` types (`git grep "as any"` returns nothing)
- [ ] Service factory configured with USE_MOCKS=true
- [ ] CHANGELOG.md updated
- [ ] Demo: Can run app with mocks end-to-end

---

#### Sprint 2: UI Components (Week 2-3)

**Goal**: Build complete UI working with mock services

##### Component Development
- [ ] **Upload Component** (`src/lib/components/Upload/`)
  - [ ] Create `ImageUpload.svelte`
  - [ ] Drag-and-drop functionality
  - [ ] File validation (type, size)
  - [ ] Preview uploaded images
  - [ ] Remove image functionality
  - [ ] Handle 1-5 image limit
  - [ ] Error messaging
  - [ ] Test with mock service

- [ ] **Style Input Form** (`src/lib/components/StyleInput/`)
  - [ ] Create `StyleForm.svelte`
  - [ ] Theme input (dropdown or text)
  - [ ] Tone input (dropdown or text)
  - [ ] Concept input (text)
  - [ ] Description textarea (500 char limit with counter)
  - [ ] Characters input (optional)
  - [ ] Form validation
  - [ ] Clear/reset functionality
  - [ ] Test with mock service

- [ ] **Prompt Preview/Editor** (`src/lib/components/PromptPreview/`)
  - [ ] Create `PromptPreview.svelte`
  - [ ] Display all 22 card prompts
  - [ ] Show card names (The Fool, The Magician, etc.)
  - [ ] Show traditional meanings
  - [ ] Edit prompt functionality
  - [ ] Expand/collapse cards
  - [ ] "Generate Images" CTA button
  - [ ] Test with mock service

- [ ] **Card Gallery** (`src/lib/components/Gallery/`)
  - [ ] Create `CardGallery.svelte`
  - [ ] Grid view layout (responsive)
  - [ ] Card component (`Card.svelte`)
  - [ ] Zoom/lightbox view
  - [ ] Download individual card button
  - [ ] Loading placeholders
  - [ ] Empty state
  - [ ] Test with mock service

- [ ] **Progress Indicator** (`src/lib/components/Progress/`)
  - [ ] Create `ProgressIndicator.svelte`
  - [ ] Show X/22 cards generated
  - [ ] Progress bar with percentage
  - [ ] Estimated time remaining
  - [ ] Cancel generation option
  - [ ] Test with mock service

- [ ] **Cost Estimator Widget** (`src/lib/components/CostEstimator/`)
  - [ ] Create `CostEstimator.svelte`
  - [ ] Display estimated cost
  - [ ] Update in real-time based on inputs
  - [ ] Warning if cost exceeds threshold
  - [ ] Test with mock service

- [ ] **Download Buttons** (`src/lib/components/Download/`)
  - [ ] Create `DownloadButtons.svelte`
  - [ ] Download individual card button
  - [ ] Download all as ZIP button
  - [ ] Loading states
  - [ ] Success feedback
  - [ ] Test with mock service

##### Page Development
- [ ] **Home/Landing Page** (`src/routes/+page.svelte`)
  - [ ] Upload section
  - [ ] Style input section
  - [ ] Generate button
  - [ ] Cost display
  - [ ] Link to documentation
  - [ ] Responsive layout

- [ ] **Generation Page** (`src/routes/generate/+page.svelte`)
  - [ ] Prompt preview
  - [ ] Edit prompts functionality
  - [ ] Generate images button
  - [ ] Progress indicator
  - [ ] Server-side data loading (`+page.server.ts`)

- [ ] **Gallery Page** (`src/routes/gallery/+page.svelte`)
  - [ ] Card gallery grid
  - [ ] Download options
  - [ ] Regenerate options (placeholder for Phase 2)
  - [ ] Server-side data loading (`+page.server.ts`)

##### Styling & Responsiveness
- [ ] Global styles (`src/app.css`)
- [ ] Mobile responsive (breakpoints: 640px, 768px, 1024px)
- [ ] Loading states for all async operations
- [ ] Error boundaries and user-friendly error messages
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Dark mode support (optional)

##### Sprint 2 Completion Criteria
- [ ] All components built and styled
- [ ] All pages functional with mocks
- [ ] Mobile responsive on 3 breakpoints
- [ ] All async operations have loading states
- [ ] Error handling in place
- [ ] Manual testing completed (checklist below)
- [ ] CHANGELOG.md updated
- [ ] Demo: Complete user flow works with mocks

**Manual Testing Checklist**:
- [ ] Upload 1 image, generate deck
- [ ] Upload 5 images, generate deck
- [ ] Try to upload 6 images (should prevent)
- [ ] Upload invalid file type (should error)
- [ ] Upload oversized file (should error)
- [ ] Fill out style form, submit
- [ ] Edit prompts before generating
- [ ] View generated cards in gallery
- [ ] Download individual card
- [ ] Download full deck as ZIP
- [ ] Test on mobile device or simulator
- [ ] Test on tablet
- [ ] Test on desktop (wide screen)

---

#### Sprint 3: Grok Integration (Week 4)

**Goal**: Replace mocks with real Grok API services

##### Pre-Integration Checks
- [ ] Grok API key obtained and configured
- [ ] All contract tests passing
- [ ] All mock tests passing
- [ ] No `any` types in codebase
- [ ] SEAMSLIST.md up to date

##### Real Service Implementation
- [ ] **Real Prompt Generation Service** (`services/real/PromptGenerationService.ts`)
  - [ ] Create service file
  - [ ] Implement `IPromptGenerationService` contract
  - [ ] Configure Grok API client (grok-4-fast-reasoning)
  - [ ] Build prompt template for card generation
  - [ ] Parse API response into `CardPrompt[]` type
  - [ ] Handle errors (API errors, network errors, timeouts)
  - [ ] Implement retries (max 3 attempts)
  - [ ] Add to real service factory
  - [ ] Test manually with real API

- [ ] **Real Image Generation Service** (`services/real/ImageGenerationService.ts`)
  - [ ] Create service file
  - [ ] Implement `IImageGenerationService` contract
  - [ ] Configure Grok image API client (grok-image-generator)
  - [ ] Implement batch processing (22 cards)
  - [ ] Handle rate limiting (throttle requests)
  - [ ] Implement retries for failed generations
  - [ ] Store/serve generated images
  - [ ] Progress tracking
  - [ ] Add to real service factory
  - [ ] Test manually with real API

##### API Integration Details
- [ ] **Error Handling**
  - [ ] API rate limit errors (429) → retry with backoff
  - [ ] API timeout errors → retry
  - [ ] Invalid request errors (400) → user-friendly message
  - [ ] API service errors (500) → retry with exponential backoff
  - [ ] Network errors → user-friendly offline message

- [ ] **Rate Limiting**
  - [ ] Implement request throttling
  - [ ] Queue requests if rate limit hit
  - [ ] Display wait time to user
  - [ ] Cancel queue functionality

- [ ] **Cost Tracking**
  - [ ] Track token usage from API responses
  - [ ] Update cost estimator with real data
  - [ ] Log costs for monitoring

##### Integration Testing
- [ ] **Integration Tests** (`tests/integration/`)
  - [ ] Test PromptGeneration with real API
  - [ ] Test ImageGeneration with real API
  - [ ] Test end-to-end flow (upload → prompt → generate → display)
  - [ ] Test error scenarios (API failure, rate limit, network error)
  - [ ] Test retry logic
  - [ ] All integration tests pass (`npm run test:integration`)

##### Switch from Mocks to Real Services
- [ ] Set `USE_MOCKS=false` in `.env` or service factory
- [ ] Run integration readiness checks
- [ ] Test complete flow manually
- [ ] Verify costs are accurate
- [ ] Verify error handling works

##### Sprint 3 Completion Criteria
- [ ] Real services implemented and tested
- [ ] Integration tests passing
- [ ] Error handling robust
- [ ] Rate limiting working
- [ ] Cost tracking accurate
- [ ] End-to-end generation works
- [ ] CHANGELOG.md updated
- [ ] Demo: Generate real deck from Grok API

**Real API Testing Checklist**:
- [ ] Generate 1 deck successfully
- [ ] Generate 3 decks in a row (test rate limiting)
- [ ] Simulate API failure (test retries)
- [ ] Test with poor network (test timeout handling)
- [ ] Verify costs match expectations
- [ ] Verify images are correct format and quality

---

#### Sprint 4: Polish & Deploy MVP (Week 5)

**Goal**: Production-ready MVP deployed to Vercel

##### Error Handling & UX
- [ ] Error boundaries for all major sections
- [ ] User-friendly error messages (no technical jargon)
- [ ] Toast notifications for success/error
- [ ] Retry buttons for failed operations
- [ ] Clear error recovery paths

##### Loading States & Animations
- [ ] Skeleton loaders for all async content
- [ ] Smooth transitions between states
- [ ] Progress animations for generation
- [ ] Success animations (optional)
- [ ] Loading spinners with meaningful text

##### Mobile Responsive Tweaks
- [ ] Test on real mobile devices (iOS, Android)
- [ ] Fix any mobile-specific bugs
- [ ] Optimize touch targets (min 44x44px)
- [ ] Test landscape orientation
- [ ] Optimize image loading for mobile

##### Cost Display & Warnings
- [ ] Show cost estimate before generation
- [ ] Warning if cost exceeds $0.01
- [ ] Confirmation dialog before expensive operations
- [ ] Display running total (if multiple generations)

##### Download ZIP Functionality
- [ ] Implement ZIP creation (all 22 cards)
- [ ] Include metadata file in ZIP (prompt details, style inputs)
- [ ] Test ZIP generation on different browsers
- [ ] Handle large file sizes

##### Security Audit
- [ ] Validate all user inputs (XSS prevention)
- [ ] Sanitize file uploads
- [ ] Rate limit API endpoints (prevent abuse)
- [ ] Environment variables not exposed to client
- [ ] CORS configured correctly
- [ ] CSP headers configured

##### Performance Optimization
- [ ] Optimize image loading (lazy loading)
- [ ] Minimize bundle size
- [ ] Code splitting for routes
- [ ] Caching strategy (images, prompts)
- [ ] Lighthouse audit (score >80 on all metrics)

##### Deployment to Vercel

**Important**: Vercel deployment is automatic via GitHub integration. Your GitHub Actions workflows handle the testing, but Vercel handles the actual deployment.

###### Initial Vercel Setup (Do Once)
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Import `Phazzie/TarotOutMyHeart` repository
- [ ] Configure project settings:
  - [ ] Framework: SvelteKit
  - [ ] Build command: `npm run build` (auto-detected)
  - [ ] Output directory: `build` (auto-detected)
  - [ ] Install command: `npm install` (auto-detected)
- [ ] Add environment variables in Vercel dashboard:
  - [ ] `XAI_API_KEY` - Your Grok API key
  - [ ] `GROK_TEXT_MODEL` - `grok-4-fast-reasoning`
  - [ ] `GROK_IMAGE_MODEL` - `grok-image-generator`
  - [ ] `NODE_ENV` - `production`
  - [ ] `USE_MOCKS` - `false` (for production)
  - [ ] `PUBLIC_APP_URL` - Your Vercel URL (e.g., `https://tarot-up-my-heart.vercel.app`)
- [ ] Enable automatic deployments:
  - [ ] Production: Deploy from `main` branch
  - [ ] Preview: Deploy from Pull Requests

###### Deployment Workflows Explained

**1. Preview Deployments (PRs)** 🔍
- **Trigger**: When you open/update a Pull Request
- **Workflow**: `.github/workflows/deploy-preview.yml`
- **What happens**:
  1. GitHub Actions runs contract tests and mock tests
  2. Builds the project with `USE_MOCKS=true`
  3. Posts comment on PR with deployment status
  4. Vercel automatically deploys preview to unique URL
  5. Preview URL appears in PR comments and GitHub checks
- **Uses**: Mock services (safe, no API costs)
- **Purpose**: Test changes before merging to main
- **When to use**: Every feature branch before merging

**2. Production Deployments (main branch)** 🚀
- **Trigger**: When you push/merge to `main` branch
- **Workflow**: `.github/workflows/deploy-production.yml`
- **What happens**:
  1. GitHub Actions runs ALL tests (contract, mock, integration)
  2. Runs type checking and linting
  3. Builds production bundle with `USE_MOCKS=false`
  4. Creates deployment summary
  5. Vercel automatically deploys to production URL
- **Uses**: Real Grok API services
- **Purpose**: Deploy to public production site
- **When to use**: After Sprint 3+ when real API is integrated

**3. Continuous Integration (CI)** ⚙️
- **Trigger**: Every push to `main`/`develop` or PR
- **Workflow**: `.github/workflows/ci.yml`
- **What happens**:
  1. Runs linting and type checking
  2. Runs contract tests
  3. Runs mock tests
  4. Runs integration tests (only on main/develop with API key)
  5. Verifies build succeeds
- **Purpose**: Ensure code quality before deployment
- **When to use**: Automatically runs on every commit

###### Deployment Checklist (Sprint 4)

**Step 1: Vercel Project Setup**
- [ ] Create Vercel account (if not exists)
- [ ] Import GitHub repository to Vercel
- [ ] Vercel project created successfully
- [ ] Note production URL: `https://tarot-up-my-heart.vercel.app` (or similar)

**Step 2: Configure Environment Variables in Vercel**
- [ ] Navigate to Vercel dashboard → Project Settings → Environment Variables
- [ ] Add Production environment variables:
  - [ ] `XAI_API_KEY` → Your API key → Production environment
  - [ ] `GROK_TEXT_MODEL` → `grok-4-fast-reasoning` → All environments
  - [ ] `GROK_IMAGE_MODEL` → `grok-image-generator` → All environments
  - [ ] `NODE_ENV` → `production` → Production environment
  - [ ] `USE_MOCKS` → `false` → Production environment
  - [ ] `PUBLIC_APP_URL` → Your Vercel URL → Production environment
- [ ] Add Preview environment variables (optional, for testing):
  - [ ] `USE_MOCKS` → `true` → Preview environment
  - [ ] `NODE_ENV` → `development` → Preview environment

**Step 3: Configure GitHub Secrets (for CI)**
- [ ] Go to GitHub repository → Settings → Secrets and variables → Actions
- [ ] Add repository secrets:
  - [ ] `XAI_API_KEY` → Your API key (for integration tests)

**Step 4: Deploy to Preview Environment**
- [ ] Create feature branch: `git checkout -b test-deployment`
- [ ] Make small change (e.g., update README)
- [ ] Commit and push: `git push origin test-deployment`
- [ ] Open Pull Request on GitHub
- [ ] Wait for GitHub Actions to complete
- [ ] Check PR comments for Vercel preview URL
- [ ] Visit preview URL and test functionality
- [ ] Verify preview uses mock services (check network tab)

**Step 5: Deploy to Production**
- [ ] Merge PR to main branch (or push directly to main)
- [ ] GitHub Actions runs full test suite
- [ ] Wait for all checks to pass (✅ green checkmarks)
- [ ] Vercel automatically deploys to production
- [ ] Check Vercel dashboard for deployment status
- [ ] Visit production URL when ready
- [ ] Verify production deployment successful

**Step 6: Verify Production Deployment**
- [ ] Visit production URL
- [ ] Test complete user flow:
  - [ ] Upload images
  - [ ] Fill style form
  - [ ] Generate prompts (real API call)
  - [ ] Generate images (real API call)
  - [ ] View gallery
  - [ ] Download cards
- [ ] Check browser console for errors (should be none)
- [ ] Verify costs are tracked correctly
- [ ] Test on mobile device
- [ ] Test on different browsers

**Step 7: Monitor Post-Deployment**
- [ ] Check Vercel analytics (if enabled)
- [ ] Monitor Vercel logs for errors
- [ ] Set up error tracking (Sentry recommended, optional)
- [ ] Monitor API usage and costs
- [ ] Check user feedback/reports

###### Deployment Timeline

**When to Deploy Preview** (Throughout Development):
- Sprint 1: After mocks implemented → Preview with mocks
- Sprint 2: After each UI component → Preview with mocks
- Sprint 3: After Grok integration → Preview with real API (careful!)
- Sprint 4: Final polish → Preview before production

**When to Deploy Production**:
- ✅ **Sprint 4 End**: After all Sprint 4 checklist items complete
- ✅ **After**: All tests passing (contract, mock, integration)
- ✅ **After**: Security audit passed
- ✅ **After**: Performance metrics met (Lighthouse >80)
- ✅ **After**: Manual testing completed on production preview
- ✅ **After**: Documentation updated (README, USER_GUIDE)
- ⚠️ **Not Before Sprint 3**: Real API integration must be working

###### Deployment Best Practices

**DO** ✅:
- Deploy preview for every feature branch
- Test preview thoroughly before merging to main
- Deploy to production during low-traffic times (if expecting users)
- Monitor deployment logs in Vercel dashboard
- Keep environment variables in sync (local `.env` vs Vercel)
- Use `USE_MOCKS=true` for preview deployments (saves API costs)
- Create GitHub release tags for production deployments (v1.0.0, etc.)

**DON'T** ❌:
- Don't deploy to production without passing all tests
- Don't commit API keys to repository (use environment variables)
- Don't deploy to production before Sprint 3 (no real API integration yet)
- Don't deploy directly to production without preview testing
- Don't ignore deployment errors (check Vercel logs)
- Don't use `USE_MOCKS=true` in production (defeats the purpose!)

###### Troubleshooting Deployments

**Issue: Vercel deployment fails with build error**
- Check Vercel logs for specific error
- Run `npm run build` locally to reproduce
- Fix errors and push again
- Ensure all environment variables are set in Vercel

**Issue: GitHub Actions fail but Vercel succeeds**
- GitHub Actions test your code, Vercel just deploys
- Fix the failing tests (contract, mock, integration)
- Don't merge to main until GitHub Actions pass

**Issue: Production deployment works but app doesn't function**
- Check browser console for errors
- Verify environment variables in Vercel (especially `USE_MOCKS=false`)
- Check Vercel function logs (serverless functions)
- Verify API key is valid and has credits

**Issue: Preview deployment shows real API calls (costing money)**
- Verify `USE_MOCKS=true` in Vercel preview environment variables
- Check service factory is reading `USE_MOCKS` correctly
- Add cost warnings to prevent accidental expensive operations

###### Rollback Strategy

If production deployment breaks:

1. **Quick Rollback** (Vercel Dashboard):
   - Go to Vercel dashboard → Deployments
   - Find last working deployment
   - Click "Promote to Production"
   - Production instantly rolls back

2. **Git Rollback** (GitHub):
   - `git revert <commit-hash>` (safer, preserves history)
   - OR `git reset --hard <commit-hash>` (destructive)
   - Push to main → Vercel auto-deploys rollback

3. **Emergency Fix**:
   - Create hotfix branch
   - Fix critical bug
   - Fast-track PR review
   - Deploy immediately

###### Post-Deployment Checklist
- [ ] Production URL accessible
- [ ] All features working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Costs tracking correctly
- [ ] Error handling working
- [ ] Documentation links to production URL
- [ ] Announce launch! 🎉

##### Documentation
- [ ] Update README.md with:
  - [ ] Live demo link
  - [ ] How to use the app
  - [ ] How to run locally
  - [ ] API costs and limits
- [ ] Create USER_GUIDE.md (how to use the app)
- [ ] Update CHANGELOG.md for v1.0.0

##### Sprint 4 Completion Criteria
- [ ] All polish items complete
- [ ] Security audit passed
- [ ] Performance metrics met (Lighthouse >80)
- [ ] Deployed to production
- [ ] Documentation updated
- [ ] MVP launch announcement ready
- [ ] Demo: Public URL works for end-users

**Pre-Launch Checklist**:
- [ ] Test complete flow on production
- [ ] Test on 3+ browsers (Chrome, Firefox, Safari)
- [ ] Test on 3+ devices (mobile, tablet, desktop)
- [ ] Verify all links work
- [ ] Verify downloads work
- [ ] Verify costs are tracked correctly
- [ ] Set up monitoring/error tracking (optional but recommended)
- [ ] Announce launch! 🚀

---

### 📊 Post-MVP Tracking

#### Success Metrics (Track After Launch)
- [ ] **MVP Launch Goals (End of Sprint 4)**
  - [ ] Generate complete 22-card deck in <5 minutes ✅ Target met
  - [ ] <2% generation failure rate ✅ Target met
  - [ ] Mobile usable (70%+ mobile traffic) ✅ Target met
  - [ ] <$0.002 cost per deck generation ✅ Target met
  - [ ] 95%+ SDD integration success rate ✅ Target met

- [ ] **3 Months Post-Launch Goals**
  - [ ] 100+ decks generated
  - [ ] <5s page load time (P90)
  - [ ] 80%+ user satisfaction (survey)
  - [ ] 10% return user rate

---

### 🚀 Future Sprints (Phase 2 & 3)

#### Sprint 5: User Authentication
- [ ] Email/password authentication
- [ ] User registration flow
- [ ] Login/logout functionality
- [ ] Password reset flow
- [ ] Protected routes

#### Sprint 6: Database Integration
- [ ] Database setup (PostgreSQL/MySQL)
- [ ] Save generated decks
- [ ] User dashboard (view saved decks)
- [ ] Deck naming and organization
- [ ] Generation history

#### Sprint 7: Regeneration & Refinement
- [ ] Edit individual card prompts
- [ ] Regenerate specific cards
- [ ] "Use as reference" feedback loop
- [ ] Side-by-side comparison view

#### Sprint 8: Social Features
- [ ] Share decks via public URL
- [ ] Public deck gallery
- [ ] Favorites/starring
- [ ] Social login (Google, GitHub)

#### Sprint 9+: Advanced Features
- [ ] Custom card backs
- [ ] Minor Arcana generation (56 cards)
- [ ] Print-ready export (300 DPI)
- [ ] Card meaning overlays
- [ ] Animation generation
- [ ] API access for developers

---

## Product Vision
An AI-powered Major Arcana tarot card generator that transforms user-provided style references into 22 unique, cohesive tarot card designs. Built with Seam-Driven Development for reliability and Grok AI for generation.

Core User Flow
Upload Reference Images (1-5 images)

JPG/PNG support
Client-side preview
Image validation & optimization
Define Style Parameters

Theme (e.g., "cyberpunk", "art nouveau", "minimalist")
Tone (e.g., "dark", "whimsical", "serious")
Concept (e.g., "nature spirits", "celestial bodies")
Description (free text, 500 char max)
Characters (optional - recurring figures)
Generate Card Prompts (Phase 1)

AI analyzes inputs
Creates 22 unique prompts (one per Major Arcana card)
User reviews/edits prompts before image generation
Preview shows: Card name, traditional meaning, generated prompt
Generate Card Images (Phase 2)

Batch generate all 22 cards OR select specific cards
Progress indicator with real-time updates
Cost estimator ($0.001 per deck)
Review & Iterate

Gallery view of all 22 cards
Download individual cards or full deck (ZIP)
"Use as reference" - add generated cards to reference images for refinement
Regenerate specific cards with adjusted prompts
Feature Requirements
MVP (Phase 1) - Core Generator
Must Have:

✅ Image upload (1-5 files, max 10MB each)
✅ Style input form (theme, tone, description, concept, characters)
✅ Prompt generation via Grok text API
✅ Image generation via Grok image API
✅ Preview generated prompts before image creation
✅ Display all 22 cards in gallery
✅ Download individual cards (PNG)
✅ Cost estimation and display
✅ Error handling with user-friendly messages
✅ Mobile-responsive design
Should Have:

⚪ Download full deck as ZIP
⚪ Loading states with progress indicators
⚪ Basic generation history (session-based, no auth)
⚪ Regenerate individual cards
⚪ Edit prompts before image generation
Could Have:

⚪ Save draft inputs (localStorage)
⚪ Example galleries with preset styles
⚪ Batch select cards for regeneration
Won't Have (MVP):

❌ User authentication
❌ Database storage
❌ Social features
❌ Custom card backs
❌ Print-ready templates
Phase 2 - Polish & Persistence
Must Have:

⚪ User authentication (email/password)
⚪ Database storage (saved decks, history)
⚪ User dashboard (view all decks)
⚪ Deck naming & organization
⚪ Share decks via public URL
Should Have:

⚪ Edit/re-prompt individual cards
⚪ "Use as reference" - feedback loop for refinement
⚪ Side-by-side comparison view
⚪ Favorites/starring cards
Could Have:

⚪ Social login (Google, GitHub)
⚪ Deck templates/presets
⚪ Community gallery (public decks)
Phase 3 - Advanced Features
Could Have:

⚪ Custom card backs matching deck style
⚪ Minor Arcana generation (56 additional cards)
⚪ Print-ready export (300 DPI, bleed, crop marks)
⚪ Card meaning overlays (toggle traditional interpretations)
⚪ Animation generation for digital readings
⚪ API access for developers
⚪ Bulk generation (multiple decks from template)

---

## Technical Architecture (Seams & SDD)

### GitHub Workflows & CI/CD

Your repository has 3 automated workflows that run via GitHub Actions:

#### 1. **CI Workflow** (`.github/workflows/ci.yml`)
**Purpose**: Continuous Integration - ensures code quality on every commit

**Triggers**:
- Every push to `main` or `develop` branches
- Every Pull Request to `main` or `develop`

**What it does**:
- **Lint Job**: Runs ESLint, type checking, and format checking
- **Contract Tests Job**: Validates mocks match contracts
- **Mock Tests Job**: Validates mock service behavior
- **Integration Tests Job**: Tests real API services (only on main/develop with API key)
- **Build Job**: Verifies project builds successfully
- **All Checks Job**: Confirms all above jobs passed

**When it matters**:
- ✅ Must pass before merging any PR
- ✅ Blocks deployment if tests fail
- ✅ Runs automatically - no manual action needed

**Configuration needed**:
- Add `XAI_API_KEY` to GitHub Secrets (for integration tests)
- Located at: Repository → Settings → Secrets and variables → Actions

---

#### 2. **Deploy Preview Workflow** (`.github/workflows/deploy-preview.yml`)
**Purpose**: Automatic preview deployments for Pull Requests

**Triggers**:
- When a Pull Request is opened
- When commits are pushed to a PR branch
- When a PR is reopened

**What it does**:
1. Runs contract tests
2. Runs mock tests
3. Builds project with `USE_MOCKS=true`
4. Posts comment on PR with deployment status
5. Vercel automatically creates preview URL

**When it matters**:
- ✅ Every feature branch gets a live preview
- ✅ Test changes before merging
- ✅ Safe - uses mocks (no API costs)

**Configuration needed**:
- Vercel GitHub integration must be enabled
- No secrets required (uses mocks)

---

#### 3. **Deploy Production Workflow** (`.github/workflows/deploy-production.yml`)
**Purpose**: Production deployment validation

**Triggers**:
- Every push to `main` branch
- Manual trigger via GitHub Actions UI

**What it does**:
1. Runs ALL tests (contract, mock, integration)
2. Runs type checking and linting
3. Builds for production with `USE_MOCKS=false`
4. Creates deployment summary
5. Vercel automatically deploys to production

**When it matters**:
- ✅ Validates production readiness before Vercel deploys
- ✅ Blocks bad code from reaching users
- ✅ Creates audit trail of deployments

**Configuration needed**:
- Vercel environment variables must be set
- `XAI_API_KEY` in GitHub Secrets

---

### Additional Workflows (Included but not critical for MVP)

#### 4. **SDD Compliance Workflow** (`.github/workflows/sdd-compliance.yml`)
**Purpose**: Enforces Seam-Driven Development rules

**What it checks**:
- No `any` types in code
- All contracts documented in SEAMSLIST.md
- No direct contract modifications (must create v2)

**When to use**: Optional enforcement - can enable/disable as needed

---

#### 5. **Security Workflow** (`.github/workflows/security.yml`)
**Purpose**: CodeQL security scanning

**What it checks**:
- Security vulnerabilities in code
- Dependency vulnerabilities
- Code quality issues

**When to use**: Runs automatically, review alerts periodically

---

#### 6. **Release Workflow** (`.github/workflows/release.yml`)
**Purpose**: Automates version releases

**When to use**: After major milestones (v1.0.0, v1.1.0, etc.)

---

### Workflow Setup Instructions

**Required Setup (Do in Sprint 4 before first deployment)**:

1. **GitHub Secrets** (for CI/CD):
   ```
   Repository → Settings → Secrets and variables → Actions → New repository secret
   ```
   - Add: `XAI_API_KEY` = Your Grok API key

2. **Vercel Integration**:
   ```
   Vercel Dashboard → Project → Settings → Git Integration
   ```
   - Ensure GitHub integration is connected
   - Ensure automatic deployments are enabled

3. **Branch Protection** (Recommended):
   ```
   Repository → Settings → Branches → Add rule for 'main'
   ```
   - ☑ Require status checks to pass before merging
   - ☑ Require branches to be up to date before merging
   - Select checks: `CI / All CI Checks Passed`

**Optional Setup**:
- Enable GitHub Discussions (for user feedback)
- Enable GitHub Issues (for bug tracking)
- Set up GitHub Projects (for project management)

---

### Workflow Decision Tree

**Use this to understand which workflow runs when:**

```
┌─────────────────────────────────────┐
│ You push code to GitHub             │
└─────────────┬───────────────────────┘
              │
              ├─ Push to feature branch → Nothing (just CI)
              │
              ├─ Open Pull Request → CI + Deploy Preview
              │                      (Preview at unique URL)
              │
              ├─ Push to PR branch → CI + Deploy Preview
              │                      (Preview updates)
              │
              └─ Merge to main → CI + Deploy Production
                                 (Production at main URL)
```

**Cost implications**:
- **CI**: Free (GitHub Actions free tier: 2000 min/month)
- **Preview**: Free Vercel hosting, mock services (no API costs)
- **Production**: Free Vercel hosting, real API costs (Grok charges)

---

### Seam Definitions

#### Seam 1: Image Upload Service
Contract: IImageUploadService

Input: File[] (1-5 images)
Output: UploadedImage[] (with URLs, metadata)
Error cases: Invalid format, size exceeded, upload failure
Seam 2: Style Input Service
Contract: IStyleInputService

Input: StyleInputs (theme, tone, description, concept, characters)
Output: ValidatedStyleInputs
Validation: Required fields, character limits
Seam 3: Prompt Generation Service
Contract: IPromptGenerationService

Input: UploadedImage[], ValidatedStyleInputs
Output: CardPrompt[] (22 prompts with card metadata)
Uses: Grok text API (grok-4-fast-reasoning)
Seam 4: Image Generation Service
Contract: IImageGenerationService

Input: CardPrompt[]
Output: GeneratedCard[] (images + metadata)
Uses: Grok image API (grok-image-generator)
Handles: Batch processing, retries, rate limiting
Seam 5: Gallery Display Service
Contract: IGalleryService

Input: GeneratedCard[]
Output: Rendered gallery with download options
Features: Grid/list view, zoom, filtering
Seam 6: Cost Calculation Service
Contract: ICostCalculatorService

Input: Number of cards, token counts
Output: EstimatedCost (USD)
Pricing: $0.20/1M input, $0.50/1M output tokens
Seam 7: Download Service
Contract: IDownloadService

Input: GeneratedCard[] or single Card
Output: Downloadable file (PNG or ZIP)
Development Roadmap
Sprint 0: Scaffolding ✅ COMPLETE

Project structure

SDD methodology docs

CI/CD pipelines

AI agent instructions

Code quality tools
Sprint 1: Contracts & Mocks (Week 1)

Define all 7 seam contracts in [object Object]

Create mock services for all seams

Write contract validation tests

Update SEAMSLIST.md

All tests passing with mocks
Deliverable: Fully mocked app with fake data flow

Sprint 2: UI Components (Week 2-3)

Upload component with drag-drop

Style input form with validation

Prompt preview/editor component

Card gallery grid component

Progress indicator component

Cost estimator widget

Download buttons
Deliverable: Complete UI working with mocks

Sprint 3: Grok Integration (Week 4)

Implement real PromptGenerationService

Implement real ImageGenerationService

API error handling & retries

Rate limiting implementation

Integration tests with Grok API
Deliverable: End-to-end generation working

Sprint 4: Polish & Deploy MVP (Week 5)

Error boundaries & user messaging

Loading states & animations

Mobile responsive tweaks

Cost display & warnings

Download ZIP functionality

Security audit

Deploy to Vercel production
Deliverable: Public MVP launch

Sprint 5+: Post-MVP Enhancements

User authentication

Database integration

Deck management dashboard

Regeneration features

Social sharing

Community gallery
Success Metrics
MVP Launch (End of Sprint 4):

✅ Generate complete 22-card deck in <5 minutes
✅ <2% generation failure rate
✅ Mobile usable (70%+ mobile traffic expected)
✅ <$0.002 cost per deck generation
✅ 95%+ SDD integration success rate
3 Months Post-Launch:

🎯 100+ decks generated
🎯 <5s page load time (P90)
🎯 80%+ user satisfaction (survey)
🎯 10% return user rate
Risk Assessment
| Risk | Probability | Impact | Mitigation | |------|------------|--------|------------| | Grok API instability | Medium | High | Retry logic, fallback queuing, clear error messages | | High generation costs | Medium | Medium | Cost warnings, preview-before-generate, user limits | | Poor AI prompt quality | High | Medium | Prompt engineering iteration, user editing capability | | Slow generation times | Medium | Medium | Progress indicators, batch optimization, async processing | | SDD contract violations | Low | High | Automated CI checks, strict code review, no any types |

Out of Scope (Not Building)
❌ Custom training/fine-tuning AI models
❌ Physical printing service integration
❌ Tarot reading interpretations/divination
❌ Multi-language support (English only MVP)
❌ Video card generation
❌ Blockchain/NFT features
❌ Mobile native apps
This PRD should be saved to /home/user/TarotUpMyHeart/PRD.md - want me to create it?

