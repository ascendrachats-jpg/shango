# SHANGO — Phase 5.3 Workspace Consumers
**Live Workspace Consumers · 2026-07-29**

---

## 1. Objective

Phase 5.3 removes the remaining runtime dependence on Project.artifact for the live builder UI consumers that should read from Project.files as the canonical workspace source.

The change remains intentionally narrow and does not alter the completed Phase 4 or Phase 5 architecture.

---

## 2. Runtime Ownership Graph

```text
Provider
  → GeneratedArtifact (transport only)
  → Project.files (canonical workspace)
  → deriveProjectArtifact()
  → Project.artifact (derived projection for preview/rendering)
  → Preview / inspector / downstream UI
```

### Ownership rule now enforced

- Project.files is the canonical mutable workspace.
- Project.artifact remains a derived projection used for preview rendering and compatibility.
- Live consumers that edit or inspect workspace contents should read Project.files.
- Preview continues to use a derived artifact built from Project.files.

---

## 3. Updated Consumers

### 3.1 Code Explorer / File Inspector

- Updated consumer: [src/components/PreviewPanel.tsx](src/components/PreviewPanel.tsx)
- Behavior: the inspector now resolves file contents from Project.files first.
- Classification: Should consume Project.files

### 3.2 Preview

- Updated consumer: [src/components/PreviewPanel.tsx](src/components/PreviewPanel.tsx)
- Behavior: preview URL and preview document generation continue to use the derived artifact path.
- Classification: Should consume derived Project.artifact

### 3.3 Compatibility fallback

- Added in: [src/lib/preview.ts](src/lib/preview.ts)
- Behavior: if no Project.files are present, the inspector falls back to artifact-based helpers for backwards compatibility.
- Classification: Temporary compatibility layer

---

## 4. Compatibility Layer

A lightweight compatibility layer remains in place so older project state and tests continue to work when Project.files is absent.

This is implemented in [src/lib/preview.ts](src/lib/preview.ts) through:

- buildInspectorFilesFromProject(project, streamedFiles)
- buildInspectorFilesFromArtifact(artifact, projectName, streamedFiles)

This preserves compatibility with existing persisted and test data while steering live consumers toward the workspace-first path.

---

## 5. Modified Files

- [src/lib/preview.ts](src/lib/preview.ts)
  - added workspace-first inspector resolution helpers
  - preserved artifact fallback for compatibility
- [src/components/PreviewPanel.tsx](src/components/PreviewPanel.tsx)
  - switched the live inspector UI to read from Project.files first
- [src/__tests__/preview.test.ts](src/__tests__/preview.test.ts)
  - added regression coverage for workspace-backed inspector consumption

---

## 6. Validation

Validation was performed with the requested commands:

- npx tsc --noEmit
- pnpm vitest run
- pnpm build

Observed results:

- TypeScript completed successfully
- Vitest: 13/13 test files passed, 74/74 tests passed
- Production build completed successfully

---

## 7. Remaining Technical Debt

- The broader UI still contains some artifact-centric helpers and tests; these remain compatible but are not yet fully migrated.
- Future work can continue to push more inspection and export surfaces to read directly from Project.files.
- The current change is intentionally minimal and focused on the live workspace consumer boundary.
