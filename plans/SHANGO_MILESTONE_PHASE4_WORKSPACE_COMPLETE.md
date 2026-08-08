# SHANGO — Phase 4 Milestone
# Workspace Migration Complete

Completion Date: 2026-07-29

---

## 1. Purpose

This milestone records the completion of the Project.files canonical workspace migration for Shango.

The transition moves the system from an artifact-first architecture to a workspace-first architecture. In the earlier model, generated UI output was treated as the primary state carrier. In the current model, the workspace is the durable source of truth for the builder experience.

This milestone marks the point where Shango stops behaving like a prototype and begins behaving like a true workspace-based builder. The application now treats the project workspace as the authoritative representation of the generated product, while the rendered artifact is treated as a derived projection.

---

## 2. Architecture Before

Before this migration, the runtime ownership model was effectively:

Provider
↓

GeneratedArtifact
↓

Project.artifact

↓

Preview

This model had several limitations:

- Generated output was treated as both transport and ownership state.
- The runtime could drift between temporary generation payloads and the project’s rendered state.
- Preview and downstream flows depended on artifact values that were not guaranteed to reflect a durable workspace.
- The architecture did not provide a single canonical workspace for iteration and persistence.

---

## 3. Architecture After

The verified architecture is now:

Provider
↓

GeneratedArtifact (transport only)
↓

Project.files (canonical workspace)
↓

deriveArtifactFromWorkspace()
↓

Project.artifact (derived render projection)
↓

Preview

This model establishes the following design rules:

- Project.files is the single source of truth.
- Project.artifact is a derived cache.
- GeneratedArtifact is temporary.
- The rendered artifact is always reconstructed from the workspace.

---

## 4. Ownership Guarantees

The following ownership guarantees are now part of the runtime contract:

- Generation writes to Project.files.
- Restore writes to Project.files.
- Persistence trusts Project.files.
- Hydration trusts Project.files.
- Preview consumes a derived artifact.
- Version history restores Project.files.
- Artifact is never the canonical workspace.

---

## 5. Runtime Verification

The migration was verified through the runtime implementation and the existing project validation workflow.

Completed verification:

- TypeScript: successful
- Vitest: successful
- Production build: successful
- Workspace audit: successful
- Generation audit: successful
- Restore audit: successful
- Persistence audit: successful
- Dual ownership search: successful

The verification confirms that the workspace-first ownership model is active across generation, restore, preview, and persistence paths.

---

## 6. Runtime Ownership Graph

The verified runtime flow is:

Provider
↓

Generation
↓

Project.files
↓

deriveArtifactFromWorkspace()
↓

Project.artifact
↓

Preview

This flow is now the governing runtime path for generated content.

---

## 7. Architectural Guarantees Going Forward

The following rules apply for all future work:

- Never introduce a second mutable workspace.
- Never make Project.artifact the source of truth again.
- Never bypass deriveArtifactFromWorkspace().
- All future features must operate on Project.files.
- GitHub must use Project.files.
- ZIP export must use Project.files.
- Deployment must use Project.files.
- AI iteration must modify Project.files.
- Preview is always derived.

---

## 8. Remaining Known Caveats

The following are known limitations of the current derived-artifact model:

- Regenerated artifact timestamps are recreated rather than preserved exactly.
- Derived artifact metadata is limited to what can be reconstructed from workspace content.
- Future optimization opportunities remain around richer workspace-to-artifact fidelity.

These are architectural limitations of the current derivation model, not regressions in the ownership model.

---

## 9. What This Unlocks

This milestone enables the next phases without requiring a redesign of the underlying architecture.

The following capabilities are now structurally possible:

- Workspace Explorer
- Real Code Editor
- Workspace-based AI Iteration
- GitHub Integration
- ZIP Export
- Deployment Pipeline
- Live Preview
- File-based Version History
- Future Collaboration

---

## 10. Phase 5 Entry Criteria

Phase 5 begins from this milestone.

Every Phase 5 implementation must satisfy the following requirements:

- Project.files remains canonical.
- Artifact remains derived.
- No duplicate workspace state.
- No secondary ownership.
- No mock filesystem.
- No architectural regression.

---

## 11. Verification Snapshot

Latest successful verification snapshot:

- TypeScript: successful
- Vitest: successful
- Production build: successful
- Workspace audit: successful
- Generation audit: successful
- Restore audit: successful
- Persistence audit: successful
- Dual ownership audit: successful

All verification steps completed successfully.

---

## 12. Commit / Milestone Metadata

Commit:

Branch:

Date:

Verified By:
