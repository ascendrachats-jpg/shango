# SHANGO_INTELLIGENCE_ARCHITECTURE

Purpose
-------
Describe the architecture and boundaries for Shango's Workspace Intelligence layer. This document is an architecture blueprint only — no implementation changes should be made from this doc. It explains what the system knows, what it computes deterministically, what is reserved for AI, safety guardrails, and a roadmap for future intelligence capabilities.

Core Philosophy
--------------
- Principle: If a fact can be computed deterministically, Shango computes it. If a decision requires creativity or judgment, Shango asks the model.
- Ownership:
  - Shango owns the workspace, normalization, and interpretation of provider output.
  - Providers only describe changes (BuildResponse -> file operations). Providers do not own artifacts or project state.
- Determinism-first: prefer deterministic, verifiable computations for project facts; reserve AI for higher-level reasoning and suggestions.

Knowledge Model (what Shango should KNOW)
-----------------------------------------
Shango's knowledge model is a set of cached, queryable facts about the project. Each fact must be defined with a deterministic computation or an explicit provenance when produced by AI.

- Workspace
  - File list, file contents, languages, timestamps
  - Project roots, ignored/glob patterns
- Files
  - Path, content, language, size, last modified
  - Parsed AST or lightweight parse tree (per-language adapters)
- Imports / Exports
  - Import graph per file (resolved specifier -> file)
  - Export lists per module (named, default, types)
- Components / Symbols
  - Component definitions (name, props, location)
  - Function and class symbols with signatures
- Routes and Entry Points
  - Routing table, known page entry files
- Dependencies & Build Config
  - Package.json dependencies, lockfile mappings, build scripts
- Assets
  - Static assets, referenced files, asset sizes
- Version History & Metadata
  - Project versions, versions' artifacts, timestamps, messages
- Conversation & Prompt History
  - Recent prompts and assistant responses, with timestamps and IDs
- Derived Metrics
  - Project size, codeowners, test counts, basic cyclomatic metrics

Deterministic Intelligence (what Shango COMPUTES deterministically)
-------------------------------------------------------------------
Shango should compute the following facts without asking an LLM. These computations must be reproducible, fast, and auditable.

- Dependency Graph
  - Resolve import specifiers to workspace files where possible
  - Map package imports to lockfile/resolved package names
- Import / Export Graph
  - Per-file import list, per-file export list, and symbol-level mapping when parsers support it
- Affected Files (Change Impact)
  - Given a set of changed files or a proposed change, compute the transitive set of affected files via dependency graph
- Minimal Context Selection
  - Compute minimal set of files to include in a request for a given edit (primary file + related files)
- File Diffs & Workspace Diff
  - Normalize operations to create/modify/delete and compute minimal patch set
- Workspace Validation
  - Deterministic checks: lint rules (configured), missing imports, parse errors, build script sanity
- Context Ranking Heuristics
  - Score files for inclusion by recency, size, import proximity, and test coverage
- Version Metadata and Provenance
  - Deterministically compute derived artifacts via `deriveProjectArtifact()` from canonical `Project.files`

AI-Only Decisions (what ONLY AI should decide)
-----------------------------------------------
Shango should reserve creative, ambiguous, or intention-driven decisions for AI. Examples:
- Exact code generation or refactoring content
- Naming suggestions where subjective judgement is required
- High-level architecture recommendations and trade-offs
- Prioritization when multiple valid edits exist and there is no deterministic tie-breaker
- Natural-language explanations and teaching-oriented guidance

Workspace Intelligence (how Shango identifies related scope)
------------------------------------------------------------
This section defines *architectural* rules for selecting context and reasoning about impact. Implementation details (parsers, indices) are out of scope here; describe capabilities and interfaces only.

- Primary File
  - Definition: the file the user directly edits or cites in the prompt. May be identified by active editor, prompt reference, or explicit selection.
- Related Files
  - Closest imports/exports reachable within N hops (configurable default: 2)
  - Files that reference or are referenced by the primary file (both directions)
  - Tests and storybook entries associated with primary file via naming conventions or import graph
- Dependency Chain
  - Transitive closure of imports from the primary file up to a depth or until encountering a boundary (external package or entrypoint)
- Affected Workspace
  - The set of files expected to change as consequence of applying proposed operations; used for preflight impact analysis
- Minimal Context (goal)
  - Smallest set of files that provides sufficient deterministic compilation context for a safe edit (primary file + immediate imports + build config + types)
- Maximum Safe Context
  - Larger, but bounded set (e.g., primary file + dependency closure to entry points + related tests); safe to include in more expensive analysis or offline reasoning
- Future Graphs
  - Support for speculative graphs (e.g., if we refactor Component A to B, what files will change?). These should be produced by the Intelligence layer using deterministic graph traversal + optional AI suggestion for naming/placements.

Context Selection Interface (architectural contract)
- Input: primary file path, user intent tags (e.g., 'theme', 'api', 'refactor'), optional depth limits
- Output: ordered list of files, reason for inclusion, heuristics score
- Guarantees: deterministic for identical inputs and project state; must include provenance for AI-included heuristics

Workspace Safety Rules (permanent guardrails)
---------------------------------------------
- Never overwrite unrelated files. Every proposed change must include an explicit `operation` and a source of truth for why it was selected.
- Never apply broad workspace rewrites without explicit user consent.
- Never delete files without explicit user confirmation and clear provenance.
- Always normalize provider-suggested operations into canonical `BuildFileOperation[]` before merging.
- Validate provider operations against deterministic rules (e.g., no modifications outside project root unless explicitly allowed).
- Keep the merge engine as the single canonical workspace mutation point (`mergeWorkspaceFilesWithArtifact()`).
- Record provenance for every change: source (provider id / user / local tool), timestamp, resolved minimal context.
- Rate-limit or sandbox any AI-driven code execution or build verification; require human confirmation for destructive operations.

Context Engine Evolution (phased)
---------------------------------
Phase 0 — Baseline
- Current: lightweight workspace context derived from `Project.files` and a file list passed as `currentFiles`.

Phase 1 — Deterministic Graphs
- Build import and dependency graphs using language-specific lightweight parsers.
- Expose an API for `getDependencyGraph()` and `getAffectedFiles(changes)`.

Phase 2 — Symbol Index
- Add symbol extraction (components, functions, classes, types) where language adapters exist.
- Provide `findSymbol(name)` and `listSymbols(file)` deterministic queries.

Phase 3 — Context Scoring & Selection
- Implement deterministic scoring heuristics for minimal context selection.
- Integrate user/session signals (recent edits, active file) without invoking AI.

Phase 4 — Assisted Reasoning
- Use AI only to rank ambiguous choices, suggest names, or propose non-deterministic refactorings.
- Always provide deterministic justification (graph traversal, import counts) alongside AI suggestions.

Phase 5 — Semantic Index & Embeddings (optional future)
- Non-deterministic: embeddings and semantic search, with privacy and cost controls; clearly separate from deterministic facts.

Provider Philosophy
-------------------
- Providers: interchangeable execution engines that return textual or structured build responses.
- SHANGO responsibility:
  - Interpret provider output into `BuildFileOperation[]` and/or structured artifacts.
  - Normalize and validate operations before merging.
  - Own workspace state and derived artifacts.
- Provider scope: suggest content; never mutate canonical project state directly.

Future Intelligence Roadmap (milestones)
----------------------------------------
- Workspace Intelligence (this document's top priority): deterministic graphs, context selection, impact analysis.
- Dependency Intelligence: package-level reasoning, upgrade suggestions, and pinning recommendations.
- Symbol Intelligence: symbol indexing, cross-file refactoring assistance, rename propagation detection.
- Change Impact & Risk Scoring: estimate test impact and risk before applying changes.
- Project Graph & Visualization: visual tools for dependencies and impact.
- Semantic Search & Embeddings: optional, cost-managed semantic search over code and docs.
- Build Verification & Test Harness: automated deterministic test selection for changed files.
- Self-Healing (far future): detect regressions and propose rollbacks or fixes.

Architecture Diagram
--------------------
```mermaid
flowchart LR
  Provider[Provider]
  Provider -->|BuildResponse (files)| ShangoPipeline[Shango Pipeline]
  ShangoPipeline -->|file ops| GenerationResult[GenerationResult.fileChanges]
  GenerationResult -->|merge| MergeEngine[mergeWorkspaceFilesWithArtifact()]
  MergeEngine --> ProjectFiles[Project.files (canonical)]
  ProjectFiles -->|derive| DerivedArtifact[deriveProjectArtifact()]
  DerivedArtifact --> Preview[Preview / Inspector]

  subgraph IntelligenceLayer[Workspace Intelligence]
    DG[Dependency Graph]
    SI[Symbol Index]
    CE[Context Engine]
    IA[Impact Analysis]
  end

  CE --> ShangoPipeline
  DG --> CE
  SI --> CE
  IA --> CE
  CE -->|context| Provider
```

Relationship to existing phases
--------------------------------
- Phase4–9 preservation: this document respects Phase4–9 invariants: `Project.files` remains canonical; `Project.artifact` is derived; `GeneratedArtifact` remains transport-only.
- Phase10: pipeline remains the source that describes file operations; Workspace Intelligence consumes these operations and the deterministic graphs to make decisions.

Deliverables & Validation
-------------------------
- Deliverable: `SHANGO_INTELLIGENCE_ARCHITECTURE.md` (this file)
- Validation: documentation only — no runtime change, no tests, no build changes.

Next steps (suggested)
----------------------
- Review and iterate on this document with stakeholders.
- Identify language adapters and parser work required for Phase 1.
- Define the minimal API surface for the Context Engine (`getDependencyGraph`, `getAffectedFiles`, `selectContext`).

--------------------------------------------------------------------------------
Expanded Sections
--------------------------------------------------------------------------------

1) Knowledge Model (detailed)
--------------------------------
- Workspace Surface:
  - `Project.files`: canonical file list (path, content, language, timestamps).
  - Project roots, ignore globs, monorepo boundaries.
- File Artifacts:
  - File metadata: size, encoding, hash, lastModified.
  - Parsable representation (AST or lightweight parse tokens) when supported.
- Module & Dependency Facts:
  - Static import specifiers and resolved file targets (when resolvable deterministically).
  - Package imports resolved to lockfile entries where available.
- Symbols & Components:
  - Extracted symbols per file: functions, classes, types, React components, exported names.
  - Metadata: signature (params/returns), prop-types or TS types, location.
- Routes & Entry Points:
  - Known app routes and their entry files; SPA routers and framework conventions.
- Build & Tooling:
  - `package.json` scripts, build targets, configured linters and test runners.
- Version & Conversation History:
  - Project versions, messages, prompts, and provider metadata (IDs, timestamps).

Each knowledge item must declare provenance: deterministic (parser/graph) or AI-derived (with model ID and prompt snapshot).

2) Deterministic Intelligence (expanded)
---------------------------------------
Shango computes these deterministically and caches results where appropriate:

- Dependency Graph Construction
  - Parse import/export relationships using language adapters.
  - Normalize specifiers (relative, aliased) against project resolution rules.
- Import/Export Indices
  - Per-file exports and resolved imports, enabling fast reverse-lookup of dependents.
- Affected Files Calculation
  - Given X changed files, return transitive dependents and upstream usages.
- Minimal Context Selection
  - Heuristics to compute minimal safe context: primary file + immediate imports + package typings + build config.
- Deterministic Validation
  - Lint errors, parse errors, missing modules, broken type references — reportable without AI.
- Provenance & Reproducibility
  - Deterministic outputs must be replayable given identical workspace input and adapter versions.

3) AI Intelligence (expanded)
-----------------------------
AI is reserved for non-deterministic, value-laden, or creative decisions. Examples:

- Code Generation & Refactoring
  - Produce code patches (create/modify) using prompts that include deterministic context.
- Naming, API Shape, and UX Decisions
  - Propose names, folder placements, and UX flows when multiple valid options exist.
- Trade-off Reasoning
  - Evaluate architectural trade-offs (e.g., monolith vs modularization) and produce explanations.
- High-level Planning
  - Create step-by-step plans (milestones) for large changes; these are suggestions requiring human approval.

AI outputs must include: the deterministic context supplied, a concise prompt snapshot, and an explicit confidence / uncertainty statement when available.

4) Context Selection Engine (detailed)
------------------------------------
Purpose: deterministically choose a bounded set of files to include when asking the model or computing local operations.

Selection rules (examples):

- Basic: primary file + direct imports + direct dependents (1 hop).
- Bounded closure: include up to N hops or until encountering external packages or entry points.
- Score-based inclusion: rank candidate files by import distance, recent edits, file size (prefer small), and test proximity.
- Include build config (e.g., `tsconfig.json`, `vite.config.ts`, `package.json`) and relevant type declarations.

Context output: ordered list of files with inclusion reason and score. The context engine must be deterministic for identical workspace state.

5) Workspace Intelligence API (documentation-only interface stubs)
-----------------------------------------------------------------
These are documentation contracts — do NOT implement yet.

```ts
// high-level context object passed to AI or subsystems
interface WorkspaceContext {
  projectId?: string
  primaryFile: string
  activeFile?: string
  affectedFiles: ProjectFile[]
  dependencyGraph?: DependencyGraph
  symbolGraph?: SymbolGraph
  contextFiles: ProjectFile[] // ordered
  provenance: { computedAt: string; engineVersion: string }
}

interface DependencyNode {
  id: string // file path or package name
  type: 'file' | 'package'
}

interface DependencyEdge {
  from: string
  to: string
  reason?: string
}

interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}

interface Symbol {
  id: string
  name: string
  kind: 'function' | 'class' | 'component' | 'type' | 'variable'
  file: string
  location: { line: number; column: number }
}

interface SymbolReference {
  symbolId: string
  file: string
  location: { line: number; column: number }
}

interface SymbolGraph {
  symbols: Symbol[]
  references: SymbolReference[]
}

interface ProjectFile {
  path: string
  contentHash?: string
  language?: string
  content?: string
}
```

6) Dependency Graph (architecture notes)
----------------------------------------
- Responsibility: the dependency graph maps import specifiers to either workspace files or external packages.
- Construction: built by language adapters that produce a normalized import list per file.
- Resolution: attempt deterministic resolution using `tsconfig` paths, alias config, and package lock data.
- Boundaries: when resolution fails (ambiguous or missing), mark nodes as external and include best-effort mapping; surface unresolved nodes to UI for user resolution.

7) Symbol Graph (architecture notes)
------------------------------------
- Responsibility: symbol extraction and cross-file reference indexing.
- Scope: begin with high-value languages (TypeScript/JSX), expand per-language.
- Use-cases: rename safety checks, find-all-references, impact analysis for API changes.
- Granularity: symbols should include kind, signature, and exported/used status.

8) Project Graph (notes)
-------------------------
- Compose dependency graph, symbol graph, version history, and asset graph into a Project Graph used for visualization and high-level queries.
- The Project Graph is an aggregate view — not a runtime mutation source. All writes remain routed through the canonical merge engine.

9) Safety Rules (expanded)
---------------------------
- Never allow untargeted writes: each change must be a discrete `create|modify|delete` with provenance and explicit user acceptance for destructive operations.
- Disallow global regeneration for single edits without explicit consent.
- Validate any provider-specified path to ensure it's inside the project root and not a system path.
- Require a deterministic preflight: run `getAffectedFiles()` and present an impact summary before applying changes.
- Keep an immutable audit log of proposed and applied changes (who/what/when/why).

10) Future Evolution & Roadmap (expanded)
-----------------------------------------
- Near-term (docs + Phase 1):
  - Finalize interface contracts in this document.
  - Implement read-only graph builders and context selection prototypes (internal experiments, not runtime integration).
- Mid-term:
  - Symbol index and robust rename/refactor assistant (deterministic + AI-assisted review flow).
  - Change impact estimator that leverages test selectors and graph distances.
- Long-term:
  - Optional semantic index and embeddings for search (strict privacy and cost controls).
  - Build verification pipelines and safe rollbacks.

Architecture Diagram (context selection flow)
```mermaid
flowchart LR
  User[User edits primary file]
  User --> CE[Context Engine]
  CE --> DG[Dependency Graph]
  CE --> SG[Symbol Graph]
  CE --> Context[Context Files (ordered)]
  Context --> AI[Provider/Model] 
  AI --> FileOps[BuildFileOperation[]]
  FileOps --> Merge[mergeWorkspaceFilesWithArtifact()]
  Merge --> ProjectFiles[Project.files]
  ProjectFiles --> Derive[deriveProjectArtifact()]
```

--------------------------------------------------------------------------------
Finish: this expansion is documentation-only. No code files were added or modified beyond this document.

Next steps:
- Review these expanded sections and the interface stubs.
- Tell me which sections you want further expanded or tightened into concrete API method names.



