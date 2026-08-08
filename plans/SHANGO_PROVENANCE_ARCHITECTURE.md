# SHANGO_PROVENANCE_ARCHITECTURE

Purpose
-------
Design the permanent provenance system that allows Shango to explain, audit, reproduce, compare, and safely roll back AI-generated work. This is an architecture document only. It defines the provenance model, ownership boundaries, lifecycle, rollback philosophy, educational capabilities, and enterprise support. It does not introduce runtime code, persistence mechanisms, APIs, tests, or implementation.

Why Provenance Exists
---------------------
Provenance is the metadata trail that explains why a change exists and who is responsible for it. In Shango, provenance enables:

- Explainability
  - Answer questions like “Why does this line exist?” or “Which prompt introduced this function?”
- Rollback
  - Enable safe undo, selective undo, restore, and branching based on source attribution.
- Version History
  - Support version comparison by tracking not only workspace changes, but the reasons for those changes.
- Education
  - Help learners understand the connection between prompts, AI decisions, and project outcomes.
- Enterprise Auditing
  - Enable compliance and trust by logging provider, model, pipeline, and user metadata.
- Collaboration
  - Allow teams to trace changes across conversations, providers, and iterations.
- Analytics
  - Compare provider performance, evaluate which models introduced specific classes of changes, and measure AI-assisted productivity.

Provenance exists because Shango is not just a code generator. It is a reasoning system that must make every AI decision traceable and defensible.

The Provenance Model
--------------------
Every generation should eventually be traceable. Provenance is metadata attached to an AI generation, not a replacement for workspace ownership. It describes the path from prompt to project operation without owning `Project.files`.

### Core provenance concepts

- `Prompt` — the user’s original instruction.
- `BuildRequest` — the structured request sent to the backend.
- `Provider Response` — the raw output returned by the provider.
- `Parser Result` — the normalized interpretation of provider output.
- `Workspace Operation` — the canonical file change or diff applied to `Project.files`.
- `Provenance Record` — the metadata snapshot that links prompt, provider, pipeline, context, and applied operations.
- `Version Snapshot` — the resulting project version created after merge.

### Provenance fields

A provenance model should include, at minimum, the following fields:

- `projectId`
- `workspaceVersion` or workspace state reference
- `versionId` (when a version is created)
- `conversationId`
- `generationId`
- `promptId`
- `timestamp`
- `userId`
- `provider`
- `model`
- `modelVersion`
- `pipelineVersion`
- `contextVersion`
- `workspaceSnapshotReference` (hash or reference to the deterministic workspace state used)
- `generatedFileOperations`
- `diagnostics`
- `warnings`
- `buildStatus`
- `reasoningSummary` (optional, human-readable explanation)

### Documentation-only interface stub

```ts
interface ProvenanceReference {
  projectId: string
  workspaceHash: string
  workspaceVersion?: string
}

interface ProvenanceOperation {
  path: string
  operation: 'create' | 'modify' | 'delete'
  contentHash?: string
  language?: string
  reason?: string
}

interface ProvenanceRecord {
  provenanceId: string
  promptId: string
  generationId: string
  conversationId?: string
  userId?: string
  projectId: string
  timestamp: string
  provider: string
  model: string
  modelVersion?: string
  pipelineVersion: string
  contextVersion?: string
  workspaceReference: ProvenanceReference
  generatedOperations: ProvenanceOperation[]
  diagnostics?: Record<string, unknown>
  warnings?: string[]
  buildStatus: 'success' | 'partial' | 'error'
  reasoningSummary?: string
  source: 'provider' | 'pipeline' | 'user'
}
```

This interface is a contract for architecture only. It is not a runtime implementation.

Ownership
---------
Provenance must have clear owner boundaries. Each subsystem owns exactly one part of the provenance model:

- Provider
  - Owns provider metadata: `provider`, `model`, `modelVersion`, provider-specific diagnostics, raw provider response identity.
- Pipeline
  - Owns transformation metadata: `pipelineVersion`, `contextVersion`, parser classification, warning categories, operation normalization metadata.
- Workspace
  - Owns applied operations: the canonical `generatedFileOperations` that were merged into `Project.files`.
- Versioning
  - Owns historical references: `versionId`, `workspaceVersion`, `workspaceSnapshotReference`, and the creation of persistent version records.
- Persistence
  - Owns storage responsibility in implementation, not the provenance model itself. Persistence ensures provenance records are durably stored and retrievable.

No ownership should overlap. Provenance is the shared metadata contract between these owners.

Lifecycle
---------
Provenance is created, enriched, and finalized as the generation flow progresses. The lifecycle is:

1. Prompt
2. BuildRequest
3. Provider
4. Provider Response
5. Parser
6. Operation Normalizer
7. Workspace Merge
8. Version Snapshot
9. Provenance Record
10. Persistence

### Lifecycle flow

```text
User prompt
  ↓
BuildRequest
  ↓
Provider invocation
  ↓
Raw provider response
  ↓
Parser interpretation
  ↓
Normalized file operations
  ↓
Workspace merge (Project.files)
  ↓
Version snapshot creation
  ↓
Provenance record finalization
  ↓
Persistence layer (storage)
```

### Where provenance is created and enriched

- Prompt stage
  - capture `promptId`, raw prompt text, user, conversation context.
- Provider stage
  - capture `provider`, `model`, `modelVersion`, provider reliability, response metadata.
- Parser stage
  - capture parser classification, extracted diagnostics, reasoning summary, normalized parser output.
- Operation Normalizer stage
  - capture the final `generatedFileOperations`, any operation rewrite metadata, and validation warnings.
- Workspace Merge stage
  - capture the exact merge result, applied operations, and derived workspace reference.
- Version Snapshot stage
  - capture `versionId`, snapshot reference, and the linkage between provenance and version.
- Persistence stage
  - capture storage metadata and retrieval keys.

Rollback Philosophy
-------------------
Provenance enables rollback and selective restoration without guessing. The key principles are:

- Undo should be deterministic when the provenance record identifies exact operations.
- Selective undo should operate on a subset of provenance-attributed operations, not on open-ended AI intent.
- Restore should use version snapshots created after merge, with provenance as the explanation layer.
- Fork should create a new branch from a chosen provenance-linked snapshot.
- Replay should reconstruct the same sequence of operations from the provenance record when the underlying workspace snapshot is available.
- Comparison should use provenance metadata to distinguish changes by provider, model, prompt, or conversation.

### Deterministic vs user-confirmed

- Deterministic:
  - Re-applying the same operations to the same workspace snapshot.
  - Comparing two provenance records.
- User-confirmed:
  - Undoing a change when the workspace has diverged since the provenance record was created.
  - Selective undo across multiple provenance records with overlapping file paths.
  - Rolling back changes that depend on later unrelated edits.

Education & Transparency
------------------------
Provenance is a teaching and trust mechanism. It should make these capabilities possible:

- “Which model created this file?”
- “Which prompt introduced this function?”
- “What changed between these versions?”
- “Why was this file modified?”
- “Which conversation produced this result?”

These capabilities are conceptual requirements only. UI is not part of this document.

### Transparency features

- Link every version or file mutation back to a prompt, provider, model, and pipeline run.
- Make reasoning summaries available as metadata that can be surfaced by future UI.
- Preserve the raw provider response reference for auditing, even if the raw text is not shown in UI.
- Keep provenance records immutable once finalized.

Future Enterprise Support
-------------------------
Provenance enables enterprise-grade features:

- Compliance
  - Audit trails for who changed what, when, and why.
- Approval workflows
  - Review and approve provenance-linked changes before merge.
- Organization history
  - Track provider usage and model selection across teams.
- Team collaboration
  - Attribute changes to specific conversations and users.
- Policy enforcement
  - Enforce allowed providers, models, or prompt patterns in provenance metadata.
- Provider comparison
  - Compare results and reliability across providers and models.
- Usage analytics
  - Analyze which prompts, models, or skills produce the best outcomes.

Architecture Diagram
--------------------
```mermaid
flowchart LR
  User[User prompt]
  User --> Request[BuildRequest]
  Request --> Provider[Provider Adapter]
  Provider --> Raw[Raw Provider Response]
  Raw --> Parser[Parser / Response Classifier]
  Parser --> Normalizer[Operation Normalizer]
  Normalizer --> Workspace[Workspace Merge Engine]
  Workspace --> ProjectFiles[Project.files (canonical)]
  ProjectFiles --> Version[Version Snapshot]
  Version --> Provenance[Provenance Record]
  Provenance --> Storage[Persistence (durable storage)]

  subgraph Metadata[Provenance metadata]
    PromptMeta[Prompt ID / user / conversation]
    ProviderMeta[Provider / model / model version]
    PipelineMeta[Pipeline version / context version]
    Ops[Generated file operations]
    Diagnostics[Diagnostics / warnings]
  end

  Provider --> ProviderMeta
  Parser --> PipelineMeta
  Normalizer --> Ops
  Workspace --> PromptMeta
  Version --> Diagnostics
  Provenance --> Storage
```

Relationship to Existing Architecture
-------------------------------------
Provenance complements existing Shango systems; it does not replace ownership or change the canonical workspace model.

- Workspace ownership
  - `Project.files` remains canonical. Provenance is metadata about changes, not a workspace owner.
- Provider pipeline
  - Providers remain responsible for raw responses. The pipeline remains responsible for parsing and normalizing operations.
- Version intelligence
  - Provenance links version snapshots to their source prompts and operations.
- Context engine
  - Provenance records may reference the context version used for generation, but they do not compute context.
- Intelligence architecture
  - Provenance is an orthogonal metadata layer that documents AI decisions and traceability.

Provenance complements these systems by providing the audit trail that explains how their outputs were created.

Notes & Constraints
-------------------
- Do not implement persistence or storage in this document.
- Do not create runtime APIs.
- Do not change existing documents or code.
- Provenance is metadata only. It never owns the workspace, `Project.files` remains canonical, `Project.artifact` remains derived, and `GeneratedArtifact` remains transport-only.

Deliverable
-----------
- `SHANGO_PROVENANCE_ARCHITECTURE.md` is the standalone architecture blueprint for AI provenance in Shango.
- This document is ready for review and should be validated before any implementation begins.
