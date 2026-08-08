# SHANGO — Phase 5.1 Workspace Generation
**Workspace-Centric Builder Loop · 2026-07-29**

---

## 1. Implementation Summary

Phase 5.1 focuses on the Builder Loop only and keeps the Phase 4 architecture intact.

The main change was to make generation update Project.files as the primary workspace output while keeping Project.artifact as a derived preview projection.

Previously, generation updates were effectively treating the incoming artifact as the main state carrier. The new flow now merges generated file content into the existing workspace so that:

- the AI can populate and update Project.files,
- existing files remain preserved unless the new generation explicitly changes them,
- preview and versioning continue to derive from the workspace state.

---

## 2. Modified Files

- [src/lib/workspace.ts](src/lib/workspace.ts)
  - added workspace merge logic for generated file updates
  - added lightweight metadata support for ProjectFile entries
- [src/lib/versioning.ts](src/lib/versioning.ts)
  - updated generation and versioning paths to use merged workspace files
- [src/store/AppContext.tsx](src/store/AppContext.tsx)
  - updated app-level generation application to preserve and merge workspace files
- [src/lib/store.ts](src/lib/store.ts)
  - extended ProjectFile with optional metadata fields for future workspace evolution
- [src/__tests__/versioning.test.ts](src/__tests__/versioning.test.ts)
  - added regression coverage for merging generated files into an existing workspace

---

## 3. New Runtime Ownership Flow

The Phase 5.1 runtime flow is now:

Provider
↓
GeneratedArtifact (transport only)
↓
Project.files (primary workspace state)
↓
Version
↓
Preview / Code Explorer (derived from workspace)

The key behavior is:

- generated files are merged into the existing workspace,
- unchanged files remain intact,
- Project.artifact is derived from Project.files for preview rendering.

---

## 4. Migration Notes

This change is intentionally narrow and does not introduce GitHub export, deployment, authentication, or collaboration flows.

The scope remains restricted to the Builder Loop:

- generation entry points,
- workspace update semantics,
- version snapshots,
- preview derivation.

No Phase 4 architectural contract was changed. The workspace-first model remains the baseline.

---

## 5. Validation Results

Validation was performed with the relevant test suites:

- pnpm vitest run src/__tests__/versioning.test.ts
- pnpm vitest run src/__tests__/generation.test.ts

Observed results:

- 15/15 versioning tests passed
- 18/18 generation tests passed

---

## 6. Recommendation for Follow-Up

The proposed ProjectFile specification is still valuable and should be formalized next as a small follow-up milestone. A stable schema for fields such as id, path, content, language, lastModified, and size will make future AI editing, versioning, export, deployment, and GitHub sync work much easier without another data-model migration.
