# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **AI Coordination Server** ✅ (Phase 3-4 complete - 2025-11-08):
  - Full coordination server implementation in `/coordination-server/`
  - **Phase 3**: Contracts + Mocks + Tests
    - 5 contracts for Claude-Copilot collaboration
    - Mock implementations with realistic behavior
    - **Contract tests**: 5 test files (~53KB)
    - **Mock tests**: 1 test file (StateStore, 13KB)
    - **Integration tests**: 1 test file (15KB)
  - **Phase 4**: Real Service Implementation ✅
    - StateStoreSQLite - Production SQLite persistence layer
    - ClaudeCoordinationService - Full orchestration API
    - CopilotCoordinationService - MCP tools implementation
    - UserCoordinationService - User control interface
    - FileSystemCoordinationService - File locking coordination
    - Factory updated to support `USE_MOCKS=false` mode
    - All services implement contracts exactly (0 type errors)
  - **MCP Server**: Complete MCP protocol implementation for Copilot
  - **HTTP API**: Complete REST + WebSocket server for Claude
  - TypeScript strict mode compliance (only minor cosmetic warnings)
  - **Status**: Phase 4 complete, Phase 5 (testing + docs + deployment) in progress

- **Tarot App Contracts** (Phase 2 complete):
  - 7 core seam contracts defined in `/contracts/`
  - ImageUpload, StyleInput, PromptGeneration, ImageGeneration, DeckDisplay, CostCalculation, Download
  - All contracts exported from `contracts/index.ts`
  - Comprehensive JSDoc documentation for each contract

- **Tarot App Mock Services** (Phase 3 in progress):
  - Mock implementations created for all 7 seams in `/services/mock/`
  - Service factory pattern for mock/real service switching
  - **Status**: Mock files exist, TypeScript errors need fixing
  - **Blocking**: Must fix type errors and write contract tests before UI development

- **Documentation**:
  - Updated SEAMSLIST.md with coordination and tarot seams
  - Created planning docs in `/docs/planning/`:
    - DATA-BOUNDARIES.md (data boundary analysis)
    - RECOMMENDATIONS.md (technical decisions)
  - Created blueprint templates in `/docs/blueprints/`
  - Updated AGENTS.md with expanded SDD guidance
  - Updated AI-CHECKLIST.md with detailed workflows
  - Updated lessonslearned.md with critical lessons (mock validation, SDD success)
  - Product Requirements Document (PRD.md)

### Changed

- Enhanced documentation structure: root files for scaffolding, `/docs/planning/` for development docs
- Improved AI agent instructions with emphasis on contract immutability
- SEAMSLIST.md now tracks both tarot app and coordination server seams

### Fixed

- N/A (no bugs fixed yet - project still in initial development)

### Known Issues

**AI Coordination Server:**
- ⚠️ Minor TypeScript warnings (unused variables/imports - cosmetic only)
- ⚠️ Missing behavior tests for 4 mocks (Claude, Copilot, User, FileSystem)
- ⚠️ No MCP protocol tests
- ⚠️ No integration guides (Copilot, Claude)
- ⚠️ No deployment configuration
- ⚠️ Contract duplication (exists in both `/contracts/` and `/coordination-server/contracts/`)

**Tarot App:**
- ⚠️ TypeScript errors in mock services
- Contract tests not yet written for Tarot seams
- SEAMSLIST.md not fully updated with Tarot seam details
- UI components not yet built

### Next Steps

**Priority 1: Complete AI Coordination Server (Phase 5)**
1. Fix contract duplication (delete `/coordination-server/contracts/`)
2. Write missing mock behavior tests (4 mocks)
3. Write MCP protocol tests
4. Create integration guides (Copilot + Claude)
5. Create deployment configuration (Docker, .env.example)
6. Update all documentation

**Priority 2: Complete Tarot App**
1. Fix TypeScript errors in Tarot mock services
2. Write 7 contract tests for Tarot seams
3. Build UI components against validated mocks
4. Implement real Grok API services
5. Integration testing

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

[Unreleased]: https://github.com/Phazzie/TarotOutMyHeart/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Phazzie/TarotOutMyHeart/releases/tag/v0.0.1
