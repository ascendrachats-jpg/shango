# SHANGO_PHASE8_BACKEND_GENERATION_PIPELINE

## Current backend flow

- Frontend sends a build request to `/api/build`.
- Dev backend ignores workspace context and file context.
- Backend forwards the prompt to the provider.
- Provider returns raw assistant text.
- Frontend parses the text into a fallback artifact or file operations.

## New backend flow

- Frontend sends a complete `BuildRequest` including:
  - `prompt`
  - `mode`
  - `selectedModel`
  - `activeFile`
  - `workspaceContext`
  - `fileContext`
- Backend builds a provider prompt that includes workspace state.
- Backend calls the provider adapter.
- Backend parses provider output into a structured `BuildResponse`.
- Backend emits explicit file operations.
- Frontend applies file operations and derives the preview artifact.

## Provider adapter

The backend now isolates provider interaction behind a provider adapter.

Responsibilities:

- normalize model selection
- include `prompt`, `workspaceContext`, `fileContext`, `mode`, and `activeFile`
- call the existing provider layer (`generateWithProvider`)
- return a normalized provider response to the parser

## Parser

The parser converts provider output into a structured backend contract.

It supports:

- JSON artifact payloads with `html`, `css`, `js`, `title`, `description`
- plain HTML or markup output
- fallback text output

The parser produces explicit file operations:

- `create`
- `modify`
- `delete`

The existing workspace merge functions remain responsible for applying those operations.

## GenerationResult contract

The backend returns a `BuildResponse` with:

- `response`: raw provider text
- `provider`: provider ID
- `message`: assistant content
- `build.files`: explicit file operations
- `diagnostics`: optional metadata

This keeps the frontend contract backward-compatible while removing the text-proxy behavior.

## Request flow

1. `/api/build` receives a POST request.
2. Request body is parsed into `BuildRequest`.
3. `generateBuildResponse()` builds a provider prompt.
4. Provider receives the prompt and returns raw text.
5. Parser converts that text into file operations.
6. Response is returned as JSON.

## Response flow

1. Frontend receives JSON from `/api/build`.
2. Existing generation parsing extracts `build.files` into `fileChanges`.
3. `applyGenerationResultToProject()` applies the file operations.
4. The workspace is merged and `Project.artifact` is derived.
5. Preview renders the updated generated project.

## Compatibility

- `Project.files` remains canonical.
- `Project.artifact` remains derived.
- `GeneratedArtifact` remains transport-only.
- No UI contract changes were made.
- Existing provider implementations are preserved.

## Future streaming

The backend still supports structured responses.

Streaming can be added later by emitting SSE events with the same `build.files` contract.

## Validation

- `npx tsc --noEmit`
- `pnpm vitest run`
- `pnpm build`
- Manual verification of build request contents and generated file operations
