# SHANGO Continuation Playbook

## Purpose

This is the operating guide for the next agent, engineer, designer, or product partner continuing Shango. It is an execution playbook, not a replacement for the frozen architecture documents.

Use it to make Shango more real without making it noisier, more generic, or less trustworthy.

## The Product We Are Building

Shango is a calm, capable software-creation workspace for builders everywhere, with a deliberate commitment to Africa. It must feel globally excellent without erasing local realities: variable connectivity, shared devices, mobile-first habits, constrained data budgets, different languages, different payment systems, and ambitious builders who deserve tools designed for them rather than adapted to them afterward.

Shango is not a prompt-to-app spectacle. It is a workspace where a builder can form an idea, direct the work, understand the result, retain ownership, and keep moving when conditions are imperfect.

The desired feeling is:

- calm rather than hyperactive;
- powerful rather than flashy;
- explainable rather than magical;
- culturally grounded without becoming a stereotype;
- globally credible without copying Silicon Valley product personality;
- supportive of beginners without patronising experienced builders.

## Shango Constitution: Ship Only What Passes These Tests

Before implementing a feature or changing a flow, ask:

1. Does it increase builder confidence?
2. Does it reduce cognitive load?
3. Does it preserve builder control and ownership?
4. Does it make the system more honest about what happened?
5. Does it work respectfully under real African connectivity, hardware, language, and cost constraints?

If the answer is no, do not ship it merely because it resembles a popular AI builder feature.

## Non-Negotiable Technical Boundaries

### Workspace ownership

`Project.files` is canonical. It is the builder's workspace and the durable source of truth.

`Project.artifact` is a derived preview projection only. Do not introduce runtime paths that treat the artifact as the owner of files.

The invariant is:

```text
Provider response
  -> parsed output
  -> normalized explicit file operations
  -> validated workspace merge
  -> Project.files (canonical)
  -> derived Project.artifact (preview)
```

### Provider ownership

Providers generate raw content. They never decide directly what the workspace mutates. Shango decides mutations via deterministic parsing, normalization, validation, and merge logic.

Keep provider code narrow and replaceable. Never let provider-specific fields leak throughout the product.

### Safety and provenance

Every accepted generation should be attributable to:

- prompt;
- timestamp;
- provider and selected model;
- mode (`plan` or `build`);
- explicit accepted file operations;
- rejected operations and the reason they were rejected.

Generated work must be reversible through version snapshots. User-authored files and destructive actions require a review before Shango applies them.

### Existing safety behavior to preserve

- An omitted file is not a delete.
- Invalid traversal and absolute paths are rejected.
- `package.json`, `vite.config.ts`, and `tsconfig.json` cannot be deleted by a generation.
- Deletions require a builder review.
- Modifying a `userModified` file requires a builder review.
- Review presents a compact file-level diff before approval.
- Blocked operations remain visible in provenance rather than silently disappearing.

## Current Product Reality (as of this playbook)

The application is a React 19 + Vite + Tailwind v4 workspace.

Implemented and verified:

- workspace-first project ownership and derived artifacts;
- provider-agnostic pipeline stages: adapter, parser, normalizer, response construction;
- version snapshots, restore, and fork flows;
- safety validation, protected-file rules, sensitive-change reviews, and provenance;
- protected-change review shows a compact diff first, with a bounded expandable continuation for larger changed regions before approval;
- restoring a prior workspace version from Builder History requires explicit confirmation and names the replacement boundary before any workspace mutation;
- shared confirmation dialogs support Escape dismissal, dialog semantics, and labelled close controls so consequential workspace decisions remain accessible by keyboard;
- Builder History visibility for verified provider changes and protected operations;
- provider-response normalization and project API persistence retain rejected workspace operations, so blocked changes remain auditable after sync;
- server project reads return deep isolated snapshots, preventing consumers from mutating canonical workspace, version, file, or provenance state outside explicit store operations;
- server project writes deep-copy caller-owned inputs before retention, preventing later object mutation from changing canonical workspace or provenance state;
- server-side version restore and fork resolve and carry canonical workspace files before deriving preview artifacts, matching the workspace-first client invariant;
- the project API rejects unverified client attempts to mark a workspace `LIVE`; only a future attested deployment provider may introduce that public-release transition;
- the local generation API applies a tested per-client sliding-window request limit and returns an explicit retry window before expensive provider work begins;
- local persistence and in-flight conflict protection;
- offline notice, local failed-sync queue, and reconnect retry;
- route-level code splitting;
- enforceable gzip bundle budgets for the application entry, Builder route, Home route, and stylesheet so low-data regressions fail visibly;
- low-data mode that removes ambient home media and dynamically defers the 2.7 MB ambient video;
- generation language preference propagated into backend provider prompts;
- enabled Skills translated into explicit provider implementation guidance and recorded in version provenance;
- Plan mode treated as a no-mutation planning flow from project creation through provider response handling;
- per-project `SAVED LOCAL` state when backend synchronization is queued;
- Projects grid and list surfaces subscribe to the local sync queue and identify only affected workspaces with a `SAVED LOCAL` badge;
- global reduced-motion preference that actually suppresses animation and transition motion;
- honest preview disclosures for local authentication and session-only API keys;
- authentication preview actions create and name local sessions precisely; they never claim external OAuth verification, account persistence, or email delivery;
- authentication dialogs support Escape dismissal, explicit dialog semantics, labelled close controls, and a polite status announcement for completed local sessions;
- sharing is an explicit local-reference preview until verified publishing, visibility, embedding, and collaborator-invitation services exist; it never manufactures public URLs or sent invitations;
- share preview supports Escape dismissal, explicit dialog semantics, and a labelled close control;
- local export downloads a correctly named ZIP of canonical workspace files; GitHub publishing remains clearly gated on a verified connector rather than implying a repository push;
- Builder's GitHub shortcut opens the Integrations setup surface instead of suggesting a direct repository connection;
- connector drawer and registry now share one workspace connection state; connector setup explicitly avoids collecting live credentials until a verified provider flow exists;
- new workspaces begin with no externally connected providers, and enabled connector previews never fabricate account, sync, or activity data;
- connector security copy names the current boundary precisely: preview flows do not collect, store, encrypt, or transmit credentials;
- Community is explicitly a local illustrative catalog until consented publishing, moderation, and verified activity services exist;
- Community showcase discussion is visibly illustrative and non-interactive until moderated comments and consented identities are implemented;
- Community showcase detail sheets identify seeded projects as illustrative instead of presenting fictional publication timestamps;
- Catalog project references can create a clearly named local starting project, but never claim a repository fork, clone, saved social collection, shared public URL, or reachable live preview;
- catalogue project detail sheets do not display seeded engagement counters as live social proof;
- illustrative community project and builder detail sheets support Escape dismissal, dialog semantics, and labelled close controls;
- Builder profile sheets label catalog identities and activity as illustrative and keep follow/message controls unavailable until consented, verified community relationships exist;
- Community discovery cards no longer simulate following relationships, and the team-creation control is visibly unavailable until real team membership and moderation flows exist;
- Community project cards are being kept visibly catalog-only, with no UI that claims a live public release;
- Builder catalog profiles never display seeded provider URLs or live-deployment signals as reachable public work;
- Community event entries are clearly illustrative; they cannot create a local RSVP, attendee count, or registration confirmation before verified event services exist;
- Community challenge cards never imply that seeded status, deadlines, prizes, or participant figures represent open programmes; the preview explicitly marks them as illustrative;
- Skills and integrations do not present seeded catalog counts as live installs, usage, or active-connection social proof;
- primary connector and deployment overlays support Escape dismissal, except while the deployment preview is actively progressing;
- new workspaces start with an empty notification center; notifications are created only by actions in the current workspace session;
- template starters preserve a clean builder-owned project name and description while retaining the richer template brief as generation context;
- template origin (`id`, name, category) persists with a project through local state and the project API for future attribution and upgrade paths;
- failed Builder generations persist a recoverable state, reconstruct the retry action after refresh, and retry the exact prior prompt without duplicating the builder's chat instruction;
- Builder console output distinguishes a derived local workspace preview from a production build or provider deployment;
- deployment preview records redact secret environment values before local or API storage, distinguish provider-unconfirmed previews from live releases, and never show another project's deployment history as the active project's own;
- deployment progress and logs describe only the local preparation that actually occurs; they must never simulate uploads, SSL issuance, health checks, or a live release;
- deployment previews persist only unconfirmed local state: pending provider/domain status, zero measured build duration, and no fabricated performance telemetry or seeded release history;
- recording a deployment preview has a single truthful local-persistence state rather than a timed sequence that imitates provider build stages;
- deployment API requests fail closed when their preview identity/reference is incomplete and never synthesize a live provider status or public URL as a fallback;
- deployment navigation and empty states describe preview handoffs precisely and reserve live status and performance language for verified provider releases;
- preview deployment history and detail views explicitly disable provider controls such as rollback, pause, and redeploy until a verified release exists;
- Project Settings routes deployment work to the truthful preview surface and never derives live URLs, DNS records, regions, or custom domains from project metadata alone;
- Project Settings supports Escape dismissal outside destructive confirmation, dialog semantics, and a labelled close control;
- template cards that create and open projects rather than acting as static visuals.
- project-list empty-state starters carry their selected, editable brief into the Home composer instead of losing intent during navigation.
- Home submission enters the Builder immediately instead of blocking the builder behind a decorative timed forge sequence; genuine generation state remains visible in the Builder itself.
- Network status is driven by actual browser online/offline events; the product contains no hidden shortcut that simulates a connection failure.

The current quality baseline is expected to remain green:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

At the time this guide was last updated, the suite has 121 tests. Do not report a feature as done without running validation proportional to its risk.

## Important Files and Their Roles

| Area | Primary locations |
| --- | --- |
| Routes and global shell | `src/App.tsx` |
| Builder orchestration | `src/pages/BuilderScreen.tsx` |
| Builder timeline and provenance display | `src/components/ConversationPanel.tsx` |
| Generation client contract | `src/lib/generation.ts` |
| Workspace merge, versions, safety | `src/lib/versioning.ts`, `src/lib/workspace.ts` |
| Project model | `src/lib/store.ts` |
| Persistence, offline queue, backend sync | `src/lib/persistence.ts` |
| Provider pipeline | `server/generationPipeline/*` |
| Settings and preferences | `src/pages/SettingsPage.tsx` |
| Current frozen design/architecture references | `SHANGO_*.md` files in repository root |

Read the relevant frozen document before changing a core contract. Do not rewrite frozen architecture documents to justify implementation drift.

## Surgical Execution Method

Work in small, verified vertical slices. A good Shango change is narrow in code but complete in behavior.

For every task:

1. State the user outcome, not just the code change.
2. Read the exact component, model, API path, and relevant tests first.
3. Identify the contract that must not change.
4. Implement the smallest coherent slice.
5. Add or update focused tests for new logic and regression risk.
6. Run typecheck, tests, and production build.
7. Check the build output for bundle regressions.
8. Describe what changed, what was verified, and what remains intentionally out of scope.

Do not:

- replace working screens wholesale to make a small improvement;
- use placeholder success states where a real state is possible;
- add mock controls without visually marking them as unavailable;
- solve uncertainty by silently guessing destructive workspace changes;
- expand scope from local work into external services without authority;
- erase user or existing work to make tests easier.

## UX Standard: The Ultimate Shango Polish Bar

### General principles

Every screen should have a clear primary action, a visible state, and an understandable exit. The interface should guide attention with hierarchy, spacing, contrast, restrained motion, and precise language—not decorative density.

The product should feel considered at every state:

- first visit;
- empty state;
- loading;
- streaming generation;
- slow connection;
- offline;
- error;
- success;
- destructive action;
- returning builder;
- mobile or narrow viewport.

### Builder UX

The Builder is the heart of Shango. Treat it as a collaboration space, not a chat wrapper.

- Show what Shango understands before it changes work.
- Keep the builder's instruction, current workspace, result, and history mentally connected.
- Use concise progress language: explain the stage, never fake hidden reasoning.
- Give meaningful actions after every result: inspect, refine, restore, fork, deploy.
- Never leave a builder wondering whether a change was applied.
- Make file-impact review readable in seconds: operation, path, a few changed lines, clear apply/cancel choices.
- Preserve user edits visibly; make their ownership a product strength.
- Show errors in plain language with a safe next action.

### Language and content

- Use clear international English as the default voice: warm, concise, dignified.
- Never use generic startup hype such as “10x,” “vibe coding,” or “magic.”
- Do not reduce African identity to flags, patterns, or random local words.
- Use locally credible examples only when they help: savings groups, clinics, schools, logistics, agriculture, informal and formal commerce, mobile money, civic services, creators.
- Language settings must affect outputs, not merely visual controls.
- User-facing translated content should remain legible, respectful, and appropriate for the selected language.

### Low-bandwidth and mobile behavior

- Assume data is valuable and connections may drop mid-task.
- Defer non-essential media and heavy routes.
- Respect low-data mode everywhere it is relevant.
- Keep useful local state available offline.
- Make reconnection, queued sync, and unsynced work visible without anxiety.
- Prefer compact payloads, deterministic local calculations, and lazy imports.
- Never make an offline builder believe their work disappeared.

### Accessibility

- Keyboard navigation is required for primary flows.
- Focus states must be visible on dark surfaces.
- Buttons need labels and sufficient hit areas.
- Color never carries critical meaning alone.
- Loading and network messages need appropriate live-region behavior.
- Honor reduced-motion preferences and avoid continuous motion that competes with work.

## Product Roadmap: Build in This Order

### 1. Trust layer completion

Goal: make workspace changes fully explainable and recoverable.

- Add richer diff expansion for reviewed files when needed.
- Add a provenance inspector showing prompt, provider, model, accepted/blocked operations, and version relationship.
- Add selective revert only after it has a sound deterministic merge design.
- Persist provenance through all project API paths; do not drop it on backend serialization.
- Add tests for every safety rule and compatibility migration.

### 2. Low-connectivity excellence

Goal: Shango remains useful under constrained network conditions.

- Extend low-data mode beyond the home surface where high-cost assets exist.
- Display queued-sync state per project, not only a generic online/offline banner.
- Add retry controls for failed generation requests without duplicating user actions.
- Measure actual initial-route and Builder-route payloads in CI or a repeatable script.
- Evaluate offline draft queuing only after defining conflict behavior.

### 3. Real project surfaces

Goal: every visible product surface earns its existence.

- Templates: evolve from prompt starters into curated, versioned workspace foundations only when each template has maintainable source files and clear ownership.
- Deployments: replace mock history with a real deployment contract, clear provider states, logs, domains, and rollback boundaries.
- Integrations: show actual connection state, permissions, health, and disconnect behavior.
- Skills: make enabled skills visibly affect generation context and show why they were applied.
- Community: use genuine, moderated project sharing and learning artifacts; never manufacture activity as social proof.

### 4. Global product readiness

Goal: earn trust outside a local prototype.

- Authentication that does not pretend to be production OAuth.
- Durable server-side project storage and migration strategy.
- Rate limits, audit logs, input validation, and secrets boundaries.
- Real observability that avoids collecting unnecessary builder content.
- Mobile QA, accessibility QA, browser QA, and performance budgets.
- Payments and regional pricing only after legal, provider, and user-support decisions are deliberate.

### 5. African builder ownership

Goal: build with communities, not merely for them.

- Recruit a small, diverse builder cohort across regions and skill levels.
- Prioritize evidence from real workflows over assumptions about “the African market.”
- Publish templates and learning paths based on demonstrated needs.
- Support local languages and payment realities where they create real access.
- Highlight builders' work with consent, attribution, and control.

## Definition of “Done” for Any Feature

A feature is done only when all are true:

- it has a real user outcome;
- its primary and failure states are designed;
- its data ownership is explicit;
- it cannot violate workspace-first ownership;
- it does not silently destroy or overwrite builder work;
- it has focused tests where logic changed;
- typecheck, tests, and production build pass;
- it does not create an unreasonable payload or interaction cost;
- it is expressed in Shango's calm, precise product voice.

## Handoff Format for Future Agents

When pausing or handing over work, record:

1. Outcome completed.
2. Files changed and why.
3. Invariants preserved.
4. Tests/build commands run and results.
5. Known limitation or intentional deferral.
6. Exact recommended next smallest slice.

Example:

```text
Outcome: Protected builder-edited files from silent AI overwrites.
Changed: versioning safety policy, Builder review trigger, focused workspace test.
Preserved: Project.files ownership; generated artifacts remain derived.
Verified: typecheck, 103 tests, production build.
Deferred: line-by-line expand/collapse UI for large diffs.
Next: persist rejected operation provenance through the project API serializer.
```

## Final Reminder

Shango wins by being the tool a builder can trust with serious work. The quality bar is not whether it can generate a demo quickly. The quality bar is whether a student in Kumasi, a founder in Nairobi, a product team in Lagos, a creator in Dakar, or an engineer anywhere in the world can open it, understand it, build with it, recover from mistakes, and feel that the product respects their ambition.
