# KNOWN_ISSUES

Purpose
-------
Track technical debt and known problems in one place. This document does not include future features.

Critical
--------

- ID: KI-001
  Title: No local git metadata available
  Description: The workspace is not in a git repository, so branch and commit metadata cannot be determined for the current milestone dashboard.
  Impact: Project status and branch tracking are incomplete.
  Temporary Workaround: Record branch and commit details manually outside the workspace.
  Proposed Solution: Initialize or connect to a git repository before handoff or implementation.
  Status: Open

High
----

- ID: KI-002
  Title: Provenance design not implemented
  Description: Provenance architecture is documented, but there is no runtime implementation or persistence layer to enforce auditability.
  Impact: Auditability, rollback traceability, and change attribution are not yet available.
  Temporary Workaround: Preserve provenance requirements in architecture documentation and defer implementation to the next phase.
  Proposed Solution: Implement provenance record creation, storage, and query support in the Antigravity pipeline.
  Status: Open

- ID: KI-003
  Title: Workspace ownership not enforced
  Description: The canonical workspace model is defined, but runtime enforcement of `Project.files` ownership and artifact derivation is not yet in place.
  Impact: The system could diverge from the intended ownership model if implementation is not careful.
  Temporary Workaround: Treat the project model as the source of truth and avoid architecture changes.
  Proposed Solution: Implement merge engine invariants and guardrails before broad AI-driven workspace writes.
  Status: Open

Medium
------

- ID: KI-004
  Title: Architecture-only context has no validation tests
  Description: The architectural documents are complete, but there are no supporting tests or validation artifacts for architecture compliance.
  Impact: It may be difficult to verify future implementation matches the documented design.
  Temporary Workaround: Use manual review and architectural audits during implementation.
  Proposed Solution: Create architecture compliance checks or component tests in the implementation phase.
  Status: Open

- ID: KI-005
  Title: Known issues document is manual
  Description: Issue tracking is currently maintained outside of a formal issue tracker.
  Impact: Risk of duplicate issues or missing updates.
  Temporary Workaround: Keep this document synchronized with team issue tracking.
  Proposed Solution: Sync KNOWN_ISSUES.md with the project issue tracker once implementation begins.
  Status: Open

Low
---

- ID: KI-006
  Title: Dashboard file names may change
  Description: The new dashboard documents are likely to be renamed or moved as implementation tracking matures.
  Impact: Minimal; documentation references may require updating.
  Temporary Workaround: Keep references in current milestone docs up to date.
  Proposed Solution: Confirm file naming conventions after the next phase begins.
  Status: Open