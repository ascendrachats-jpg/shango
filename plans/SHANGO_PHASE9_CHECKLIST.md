# SHANGO Phase 9 Checklist

## Purpose

Establish the Intelligent Iteration Engine as the backend architecture for structured, workspace-targeted AI generation while preserving the current Phase 7 ownership model.

## Goals

- Formalize `/api/build` as the backend entrypoint for structured build requests
- Keep `Project.files` canonical and `Project.artifact` derived
- Route abstract frontend model selections through a backend provider adapter
- Normalize provider output into explicit file operations
- Emit version metadata and preserve project history
- Validate generated output before applying it to the workspace

## Implementation Boundaries

- Documentation-only architecture milestone
- No runtime code changes
- No frontend UI redesign
- No deployment, sharing, billing, collaboration, or GitHub sync work
- No semantic search, embeddings, or external intelligence features

## Files Involved

- `server/generationPipeline/routes.ts`
- `server/generationPipeline/adapter.ts`
- `server/generationPipeline/provider.ts`
- `server/generationPipeline/parser.ts`
- `server/generation.ts`
- `vite.config.ts`
- `src/lib/generation.ts`
- `src/lib/versioning.ts`
- `src/lib/workspace.ts`

## Validation Performed

- Confirmed architecture alignment with `SHANGO_PHASE8_BACKEND_GENERATION_PIPELINE.md`
- Confirmed `Phase 5.1 Workspace Generation` canonical ownership model remains valid
- Confirmed the backend contract is documented as structured `BuildResponse`
- Confirmed no UI or architecture changes are introduced beyond documentation

## Future Work — Phase 10: Workspace Intelligence

Focus on the next architectural milestone without implementation.

- smarter file selection
- dependency-aware editing
- project-wide reasoning
- higher quality iteration

Avoid introducing deployment, collaboration, billing, semantic search, embeddings, or GitHub synchronization in this phase.