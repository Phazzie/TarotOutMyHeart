# Integration Tests - Grok API

This directory contains end-to-end integration tests that verify the complete user flow with real Grok API services.

## ⚠️ COST WARNING

**Running these tests will incur real API costs!**

- **Prompt Generation**: ~$0.10-0.50 per test run
- **Image Generation**: ~$2.20 per test run (22 images × $0.10)
- **Complete Flow**: ~$2.25-2.70 per full run

**RUN SPARINGLY!** Only run integration tests when:
- You've made significant changes to real service implementations
- You're preparing for a release
- You need to verify API integration is working

## Prerequisites

1. **Real services implemented**:
   - ✅ `PromptGenerationService` (`services/real/PromptGenerationService.ts`)
   - ✅ `ImageGenerationService` (`services/real/ImageGenerationService.ts`)

2. **API Key**:
   - Get your Grok API key from [x.ai](https://x.ai/)
   - Set environment variable: `XAI_API_KEY=your-key-here`

## Running Tests

### With API Key (Real Tests)

```bash
# Set API key and run integration tests
XAI_API_KEY=your-key-here npm run test:integration

# Or export it first
export XAI_API_KEY=your-key-here
npm run test:integration

# Run specific test file
XAI_API_KEY=your-key-here npx vitest run tests/integration/grok-api.test.ts
```

### Without API Key (Tests Skip)

```bash
# Tests will skip gracefully if no API key is set
npm run test:integration
```

Output:
```
⏭️  Skipping: XAI_API_KEY not set (set env var to run real API tests)
```

## Test Coverage

### 1. Prompt Generation Tests
- ✅ Generate 22 card prompts with valid inputs
- ✅ Handle different style configurations
- ✅ Validate generated prompts
- ✅ Regenerate single prompt with feedback
- ✅ Estimate costs accurately
- ✅ Error handling (invalid inputs, missing API key)

**Cost per run**: ~$0.10-0.50

### 2. Image Generation Tests
- ✅ Generate 22 card images from prompts
- ✅ Track generation progress
- ✅ Handle partial failures (some cards fail)
- ✅ Regenerate single failed image
- ✅ Estimate costs accurately
- ✅ Cancel ongoing generation
- ✅ Error handling (invalid prompts, wrong count)

**Cost per run**: ~$2.20 (22 images)

### 3. Complete End-to-End Flow
- ✅ Generate prompts → Validate → Generate images
- ✅ Verify deck completeness (all 22 cards)
- ✅ Track total costs
- ✅ Measure generation time
- ✅ Handle failures gracefully

**Cost per run**: ~$2.25-2.70

## Test Timeouts

Tests have appropriate timeouts for API operations:

- **Prompt Generation**: 2 minutes
- **Image Generation**: 10 minutes (sequential with delays)
- **Single Image**: 1 minute
- **Complete Flow**: 12 minutes

## Example Output

### Successful Run

```
🔑 Running integration tests with real Grok API
⚠️  WARNING: These tests will incur real API costs!
💰 Expected cost: $2.25-2.7

Prompt Generation - Real Grok API
  ✓ should generate 22 card prompts with valid style inputs (45s)
    ✅ Generated 22 prompts successfully
    📊 Tokens: 3,245 (2,100 prompt + 1,145 completion)
    💰 Cost: $0.0523

Image Generation - Real Grok API
  ✓ should generate 22 card images from prompts (285s)
    📸 Generated 5/22 images (23%)
    📸 Generated 10/22 images (45%)
    📸 Generated 15/22 images (68%)
    📸 Generated 20/22 images (91%)
    ✅ Generated 22/22 images successfully
    📊 Generation time: 285.3s
    💰 Cost: $2.20

Complete End-to-End Flow - Real Grok API
  ✓ should complete full deck generation flow (340s)

    🎴 Starting complete deck generation flow...

    📝 Step 1: Generating 22 card prompts...
    ✅ Generated 22 prompts
    💰 Prompt cost: $0.0534

    ✓ Step 2: Validating prompts...
    ✅ All prompts valid

    🎨 Step 3: Generating 22 card images...
      📸 Progress: 5/22 (23%)
      📸 Progress: 10/22 (45%)
      📸 Progress: 15/22 (68%)
      📸 Progress: 20/22 (91%)
    ✅ Generated 22/22 images

    ✓ Step 4: Verifying deck completeness...
    ✅ All 22 cards present

    📊 FLOW SUMMARY
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Prompts: 22/22
    Images: 22/22
    Failed: 0
    Total Cost: $2.25
    Generation Time: 5.7 minutes
    Within Budget: ✅
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

==================================================
💰 TOTAL COST SUMMARY
==================================================
Total cost: $2.25 across 3 operations

Operations:
  1. Prompt Generation (22 cards): $0.0523
  2. Image Generation (22 cards): $2.20
  3. Complete End-to-End Flow: $2.25
==================================================
```

### Without API Key

```
⏭️  Skipping: XAI_API_KEY not set (set env var to run real API tests)

Test Files  1 passed (1)
     Tests  1 skipped | 1 passed (1)
```

## Cost Optimization Tips

1. **Use mock services during development**:
   ```bash
   # This uses mocks (no cost)
   npm run test:mocks
   ```

2. **Run contract tests first**:
   ```bash
   # Validates contracts without API calls (no cost)
   npm run test:contracts
   ```

3. **Test with smaller datasets**:
   - Modify tests to use fewer cards for quick checks
   - Only run full 22-card tests before releases

4. **Use CI wisely**:
   - Don't run integration tests on every commit
   - Run only on `main` branch or tagged releases
   - Use GitHub secrets for API keys

## Troubleshooting

### Tests timeout
- Increase timeout in test file: `TEST_TIMEOUTS.imageGeneration`
- Check network connection
- Verify API is not rate limiting

### All images fail
- Check API key is valid
- Verify Grok API is operational
- Check rate limits on your account

### Costs higher than expected
- Check Grok pricing (may have changed)
- Review `EXPECTED_COSTS` in `tests/helpers/test-data.ts`
- Some tests may retry on failures, increasing cost

### Tests skip even with API key
- Verify environment variable is set: `echo $XAI_API_KEY`
- Use correct syntax: `XAI_API_KEY=key npm run test:integration`
- Check no typos in variable name

## CI/CD Configuration

### GitHub Actions Example

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  workflow_dispatch: # Manual trigger only

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:integration
        env:
          XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
```

**Important**: Only run integration tests manually or on important branches to control costs.

## Related Files

- `grok-api.test.ts` - Main integration test suite
- `../helpers/test-data.ts` - Test data and utilities
- `../../services/real/PromptGenerationService.ts` - Real prompt service
- `../../services/real/ImageGenerationService.ts` - Real image service
- `../../contracts/PromptGeneration.ts` - Prompt generation contract
- `../../contracts/ImageGeneration.ts` - Image generation contract

## Questions?

See main project documentation:
- `CLAUDE.md` - AI agent instructions
- `prd.MD` - Product requirements
- `SEAMSLIST.md` - Defined seams
