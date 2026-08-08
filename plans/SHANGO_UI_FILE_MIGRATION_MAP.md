# SHANGO UI File Migration Map
**File-by-File VS Code Implementation Guide · 2026-07-21**

---

## Migration Key

| Action | Meaning |
|--------|---------|
| **KEEP** | Copy verbatim — do not change |
| **MODIFY** | Keep structure, replace mock logic with real calls |
| **REPLACE** | Rebuild from scratch with real implementation |
| **SKIP** | Do not copy to VS Code project |

---

## Entry & Routing Files

### `src/main.tsx`
- **Action**: KEEP
- **Purpose**: React root mount
- **Modify**: Add `StrictMode` wrapper if not present
- **Backend hooks**: None

### `src/App.tsx`
- **Action**: MODIFY
- **Purpose**: Router definition, RootLayout, AppShell
- **Keep**: All route paths, all component imports, IntroSequence, all modal renders in RootLayout
- **Modify**:
  - `AppShell`: Add auth check on mount (call `/api/me`, dispatch `SET_CURRENT_USER`)
  - Add route guards for authenticated-only routes
- **Backend hooks**:
  - `GET /api/me` on mount (to restore session)
- **Risk**: Route guard must preserve existing route structure exactly

---

## Page Files

### `src/pages/HomePage.tsx`
- **Action**: MODIFY
- **Keep**: All JSX/layout, video background, omnibox design, omnibox animations, model selector UI, Plan/Build toggle UI, signed-in hub grid
- **Modify**:
  - `handleSubmit()`: Replace `createProject(omniValue)` with POST `/api/projects`
  - Voice button: Wire to browser SpeechRecognition API
  - Attach button: Wire to file picker
  - Hub templates: Load from GET `/api/templates` instead of `HUB_TEMPLATES` constant
- **Backend hooks**:
  - `POST /api/projects { prompt, mode, model }` → returns `{ projectId }`
  - `GET /api/templates` → returns template array
- **Risk**: Loading state needed between submit and navigation; currently instant

### `src/pages/BuilderScreen.tsx`
- **Action**: MODIFY (largest change)
- **Keep**: ALL JSX layout, all header button structure, all state variable names, all keyboard shortcuts, all modal open/close logic, all animation classes, resize handle behavior, panel collapse behavior
- **Modify**:
  - `handleWorkspaceSend()`: Replace `buildAIResponse()` with `fetch('/api/build', SSE stream)`
  - `buildAIResponse()` function: DELETE — replace with stream consumer
  - `buildConsoleLogs()` function: DELETE — replace with real SSE console events
  - `stopGeneration()`: Add AbortController to cancel real fetch
  - Version creation: Persist via PATCH `/api/projects/:id`
  - `localMessages`: Source from database on mount + append on new messages
- **Backend hooks**:
  - `GET /api/projects/:id` on mount (load messages + versions)
  - `POST /api/build` SSE stream (prompt → response)
  - `PATCH /api/projects/:id` on each build (save messages + version)
  - `POST /api/projects/:id/restore/:versionId` (restore)
  - `POST /api/projects/:id/fork/:versionId` (fork)
- **Risk**: HIGH — most complex file. Preserve exact state variable names; stream consumer must map to existing state shape

### `src/pages/ProjectsPage.tsx`
- **Action**: MODIFY
- **Keep**: All layout, filter/search UI, grid/list toggle, ProjectCard design, context menus, confirmation modal integration
- **Modify**:
  - Load projects from `GET /api/projects` on mount (add loading state / SkeletonGrid)
  - Rename/delete/archive/duplicate: Replace dispatches with API calls
- **Backend hooks**:
  - `GET /api/projects` (list)
  - `PATCH /api/projects/:id { name }` (rename)
  - `DELETE /api/projects/:id` (delete)
  - `PATCH /api/projects/:id { status: 'ARCHIVED' }` (archive)
  - `POST /api/projects/:id/duplicate` (duplicate)

### `src/pages/SettingsPage.tsx`
- **Action**: MODIFY
- **Keep**: All 8 tabs layout, all form controls, all toggle designs, localStorage persistence for appearance/model/motion settings
- **Modify**:
  - API key inputs: On save, POST `/api/settings/keys` instead of holding in component state
  - Keys should not be returned to frontend after save (show masked placeholder)
- **Backend hooks**:
  - `POST /api/settings/keys { provider: 'openrouter'|'anthropic', key }`
  - `GET /api/settings/keys` → returns `{ openrouter: boolean, anthropic: boolean }` (masked)

### `src/pages/TemplatesPage.tsx`
- **Action**: MODIFY
- **Keep**: All layout, template card design, category filter UI, WireframeSVG components
- **Modify**:
  - Load templates from `GET /api/templates` instead of hardcoded array
  - "Use template" click: POST `/api/projects { templateId }` → navigate to builder
- **Backend hooks**:
  - `GET /api/templates`
  - `POST /api/projects { templateId }`

### `src/pages/CommunityPage.tsx`
- **Action**: MODIFY (lower priority)
- **Keep**: All tab layout, all card designs, search UI, BuilderProfileSheet, ProjectShowcaseSheet
- **Modify**: Replace all hardcoded arrays with API calls
- **Backend hooks**:
  - `GET /api/community/projects`
  - `GET /api/community/builders`
  - `GET /api/community/teams`
  - `GET /api/community/knowledge`

### `src/pages/SkillsPage.tsx`
- **Action**: MODIFY
- **Keep**: All layout, skill card design, health indicators, InstallProgress animation
- **Modify**: Wire install/enable/disable to real skill runner backend
- **Backend hooks**:
  - `GET /api/skills`
  - `POST /api/skills/:id/install`
  - `DELETE /api/skills/:id`
  - `POST /api/skills/:id/enable`
  - `POST /api/skills/:id/disable`

### `src/pages/DeploymentPage.tsx`
- **Action**: MODIFY
- **Keep**: All 5 tab layouts, all metric card designs, RecordSheet
- **Modify**: Load real DeploymentRecords from backend
- **Backend hooks**:
  - `GET /api/deployments`
  - `GET /api/deployments/:id`
  - `POST /api/deployments/:id/rollback`
  - `POST /api/deployments/:id/redeploy`

### `src/pages/IntegrationsPage.tsx`
- **Action**: MODIFY
- **Keep**: All layout, connector card design, search UI
- **Modify**: Load connectors from API; wire real OAuth flows
- **Backend hooks**:
  - `GET /api/connectors`
  - `POST /api/connectors/:id/connect` (OAuth or API key)
  - `DELETE /api/connectors/:id/disconnect`
- **Note**: Add sidebar nav entry for this page (currently unreachable)

---

## Component Files

### `src/components/Sidebar.tsx`
- **Action**: KEEP (with minor modification)
- **Keep**: All JSX, all animations, all nav items, collapse behavior, badge logic
- **Modify**: Profile zone — after sign-in show real user data from context
- **Backend hooks**: None (reads from AppContext)

### `src/components/ConversationPanel.tsx`
- **Action**: MODIFY
- **Keep**: All 3 tab layouts, all message bubble designs, all animations, model selector UI, ForgeInput structure, NextStepChips, GeneratingIndicator, HistoryTimeline
- **Modify**:
  - Token estimate: Replace with real token count from API response
  - `buildAIResponse()`: DELETE — messages come from parent BuilderScreen's stream consumer
  - NextStepChips click: Wire onClick to `setInput(chip.label)` (fill ForgeInput)
  - Model selector: Forward `selectedModel` to build request
- **Backend hooks**: None directly (receives props from BuilderScreen)

### `src/components/PreviewPanel.tsx`
- **Action**: MODIFY (major change to preview, keep shell)
- **Keep**: ALL JSX for panel shell, console panel, code inspector drawer, all animations, build progress bar, fullscreen mode, floating chat toggle, CodeEditor file/console tabs
- **Modify**:
  - `MockAppPreview`: REPLACE with sandboxed `<iframe>` rendering real generated HTML/JS
  - `CODE_FILES` hardcoded list: Replace with real files from `BuildResponse.build.files`
  - Fake code content: Replace with real file content from API
  - Console logs: Already wired to `consoleLogs` prop — just needs real data piped in
  - Route dropdown: Wire to real app routes from build output
- **Backend hooks**:
  - Preview iframe `src`: Point to isolated sandbox URL serving generated files
  - `GET /api/projects/:id/files` (load file list on inspector open)
  - `GET /api/projects/:id/files/:path` (load file content on tab select)

### `src/components/ProfilePanel.tsx`
- **Action**: KEEP
- **Keep**: All layout, all animations, credit bar, all button designs
- **Modify**: Sign-out action to call `/api/auth/signout` before clearing context

### `src/components/ConnectorsDrawer.tsx`
- **Action**: MODIFY
- **Keep**: All layout, search UI, connector card design, manage panel expansion
- **Modify**:
  - Load connectors from API instead of hardcoded `INTEGRATIONS` array
  - Toggle: Trigger OAuth or API key flow
  - Credential inputs: POST to `/api/connectors/:id/credentials`
- **Backend hooks**: Full OAuth and credential management

### `src/components/AuthSheet.tsx`
- **Action**: MODIFY
- **Keep**: All layout, OAuth button designs, email input, success state design, animations
- **Modify**:
  - `handleOAuth()`: Replace with real OAuth redirect flow
  - `handleMagicLink()`: Replace with real POST `/api/auth/magic-link`
- **Backend hooks**:
  - OAuth: `/api/auth/github`, `/api/auth/google` redirects
  - `POST /api/auth/magic-link { email }`

### `src/components/ShareModal.tsx`
- **Action**: MODIFY
- **Keep**: All layout, privacy options, embed code display, animations
- **Modify**:
  - Share URL: Generate via POST `/api/projects/:id/share` → real short URL
  - Email invite: POST `/api/projects/:id/invite { email }`
- **Backend hooks**:
  - `POST /api/projects/:id/share` → `{ url }`
  - `POST /api/projects/:id/invite { email }`

### `src/components/VersionHistoryPanel.tsx`
- **Action**: KEEP (with prop changes)
- **Keep**: All layout, timeline design, node styles, restore/fork button designs
- **Backend hooks**: Receives `versions[]` prop — parent must load from DB

### `src/components/CommandPalette.tsx`
- **Action**: KEEP
- **Keep**: All layout, keyboard navigation, search, group rendering, animations
- **Modify**: "Recent Projects" group — source from `GET /api/projects?limit=5&sort=updatedAt`

### `src/components/ToastStack.tsx`
- **Action**: KEEP — copy verbatim

### `src/components/KeyboardShortcutOverlay.tsx`
- **Action**: KEEP — copy verbatim

### `src/components/NetworkErrorBanner.tsx`
- **Action**: KEEP — copy verbatim (remove Shift+E demo trigger in production)

### `src/components/ForgeOverlay.tsx`
- **Action**: KEEP — copy verbatim

### `src/components/IntroSequence.tsx`
- **Action**: KEEP — copy verbatim

### `src/components/ConfirmationModal.tsx`
- **Action**: KEEP — copy verbatim

### `src/components/icons.tsx`
- **Action**: KEEP — copy verbatim

---

## State Management

### `src/store/AppContext.tsx`
- **Action**: MODIFY (major)
- **Keep**: Context structure, `useApp()` hook signature, all dispatch action names, all existing reducer cases, `addToast()`, `openModal()`, `closeModal()`
- **Modify**:
  - `initialState.currentUser`: Load from session/cookie on mount
  - `initialState.projects`: Load from `GET /api/projects` on mount
  - `createProject()`: Replace with async API call
  - All project CRUD dispatches: Wrap with API calls + optimistic updates
  - `SEED_NOTIFICATIONS`: Replace with `GET /api/notifications`
- **Add**:
  - `SET_PROJECTS` action (bulk project load from DB)
  - `SET_NOTIFICATIONS` action
  - Loading state for initial data fetch
- **Backend hooks**: Every project mutation + auth restore

---

## Styling Files

### `src/index.css`
- **Action**: KEEP — copy verbatim
- **Do not modify** design tokens, keyframes, or utility classes
- **Only safe addition**: `@media (prefers-reduced-motion: reduce)` handler for motion toggle

---

## Asset Files

### `src/imports/Animated_wallpaper_particles_energy_202607151634.mp4`
- **Action**: KEEP — move to `public/` or CDN
- **Used by**: `HomePage.tsx` video background

### `src/imports/image*.png`, `src/imports/pasted_text/*.md`
- **Action**: SKIP — handoff docs only

---

## Files to NOT Copy

| File | Reason |
|------|--------|
| `src/imports/image.png` | Reference screenshot only |
| `src/imports/image-1.png` | Reference screenshot only |
| `src/imports/image-2.png` | Reference screenshot only |
| `src/imports/pasted_text/` | All audit/handoff docs |
| `plans/` | Planning docs |
| `SHANGO_*.md` (root) | All handoff docs |
| `.mise.toml` | Figma Make toolchain config |
| `vite.config.ts` | May need adjustment for VS Code/Antigravity build system |

---

## Dependency Changes for VS Code

### Keep (already correct)
```json
"react": "^19.0.0"
"react-dom": "^19.0.0"
"react-router-dom": "^7.0.0"
"typescript": "^5.0.0"
```

### Add
```json
"@supabase/supabase-js": "^2.x"    // if using Supabase
"openai": "^4.x"                    // or openrouter HTTP fetch
"zod": "^3.x"                       // API response validation
"@tanstack/react-query": "^5.x"    // data fetching + cache
```

### Remove / Replace
```
lucide-react 1.24.0  // currently installed but unused — icons.tsx uses inline SVGs
                     // keep icons.tsx, skip lucide
```

---

## Environment Variables Required

```bash
# Backend (never exposed to frontend)
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
JWT_SECRET=

# Frontend (safe to expose)
VITE_API_BASE_URL=https://api.shango.app
VITE_APP_URL=https://shango.app
```
