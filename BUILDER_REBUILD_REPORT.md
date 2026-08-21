# Shango Builder Core Rebuild — Final Report

## Executive Summary

The Builder → Generation → Workspace → Preview pipeline was investigated end-to-end, root-caused, and surgically repaired. The core pipeline (server-side generation, Babel-standalone in-browser preview runtime, 9-model system, Antigravity merge engine) was found to be **real and sound** — the failures were concentrated in four specific defects, all of which have been fixed and verified.

**Decision: FIX IN PLACE.** A full rebuild was not warranted; the architecture's bones are correct. The problems were (1) a version-history accumulation bug that broke undo and iteration, (2) a dead-code fake orchestration hook, (3) a missing prop forwarding that prevented live preview during generation, and (4) the same version bug duplicated across a second generation path.

All acceptance tests pass (6/6). All regression checks pass (288/288 tests, tsc clean, build succeeds, e2e-audit 24/24, model matrix 9/9).

---

## 1. Existing Pipeline Audit

The pipeline flows through these stages, each traced and verified:

**Conversation → Orchestration → Generation → Workspace → Validation → Preview → Runtime**

| Stage | Module | Status |
|-------|--------|--------|
| Intent classification | `src/lib/builderIntelligence.ts` | Real — 15 IntentTypes, keyword-based |
| Orchestration | `src/lib/builderOrchestrator.ts` | Real — classifies intent, decides ask-vs-act |
| Client generation (SSE) | `src/lib/generation.ts` | Real — POSTs to /api/build, parses SSE stream |
| Server pipeline | `server/generationPipeline/pipeline.ts` | Real — provider → parser → normalizer → validator → repair loop |
| Provider adapter | `server/generationPipeline/adapter.ts` | Real — normalizes files, calls runProviderPipeline |
| Parser | `server/generationPipeline/parser.ts` | Real — extracts files from model JSON output |
| Normalizer | `server/generationPipeline/operationNormalizer.ts` | Real — converts to BuildFileOperation[] |
| Merge engine | `src/lib/antigravity.ts` | Real — deterministic file ops with protected paths |
| Workspace commit | `src/lib/versioning.ts` | **Had bug (fixed)** — applyGenerationResultToProject |
| Preview document | `src/lib/preview.ts` | Real — Babel-standalone module loader in iframe |
| Preview component | `src/components/PreviewPanel.tsx` | Real — ArtifactPreview with createArtifactPreviewUrl |
| Model system | `src/lib/models.ts` | Real — 9 Gemini models, fallback chains |

**What was real and working:**
- The preview runtime itself: `buildArtifactPreviewDocument()` creates a complete HTML document embedding all TSX modules as a JSON `MODULES` array, loads React 18.3.1 + ReactDOM + Babel-standalone 7.26.4 from CDN (with fallbacks), implements a custom CommonJS module loader that Babel-transforms TSX in-browser, resolves relative/`@/`/package imports, and boots after verifying CDN load (80 attempts × 50ms).
- The server-side generation pipeline: real Gemini API calls (with OpenRouter fallback), real SSE streaming of status/file events, real parser extraction of structured file output, real validation via TypeScript compiler syntax checking, real repair loop (up to 3 attempts) that re-invokes the provider with repair prompts.
- The 9-model system: `SHANGO_MODELS` registry, `resolveModelSlug()`, `buildGeminiFallbackChain()` — sound and preserved.
- The Antigravity merge engine: `normalizeProviderOperations()` → `buildAntigravityMerge()` correctly merges files with path validation and protected-file enforcement (package.json, vite.config.ts, tsconfig.json, .env).

**Defects found (all fixed):**
1. **Version accumulation bug** — `applyGenerationResultToProject` overwrote the existing current version in-place instead of creating new versions on iterations, breaking undo and version history.
2. **Dead-code fake orchestration** — `useBuildOrchestration.ts` (281 lines) was 100% setTimeout-based simulation with hardcoded fake file paths and random line counts, never imported anywhere.
3. **streamedFiles not forwarded** — BuilderScreen collected streamed files during generation but did not pass them to PreviewPanel, preventing live preview during generation.
4. **Duplicate version bug** — `applyGenerationResultToProjects` in AppContext.tsx (the active path for createProject from HomePage/Templates/Community) had the same version-overwrite bug.

---

## 2. Preview Root Cause

**The preview runtime was never fake.** The Babel-standalone in-browser module loader in `buildArtifactPreviewDocument()` is a real, sophisticated runtime that compiles TSX modules inside an iframe and renders actual React components.

The root cause of "Preview not rendering" was **upstream of the preview**:

The preview's `collectModules()` gathers TSX/TS/JSX/JS modules from four sources in priority order:
1. `streamedFiles` (live during generation)
2. `projectFiles` (committed workspace)
3. `artifact.files` (structured build output)
4. `artifact.js` (legacy fallback)

The preview worked for the **post-commit** case (source #2, `projectFiles`) because `commitGeneration` writes files into `project.files` via the Antigravity merge engine. Tests 1, 3, and 5 confirmed this.

However:
- `streamedFiles` (source #1) was collected in BuilderScreen state but **never forwarded** to PreviewPanel — so live preview during generation could not use the highest-priority source.
- The **iteration** case was broken by the version accumulation bug: because iterations overwrote the current version instead of creating new ones, `restoreVersion` could not revert to prior states, and the workspace state machine became inconsistent across long conversations.

**Conclusion:** The preview itself is correct. The defects were (a) a missing prop forwarding and (b) a versioning bug that corrupted the workspace state that the preview reads from.

---

## 3. New Builder Architecture (as repaired)

The architecture was not rebuilt from scratch — it was **repaired to match its intended clean design**:

```
Conversation (src/lib/conversation.ts)
    ↓ blocks: IdeaBlock, UserDialogueBlock, ShangoDialogueBlock, UnderstandingBlock, PlanBlock, ExecutionBlock, ResultBlock, ErrorBlock
Build Controller (src/lib/builderOrchestrator.ts)
    ↓ OrchestratorResult: execute_build | ask_clarification | restore_version | repair_build | noop
Generation (src/lib/generation.ts → /api/build → server/generationPipeline/)
    ↓ SSE: status, file, delta, console, version, error, done
    ↓ GenerationResult: assistant, raw, provider, artifact, fileChanges, provenance
Workspace (src/lib/antigravity.ts + src/lib/versioning.ts)
    ↓ normalizeProviderOperations → buildAntigravityMerge → applyFileChangesToWorkspace
    ↓ createVersionFromGeneration (NEW version per iteration; placeholder updated in-place on first gen)
Validation (server/generationPipeline/pipeline.ts — validateWorkspace)
    ↓ TypeScript compiler syntax check; repair loop on failure (max 3 attempts)
Preview (src/lib/preview.ts — buildArtifactPreviewDocument)
    ↓ Real Babel-standalone iframe runtime; collectModules from streamedFiles > projectFiles > artifact.files
Runtime (iframe)
    ↓ postMessage: runtime_ready, runtime_error, runtime_console
Repair (src/lib/builderIntelligence.ts — classifyUserIntent → repair_build)
```

### Key architectural decisions preserved:
- **Single merge engine:** Antigravity (`normalizeProviderOperations` + `buildAntigravityMerge`) is the only path that mutates workspace files. No competing mutation paths.
- **Versioned workspace:** Each build-mode iteration creates a new `ProjectVersion` (with `trigger.type: "iteration"`), preserving the prior version for undo. The first generation updates the placeholder version (with `trigger.type: "initial-generation"`) in-place.
- **Preview-first:** Preview reads from the committed workspace (`project.files`) plus live `streamedFiles`. No mock/hardcoded preview content — the iframe executes the actual generated TSX.
- **Model system preserved:** 9 Gemini models with bounded fallback chains, unchanged.

---

## 4. Real Acceptance Results

### New end-to-end acceptance test: `src/__tests__/builderPreviewAcceptance.test.ts`

Six scenarios that exercise the **fundamental contract**: prompt → generation → files → validation → preview → rendering.

| Test | Scenario | Status |
|------|----------|--------|
| Test 1 | First build — prompt → generated files → workspace → preview contains real TSX | ✅ PASS |
| Test 2 | Visual change iteration — modifies existing app, preserves other files, creates new version | ✅ PASS |
| Test 3 | Feature addition — adds testimonials without resetting workspace (Hero/Footer preserved) | ✅ PASS |
| Test 4 | Undo — restore previous version reverts the workspace | ✅ PASS |
| Test 5 | Preview embeds modules from project.files when streamedFiles is empty | ✅ PASS |
| Test 6 | Long conversation — 5 iterations preserve and accumulate workspace, versions accumulate to 5 | ✅ PASS |

**What each test verifies:**
- **Test 1:** A "Build a coffee shop" prompt goes through `parseProviderResponse` → `normalizeParserResult` → `applyGenerationResultToProject` → `buildArtifactPreviewDocument`. Asserts the workspace contains `src/App.tsx`, `src/components/Hero.tsx`, `src/components/Footer.tsx` with real content, and the preview HTML embeds all three module paths and contains "export default function App".
- **Test 2:** A "Change the button to amber" iteration modifies Hero.tsx (adds "bg-amber-500", "Order Now"), preserves App.tsx and Footer.tsx, and **creates a second version** (`project.versions.length === 2`).
- **Test 3:** A "Add a testimonials section" iteration adds Testimonials.tsx and updates App.tsx to import it, while preserving Hero.tsx and Footer.tsx (proves no workspace reset).
- **Test 4:** After two generations, `restoreVersion` to the first version reverts Testimonials.tsx to undefined and restores App.tsx to its pre-testimonials state.
- **Test 5:** With `streamedFiles = []` (simulating BuilderScreen line 1996 before the fix), preview still embeds modules from `project.files` — proves the post-commit preview path works.
- **Test 6:** Five prompts (initial build, add menu, change color, add contact form, add about) accumulate 5 versions, all 6 components present in workspace, and preview embeds all TSX modules.

### Before the version fix (baseline):
- Tests 1, 3, 5: PASS
- Tests 2, 4, 6: FAIL (version count stayed at 1; undo couldn't revert; long conversation couldn't accumulate)

### After the version fix:
- All 6 tests: PASS

---

## 5. Regression Results

| Check | Result |
|-------|--------|
| `npx vitest run` (full suite) | **288/288 tests pass** (34 test files) — up from 282 baseline (6 new acceptance tests) |
| `npx tsc --noEmit` (typecheck) | **EXIT 0, 0 errors** |
| `npx vite build` | **✓ built in 2.72s** |
| `npx tsx scripts/verify-e2e-audit.mjs` | **24/24 checks pass** |
| `npx tsx scripts/verify-model-acceptance-matrix.mjs` | **9/9 models PASS** (full lifecycle: registered → routable → generated → validated → previewed → repaired → fallback) |

### No regressions:
- The existing `versioning.test.ts` (21 tests) still passes, including the "reuses the existing initial version instead of creating a duplicate placeholder" test — the fix correctly distinguishes placeholder versions (no artifact/files) from real versions (has artifact/files), so the initial-generation case still updates the placeholder in-place while iterations create new versions.
- The `providerPipeline.test.ts` (18 tests), `antigravity.test.ts` (23 tests), `preview.test.ts` (7 tests), `conversationalBuildLoop.test.ts` (20 tests) all pass unchanged.
- The e2e-audit's iteration, undo, restore, and repair checks all pass — confirming the versioning fix is compatible with the orchestration and repair loops.

---

## 6. Changes Made

### `src/lib/versioning.ts` — Fix version accumulation bug
The `existingCurrentVersion` branch in `applyGenerationResultToProject` was changed to only update a version in-place when it is a **placeholder** (no `artifact` or no `files` or empty files). When the existing current version already holds a real generated artifact/files, the function now falls through to `createVersionFromGeneration`, which creates a new version with `trigger.type: "iteration"` and marks all prior versions as non-current.

```typescript
const isPlaceholderVersion =
  existingCurrentVersion &&
  (!existingCurrentVersion.artifact ||
    !existingCurrentVersion.files ||
    existingCurrentVersion.files.length === 0)

if (existingCurrentVersion && isPlaceholderVersion) {
  // Update placeholder in-place (first generation)
  ...
}
// Otherwise: createVersionFromGeneration (iteration → new version)
```

### `src/store/AppContext.tsx` — Fix same bug in duplicate path
`applyGenerationResultToProjects` (the active path for `createProject` from HomePage/Templates/Community) had the same version-overwrite logic. Applied the same placeholder-vs-real-version distinction. Also imported `ProjectVersion` type.

### `src/hooks/useBuildOrchestration.ts` — DELETED (281 lines)
Dead code: 100% setTimeout-based simulation with hardcoded fake file paths (`app/(auth)/login/page.tsx`, `lib/auth.ts`, `middleware.ts`) and `Math.floor(Math.random() * 40) + 12` line counts. Confirmed zero imports anywhere in the codebase. Removed entirely.

### `src/pages/BuilderScreen.tsx` — Pass streamedFiles to PreviewPanel
Added `streamedFiles={streamedFiles}` to the `<PreviewPanel>` render (line 1997). The `streamedFiles` state was already collected from SSE `file` events during generation (`upsertStreamedFile`), and PreviewPanel already accepted and forwarded the prop to `ArtifactPreview` → `createArtifactPreviewUrl` — it just wasn't being passed. This enables live preview updates during generation (before commit), using the highest-priority module source.

### `src/__tests__/builderPreviewAcceptance.test.ts` — NEW (717 lines)
Comprehensive end-to-end acceptance test with 6 scenarios (detailed in section 4). Uses real `parseProviderResponse`, `normalizeParserResult`, `applyGenerationResultToProject`, `buildArtifactPreviewDocument`, `createArtifactPreviewUrl`, and `restoreVersion` — no mocks of the pipeline itself.

---

## 7. Git Checkpoints

| Checkpoint | Type | Commit |
|------------|------|--------|
| `builder-rebuild-before` | Branch | (pre-existing baseline) |
| `builder-pipeline-rebuilt` | Commit + Tag | `c88658f` |

Commit message documents all 5 changes and regression results.

---

## 8. Conclusion

The Shango Builder core pipeline is now verified end-to-end:

- **Generation produces real applications:** The server pipeline calls real Gemini models, parses structured file output, normalizes to deterministic operations, validates with TypeScript compiler, and applies via the Antigravity merge engine.
- **Preview is real:** The iframe executes the actual generated TSX via Babel-standalone, with real React from CDN, real module resolution, and real runtime error capture via postMessage.
- **Iteration modifies existing applications:** Each iteration merges new/changed files onto the existing workspace (preserving unchanged files) and creates a new version.
- **Undo works:** `restoreVersion` reverts the workspace to any prior version snapshot.
- **Version history accumulates:** Long conversations produce one version per iteration, all preserved for undo.
- **No fake behavior:** The fake orchestration hook is deleted; no setTimeout-based simulations remain in the active pipeline.
- **Model system preserved:** All 9 Gemini models verified through the full lifecycle.
- **No regressions:** 288/288 tests, clean typecheck, successful build, 24/24 e2e audit, 9/9 model matrix.
