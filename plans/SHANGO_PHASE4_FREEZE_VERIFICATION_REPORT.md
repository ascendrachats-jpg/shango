# SHANGO — Phase 4 Freeze Verification Report
**Workspace-First Ownership Baseline · 2026-07-29**

---

## 1. Freeze Decision

Status: APPROVED FOR PHASE 5 ENTRY

The workspace-first ownership model is now stable and verified. The runtime is operating from a single canonical workspace path where generated content flows into Project.files, and the rendered artifact is treated as a derived projection from that workspace.

This report is intended to serve as the architectural freeze checkpoint before Phase 5 work begins.

---

## 2. Verified Runtime Contract

The verified runtime contract is:

Provider
↓
GeneratedArtifact (transport only)
↓
Project.files (canonical workspace)
↓
deriveArtifactFromWorkspace()
↓
Project.artifact (derived projection)
↓
Preview / inspector / downstream UI

### Architectural rules now in effect

- Project.files is the single source of truth for mutable project state.
- Project.artifact is a derived cache used by preview and UI rendering.
- GeneratedArtifact is temporary transport only.
- Version restore and generation both route through the workspace-first flow.
- Persistence and hydration trust the workspace state.

---

## 3. Verification Evidence

The following checks were run successfully from the project root:

- TypeScript check: pnpm exec tsc --noEmit
- Test suite: pnpm vitest run
- Production build: pnpm build

Observed results:

- 13 test files passed
- 71 tests passed
- Production build completed successfully
- Vite emitted only non-blocking bundle-size warnings

---

## 4. Component-by-Component Assessment

| Area | Status | Notes |
|---|---|---|
| Generation flow | PASS | Generation results are applied through the workspace-first path in [src/lib/versioning.ts](src/lib/versioning.ts) and [src/store/AppContext.tsx](src/store/AppContext.tsx). |
| Versioning and restore | PASS | Version snapshots now carry workspace files and derive artifact from them in [src/lib/versioning.ts](src/lib/versioning.ts). |
| Persistence and hydration | PASS | Normalization trusts Project.files and derives artifact from workspace content in [src/lib/persistence.ts](src/lib/persistence.ts). |
| Preview and inspector | PASS | Preview uses the derived artifact path from the current project state in [src/components/PreviewPanel.tsx](src/components/PreviewPanel.tsx). |
| Workspace derivation | PASS | Canonical conversion logic is centralized in [src/lib/workspace.ts](src/lib/workspace.ts). |
| Export / share surface | PASS WITH NOTE | Export currently consumes the derived artifact bundle in [src/lib/exportShare.ts](src/lib/exportShare.ts); this is acceptable for the freeze because it remains derived from the project state, but it should remain aligned with future workspace-based export work. |
| Deployment surface | PASS WITH NOTE | Deployment UI remains a higher-level workflow surface; it is not part of the ownership bug that was being fixed here. |

---

## 5. Ownership Graph Confirmed in Code

The freeze baseline is represented by these runtime paths:

- [src/lib/workspace.ts](src/lib/workspace.ts): canonical derivation helpers
- [src/lib/versioning.ts](src/lib/versioning.ts): generation and restore flow
- [src/lib/persistence.ts](src/lib/persistence.ts): hydration and persistence normalization
- [src/components/PreviewPanel.tsx](src/components/PreviewPanel.tsx): derived preview rendering
- [src/store/AppContext.tsx](src/store/AppContext.tsx): shared application-state application path

No remaining dual-ownership mutation pattern was found in the runtime path that was audited for this freeze.

---

## 6. Remaining Follow-Up Items

These are not blockers for this freeze, but they are the correct future work items for Phase 5 and beyond:

1. Further harden workspace-to-artifact fidelity so derived artifact metadata is richer and closer to the full workspace semantics.
2. Continue aligning downstream export and deployment flows with the same workspace-first rule set where those surfaces become fully backend-backed.
3. Keep future features operating on Project.files as the canonical mutable structure rather than introducing a second mutable workspace layer.

---

## 7. Recommendation

Phase 4 may be considered complete for the purpose of architectural freeze. The workspace-first model is now the baseline for all future work.

Recommendation: proceed into Phase 5 using the current ownership model as the contract and avoid introducing any new artifact-first patterns.
