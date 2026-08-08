# SHANGO UI Implementation Order
**Recommended Build Sequence for VS Code · 2026-07-21**
> The UI is complete. Do not rebuild it. Wire real logic in this order.

---

## Guiding Principle

Preserve the existing UI at every phase. Each phase adds real backend logic behind the existing mock stubs. The user experience should look identical to the current prototype at the end of every phase.

---

## Phase Status

COMPLETED
- Phase 4 — Workspace Foundation
- Phase 5 — Workspace Generation & Consumers
- Phase 6 — Version Intelligence
- Phase 7 — Context Engine & Dependency Intelligence
- Phase 8 — Backend Generation Pipeline
- Phase 9 — Intelligent Iteration Engine (Architecture)

IN PROGRESS
- Phase 10 — Deployment

PLANNED
- Phase 11 — Sharing & Collaboration
- Phase 12 — Connectors & Skills
- Phase 13 — Community & Discovery

---

## Phase 0 — UI Baseline (before any backend work)

**Goal**: Establish a stable, verified copy of the current frontend in VS Code.

**Files involved**: All `src/` files as documented in `SHANGO_UI_FILE_MIGRATION_MAP.md`

**Steps**:
1. Copy the entire `src/` directory to VS Code project (see migration map for which to keep/skip)
2. Copy `src/index.css` verbatim
3. Copy the video asset to `public/` or CDN
4. Run `npm install` with all existing dependencies
5. Run `npx tsc --noEmit` → must pass with zero errors
6. Run `npm run build` → must succeed
7. Run `npm run dev` → open in browser, manually verify all 9 routes
8. Remove the `Shift+E` demo trigger from `NetworkErrorBanner`
9. Create a git tag: `v1-ui-baseline`

**Validation**:
- [ ] All 9 routes load correctly
- [ ] Sidebar collapse/expand works + persists
- [ ] Settings page saves to localStorage + survives refresh
- [ ] Intro animation plays
- [ ] Builder keyboard shortcuts fire correctly
- [ ] `⌘K` CommandPalette opens + filters + navigates
- [ ] ShareModal copy button copies text
- [ ] TypeScript: zero errors
- [ ] Build: clean

**Dependencies**: None
**Risk**: Low

---

## Phase 1 — Authentication

**Goal**: Real sign-in/sign-out with session persistence across refreshes.

**Files to modify**:
- `src/components/AuthSheet.tsx` — wire OAuth + magic link
- `src/App.tsx` (AppShell) — add session restore on mount
- `src/store/AppContext.tsx` — no structural changes needed; `SET_CURRENT_USER` dispatch already exists
- `src/components/ProfilePanel.tsx` — sign-out must call `/api/auth/signout`
- `src/pages/BuilderScreen.tsx` BuilderProfilePopover — sign-out must call `/api/auth/signout`

**Backend required**:
- GitHub OAuth flow
- Google OAuth flow
- Magic link email + verify endpoint
- `GET /api/me`
- `POST /api/auth/signout`
- JWT or session cookie issuance

**UI changes**: None — existing anonymous/authenticated states are already designed

**Validation**:
- [ ] Click GitHub → real OAuth redirect → return → user logged in
- [ ] Refresh page → still logged in (session persists)
- [ ] Sign out → `currentUser = null` → UI reverts to anonymous
- [ ] Magic link email received + clicking link logs in
- [ ] `GET /api/me` fails gracefully → anonymous state (no crash)

**Dependencies**: Phase 0
**Risk**: Medium — OAuth redirect flows require backend + environment setup

---

## Phase 2 — Project Persistence

**Goal**: Projects survive page refresh. All CRUD operations hit the database.

**Files to modify**:
- `src/store/AppContext.tsx` — add `SET_PROJECTS` action; wrap project mutations with API calls
- `src/pages/HomePage.tsx` — `handleSubmit()` → POST `/api/projects`
- `src/pages/ProjectsPage.tsx` — load from `GET /api/projects` on mount; add loading skeleton
- `src/pages/BuilderScreen.tsx` — load project from `GET /api/projects/:id` on mount if not cached

**Backend required**:
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/duplicate`

**UI changes**: 
- Add loading state to ProjectsPage (SkeletonGrid — already exists in code, just need to activate)
- Add loading state to omnibox submit button

**Validation**:
- [ ] Create a project → refresh page → project still appears in `/projects`
- [ ] Rename project → refresh → name persists
- [ ] Delete project → gone from database
- [ ] Archive project → status updates in DB
- [ ] BuilderScreen loads project from `/api/projects/:id`
- [ ] Invalid project ID → redirect to `/projects`

**Dependencies**: Phase 1 (auth required for ownership)
**Risk**: Medium — optimistic updates vs. loading states need careful coordination

---

## Phase 3 — Project Message Persistence

**Goal**: Chat conversation survives page refresh. Messages and versions stored in DB.

**Files to modify**:
- `src/pages/BuilderScreen.tsx` — `localMessages` initialized from DB project on mount; save on each message
- `src/store/AppContext.tsx` — `Project.messages[]` and `Project.versions[]` persisted via PATCH

**Backend required**:
- `GET /api/projects/:id` must include `messages[]` and `versions[]`
- `PATCH /api/projects/:id { messages, versions }` for auto-save

**Auto-save trigger**: After each AI response + after each build

**Validation**:
- [ ] Send a message, get response → refresh → conversation still shows
- [ ] Version history persists across refresh
- [ ] Opening same project from `/projects` → conversation loads

**Dependencies**: Phase 2
**Risk**: Low (data shape already defined)

---

## Phase 4 — Real AI Generation

**Goal**: Replace `buildAIResponse()` with a real LLM call. Stream response into the existing UI.

**Files to modify**:
- `src/pages/BuilderScreen.tsx` — `handleWorkspaceSend()`: replace `buildAIResponse()` with SSE fetch; add AbortController for stop button
- `src/pages/BuilderScreen.tsx` — `stopGeneration()`: call `controller.abort()`
- `src/pages/BuilderScreen.tsx` — map SSE events to existing state variables:
  - `delta` → append to last assistant message content
  - `console` → append to `consoleLogs[]`
  - `version` → append to project versions
  - `done` → `setIsGenerating(false)`, `addToast('Version saved', 'success')`
  - `error` → `setIsGenerating(false)`, `addToast('Build failed', 'error')`

**Backend required**:
- `POST /api/build` → SSE stream per `SHANGO_MODEL_ROUTING_SPEC.md`
- Model router connecting to OpenRouter (Balanced → Claude Sonnet, Fast → Gemini Flash, Powerful → Claude Opus)

**UI changes**: None — all existing states (`isGenerating`, `isRebuilding`, `buildSuccess`, `consoleLogs`) are already wired

**Validation**:
- [ ] Submit a prompt → real AI response streams into conversation
- [ ] Stop button aborts the request mid-stream
- [ ] Console receives real build log events
- [ ] Version is created after each successful build
- [ ] Plan mode returns structured plan (no file changes)
- [ ] Build mode returns file changes

**Dependencies**: Phase 3
**Risk**: HIGH — most complex phase; SSE stream consumer must handle partial chunks, connection drops, and error recovery

---

## Phase 5 — Real Preview

**Goal**: Preview shows the actual generated app instead of `MockAppPreview`.

**Files to modify**:
- `src/components/PreviewPanel.tsx` — replace `<MockAppPreview>` with `<iframe>` pointing to real sandbox URL
- `src/components/PreviewPanel.tsx` — `previewKey` increment already refreshes the iframe (keep this pattern)

**Backend required**:
- File storage: store generated files per project version (S3 or DB blobs)
- Sandbox service: serve generated HTML/JS/CSS in an isolated environment
- `GET /api/projects/:id/preview` → redirect to sandbox URL

**iframe setup**:
```jsx
<iframe
  key={previewKey}
  src={`${VITE_API_BASE_URL}/projects/${project.id}/preview`}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'white' }}
/>
```

**UI changes**: None — preview canvas shell, viewport transitions, and fullscreen mode are unchanged

**Validation**:
- [ ] After build, preview iframe renders the generated app
- [ ] Viewport switch (desktop/tablet/mobile) correctly resizes the iframe container
- [ ] Fullscreen mode works with real iframe
- [ ] Code inspector shows real file list and content
- [ ] `previewKey` increment refreshes the iframe

**Dependencies**: Phase 4
**Risk**: HIGH — sandbox isolation is a significant infrastructure component; CORS, CSP, and script execution policies need careful setup

---

## Phase 6 — Real Code Inspector

**Goal**: CodeEditor shows real generated files instead of hardcoded fakes.

**Files to modify**:
- `src/components/PreviewPanel.tsx` CodeEditor — replace `CODE_FILES` with `GET /api/projects/:id/files`
- `src/components/PreviewPanel.tsx` CodeEditor — replace fake content with `GET /api/projects/:id/files/*path`
- Route dropdown: source from build output's detected routes

**Backend required**:
- `GET /api/projects/:id/files`
- `GET /api/projects/:id/files/*path`

**Validation**:
- [ ] Open code inspector → file list matches generated output
- [ ] Click file → real content with syntax highlighting
- [ ] After new build → file list updates

**Dependencies**: Phase 5
**Risk**: Low

---

## Phase 7 — Version History (Real)

**Goal**: Restore and Fork actually work against persisted versions.

**Files to modify**:
- `src/components/VersionHistoryPanel.tsx` — Restore/Fork call API instead of dispatch
- `src/pages/BuilderScreen.tsx` — after restore, reload project from API

**Backend required**:
- `POST /api/projects/:id/versions/:versionId/restore`
- `POST /api/projects/:id/versions/:versionId/fork`

**Validation**:
- [ ] Restore a version → preview updates to that version's files
- [ ] Fork a version → new project created → navigate to it
- [ ] Version list matches database state after refresh

**Dependencies**: Phase 5
**Risk**: Low

---

## Phase 8 — Export

**Goal**: Real file export as downloadable ZIP.

**Files to modify**:
- `src/components/PreviewPanel.tsx` CodeEditor export button → call `/api/projects/:id/export`
- ExportModal (implement or find existing component)

**Backend required**:
- `POST /api/projects/:id/export` → signed download URL
- Zip generation server-side

**Validation**:
- [ ] Click export → ZIP downloads with real project files

**Dependencies**: Phase 6
**Risk**: Low

---

## Phase 9 — Intelligent Iteration Engine (Architecture)

**Goal**: Establish the backend Iteration Engine architecture for structured AI workspace generation while preserving the current Phase 7 ownership model.

**Files to modify**:
- `server/generationPipeline/routes.ts`
- `server/generationPipeline/adapter.ts`
- `server/generationPipeline/provider.ts`
- `server/generationPipeline/parser.ts`
- `server/generation.ts`
- `vite.config.ts`
- `src/lib/generation.ts`
- `src/lib/versioning.ts`
- `src/lib/workspace.ts`

**Backend required**:
- `/api/build` structured request/response contract
- provider routing and normalization layer
- explicit file operation parsing and workspace merge semantics
- version metadata emission for builds

**Validation**:
- [ ] Backend architecture aligned with existing Phase 8 pipeline contract
- [ ] `Project.files` remains canonical and derived artifacts remain projection-only
- [ ] Structured `BuildResponse` workflow documented and stable
- [ ] phase documentation reflects current implementation state without UI change

**Dependencies**: Phase 8
**Risk**: Low — architecture-only milestone

---

## Phase 10 — Deployment

**Goal**: Deploy button triggers a real deployment to Vercel/Netlify.

**Files to modify**:
- `src/pages/BuilderScreen.tsx` — Deploy button → POST `/api/projects/:id/deploy`
- DeployModal — implement progress UI (SSE stream from deploy endpoint)
- `src/pages/DeploymentPage.tsx` — load from `GET /api/deployments`

**Backend required**:
- `POST /api/projects/:id/deploy`
- Vercel API integration
- `GET /api/deployments`
- Deploy SSE progress stream

**Validation**:
- [ ] Click Deploy → real Vercel deployment triggered
- [ ] Progress shown in DeployModal
- [ ] DeploymentPage shows real history
- [ ] Rollback works

**Dependencies**: Phase 6 (need real files to deploy)
**Risk**: Medium — Vercel API integration + webhook handling

---

## Phase 11 — Sharing & Collaboration

**Goal**: Real share links and email invites.

**Files to modify**:
- `src/components/ShareModal.tsx` — POST to `/api/projects/:id/share` for real URL

**Backend required**:
- `POST /api/projects/:id/share`
- Short URL service or slug generation
- `POST /api/projects/:id/invite` (email sending)

**Validation**:
- [ ] Copy link → real public URL
- [ ] Open URL in incognito → project preview visible (if public)
- [ ] Email invite delivered

**Dependencies**: Phase 5 (need working preview)
**Risk**: Low

---

## Phase 11 — Connectors & Skills

**Goal**: Real credential management and skill execution.

**Files to modify**:
- `src/components/ConnectorsDrawer.tsx` — real OAuth + credential submission
- `src/pages/IntegrationsPage.tsx` — same
- `src/pages/SkillsPage.tsx` — real install/enable via API

**Backend required**:
- Full connector OAuth flows
- Encrypted credential vault
- Skill runner backend

**Dependencies**: Phase 1 (auth required)
**Risk**: High — complex per-connector implementation

---

## Phase 12 — Community & Discovery

**Goal**: Real community content.

**Files to modify**:
- `src/pages/CommunityPage.tsx` — load from API
- `src/pages/TemplatesPage.tsx` — load from API

**Backend required**:
- Community API (projects, builders, teams, knowledge)
- Template catalog API

**Dependencies**: Phase 2 (projects must be persistable to appear in community)
**Risk**: Low (UI unchanged)

---

## Implementation Order Summary

| Phase | Feature | Files Changed | Backend | Risk | UI Change | Status |
|-------|---------|--------------|---------|------|-----------|--------|
| 0 | UI Baseline | All (copy) | None | Low | None | Completed |
| 1 | Authentication | AuthSheet, AppShell, AppContext | Auth API | Medium | None | Completed |
| 2 | Project Persistence | AppContext, HomePage, ProjectsPage, BuilderScreen | Project CRUD API | Medium | Loading states | Completed |
| 3 | Message Persistence | BuilderScreen, AppContext | Project PATCH | Low | None | Completed |
| 4 | Workspace Foundation | BuilderScreen | POST /api/build SSE | High | None | Completed |
| 5 | Workspace Generation & Consumers | PreviewPanel | Files + Sandbox | High | iframe replaces MockAppPreview | Completed |
| 6 | Version Intelligence | PreviewPanel CodeEditor | Files API | Low | File list dynamic | Completed |
| 7 | Context Engine & Dependency Intelligence | VersionHistoryPanel, BuilderScreen | Version APIs | Low | None | Completed |
| 8 | Backend Generation Pipeline | PreviewPanel, ExportModal | Export API | Low | None | Completed |
| 9 | Intelligent Iteration Engine (Architecture) | generationPipeline, server/generation.ts, src/lib | Build API, provider routing | Low | None | Completed |
| 10 | Deployment | BuilderScreen, DeployModal, DeploymentPage | Vercel API | Medium | None | In Progress |
| 11 | Sharing & Collaboration | ShareModal | Share API | Low | None | Planned |
| 12 | Connectors & Skills | ConnectorsDrawer, SkillsPage | Connector APIs | High | None | Planned |
| 13 | Community & Discovery | CommunityPage, TemplatesPage | Community API | Low | None | Planned |

---

## Validation Checklist (end-state)

At the end of all phases, the following must be true:

- [ ] Create a project from the homepage → appears in `/projects` after refresh
- [ ] Open the project → conversation history loads from DB
- [ ] Submit a prompt → real AI response streams in
- [ ] Build completes → preview shows real generated app
- [ ] Code inspector shows real files from the build
- [ ] Switch viewport → preview resizes correctly
- [ ] Fullscreen mode works
- [ ] Version history has real entries; Restore works
- [ ] Fork creates a real new project
- [ ] Sign out → refresh → still signed out
- [ ] Sign in (any method) → projects and history still present
- [ ] Share link opens the project for anonymous users
- [ ] Export downloads a real ZIP
- [ ] Deploy creates a real live URL
- [ ] All keyboard shortcuts fire correctly
- [ ] All animations play correctly (no regressions)
- [ ] TypeScript: zero errors
- [ ] Build: clean
