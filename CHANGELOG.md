# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Contracts** (Phase 2 complete):
  - 7 core seam contracts defined in `/contracts/`
  - ImageUpload, StyleInput, PromptGeneration, ImageGeneration, DeckDisplay, CostCalculation, Download
  - All contracts exported from `contracts/index.ts`
  - Comprehensive JSDoc documentation for each contract
  
- **Mock Services** (Phase 3 in progress):
  - Mock implementations created for all 7 seams in `/services/mock/`
  - Service factory pattern for mock/real service switching
  - **Status**: Mock files exist but have 115 TypeScript errors (not validated yet)
  - **Blocking**: Must fix type errors before UI development can proceed

- **AI Coordination Server** (separate subproject):
  - Coordination server scaffolding in `/coordination-server/`
  - Contracts for Claude-Copilot collaboration
  - Mock implementations for 5 coordination seams
  - MCP server foundation for Copilot integration

- **Documentation**:
  - Updated SEAMSLIST.md with 7 tarot app seams + 5 coordination seams
  - Created planning docs in `/docs/planning/`:
    - DATA-BOUNDARIES.md (data boundary analysis)
    - RECOMMENDATIONS.md (technical decisions)
  - Created blueprint templates in `/docs/blueprints/`
  - Updated AGENTS.md with expanded SDD guidance
  - Updated AI-CHECKLIST.md with detailed phase-by-phase workflow
  - Product Requirements Document (PRD.md)

### Changed

- Enhanced documentation structure: root files for scaffolding, `/docs/planning/` for development docs
- Improved AI agent instructions with emphasis on contract immutability
- SEAMSLIST.md now tracks both tarot app and coordination server seams

### Fixed

- N/A (no bugs fixed yet - project still in initial development)

### Known Issues

- ⚠️ **115 TypeScript errors in mock services** - mocks don't fully match contracts yet
- Mock services not validated with `npm run check` before commit
- Contract tests not yet written
- Real services not yet implemented
- UI components not yet built

### Next Steps

1. **Immediate**: Fix 115 TypeScript errors in mock services (Phase 3 completion)
2. Write contract tests to validate mocks match contracts
3. Build UI components against validated mocks (Phase 4)
4. Implement real Grok API services (Phase 5)
5. Integration testing (Phase 6)

## [0.0.1] - 2025-11-07

### Added

- Initial project scaffolding with Seam-Driven Development (SDD) structure
- Complete documentation framework:
  - AGENTS.md - Universal AI agent instructions
  - seam-driven-development.md - Complete SDD methodology guide
  - SEAMSLIST.md - Seam catalog template (to be populated)
  - README.md - Project overview and quick start
  - CHANGELOG.md - Version history (this file)
  - lessonslearned.md - Project insights template
- AI agent instruction files:
  - CLAUDE.md (symlink to AGENTS.md)
  - GEMINI.md (symlink to AGENTS.md)
  - .github/copilot-instructions.md
- Environment and configuration:
  - .env.example with required variables
  - .gitignore for SvelteKit + Node.js
  - .nvmrc specifying Node.js 20
- Code quality tooling:
  - .prettierrc for code formatting
  - .eslintrc.cjs for linting
  - .editorconfig for cross-editor consistency
- SvelteKit framework setup:
  - package.json with dependencies and scripts
  - svelte.config.js with Vercel adapter
  - vite.config.ts with testing configuration
  - tsconfig.json with strict mode and path aliases
- Project structure:
  - `/contracts` directory for immutable contracts
  - `/services/mock` for mock implementations
  - `/services/real` for real implementations
  - `/src/lib` for components and utilities
  - `/tests` for contract, mock, and integration tests
- LICENSE file (MIT)

### Notes

This is the initial scaffolding release. No functional code yet - only project structure and documentation following Seam-Driven Development methodology.

**Next Steps**:

1. Define seams in SEAMSLIST.md (IDENTIFY phase)
2. Create contracts in `/contracts` (DEFINE phase)
3. Implement mock services (BUILD UI phase)
4. Implement UI components against mocks
5. Implement real Grok API services (IMPLEMENT phase)
6. Integration (INTEGRATE phase)

---

## Version History Format

### Types of Changes

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerabilities

### Version Numbering

Following [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0) - Incompatible API changes
- **MINOR** version (0.X.0) - Backwards-compatible functionality
- **PATCH** version (0.0.X) - Backwards-compatible bug fixes

### Pre-1.0 Releases

Before 1.0.0, the project is in initial development. Anything may change at any time.

---

[Unreleased]: https://github.com/Phazzie/TarotUpMyHeart/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Phazzie/TarotUpMyHeart/releases/tag/v0.0.1
