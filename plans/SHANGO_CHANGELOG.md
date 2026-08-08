# SHANGO CHANGELOG

All notable workspace changes are recorded here for audit and review. This file is append-only and designed to give builders a compact, verifiable trail of surgical slices applied to the codebase.

## 2026-08-01 — Slice 02: Shared ActivityStatus
- Summary: Introduced a single factual ActivityStatus model and unified all builder-facing status surfaces to consume it. Removed speculative timers, fabricated progress, and duplicate UI state machines. The BuilderScreen is the authoritative owner and updates ActivityStatus based on real events (request sent, assistant deltas, file events, rebuilds, commits, stops, failures).
- Files changed (high level):
  - added: src/lib/activityStatus.ts
  - added: src/components/ActivityStatusLine.tsx
  - modified: src/pages/BuilderScreen.tsx
  - modified: src/components/PreviewPanel.tsx
  - modified: src/components/ConversationPanel.tsx
  - modified: src/components/TopBar.tsx
  - modified: src/components/ActivityBox.tsx
  - modified: src/components/ConfidenceCard.tsx
  - modified: src/components/ActivityBox.tsx
  - modified: src/components/PreviewPanel.tsx
  - modified: src/components/ConversationPanel.tsx

- Rationale: Increase builder trust and clarity by ensuring every place the builder looks reports the same factual state. Avoid misleading progress metaphors and keep the UI calm and deterministic.

- Verification performed: pnpm typecheck; pnpm test; pnpm build — all green.

---

## 2026-08-02 — Slice 03: Provenance persistence through mergePersistedProjects
- Summary: Fixed a gap where `mergePersistedProjects` in persistence.ts dropped `lastGeneration` provenance when merging remote project snapshots into local state. The merge now preserves the last accepted AI change record (remote-wins with local fallback), satisfying the playbook invariant: "Persist provenance through all project API paths; do not drop it on backend serialization."
- Files changed:
  - modified: src/lib/persistence.ts
  - modified: src/__tests__/persistence.test.ts

- Rationale: Provenance attribution is a core trust invariant. Dropping `lastGeneration` during remote merge silently lost the audit trail for the most recent accepted generation, breaking rollback and attribution continuity.

- Verification performed: npx tsc --noEmit; npx vitest run; npx vite build — all green (147 tests, 21 files).

---

## 2026-08-02 — Slice 06: Revert confirmation dialog
- Summary: The per-file Revert button in the Context panel's Last Generation section now opens a confirmation dialog before undoing the change, preventing accidental reverts from a misclick. The dialog names the file and explains what will happen (created files removed, modified/deleted files restored).
- Files changed:
  - modified: src/components/ConversationPanel.tsx

- Rationale: The previous slice shipped revert buttons that fired immediately. A destructive, irreversible-by-default action should always gate behind a confirmation step. The existing `ConfirmationModal` component was reused — no new modal infrastructure needed.

- Verification performed: npx tsc --noEmit; npx vitest run; npm run build — all green (147 tests, 21 files).

---

## 2026-08-02 — Slice 05: Selective per-file revert from provenance inspector
- Summary: Builders can now revert individual file operations from the last AI generation directly from the Context panel's "Last Generation" section. Each applied file operation shows a "Revert" button. Clicking it undoes that single change — created files are removed, modified/deleted files are restored to their previous version's content — without reverting the entire version.
- Files changed:
  - modified: src/lib/versioning.ts — added `revertFileOperations(project, paths)` function
  - modified: src/components/ConversationPanel.tsx — added `onRevertOperation` prop chain and per-operation Revert buttons in `ProvenanceOperationList`
  - modified: src/pages/BuilderScreen.tsx — wired `revertFileOperations` to the `onRevertOperation` callback

- Rationale: The playbook's trust-layer roadmap calls for "selective revert for individual file operations" with "a sound deterministic merge design." The design uses the version snapshot model already in place: each `ProjectVersion` stores a complete file snapshot, so the previous version's snapshot is the deterministic source of truth for the "before" state. No fuzzy merge logic is needed — the operation type (`create`/`modify`/`delete`) determines the revert action deterministically.

- Verification performed: npx tsc --noEmit; npx vitest run; npm run build — all green (147 tests, 21 files).

---

## 2026-08-02 — Slice 04: Provenance inspector in Builder Context panel
- Summary: The Builder's Context tab now surfaces the project's `lastGeneration` provenance record — provider, model, mode, timestamp, original instruction, applied file operations, blocked operations, and applied skills — in a readable panel. This completes the trust-layer visibility loop: builders can review what the last AI change did and why, directly from the workspace.
- Files changed:
  - modified: src/components/ConversationPanel.tsx
  - modified: src/pages/BuilderScreen.tsx

- Rationale: The playbook's trust-layer roadmap calls for "a provenance inspector showing prompt, provider, model, accepted/blocked operations, and version relationship." Provenance was already stored on `Project.lastGeneration` and displayed per-version in History, but the Context panel — the builder's natural "what is this project" view — had no visibility into the most recent generation. This slice adds that surface without duplicating logic, reusing the existing `ProvenanceOperationList` and `ProvenanceSkillList` components.

- Verification performed: npx tsc --noEmit; npx vitest run; npm run build — all green (147 tests, 21 files).

---
