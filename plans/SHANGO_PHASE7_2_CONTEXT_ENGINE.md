# SHANGO Phase 7.2 — Context Engine

## Summary

Phase 7.2 introduces a lightweight Context Builder layer that prepares a compact, typed workspace context for generation requests without changing the UI, runtime ownership model, or backend contract shape.

## Current generation flow

1. The builder collects the active prompt and current project state.
2. The generation request is sent to the existing `/api/build` endpoint.
3. The request includes prompt metadata, model selection, active file, and optional workspace file payloads.
4. The backend returns a generation artifact plus optional file operations.
5. The runtime applies the generation result to Project.files and derives the preview artifact from that canonical workspace.

## Context Builder design

The new Context Builder lives in [src/lib/contextBuilder.ts](src/lib/contextBuilder.ts) and produces a structured `WorkspaceContext` object that is intentionally provider-agnostic.

### Responsibilities

- Classify files by usefulness relative to the active file and prompt.
- Prioritize a small, relevant set of files for generation context.
- Keep the selection strategy deterministic and lightweight.
- Preserve compatibility with the existing generation request contract.

## Context object schema

```ts
interface WorkspaceContext {
  activeFile?: string
  prompt: string
  relatedFiles: WorkspaceContextFile[]
  dependencyFiles: WorkspaceContextFile[]
  projectMetadata: {
    fileCount: number
    rootFiles: string[]
    hasPackageJson: boolean
    hasTsconfig: boolean
    hasStyles: boolean
    activeFileLanguage?: string
  }
  builderMode: 'plan' | 'build'
}
```

## Selection strategy

The initial implementation uses a conservative heuristic:

- High priority:
  - active file
  - root entry files
  - layout/routing files
  - app entry files
- Medium priority:
  - related utilities/styles/components
- Low priority:
  - unrelated assets and documentation

This phase does not introduce dependency graphing or semantic indexing.

## Compatibility

The Context Builder is additive:

- Existing generation requests still work.
- Existing UI and state flow remain unchanged.
- The request body now includes an optional `workspaceContext` object while preserving `fileContext` for backwards compatibility.

## Runtime changes

Modified runtime files:

- [src/lib/contextBuilder.ts](src/lib/contextBuilder.ts)
- [src/lib/generation.ts](src/lib/generation.ts)
- [src/__tests__/generation.test.ts](src/__tests__/generation.test.ts)

## Validation

Validation ran successfully:

- `pnpm vitest run src/__tests__/generation.test.ts`
- `npx tsc --noEmit`
- `pnpm build`

## Future expansion

This foundation is intentionally narrow. The next phase may expand the selector with richer heuristics, but this implementation keeps the contract stable and the runtime behavior conservative.
