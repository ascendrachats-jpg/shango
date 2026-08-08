# SHANGO Phase 10 — Provider Pipeline

## Purpose

Phase 10 establishes a provider-agnostic compiler-style backend pipeline for Shango generation requests. The goal is to keep provider integration narrow, parse model output consistently, and preserve `Project.files` as the single canonical workspace source.

## Current status

- [x] Phase 10 documentation created
- [x] Provider Adapter stage implemented
- [x] Response Classifier stage implemented
- [x] Structured Parser stage implemented
- [x] Operation Normalizer stage implemented
- [ ] Workspace Merge layer preserved and validated
- [ ] Compatibility with Phase 4–9 invariants verified
- [ ] Tests added for each pipeline stage
- [ ] `npx tsc --noEmit`, `pnpm vitest run`, and `pnpm build` pass

## Completed layers

- Provider Adapter
  - Implements `invokeProviderAdapter(request: BuildRequest)`.
  - Only communicates with model providers.
  - Returns immutable `{ provider, rawResponse, metadata }`.
- Response Classifier
  - Implements `classifyProviderResponse(rawResponse: string)`.
  - Distinguishes `JSON`, `HTML`, `Markdown`, `PlainText`, `Unknown`.
  - No parsing or workspace logic.
- Structured Parser
  - Implements `parseProviderResponse(rawResponse: string)`.
  - Converts provider output into a unified parser result.
  - Produces `files`, optional `title`, `description`, `diagnostics`, `warnings`.
- Operation Normalizer
  - Implements `normalizeParserResult(parserResult, currentFiles)`.
  - Derives deterministic `create`, `modify`, and `delete` operations.
  - Prevents the provider from deciding workspace mutations.

## Architecture

The pipeline is designed as a sequence of immutable transforms:

```
BuildRequest
↓
Prompt Builder
↓
Provider Adapter
↓
Response Classifier
↓
Structured Parser
↓
Operation Normalizer
↓
Workspace Merge Engine
↓
deriveProjectArtifact()
↓
BuildResponse
```

## Principles

- Each stage exposes one public function.
- Stages do not mutate inputs.
- Providers only generate raw content.
- Parsers are provider-agnostic.
- Only the workspace merge layer mutates `Project.files`.
- `Project.artifact` remains derived from `Project.files`.
- `GeneratedArtifact` remains a transport object only.

## Progress

Phase 10 is being implemented incrementally, with documentation updated as each stage is completed.
