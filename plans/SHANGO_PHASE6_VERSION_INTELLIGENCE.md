# SHANGO — Phase 6 Version Intelligence
**Workspace-Aware Version Snapshots · 2026-07-29**

---

## 1. Objective

Phase 6 moves Version History from artifact-centric snapshots toward a workspace-aware version model while preserving the current UI, restore behavior, and compatibility with existing saved projects.

The migration remains intentionally narrow and does not introduce Git, branching semantics, or a new collaboration backend. It establishes the smallest step that makes Project.files the authoritative source for version history.

---

## 2. Current Architecture

### Current version model

The current runtime creates version entries that carry:

- a derived artifact snapshot for preview and UI rendering,
- an optional workspace file snapshot,
- a label, prompt, timestamp, and current-state flag.

The versioning flow is implemented in [src/lib/versioning.ts](src/lib/versioning.ts), and the UI remains the existing Version History panel in [src/components/VersionHistoryPanel.tsx](src/components/VersionHistoryPanel.tsx).

### Architectural behavior today

- Generation creates versions through the workspace merge path.
- Restore uses version.files when present, otherwise falls back to the current project files.
- The Version History UI remains unchanged and continues to restore or fork versions through the same entry points.

---

## 3. Classification of Current Version Content

### Full project snapshot

- Not used as the primary version payload in the current implementation.
- This is the future extension point for richer branching and collaboration workflows.

### Artifact snapshot

- Still used as a compatibility layer and for render-time projection.
- It remains useful for preview and older saved projects.
- It should not be the authoritative source for version history.

### Workspace snapshot

- This is the authoritative version payload for Phase 6.
- Project.files now carries the mutable workspace state that versions should preserve.
- Restore and fork paths now prefer version.files when available.

### Diff opportunity

- The next natural evolution is to store lightweight workspace diffs instead of full file snapshots for each version.
- That is intentionally deferred to avoid changing the current UI and introducing a larger migration.

---

## 4. Proposed Version Model

### Minimal Phase 6 model

Each version should preserve:

- the version metadata (label, prompt, timestamp, current flag),
- the workspace snapshot in files,
- a derived artifact projection for compatibility and preview, and
- optional historical metadata for future intelligence work.

### Rule of ownership

- Project.files is authoritative for the version snapshot.
- Version.files is the stored workspace snapshot for that version.
- Version.artifact remains derived and compatibility-oriented.

### Why this is the smallest migration

This change preserves:

- the existing version UI,
- restore behavior,
- fork behavior,
- compatibility with older project data.

It also creates the right base for future branching, diff-based versioning, GitHub sync, and collaboration.

---

## 5. Migration Plan

### Step 1: Prefer workspace snapshots in version creation

Version creation continues to build from the current workspace state, but the version payload now treats files as the authoritative representation.

### Step 2: Restore from workspace snapshots first

Restore and fork now resolve from version.files first and only fall back to artifact-based compatibility when necessary.

### Step 3: Preserve artifact snapshots as derived compatibility data

Artifact data remains available on versions so older saved projects and preview-oriented consumers continue to work.

### Step 4: Keep UI unchanged

No Version History UI change was introduced. The panel still behaves the same from the user’s perspective.

---

## 6. Compatibility Strategy

Compatibility is preserved through a fallback path:

- if a version contains files, those are used,
- if not, the runtime derives a workspace snapshot from the version artifact,
- if that is unavailable, it falls back to the current project state.

This approach ensures that older saved projects continue to restore and fork correctly without requiring data migration.

---

## 7. Affected Runtime Files

- [src/lib/versioning.ts](src/lib/versioning.ts)
  - shifted restore and fork logic to prefer workspace snapshots,
  - added compatibility fallback from artifact-only versions,
  - preserved version metadata and derived artifact behavior.
- [src/lib/store.ts](src/lib/store.ts)
  - version shape already supports files and artifact, which is sufficient for this migration.
- [src/components/VersionHistoryPanel.tsx](src/components/VersionHistoryPanel.tsx)
  - no UI change required; existing interactions continue to work.
- [src/__tests__/versioning.test.ts](src/__tests__/versioning.test.ts)
  - added regression coverage for artifact-only compatibility restores.

---

## 8. Risks

- Legacy versions may only have artifact data and no workspace snapshot.
  - Mitigation: compatibility fallback derives files from the artifact.
- Future diff-based storage is not introduced yet.
  - Mitigation: the current model remains simple and additive.
- Version History UI may eventually need richer visualizations.
  - Mitigation: this phase keeps the UI stable and avoids premature redesign.

---

## 9. Validation

Validation was completed with the requested commands:

- npx tsc --noEmit
- pnpm vitest run
- pnpm build

Observed results:

- TypeScript completed successfully
- Vitest: 13/13 test files passed, 75/75 tests passed
- Production build completed successfully

---

## 10. Summary

Phase 6 establishes the smallest safe migration toward workspace-aware version intelligence:

- keep the existing Version History UI unchanged,
- make Project.files the authoritative source for version restore and fork behavior,
- preserve compatibility with older artifact-only versions,
- leave room for future diff-based and branching workflows.
