# SHANGO Phase 7.3 — Dependency Intelligence

## Overview

Phase 7.3 extends the Phase 7.2 Context Engine with a deterministic dependency analysis layer that makes workspace structure machine-readable without changing the UI or backend contract.

The goal is to expose a typed `WorkspaceDependencyGraph` alongside the existing `WorkspaceContext`, allowing future generation and planning logic to reason about project entry points, imports, style dependencies, and utility relationships.

## Design Goals

- Keep all existing runtime contracts intact.
- Preserve `Project.files` as the canonical workspace owner.
- Add a read-only dependency graph derived from file content.
- Make the analysis deterministic and lightweight.
- Avoid introducing resolver or bundler semantics.

## What changed

### New module
- `src/lib/dependencyGraph.ts`
  - Parses import/export specifiers from source files.
  - Resolves relative file references within `Project.files`.
  - Builds a graph model of nodes and edges.

### Updated context builder
- `src/lib/contextBuilder.ts`
  - Imports `createWorkspaceDependencyGraph()`.
  - Adds `dependencyGraph` to `WorkspaceContext`.
  - Uses graph edges to enrich `dependencyFiles`.
  - Includes dependency-related root files in `projectMetadata.rootFiles`.

### Generation integration
- `src/lib/generation.ts`
  - Continues to build `workspaceContext` on demand.
  - The new graph is additive and preserves `fileContext` compatibility.

## Dependency model

### `WorkspaceDependencyGraph`

- `nodes`: workspace files with metadata such as imports, importedBy, exports, entry-point status, utility status, and page status.
- `edges`: direct `import` or `styleImport` relationships between files.
- `entryPoints`: files considered application roots or route/page entry points.

### `WorkspaceDependencyNode`

- `path`: normalized file path.
- `language`: optional file language.
- `imports`: target paths imported by this file.
- `importedBy`: source paths importing this file.
- `exports`: export declarations found in the file.
- `isEntryPoint`: true for app/page roots and route files.
- `isUtility`: true for shared helper or lib files.
- `isPage`: true for page components.

## Validation

- `pnpm vitest run src/__tests__/generation.test.ts` ✅
- `npx tsc --noEmit` ✅
- `pnpm build` ✅

## Next steps

Phase 7.4 can use this graph to support:
- active-file dependency slices
- build-aware prompt prioritization
- page and route awareness in plan mode
- deterministic routing/preview hints
