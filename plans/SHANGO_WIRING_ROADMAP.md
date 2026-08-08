# SHANGO — Wiring Roadmap
**Implementation Roadmap for VS Code / Antigravity Handoff · 2026-07-21**
> Based exclusively on gaps identified in SHANGO_CURRENT_UI_INVENTORY.md.
> Does not add new UI, new routes, or new concepts.

---

## Phase 0 — Preserve the Existing UI

**Do this before touching any logic.**

The current frontend is a complete, polished UI prototype. Do not rebuild it.

### Checklist
- [ ] Clone the repository and confirm `npm run dev` starts without errors
- [ ] Run `npx tsc --noEmit` — confirm zero TypeScript errors
- [ ] Run `npm run build` — confirm clean production build
- [ ] Open the preview and manually verify all routes load:
  - `/` — HomePage hero + hub
  - `/projects` — ProjectsPage grid
  - `/project/:id` — BuilderScreen workspace
  - `/settings` — SettingsPage 8 tabs
  - `/templates` — TemplatesPage
  - `/skills` — SkillsPage
  - `/deployments` — DeploymentPage
  - `/integrations` — IntegrationsPage
- [ ] Verify sidebar navigation works (Home, Projects, Templates, Deployments, Skills)
- [ ] Verify Community nav item opens Discord externally
- [ ] Verify `⌘K` opens CommandPalette
- [ ] Verify `⌘Y` opens VersionHistoryPanel
- [ ] Verify `⌘S` opens ShareModal
- [ ] Verify `⌘E` opens CodeEditor drawer
- [ ] Verify IntroSequence plays on first load
- [ ] Create a git commit/tag: `v1-ui-complete` as a rollback point

### Files to preserve (do not restructure)
```
src/
  App.tsx
  index.css
  store/AppContext.tsx
  pages/  (all 9 files)
  components/  (all 15 files)
```

---

## Phase 1 — Make Current State Persistent

**Goal**: Stop losing data on page refresh. No UI changes required.

### 1A — Auth persistence

**Problem**: `currentUser` resets on every page refresh.

**What to wire**:
- Connect real OAuth (GitHub, Google) in `AuthSheet.tsx` — replace `handleOAuth()` stub
- Connect Magic Link email in `AuthSheet.tsx` — replace `handleMagicLink()` stub
- On auth success: store session token (httpOnly cookie or `localStorage` with rotation)
- On app mount: read session token → fetch `/api/me` → dispatch `SET_CURRENT_USER`

**Files to modify**:
- `src/components/AuthSheet.tsx` — `handleOAuth()`, `handleMagicLink()`
- `src/store/AppContext.tsx` — add `SET_CURRENT_USER` call on mount
- `src/App.tsx` — add auth check on `AppShell` mount

### 1B — Project data persistence

**Problem**: `projects[]` lives only in React state. All projects lost on refresh.

**Current state location**: `AppContext.state.projects[]`

**What must move to database**:
```
Project.id
Project.name
Project.status
Project.messages[]
Project.versions[]
Project.createdAt / updatedAt
Project.owner  ← must match authenticated user
Project.description
```

**What to wire**:
- On app mount (authenticated): fetch `/api/projects` → dispatch `SET_PROJECTS` (new action needed)
- On `ADD_PROJECT`: POST `/api/projects` → use returned `id` for navigation
- On `UPDATE_PROJECT`: PATCH `/api/projects/:id`
- On `DELETE_PROJECT`: DELETE `/api/projects/:id`
- On `ARCHIVE_PROJECT`: PATCH `/api/projects/:id { status: 'ARCHIVED' }`
- On `DUPLICATE_PROJECT`: POST `/api/projects/:id/duplicate`

**Files to modify**:
- `src/store/AppContext.tsx` — add `SET_PROJECTS` action, wrap mutations with API calls
- `src/pages/HomePage.tsx` — `handleSubmit()` must await project creation before navigating
- `src/pages/ProjectsPage.tsx` — add loading state while projects fetch

### 1C — Settings persistence (already done for some)

**Current state**: `shango_settings` in localStorage persists model, motion, telemetry, accent, density.

**What is missing**:
- API key inputs (OpenRouter, Anthropic) in SettingsPage are not persisted — they must be sent to the backend for secure storage, not kept in localStorage

**What to wire**:
- POST `/api/settings/keys` with `{ provider, key }` when user saves API keys
- These keys should be stored server-side and referenced by the model router — never returned to the frontend

---

## Phase 2 — Connect Project Lifecycle

**Goal**: Full round-trip for create → persist → open → continue → save.

### Current flow (all in-memory)
```
HomePage: handleSubmit()
  → createProject(prompt)         ← client factory, fake id
  → dispatch ADD_PROJECT
  → navigate('/project/:id')
  → BuilderScreen mounts
  → reads project from context.state.projects
```

### Target flow
```
HomePage: handleSubmit()
  → POST /api/projects { name, prompt, mode }
  → receive { projectId, project }
  → dispatch SET_PROJECTS (or ADD_PROJECT with real id)
  → navigate('/project/:projectId')
  → BuilderScreen mounts
  → useParams() → projectId
  → GET /api/projects/:projectId  (if not in context cache)
  → dispatch SET_ACTIVE_PROJECT
  → ConversationPanel renders project.messages[]
  → VersionHistoryPanel renders project.versions[]
```

### Save / auto-save
- After each successful build: PATCH `/api/projects/:id` with updated `messages[]` and new `version`
- On tab close / navigation away: fire a final PATCH (use `navigator.sendBeacon` if needed)

---

## Phase 3 — Connect the Omnibox / ForgeInput

**Goal**: Replace the mock AI call with a real backend request. UI does not change.

### Current event flow

**HomePage Omnibox** (`src/pages/HomePage.tsx`):
```
User types → omniValue state updates
User clicks submit / presses Enter
  → handleSubmit()
  → createProject(omniValue)        ← MOCK
  → navigate('/project/:id')
```

**ConversationPanel ForgeInput** (`src/components/ConversationPanel.tsx`):
```
User types → inputValue state updates
User clicks submit / presses Enter
  → handleSend() in BuilderScreen
  → user message appended to messages[]
  → isGenerating = true
  → buildAIResponse(content)        ← MOCK (keyword switch)
  → setTimeout ~2s
  → assistant message appended
  → isGenerating = false
  → previewKey++
```

### What must replace the mock

**In `src/pages/BuilderScreen.tsx` — `handleSend()`**:
```
Replace:
  buildAIResponse(content)

With:
  const response = await fetch('/api/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      projectId,
      prompt: content,
      mode,
      activeFile,
      selectedModel,
      enabledSkills,
    })
  })
  // Then consume SSE stream or JSON response per SHANGO_MODEL_ROUTING_SPEC.md
```

**Do not change**: ForgeInput JSX, Plan|Build toggle, model selector, submit button, isGenerating visual state. These all work correctly.

---

## Phase 4 — Connect AI Model Routing

**Reference**: `SHANGO_MODEL_ROUTING_SPEC.md`

### What to build (backend)

1. Create `POST /api/build` endpoint
2. Authenticate request via token
3. Load project context from database
4. Select model based on `selectedModel` field + routing table
5. Call provider (OpenRouter or Gemini) via server-side adapter
6. Parse provider response into `BuildResponse` shape
7. Stream events back to frontend via SSE

### Frontend changes required

In `src/pages/BuilderScreen.tsx`:
- Replace `buildAIResponse()` call with `fetch('/api/build')`
- Add SSE stream reader
- Map `delta` events → append to assistant message content
- Map `file` events → update `activeFile` and CodeEditor display
- Map `console` events → append to `consoleLogs[]`
- Map `done` event → set `isGenerating = false`, increment `previewKey`, save version
- Map `error` event → show error toast, set `isGenerating = false`

**Do not change**: `isGenerating` boolean, `previewKey` pattern, `consoleLogs` array shape, or any JSX.

---

## Phase 5 — Connect Workspace Output

**Goal**: Real AI responses update all panels. Currently all panels show mock data.

### Conversation (messages[])
- **Currently**: assistant message is a hardcoded string from `buildAIResponse()`
- **To wire**: append `BuildResponse.message` to `messages[]`; stream `delta` events into the last message's content as it arrives

### Files / Code Editor
- **Currently**: `CODE_FILES` is `['App.tsx', 'styles.css', 'components/Header.tsx']` — hardcoded, content is fake syntax highlighting
- **To wire**: populate CodeEditor file list from `BuildResponse.build.files`; render real file content with line numbers

### Preview
- **Currently**: `MockAppPreview` — static keyword-matched fake UI in a div
- **To wire**: sandboxed `<iframe>` that renders real generated HTML/JS from `BuildResponse.build.files`; refresh iframe when `previewKey` increments
- **Note**: `previewKey` increment pattern already exists — only the iframe `src` needs to change

### Console
- **Currently**: `buildConsoleLogs()` generates fake strings on each build
- **To wire**: `consoleLogs[]` populated by `BuildResponse.consoleEvents` stream events

### Version History
- **Currently**: 2 seed versions from `createProject()`, stored in `messages[]` local state
- **To wire**: after each build, POST `/api/projects/:id/versions` with `BuildResponse.version`; load version list from database on BuilderScreen mount

### Project Status
- **Currently**: project status (`LIVE`/`DRAFT`/`ARCHIVED`) updated only via ProjectsPage context menu
- **To wire**: set status to `LIVE` on first successful deploy; update via PATCH on status changes

---

## Phase 6 — Connect Real Integrations

Only integrations currently present in the codebase. No new ones.

### GitHub
- **Current state**: Button in BuilderScreen header — `UI ONLY` (behavior unknown)
- **To wire**: OAuth flow for GitHub → store token → use for repo push from CodeEditor files
- **Files**: BuilderScreen header GitHub button `onClick`

### Supabase
- **Current state**: Listed in ConnectorsDrawer and SkillsPage — `NOT CONNECTED`
- **To wire**: ConnectorsDrawer toggle → OAuth/API key → store in backend → inject as env var into user's project builds
- **Files**: `src/components/ConnectorsDrawer.tsx` toggle handler

### Vercel
- **Current state**: Listed in ConnectorsDrawer and DeploymentPage — `NOT CONNECTED`
- **To wire**: Vercel OAuth → store token → backend calls Vercel API on deploy → real `DeploymentRecord` from Vercel webhook
- **Files**: `src/components/ConnectorsDrawer.tsx`, `src/pages/DeploymentPage.tsx`

### Paystack
- **Current state**: Listed in ConnectorsDrawer — `NOT CONNECTED`
- **To wire**: API key → store in backend → inject as env var into user project
- **Files**: `src/components/ConnectorsDrawer.tsx`

### OpenRouter / Anthropic
- **Current state**: API key inputs in SettingsPage — `UI ONLY` (keys not stored or used)
- **To wire**: Key inputs POST to `/api/settings/keys` → stored server-side → used by model router
- **Files**: `src/pages/SettingsPage.tsx` API key form submit handler

---

## Phase 7 — Testing Checklist

Run this checklist against the wired system. UI must look and behave identically to the current prototype.

### Project Creation
- [ ] Enter prompt on HomePage → click Build
- [ ] Project is created in the database
- [ ] User is navigated to `/project/:id`
- [ ] Project appears in `/projects` after creation
- [ ] Refresh `/project/:id` — project and messages still load

### Project Persistence
- [ ] Create a project, type a message, get a response
- [ ] Refresh the page
- [ ] Conversation history is still present
- [ ] Version history is still present

### Opening a Project
- [ ] Navigate to `/projects`
- [ ] Click "Open" on a project card
- [ ] BuilderScreen loads with correct project name
- [ ] ConversationPanel shows previous messages
- [ ] VersionHistoryPanel shows previous versions

### Workspace Loading
- [ ] BuilderScreen header shows project name in ProjectContextMenu
- [ ] Viewport cycle button works (desktop / tablet / mobile)
- [ ] `⌘E` opens CodeEditor with real files
- [ ] `⌘Y` opens VersionHistoryPanel with real versions

### Prompt Submission
- [ ] Type a prompt in ForgeInput → click submit
- [ ] `isGenerating` spinner appears immediately
- [ ] Assistant message streams in progressively
- [ ] `isGenerating` stops when response is complete
- [ ] New version is created and appears in VersionHistoryPanel

### Plan / Build Behavior
- [ ] Set mode to Plan → submit prompt → response is a structured plan (steps, no files)
- [ ] Set mode to Build → submit prompt → response includes file changes

### File Updates
- [ ] After a Build response, CodeEditor file list reflects `BuildResponse.build.files`
- [ ] Clicking a file shows real content with syntax highlighting
- [ ] Switching files works correctly

### Preview Updates
- [ ] After a Build response, preview iframe reflects generated output
- [ ] Changing viewport (desktop/tablet/mobile) resizes the preview correctly

### Drawer Behavior
- [ ] ConnectorsDrawer opens from sidebar Connectors item
- [ ] ConnectorsDrawer opens from ProjectContextMenu "Project Connectors"
- [ ] Toggle a connector → state persists after refresh (once Phase 6 wired)
- [ ] Escape key closes ConnectorsDrawer

### Version History
- [ ] VersionHistoryPanel opens with `⌘Y`
- [ ] Each build creates a new version node
- [ ] Clicking a version shows its prompt and timestamp
- [ ] "Restore this version" reverts files and preview to that version's state

### Connectors (Phase 6)
- [ ] Connect GitHub → token stored → repo push works from CodeEditor
- [ ] Connect Supabase → credentials stored → available in generated project
- [ ] Connect Vercel → deploy triggers real Vercel deployment → DeploymentPage shows real record

### Reload Persistence
- [ ] All settings (model, theme, accent, density) survive page refresh ✅ (already works)
- [ ] Sidebar collapsed state survives page refresh ✅ (already works)
- [ ] Auth state survives page refresh (Phase 1A)
- [ ] Project list survives page refresh (Phase 1B)
- [ ] Active project messages survive page refresh (Phase 5)

---

## Notes for the Incoming Engineer

### What not to touch
- All JSX / visual layout in pages and components
- All CSS in `src/index.css`
- The design token system (`--surface-*`, `--text-*`, `--border-*`, etc.)
- The animation keyframes
- The `Sidebar`, `CommandPalette`, `ToastStack`, `KeyboardShortcutOverlay`, `IntroSequence`, `AuthSheet` JSX

### Where to add backend calls
- `src/store/AppContext.tsx` — wrap reducer dispatch in API calls for project CRUD
- `src/pages/BuilderScreen.tsx` — replace `buildAIResponse()` in `handleSend()`
- `src/pages/HomePage.tsx` — replace `createProject()` in `handleSubmit()`
- `src/components/AuthSheet.tsx` — replace `handleOAuth()` and `handleMagicLink()`

### Recommended backend stack
Not prescribed. The frontend is provider-agnostic. Any stack that can serve:
- `POST /api/build` (SSE stream)
- `GET/POST/PATCH/DELETE /api/projects`
- `POST /api/settings/keys`
- `GET /api/me`

...will wire cleanly to the existing UI without changes.
