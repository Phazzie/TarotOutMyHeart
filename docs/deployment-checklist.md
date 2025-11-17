# TarotOutMyHeart - Deployment Checklist

**Purpose**: Comprehensive pre-deployment, during-deployment, post-deployment, and rollback procedures for Sprint 4 production deployment.

**Timeline**: Complete all sections before merging to main branch.

**Responsibility**: Lead developer or deployment owner.

---

## 0. Pre-Deployment Verification (Day Before)

Complete these checks at least 1 day before planned deployment.

### Code Quality

- [ ] All code has been reviewed and merged to main via PR
- [ ] No `any` types in TypeScript: `git grep "as any"` returns nothing
- [ ] No console.log statements left (use proper logging)
- [ ] No commented-out code blocks
- [ ] All files have proper JSDoc comments per standards

### Automated Checks

```bash
# Run all verifications locally
npm run ci
```

- [ ] Linting passes: `npm run lint` (no errors or warnings)
- [ ] Type checking passes: `npm run check` (no TypeScript errors)
- [ ] All tests pass: `npm run test:all`
  - [ ] Contract tests pass
  - [ ] Mock service tests pass
  - [ ] Integration tests pass (may skip if real API not available)
- [ ] Build succeeds: `npm run build` (no errors)
- [ ] Preview works: `npm run preview` (no runtime errors)

### API Configuration

- [ ] X.AI API key is valid and has sufficient credits
- [ ] Test API key works with test request:
  ```bash
  curl -X POST https://api.x.ai/v1/chat/completions \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"grok-4","messages":[{"role":"user","content":"test"}]}'
  ```
- [ ] API rate limits are understood (check X.AI account)
- [ ] Cost estimates calculated based on expected usage
- [ ] Spending alerts configured in X.AI account

### Documentation Review

- [ ] README.md deployment section is complete and accurate
- [ ] `.env.example` has all required variables documented
- [ ] `.env.production.example` exists and is complete
- [ ] CHANGELOG.md is updated with Sprint 4 features
- [ ] All deployment docs are up-to-date

### Security Review

- [ ] No secrets (API keys) committed to version control
- [ ] `.gitignore` includes `.env.local`, `.env.production`, etc.
- [ ] All environment variables are placeholders in example files
- [ ] Vercel environment variables will be set in dashboard (not in code)
- [ ] GitHub repository secrets configured (if using CI/CD)

### Performance Baseline

- [ ] Local build size documented: `du -sh .svelte-kit/`
- [ ] Local build time recorded: `npm run build` timing
- [ ] Lighthouse score on local preview (target: >80)
  - [ ] Performance >80
  - [ ] Accessibility >90
  - [ ] Best Practices >90
  - [ ] SEO >90
- [ ] No performance regressions from previous sprint

### Backup Plan

- [ ] Document previous working deployment version (git commit hash)
- [ ] Know how to quickly rollback (see Rollback section)
- [ ] Have X.AI support contact info handy (in case of API issues)
- [ ] Have Vercel support link ready (https://vercel.com/help)

---

## 1. Environment Setup (Deployment Day)

### Prepare Vercel Project

1. **Create/Verify Vercel Project**
   - [ ] Project created at https://vercel.com/dashboard
   - [ ] GitHub repository connected
   - [ ] Build settings auto-detected (should be SvelteKit)
   - [ ] Project URL noted: `https://[project].vercel.app`

2. **Configure Production Environment Variables**

   Navigate to: Vercel Dashboard → Project Settings → Environment Variables

   Add each variable with Environment = "Production":

   - [ ] `XAI_API_KEY` = Your actual X.AI API key
   - [ ] `GROK_TEXT_MODEL` = `grok-4-fast-reasoning` (or your chosen model)
   - [ ] `GROK_IMAGE_MODEL` = `grok-image-generator` (or your chosen model)
   - [ ] `NODE_ENV` = `production`
   - [ ] `USE_MOCKS` = `false` (use real API)
   - [ ] `PUBLIC_APP_URL` = Your production domain (e.g., https://tarot-up-my-heart.vercel.app)

3. **Configure Optional Production Variables** (if using)

   - [ ] `SENTRY_DSN` = Your Sentry DSN (if using error tracking)
   - [ ] `SENTRY_ENVIRONMENT` = `production`
   - [ ] `PUBLIC_ANALYTICS_ID` = Your analytics ID (if using)
   - [ ] Rate limiting: `RATE_LIMIT_RPM` = `60` (or your value)

4. **Configure Preview Environment Variables** (optional, recommended)

   Add each variable with Environment = "Preview":

   - [ ] `USE_MOCKS` = `true` (save costs in preview)
   - [ ] `NODE_ENV` = `development` (helpful for debugging)
   - [ ] Other preview-specific settings (optional)

5. **Verify Build Settings**
   - [ ] Build Command: `npm run build` (should be default)
   - [ ] Output Directory: `.svelte-kit` (should be default)
   - [ ] Install Command: `npm install` (should be default)
   - [ ] Node Version: 20.x (matches `.nvmrc`)

### Verify Git State

```bash
# Make sure everything is committed
git status  # Should show "nothing to commit, working tree clean"

# Verify main branch is up-to-date
git checkout main
git pull origin main
```

- [ ] Working directory is clean
- [ ] On main branch
- [ ] All changes are committed and pushed

### Final Safety Check

- [ ] X.AI API key is secure (not in git history)
- [ ] No sensitive data in environment variables
- [ ] Review git log to verify recent commits are correct

---

## 2. Preview Deployment Testing (Before Production)

Test your deployment in preview environment first.

### Create and Deploy Preview

1. **Create Feature Branch** (if not already created for testing)
   ```bash
   git checkout -b test-production-deployment
   ```

2. **Make Test Commit**
   ```bash
   # Small change to trigger deployment (e.g., update package.json version)
   # OR just push current state
   git push origin test-production-deployment
   ```

3. **Create Pull Request**
   - [ ] Go to GitHub repository
   - [ ] Click "New Pull Request"
   - [ ] Select base: `main`, compare: `test-production-deployment`
   - [ ] Create PR

4. **Wait for Preview Deployment**
   - [ ] Vercel auto-deploys when PR is opened
   - [ ] Look for Vercel comment in PR
   - [ ] Click preview URL

### Test Preview Deployment

Navigate to preview URL and test:

- [ ] **Page loads without errors**
  - [ ] No 404 or 500 errors
  - [ ] All assets load (CSS, images, fonts)
  - [ ] No JavaScript errors in console

- [ ] **Upload Flow**
  - [ ] Can select reference images
  - [ ] Image preview displays correctly
  - [ ] Can clear/change images

- [ ] **Style Input**
  - [ ] Form inputs work
  - [ ] Can type in all fields
  - [ ] Form validation works (if implemented)

- [ ] **Prompt Generation** (if enabled in preview)
  - [ ] Generate button works
  - [ ] Loading state displays
  - [ ] Results appear when complete
  - [ ] No console errors
  - [ ] Check if using mock (USE_MOCKS=true) or real API (check network tab)

- [ ] **Image Generation** (if enabled in preview)
  - [ ] Generate button works
  - [ ] Shows loading/progress state
  - [ ] Generated images appear
  - [ ] No console errors
  - [ ] Can download/save

- [ ] **Gallery View**
  - [ ] Displays generated cards
  - [ ] Can scroll and interact
  - [ ] Download functionality works

- [ ] **Responsive Design**
  - [ ] Test on mobile (use DevTools device emulation)
  - [ ] Test on tablet
  - [ ] Test on desktop
  - [ ] No layout issues

- [ ] **Browser Console**
  ```javascript
  // In browser console
  console.log('errors detected: ' + (performance.getEntriesByType("navigation")[0].transferSize == 0))
  ```
  - [ ] No errors in console
  - [ ] No warnings related to missing resources
  - [ ] Network tab shows all requests succeeding

### Verify Preview Configuration

- [ ] Check that preview is using mocks (check network requests)
  - If `USE_MOCKS=true`: No API calls to X.AI
  - If testing real API: Verify X.AI calls work
- [ ] Public URL is correct in page metadata
- [ ] Analytics/error tracking not firing (OK if not configured)

### Check Vercel Logs

1. Go to Vercel dashboard → Deployments
2. Click the preview deployment
3. Check build logs:
   - [ ] Build completed successfully
   - [ ] No build warnings or errors
   - [ ] All dependencies installed
4. Check function logs:
   - [ ] No runtime errors
   - [ ] Function execution times normal (<3s)

### Close/Delete Preview

- [ ] If everything works: Keep PR open for reference
- [ ] Note any issues found
- [ ] If issues: Fix locally and repush to feature branch
- [ ] Vercel auto-redeploys when you push

---

## 3. Production Deployment

Once preview testing is complete and successful:

### Merge to Main

```bash
# Option 1: Merge via GitHub (recommended)
# Go to PR → Click "Merge pull request" → Confirm

# Option 2: Merge locally
git checkout main
git merge test-production-deployment
git push origin main
```

- [ ] PR merged to main branch
- [ ] All CI checks passed (GitHub Actions green)
- [ ] Vercel started production deployment

### Monitor Production Deployment

1. **Check Vercel Dashboard**
   - [ ] Go to Vercel dashboard
   - [ ] Select TarotOutMyHeart project
   - [ ] Go to "Deployments" tab
   - [ ] Find the latest production deployment
   - [ ] Status should progress: Building → Ready → ✅ Production

2. **Watch Build Process**
   - [ ] Click on deployment to view logs
   - [ ] Verify build completes successfully
   - [ ] Check for any warnings or errors
   - [ ] Typical build time: 1-3 minutes

3. **Wait for Completion**
   - [ ] Status shows "Ready" (not "Building")
   - [ ] Vercel auto-promotes to production URL
   - [ ] Wait at least 2 minutes after "Ready" status

- [ ] Production deployment completed
- [ ] No deployment errors in logs

### Verify Production is Live

```bash
# Test production URL (from Vercel dashboard)
curl https://tarot-up-my-heart.vercel.app
# Should return HTML page (status 200)
```

- [ ] Production URL responds (HTTP 200)
- [ ] Page loads without 404/500 errors

---

## 4. Post-Deployment Verification

### Test Production Thoroughly

Navigate to your production URL and test everything:

#### User Interface

- [ ] **Page loads**
  - [ ] No errors
  - [ ] All text visible
  - [ ] All images/assets load
  - [ ] Navigation works

- [ ] **Upload functionality**
  - [ ] Can select images
  - [ ] Preview shows correctly
  - [ ] Can upload multiple images

- [ ] **Style form**
  - [ ] All inputs work (text, dropdown, etc.)
  - [ ] Form validation works
  - [ ] Can submit form

- [ ] **Prompt generation**
  - [ ] Button responsive
  - [ ] Loading state shows
  - [ ] Completes successfully (with real API calls)
  - [ ] Results display correctly
  - [ ] Results match expected format

- [ ] **Image generation**
  - [ ] Button responsive
  - [ ] Loading/progress bar shows
  - [ ] Completes successfully (with real API calls)
  - [ ] Generated images load
  - [ ] Quality meets expectations

- [ ] **Gallery & Download**
  - [ ] Generated cards display
  - [ ] Can scroll/browse
  - [ ] Download buttons work
  - [ ] Downloaded files are valid

- [ ] **Error handling**
  - [ ] Try invalid input
  - [ ] Error messages display
  - [ ] Can retry after error
  - [ ] No blank screens or crashes

- [ ] **Mobile responsiveness**
  - [ ] Test on actual mobile device or DevTools
  - [ ] Layout adapts to small screens
  - [ ] Touch interactions work
  - [ ] No horizontal scrolling issues

- [ ] **Performance**
  - [ ] Page loads in <3 seconds
  - [ ] Interactions are responsive (no lag)
  - [ ] No janky animations

#### Technical Verification

- [ ] **Browser Console** (no errors)
  ```javascript
  // Open DevTools → Console tab
  // Should show no red error messages
  // Warnings are OK, but note them
  ```

- [ ] **Network Tab** (all requests successful)
  - [ ] All resources load (200 status)
  - [ ] No failed API calls (should see some X.AI API calls)
  - [ ] No blocked requests

- [ ] **Real API calls working**
  - [ ] X.AI API calls are happening (check network tab)
  - [ ] API responses are successful (status 200/201)
  - [ ] Responses contain expected data
  - [ ] No authentication errors

- [ ] **Environment variables correct**
  - [ ] `NODE_ENV=production` (verified in behavior - optimized)
  - [ ] `USE_MOCKS=false` (verified by real API calls)
  - [ ] `PUBLIC_APP_URL` correct (check links)

### Monitor API & Costs

1. **Check X.AI Dashboard** (https://x.ai/api)
   - [ ] Login to X.AI account
   - [ ] Check "API Usage" section
   - [ ] Verify API calls are showing (should see recent requests)
   - [ ] Verify costs are reasonable
   - [ ] Check no error_rate or failures

2. **Monitor for First Hour**
   - [ ] Check X.AI dashboard every 10 minutes
   - [ ] Watch for any API errors
   - [ ] Verify costs match expectations
   - [ ] Note any anomalies (e.g., unusually high costs)

3. **Set Up Alerts** (if not already done)
   - [ ] X.AI account: Set spending alerts
   - [ ] Vercel: Set deployment failure alerts
   - [ ] Sentry (if configured): Set alert for errors

### Performance Monitoring

1. **Check Vercel Analytics**
   - [ ] Go to Vercel dashboard
   - [ ] Select "Analytics" tab
   - [ ] Verify request counts (should see traffic)
   - [ ] Check response times (<3s target)
   - [ ] Check error rates (should be 0%)

2. **Monitor Function Duration**
   - [ ] Average function time should be <3s
   - [ ] Max function time should be <10s
   - [ ] If high: May need to optimize or increase timeout

3. **Check Database/Service Health** (if applicable)
   - [ ] All external services responding
   - [ ] No timeouts or connection errors

### Check Monitoring Systems

1. **Error Tracking** (if Sentry configured)
   - [ ] Go to Sentry dashboard
   - [ ] Should see some events from production
   - [ ] No critical errors
   - [ ] Alerts working (check email)

2. **Analytics** (if configured)
   - [ ] Check analytics dashboard
   - [ ] Should show traffic from production
   - [ ] Page views and events appearing

### Update Documentation

- [ ] README.md verified (links work, instructions correct)
- [ ] Deployment instructions are accurate
- [ ] CHANGELOG.md updated with production deployment note
- [ ] lessonslearned.md updated with lessons from this deployment

### Final Verification Checklist

- [ ] Production URL is live and responding
- [ ] All features work (upload, generate, download)
- [ ] Real API calls working (verified in network tab)
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Costs are within budget
- [ ] Monitoring systems configured and working
- [ ] Team notified of production deployment

---

## 5. Post-Deployment Monitoring

Monitor production for the first week after deployment.

### Daily Monitoring (First Week)

**Every morning**:
- [ ] Check Vercel dashboard for errors
- [ ] Check X.AI API usage and costs
- [ ] Check error tracking (Sentry, if configured)
- [ ] Check analytics for traffic patterns
- [ ] No critical issues reported

**Every afternoon**:
- [ ] Spot-check production functionality
- [ ] Verify API is still responding
- [ ] No increase in error rates
- [ ] Costs trending as expected

**At end of day**:
- [ ] Document any issues found
- [ ] Create GitHub issues for problems
- [ ] Note patterns or trends

### Weekly Monitoring (After First Week)

- [ ] Review API usage trends
- [ ] Review cost trends
- [ ] Review error rates
- [ ] Check user feedback
- [ ] Performance still good?
- [ ] Any production incidents?

### Metrics to Track

**API Performance**:
- Prompt generation success rate (target: >95%)
- Image generation success rate (target: >95%)
- Average API response time (target: <3s)
- API error rate (target: <1%)

**Application Performance**:
- Page load time (target: <3s)
- Function execution time (target: <3s)
- Error rate (target: <0.1%)
- Uptime (target: >99.9%)

**Cost Tracking**:
- Daily API costs
- Monthly budget vs actual
- Cost per user/request
- Unusual spikes or anomalies

---

## 6. Rollback Procedures

If something goes wrong in production, use these procedures.

### Quick Rollback (Revert to Previous Version)

Use this if production is broken and you need to restore quickly.

**Option 1: Vercel Deployment Rollback** (30 seconds)

```
1. Go to Vercel dashboard
2. Click "Deployments" tab
3. Find the previous working deployment
4. Click three dots (•••) → "Promote to Production"
5. Confirm
6. Production is now on previous version
```

Time to restore: 1-2 minutes
Risk: Low (you're just promoting a previous known-good deployment)

- [ ] Find previous working deployment in Vercel
- [ ] Promote to production
- [ ] Verify production is restored
- [ ] Test key features

**Option 2: Git Rollback** (2 minutes)

```bash
# Find the commit before the bad deployment
git log --oneline | head -5

# Revert the bad commit
git revert HEAD  # Creates new commit that undoes changes

# Push to trigger automatic redeploy
git push origin main
```

Wait for Vercel to redeploy, then verify.

- [ ] Identify bad commit
- [ ] Run git revert
- [ ] Push to main
- [ ] Wait for Vercel to redeploy
- [ ] Verify production is restored

### Emergency Disable API (Cost Control)

If you notice runaway costs, disable the real API immediately:

**Stop API Costs (2 minutes)**

```
1. Go to Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Find USE_MOCKS variable (Production)
4. Click edit
5. Change value from "false" to "true"
6. Save
7. Vercel auto-redeploys
```

This will:
- Stop all X.AI API calls
- Switch to mock services
- Eliminate new costs immediately
- Application continues working (with mock data)

- [ ] Change `USE_MOCKS=true` in Vercel (Production)
- [ ] Wait for redeployment
- [ ] Verify mock services working
- [ ] API costs stop immediately

### Full Code Rollback

If you need to completely revert to a previous working version:

```bash
# Find the working commit
git log --oneline
# Look for commit before problems started

# Option 1: Revert commit-by-commit
git revert HEAD
git revert HEAD~1
git push origin main

# Option 2: Hard reset to known-good commit
git reset --hard abc123def  # commit hash
git push --force origin main  # WARNING: force push, use carefully
```

- [ ] Identify last known-good commit
- [ ] Revert problematic commits
- [ ] Test locally first
- [ ] Push to main
- [ ] Vercel auto-redeploys

### Communicate Issues

When rolling back:

1. **Notify team** (Slack/Discord):
   - "Production issue detected, rolling back to previous version"
   - Brief description of problem
   - Link to Vercel deployment

2. **Create GitHub issue**:
   - Title: "Production Issue - [Brief Description]"
   - Description: What went wrong, when, how we fixed it
   - Assign to responsible developer

3. **Post-Mortem** (within 24 hours)
   - What caused the issue?
   - How do we prevent it next time?
   - What tests/checks were missing?

---

## 7. Success Criteria

Your deployment is successful when ALL of these are true:

### Technical Success

- ✅ Application loads in <3 seconds
- ✅ No errors in browser console
- ✅ All API calls are successful
- ✅ Real X.AI API is being used (not mocks)
- ✅ All features work end-to-end
- ✅ Mobile responsive design works
- ✅ Performance metrics meet targets

### Operational Success

- ✅ Vercel shows "Ready" status
- ✅ No build warnings or errors
- ✅ Function execution times normal
- ✅ No deployment rollbacks needed

### Cost Success

- ✅ API costs are within budget
- ✅ No runaway costs detected
- ✅ Spending alerts configured
- ✅ Daily costs tracking expectation

### Monitoring Success

- ✅ Error tracking configured and working
- ✅ Analytics configured and tracking
- ✅ Cost monitoring set up
- ✅ Alerts configured and testing

### Team Success

- ✅ All tests passing in CI/CD
- ✅ No critical issues reported
- ✅ Team notified of deployment
- ✅ Runbooks updated with any changes

---

## 8. Post-Deployment Documentation

### Update CHANGELOG.md

Add entry for Sprint 4 deployment:

```markdown
## [Sprint 4] - 2025-11-17

### Deployed
- Production deployment to Vercel
- All Sprint 4 features: Error handling, loading states, mobile responsiveness
- Real Grok API integration (no longer using mocks)
- Sentry error tracking configured
- Vercel Analytics enabled

### Deployment Details
- Production URL: https://tarot-up-my-heart.vercel.app
- Node version: 20.x
- Build time: ~2 minutes
- Vercel deployment: Successful

### Known Issues
- [Any issues found during deployment]

### Next Steps
- Monitor API usage and costs
- Gather user feedback
- Plan for Sprint 5 enhancements
```

### Update lessonslearned.md

Document lessons from deployment:

```markdown
## Sprint 4 Deployment Learnings

### What Went Well
1. [Thing that worked well during deployment]
2. [Process that was smooth]

### What Could Be Better
1. [Thing that could be improved]
2. [Process to optimize next time]

### Recommendations for Future Deployments
1. [Specific action to take next time]
2. [Process improvement]

### Checklists to Update
- [Any checklist items that were missed]
- [New items to add to deployment checklist]
```

### Create Deployment Summary

Document the deployment for the team:

**Format**:
```
DEPLOYMENT SUMMARY
==================
Date: 2025-11-17
Version: v1.0.0
Status: SUCCESS

Timeline:
- 10:00 AM - Began pre-deployment checks
- 10:30 AM - Preview deployment initiated
- 11:00 AM - Preview testing complete
- 11:15 AM - Production deployment initiated
- 11:20 AM - Production deployment complete
- 12:00 PM - Post-deployment verification complete

Results:
- Uptime: 100%
- Error rate: 0%
- API response time: 1.2s avg
- Users impacted by issues: 0

Issues Encountered:
- [Any issues and how they were resolved]

Next Steps:
- Monitor production for 24 hours
- Review metrics and costs
- Plan enhancements for Sprint 5
```

---

## Quick Reference

### Emergency Contacts
- X.AI Support: https://x.ai/support
- Vercel Support: https://vercel.com/help
- GitHub Support: https://support.github.com

### Important URLs
- Production: https://tarot-up-my-heart.vercel.app
- Vercel Dashboard: https://vercel.com/dashboard
- X.AI API: https://x.ai/api
- GitHub Repository: [your repo URL]

### Key Files
- Environment config: `.env.example`, `.env.production.example`
- Build config: `svelte.config.js`, `vite.config.js`
- Package config: `package.json`
- CI/CD config: `.github/workflows/*.yml`

### Common Commands
```bash
# Local testing
npm run build          # Build for production
npm run preview        # Preview built version
npm run check         # Type check
npm run test:all      # Run all tests
npm run lint          # Check code style

# Git operations
git status            # Check uncommitted changes
git push origin main  # Push to main (triggers deployment)
git log --oneline     # View recent commits

# Vercel CLI (optional)
vercel               # Deploy to Vercel
vercel rollback      # Rollback deployment
vercel logs          # View logs
```

---

**Last Updated**: 2025-11-17
**Maintained By**: [Your Name]
**Next Review**: After each production deployment
