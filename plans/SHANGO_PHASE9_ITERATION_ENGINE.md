# SHANGO Phase 9 — Iteration Engine

## Purpose

Phase 9 establishes the Iteration Engine as the backend orchestration layer for structured AI-backed workspace generation. Its mission is to turn user intent into precise workspace mutations while preserving the existing Phase 7 architecture and ownership model.

This document defines the contract, responsibilities, and integration boundaries for Phase 9 without making any UI or architecture redesign decisions.

## Scope

Phase 9 covers:

- request classification and intent handling for build vs plan actions
- workspace-targeted generation using `Project.files` as the canonical source of truth
- provider prompt composition and provider selection through the backend router
- normalization of provider responses into explicit file operations
- workspace protection and safe merge semantics
- capture of version metadata and project history
- validation of generated output before it is applied

It does not cover:

- project CRUD persistence beyond build/version updates
- authentication flows
- deployment, sharing, or export delivery
- frontend UI changes to `BuilderScreen`, `PreviewPanel`, or `CodeEditor`

## Architecture Principles

### Canonical Ownership

The Phase 9 Iteration Engine preserves the existing ownership model:

- `Project.files` remains canonical.
- `GeneratedArtifact` remains transport-only.
- `Project.artifact` remains derived from `Project.files` for preview and render projection.
- The frontend may continue to use derived artifacts, but workspace state must always be persisted and merged from file changes.

### Backend Responsibility Boundary

The backend owns:

- `/api/build` request handling and response framing
- intent classification and provider routing
- safe application of workspace file operations
- version metadata and project-level snapshot semantics
- any provider fallback or adapter normalization

The frontend owns:

- prompt capture and model selector state
- active file context and enabled skills state
- rendering conversation messages, preview, version history, and code explorer
- applying received `BuildResponse` data to client state

### No Provider Keys in Frontend

All provider selection, normalization, and API keys remain backend-only. The frontend sends abstract model choices (`balanced`, `fast`, `powerful`), and the backend maps those to concrete provider IDs and variants.

## Iteration Engine Contract

### BuildRequest

Phase 9 expects `/api/build` to accept a complete, structured request:

- `projectId`
- `prompt`
- `mode: 'plan' | 'build'`
- `selectedModel: 'balanced' | 'fast' | 'powerful'`
- `activeFile?`
- `enabledSkills?`
- `projectContext?` (optional metadata and version history)
- `fileContext?` (optional current workspace snapshot)

The request may be enriched over time with file and project context, but the API contract must remain stable for the frontend.

### BuildResponse

The engine returns a structured response aligned with the Phase 8 pipeline contract:

- `requestId`
- `projectId`
- `mode`
- `status: 'success' | 'error' | 'partial'`
- `message` (assistant narrative)
- `build?: { files: FileChange[]; entryPoint: string; previewRoute?: string }`
- `consoleEvents?: ConsoleEvent[]`
- `version?: { label: string; prompt: string }`
- `error?`

`build.files` must express explicit file operations: `create`, `modify`, `delete`.

## Iteration Engine Responsibilities

### 1. Intent Classification

The engine must distinguish intent at the backend layer:

- `plan` mode should produce structured planning output and optional suggested model guidance.
- `build` mode should produce file-level workspace changes.
- `prompt` semantics may include active file or workspace-specific instructions.

Intent classification is not a frontend concern beyond `mode` selection.

### 2. Workspace Targeting

The engine must use workspace state to constrain generation:

- prefer file-scoped edits when `activeFile` is present
- preserve unchanged files
- avoid rewriting unrelated parts of the workspace
- if file context is available, it should be included in provider prompts as a snapshot of relevant files

This ensures the Iteration Engine operates as an editor/patcher, not as a full artifact generator.

### 3. Generation Strategy

The engine should produce one of two structured responses:

- `plan` mode: a narrative plan with steps and suggested complexity; no file operations required.
- `build` mode: explicit `FileChange[]` operations that merge cleanly into `Project.files`.

For `build` mode, the response should prefer:

- `modify` for existing file updates
- `create` for new files
- `delete` only when the intent clearly requires removal

### 4. Workspace Protection

The engine must protect the workspace from invalid or destructive updates:

- validate generated file operations before applying them
- reject malformed operations with a `status: 'error'`
- preserve file data when the provider output is ambiguous
- fallback to a partial response rather than silently corrupting `Project.files`

Validation should include:

- path normalization and sanitization
- required fields for create/modify operations
- content type and language consistency

### 5. Version Metadata

The engine must emit version metadata for every successful build operation:

- `version.label` should be user-visible and derived from the prompt or build summary
- `version.prompt` should capture the provenance of the change
- versions are snapshots of `Project.files`, not `Project.artifact`

This metadata enables the existing BuilderScreen version history and restore/fork flows.

### 6. Validation and Safety

Before responding to the frontend, Phase 9 must validate generated output and ensure the engine remains aligned with the current architecture:

- preserve `Project.files` semantics
- avoid introducing new UI contracts
- keep backend response shape compatible with existing generation application logic
- support future streaming without changing the core JSON contract

## Integration with Existing Documents

Phase 9 is grounded in the following source documents:

- `SHANGO_PROJECT_MODEL.md` — the canonical workspace ownership model
- `SHANGO_PHASE8_BACKEND_GENERATION_PIPELINE.md` — the backend generation pipeline contract
- `SHANGO_PHASE5_1_WORKSPACE_GENERATION.md` — workspace merge semantics and version ownership
- `SHANGO_MODEL_ROUTING_SPEC.md` — model routing and request/response contract
- `SHANGO_UI_BACKEND_WIRING_PLAN.md` — backend API boundaries and frontend wiring expectations

## Validation Criteria

Phase 9 is complete when the Iteration Engine satisfies:

- `/api/build` returns structured `BuildResponse` objects for both `plan` and `build`
- `build.files` contains explicit file operations that can be applied to `Project.files`
- workspace merge behavior preserves unchanged files and updates only intended targets
- version metadata is emitted and compatible with existing version history structures
- the frontend contract remains unchanged from Phase 8
- no provider API keys are exposed to the browser

## Notes

- This document is deliberately backend-focused.
- No implementation decisions should be made beyond preserving the contracts and architecture described here.
- If a later iteration introduces streaming, it must preserve the existing structured response contract as the baseline.
- Phase 9 does not alter the `Project.files` canonical ownership model already defined in Phase 5.1.
