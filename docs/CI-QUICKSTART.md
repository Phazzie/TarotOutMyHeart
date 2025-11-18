# CI Quick Start Guide

## Running CI Checks Locally

Before pushing code, run these commands to ensure CI will pass:

```bash
# Run all CI checks
npm run ci

# Or run individually:
npm run lint          # Check code style
npm run check         # Type checking
npm run test:all      # All tests
npm run build         # Build verification
```

## Common CI Commands

### Linting

```bash
npm run lint              # Check for issues
npm run format            # Auto-fix formatting
```

### Type Checking

```bash
npm run check             # Check types
npm run check:watch       # Watch mode
```

### Testing

```bash
npm test                  # All tests
npm run test:contracts    # Contract tests only
npm run test:mocks        # Mock tests only
npm run test:integration  # Integration tests (requires API keys)
```

### Building

```bash
npm run build             # Production build
npm run preview           # Preview production build
```

## CI Workflows

### On Every Push/PR

- **ci.yml**: Runs lint, type check, tests, and build
- **sdd-compliance.yml**: Validates SDD methodology compliance

### On PR Creation

- **deploy-preview.yml**: Deploys preview to Vercel with mocks

### On Push to Main

- **deploy-production.yml**: Deploys to production with real services
- **security.yml**: Runs security scans

### On Tag Push (v\*)

- **release.yml**: Creates GitHub release with artifacts

## Troubleshooting

### "npm ci failed"

- **Cause**: `package-lock.json` out of sync
- **Fix**: Run `npm install` and commit updated `package-lock.json`

### "Build failed: not exported"

- **Cause**: Importing wrong export from mock files
- **Fix**: Use factory imports from `$services/factory`

### "Tests failed: not a constructor"

- **Cause**: Trying to instantiate singleton instance
- **Fix**: Import class alias (e.g., `ImageUploadMock` not `imageUploadMockService`)

### Type Errors in Mocks

- **Cause**: Mock doesn't fully implement interface
- **Fix**: Implement missing methods or mark as incomplete with TODO

## Environment Variables

### Development (Mocks)

```bash
USE_MOCKS=true          # Default - uses mock services
```

### Production (Real APIs)

```bash
USE_MOCKS=false         # Uses real services
XAI_API_KEY=xxx         # Required for real services
VERCEL_BLOB_TOKEN=xxx   # Required for image storage
```

## SDD Compliance Checks

The `sdd-compliance.yml` workflow enforces:

1. **Contract Immutability**: Contracts cannot be modified once defined
2. **No 'any' Types**: Must use `unknown` and validate
3. **SEAMSLIST Update**: New contracts must update SEAMSLIST.md
4. **Mock Coverage**: Every contract must have a mock

## CI Status Badges

Add to README.md:

```markdown
![CI](https://github.com/Phazzie/TarotOutMyHeart/workflows/CI/badge.svg)
![SDD Compliance](https://github.com/Phazzie/TarotOutMyHeart/workflows/SDD%20Compliance/badge.svg)
```

## Getting Help

- Check [CI-AUDIT-REPORT.md](./CI-AUDIT-REPORT.md) for detailed audit results
- Review workflow files in `.github/workflows/` for configuration
- See [AGENTS.md](../AGENTS.md) for coding standards
