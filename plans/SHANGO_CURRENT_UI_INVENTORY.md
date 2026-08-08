# SHANGO — Current UI Inventory
**Engineering Handoff Document · Generated 2026-07-21**
> Source of truth: existing codebase. Nothing invented. Uncertain items marked UNKNOWN.

---

## 1. CURRENT ROUTES AND PAGES

| Route | Page | Status |
|-------|------|--------|
| `/` | HomePage | Functional (visual + mock data) |
| `/projects` | ProjectsPage | Functional (visual + mock data) |
| `/project/:projectId` | BuilderScreen | Functional (visual + mock AI) |
| `/settings` | SettingsPage | Functional (localStorage persistence) |
| `/templates` | TemplatesPage | Visual-only |
| `/community` | CommunityPage | Visual-only |
| `/skills` | SkillsPage | Visual-only (mock state toggles) |
| `/deployments` | DeploymentPage | Visual-only (mock data) |
| `/integrations` | IntegrationsPage | Visual-only (mock toggles) |
| `*` | → redirect `/` | Functional |

### `/` — HomePage
- **Purpose**: Entry point. Signed-out: hero omnibox + template gallery. Signed-in: project hub with sidebar.
- **User actions**: Type a prompt, select Plan/Build mode, select model, browse hub templates, navigate to projects/templates.
- **Components rendered**: `Sidebar`, `IntroSequence`, hero omnibox (inline), `HUB_TEMPLATES` grid (6 cards).
- **Navigation in**: App root / any `<Navigate to="/" />` redirect.
- **Navigation out**: `/project/:id` on prompt submit, `/projects`, `/templates`, `/settings`.
- **State**: `omniValue`, `omniFocused`, `mode` (plan|build), `selectedModel`, `sidebarCollapsed` (localStorage), `voiceActive`.
- **Functional**: Prompt submission creates a mock project via `createProject()` and navigates to `/project/:id`. Voice input is a 2-second simulation.

### `/projects` — ProjectsPage
- **Purpose**: Full project library with filter, search, grid/list toggle.
- **User actions**: Filter (all/live/draft/archived), search, rename (inline), open, duplicate, fork, archive, delete.
- **Components rendered**: `Sidebar`, `ProjectCard` (grid/list variants), `SkeletonGrid` (loading state), confirmation modals.
- **Navigation in**: Sidebar "Projects", HomePage signed-in hub, `⌘K` command palette.
- **Navigation out**: `/project/:id` on Open.
- **Functional**: CRUD operations update `AppContext` state (in-memory only, lost on refresh).

### `/project/:projectId` — BuilderScreen
- **Purpose**: Main AI builder workspace.
- **Components rendered**: `ProjectContextMenu`, `ConversationPanel`, `PreviewPanel`, `ConnectorsDrawer`, `VersionHistoryPanel`, `ShareModal`, deploy/export modals (UNKNOWN — DeployModal not found as separate file).
- **Navigation in**: ProjectsPage, HomePage prompt submit.
- **Navigation out**: `⌘H` → `/`, ProjectContextMenu "Go to Dashboard" → `/`.
- **Functional**: All AI responses are mocked (`buildAIResponse()`). Build console logs are fake. Preview renders mock UI based on project name keyword matching.

### `/settings` — SettingsPage
- **Purpose**: User preferences across 8 tabs.
- **Tabs**: general, api-keys, models, skills, appearance, billing, shortcuts, privacy.
- **Functional**: Appearance, model, motion, telemetry, crashReports settings persist to `localStorage` key `shango_settings`. API key inputs (OpenRouter, Anthropic) are UI-only — values not validated or used. Billing section is visual-only.

### `/templates` — TemplatesPage
- **Purpose**: Browse 15 hardcoded templates by category.
- **Categories**: all, saas, ecommerce, dashboard, portfolio, api, mobile.
- **Functional**: Template cards are visual. "Use template" action behavior: UNKNOWN (likely navigate to `/` with prompt pre-filled — not verified).

### `/community` — CommunityPage
- **Purpose**: Community hub with projects, builders, knowledge, teams, events.
- **Tabs**: home, explore, projects, builders, knowledge, teams, events.
- **Functional**: All data is hardcoded mock arrays. Search, filter, and tab switching work. `BuilderProfileSheet` and `ProjectShowcaseSheet` modals open. No real data.
- **Note**: Sidebar "Community" nav item now opens `https://discord.gg/shango` in a new tab — this route still exists but is no longer reachable from sidebar nav.

### `/skills` — SkillsPage
- **Purpose**: Browse, install, enable/disable AI skills.
- **Functional**: Install/remove and enable/disable update `AppContext` state. No actual skill download or activation.

### `/deployments` — DeploymentPage
- **Purpose**: Deployment history, domains, env vars, performance.
- **Tabs**: overview, history, domains, variables, performance.
- **Functional**: All data is mock `DeploymentRecord[]` in context. Pause/rollback/redeploy trigger toasts only.

### `/integrations` — IntegrationsPage
- **Purpose**: Browse and connect external service integrations.
- **Functional**: Toggle connection state updates `AppContext`. No credential exchange or OAuth redirect.

---

## 2. CURRENT GLOBAL NAVIGATION

### Sidebar (`src/components/Sidebar.tsx`)

**Width**: 52px collapsed / 200px expanded. Manual toggle only (no hover expand).

#### Primary Nav (NAV_ITEMS)

| Label | Icon | Destination | Behavior | Functional |
|-------|------|-------------|----------|------------|
| Home | `HomeIcon` | `/` | `navigate('/')` | ✅ |
| Projects | `AppsIcon` | `/projects` | `navigate('/projects')` | ✅ |
| Templates | `TemplatesIcon` | `/templates` | `navigate('/templates')` | ✅ |
| Community | `CommunityIcon` | `https://discord.gg/shango` | `window.open(..., '_blank', 'noopener,noreferrer')` | ✅ |

#### Bottom Utilities (BOTTOM_ITEMS)

| Label | Icon | Destination | Behavior | Badge | Functional |
|-------|------|-------------|----------|-------|------------|
| Deployments | `DeployIcon` | `/deployments` | `navigate('/deployments')` | — | ✅ |
| Connectors | `IntegrationsIcon` | — | Opens `ConnectorsDrawer` | connected count | ✅ (mock) |
| Skills | `ZapIcon` | `/skills` | `navigate('/skills')` | enabled count | ✅ (mock) |

#### Profile Zone (bottom of sidebar)
- Circular avatar with initials (authenticated) or lock icon (anonymous).
- Click: opens `ProfilePanel` popover (authenticated) or `openModal('auth')` (anonymous).
- Collapsed: shows only avatar. Expanded: avatar + name + plan label + caret.

---

## 3. CURRENT PROJECT / DASHBOARD STRUCTURE

### Project Cards (ProjectsPage)
- Grid view: card with `projectAccent()` color header, name, status badge, timestamp, tech tags.
- List view: single row with name, status, date, actions.
- Context menu per card: Open, Rename (inline edit), Duplicate, Fork, Archive, Delete.
- Confirmation modal before Delete.

### Project Creation
- From HomePage omnibox: `createProject(prompt)` → `dispatch({ type: 'ADD_PROJECT', payload })` → `navigate('/project/:id')`.
- `createProject()` generates: id (timestamp), name (derived from prompt), status: 'DRAFT', seed messages, 2 seed versions, timestamps.

### Project Metadata Shown
- Name, status (`LIVE`/`DRAFT`/`ARCHIVED`), createdAt/updatedAt timestamps.
- Tech tags (derived from project name keywords).
- `projectAccent(name)` — hue value 0–360° for card color identity.

### Recent Projects
- HomePage signed-in hub shows "Recently viewed" tab (up to 3 most recent by `updatedAt`).
- UNKNOWN: Actual recently-viewed tracking not verified — may use project array order.

### ProjectContextMenu (BuilderScreen header)
Dropdown attached to the project title in the builder header:
- Go to Dashboard (`⌘H`) → `navigate('/')`
- Project Settings → opens project settings modal
- Project Connectors → opens `ConnectorsDrawer`
- Remix / Duplicate → `dispatch({ type: 'DUPLICATE_PROJECT' })` + toast
- Move to Folder — visual item, UNKNOWN behavior
- Star/Favorite toggle — visual item, UNKNOWN if persisted
- Notification expandable row — shows `notifications[]` from context
- Resource meter — credits bar (`creditsUsed / creditsTotal`)

---

## 4. CURRENT WORKSPACE (BuilderScreen)

### Canonical ownership model (future)

```text
Current implementation
  → UI and preview are centered on artifact-like state

Future canonical ownership
  → Project.files is the workspace source of truth
  → Project.artifact is a derived render projection
  → GeneratedArtifact is temporary transport only
```

### Top Navigation Bar (Header)

**LEFT cluster** (left-to-right):
1. Profile avatar (opens ProfilePanel popover)
2. Divider
3. `ProjectContextMenu` — project title dropdown (see §3)
4. Panel toggle button — icon-only, collapses/expands conversation panel

**CENTER**: URL bar showing `shango.local/{slug}` with "Open in New Tab ↗" button.

**RIGHT cluster** (left-to-right):
1. Viewport cycle — single button cycling `desktop → tablet → mobile → desktop` with icon swap
2. Divider
3. Code Inspector (`⌘E`) — opens right drawer
4. GitHub button — visual only (UNKNOWN behavior)
5. Fullscreen button
6. Divider
7. Share button → `ShareModal`
8. Deploy button → deploy modal (UNKNOWN separate component)

**Keyboard shortcuts** (all in `useEffect` keydown handler):
- `⌘P` — toggle conversation panel
- `⌘Y` — toggle `VersionHistoryPanel`
- `⌘D` — open deploy modal
- `⌘S` — open `ShareModal`
- `⌘H` — `navigate('/')`
- `⌘E` — toggle code view
- `⌘,` — open project settings modal
- `⌘1/2/3` — set viewport (desktop/tablet/mobile)
- `⌘R` — regenerate last response

### Conversation Area (ConversationPanel)

**File**: `src/components/ConversationPanel.tsx`

**Tabs**:
1. **Chat** — message thread with user/assistant bubbles, copy and regenerate actions per message, `NextStepChips` below last assistant message.
2. **History** — version timeline nodes with Restore / Fork buttons. Current version marked with white dot + glow.
3. **Context** — shows active model (name + token limit), estimated context usage bar, active skills list, project info (name, status, created date).

**ForgeInput (bottom of ConversationPanel)**:
- Textarea for chat messages.
- Plan/Build mode capsule toggle.
- Model selector (balanced/fast/powerful).
- Attach button (paperclip icon) — UNKNOWN behavior.
- Submit button (arrow icon) — sends message.
- Active skill pills (up to 3, from `enabledSkills`).
- Character count — appears when `value.length > 200`, red at `> 900`.
- Model indicator (mono text, bottom-left of toolbar).
- Voice input button — UNKNOWN behavior in conversation context.

**Message types**:
```typescript
ChatMessage { id, role: 'user'|'assistant', content, timestamp }
```

**Generating state**: Animated typing indicator (3 bouncing dots).

**`PROMPT_SUGGESTIONS`**: 4 chips shown below empty state — "Add dark mode", "Mobile responsive", "Add animations", "Improve layout".

**`NextStepChips`**: 3 chips deterministically selected from pool of 10, seeded by project name. Shown below last assistant message.

### Preview Area (PreviewPanel)

**File**: `src/components/PreviewPanel.tsx`

**Canonical ownership note**: The future architecture treats Preview as a derived view of Project.files. The current implementation remains UI-centric, but the intended ownership model is:

```text
Project.files
  → derived artifact/projection
  → PreviewPanel
```

**States**:
- Building: animated progress bar, `ForgeOverlay` full-screen quote animation.
- Preview: `MockAppPreview` iframe-like container.
- Code view: `CodeEditor` right drawer.
- Fullscreen: fixed overlay filling viewport.

**Viewport sizes**: desktop (100%), tablet (768px fixed), mobile (390px fixed).

**MockAppPreview**: Category-detected UI mockup (not a real running app). Categories: Healthcare, Fintech, Savings, Logistics, Marketplace, Agri, Events, Education, Dashboard (default). Each has 3 build phases (building → intermediate → complete).

### Code Inspector / CodeEditor

**Future canonical ownership**: Code Explorer reads from Project.files. The current UI remains a presentation layer over the workspace and should eventually be driven by the canonical file state rather than a rendered artifact snapshot.

Opened by `⌘E` or clicking Code Inspector button. Right drawer, 440px wide.

**Header row buttons**: Sync/reload, Console toggle, Export.

**Pages & Routes dropdown**: Shows `APP_ROUTES` array (`/`, `/dashboard`, `/checkout`, `/profile`, `/settings`).

**Sub-tabs**:
- **File Explorer**: Lists `CODE_FILES` (App.tsx, styles.css, components/Header.tsx). Clicking a file shows syntax-highlighted code with line numbers.
- **Console**: Shows `consoleLogs[]` — entries of `{ level: 'info'|'success'|'warn'|'error', message, timestamp }`. Fake build output generated by `buildConsoleLogs()`.

### Version History (VersionHistoryPanel)

Opened by `⌘Y` or header button. Right-side slide-in panel.

**Props**: `versions: Version[]` — from `project.versions` in context.

**Version interface**: `{ id, number, label, timestamp, prompt?, isCurrent }`.

**Actions**: Hover over node → "Restore" and "Fork" appear. Selecting shows detail panel at bottom with "Restore this version" CTA.

**Functional**: Restore and Fork dispatch reducer actions (in-memory only).

### Connectors (ConnectorsDrawer)

Full-screen overlay. Opened from sidebar Connectors item, ProjectContextMenu, or `⌘K` command palette.

**6 hardcoded integrations**: GitHub, Supabase, Vercel, Paystack, OpenAI, Cloudflare.

**Per connector**: toggle (connect/disconnect), manage panel (API key field, region field, "Configure credentials →" button). All mock — no actual credential exchange.

### Share (ShareModal)

**File**: `src/components/ShareModal.tsx`

**Privacy modes**: Private, Public, Embed.

**Actions**: Copy link (uses `navigator.clipboard` — real browser API), copy embed code, send email invite.

**URL format**: `shango.app/p/{projectId}` (hardcoded domain, not real).

---

## 5. CURRENT COMPONENT INVENTORY

| Component | File | Purpose | Used In | Reusable | Placeholder |
|-----------|------|---------|---------|----------|-------------|
| `Sidebar` | `src/components/Sidebar.tsx` | Global navigation rail | HomePage, ProjectsPage, TemplatesPage, CommunityPage, SkillsPage, DeploymentPage, IntegrationsPage | No (app-specific) | No |
| `ConversationPanel` | `src/components/ConversationPanel.tsx` | Chat interface + tabs | BuilderScreen | No | Partial (AI mock) |
| `PreviewPanel` | `src/components/PreviewPanel.tsx` | Preview + CodeEditor | BuilderScreen | No | Partial (mock preview) |
| `ProfilePanel` | `src/components/ProfilePanel.tsx` | User identity popover | Sidebar | No | Partial (auth mock) |
| `ConnectorsDrawer` | `src/components/ConnectorsDrawer.tsx` | Integration management overlay | Sidebar, BuilderScreen | No | Yes (mock) |
| `CommandPalette` | `src/components/CommandPalette.tsx` | ⌘K global command search | App.tsx (global) | No | Partial |
| `ShareModal` | `src/components/ShareModal.tsx` | Project sharing dialog | BuilderScreen | Yes | Partial (clipboard real, invite mock) |
| `VersionHistoryPanel` | `src/components/VersionHistoryPanel.tsx` | Version timeline | BuilderScreen | Yes | Partial (restore is in-memory) |
| `AuthSheet` | `src/components/AuthSheet.tsx` | Login/signup dialog | App.tsx (global) | Yes | Yes (no real auth) |
| `ToastStack` | `src/components/ToastStack.tsx` | Notification toasts | App.tsx (global) | Yes | No |
| `KeyboardShortcutOverlay` | `src/components/KeyboardShortcutOverlay.tsx` | Shortcut reference | App.tsx (global) | Yes | No |
| `NetworkErrorBanner` | `src/components/NetworkErrorBanner.tsx` | Top error banner | App.tsx (global) | Yes | No |
| `ForgeOverlay` | `src/components/ForgeOverlay.tsx` | Full-screen build animation | App.tsx (global) | No | Yes (triggers on fake build) |
| `IntroSequence` | `src/components/IntroSequence.tsx` | Boot animation | App.tsx | No | No |
| `ConfirmationModal` | `src/components/ConfirmationModal.tsx` | Confirm destructive actions | App.tsx (global), ProjectsPage | Yes | No |

**Important props summary:**

```typescript
// ConversationPanel
{ messages, versions, isGenerating, activeTab, setActiveTab, projectName? }

// PreviewPanel
{ project, conversationCollapsed, setConversationCollapsed, viewport, codeView,
  activeFile, setActiveFile, consoleOpen, setConsoleOpen, consoleLogs, setConsoleLogs,
  isRebuilding, buildSuccess, previewKey, fullscreen, setFullscreen, onExport? }

// ProfilePanel
{ open, onClose, sidebarCollapsed? }

// ConnectorsDrawer
{ open, onClose }

// ShareModal
{ open, onClose, projectName, projectId }

// VersionHistoryPanel
{ open, onClose, versions }

// AuthSheet
{ open, onClose }
```

---

## 6. CURRENT STATE

### React Context (`src/store/AppContext.tsx`)

Single global context via `AppProvider` + `useReducer`. All app state lives here.

**State shape:**
```typescript
AppState {
  currentUser: User | null
  projects: Project[]
  toasts: Toast[]
  modal: string | null               // 'auth' | 'deploy' | 'share' | 'export' | null
  confirmPayload: ConfirmPayload | null
  notifications: Notification[]      // seeded with 3 mock items
  enabledSkills: string[]
  connectedConnectors: string[]
  commandPaletteOpen: boolean
  shortcutOverlayOpen: boolean
  isForge: boolean
}
```

**Context values exposed:**
```typescript
{ state, dispatch, currentUser, openModal, closeModal, addToast, notifications }
```

**Reducer actions:**
`ADD_PROJECT`, `UPDATE_PROJECT`, `DELETE_PROJECT`, `DUPLICATE_PROJECT`,
`FORK_PROJECT`, `ARCHIVE_PROJECT`, `OPEN_MODAL`, `CLOSE_MODAL`,
`ADD_TOAST`, `REMOVE_TOAST`, `ADD_NOTIFICATION`, `REMOVE_NOTIFICATION`,
`CLEAR_NOTIFICATIONS`, `SET_CURRENT_USER`, `INSTALL_SKILL`, `UNINSTALL_SKILL`,
`ENABLE_SKILL`, `DISABLE_SKILL`, `CONNECT_CONNECTOR`, `DISCONNECT_CONNECTOR`,
`ADD_DEPLOYMENT`, `UPDATE_DEPLOYMENT`, `TOGGLE_COMMAND_PALETTE`,
`TOGGLE_SHORTCUTS`, `SET_FORGE`

### Local State (per component)

Heavy use of `useState` for UI-only state:
- BuilderScreen: `isGenerating`, `buildSuccess`, `previewKey`, `viewport`, `codeView`, `conversationCollapsed`, `fullscreen`, `shareOpen`, `historyOpen`, `connectorsOpen`, `messages`, `versions`, `consoleLogs`, `activeTab`, `activeFile`, `consoleOpen`, `forgeInputValue`.
- ConversationPanel: `selectedModel`, `inputValue`, `mode` (plan|build), `voiceActive`.
- PreviewPanel: `inspectorTab` (files|console), `routeOpen`, `syncPulse`, `fullscreen`.
- Sidebar: `profileOpen`, `connectorsOpen`, `logoHovered`.
- ProjectsPage: `filter`, `search`, `viewMode`, `renaming`.

### localStorage

| Key | Type | Controls | Set By |
|-----|------|----------|--------|
| `shango_sidebar` | `string ('true'|'false')` | Sidebar collapsed state | HomePage, Sidebar |
| `shango_settings` | `JSON string` | model, motion, telemetry, crashReports, accent, density | SettingsPage |

### Session Storage
None identified.

### URL State
- `/project/:projectId` — `projectId` param read via `useParams()`.
- No query params or hash state observed.

### Mock / Hardcoded State
- `SEED_NOTIFICATIONS` — 3 hardcoded notifications in context initial state.
- `HUB_TEMPLATES` — 6 hardcoded templates on HomePage.
- `TEMPLATES` — 15 hardcoded templates on TemplatesPage.
- `ALL_BUILDERS`, `ALL_SHOWCASE_PROJECTS`, `ALL_TEAMS`, `ALL_KNOWLEDGE`, `ALL_CHALLENGES` — all hardcoded in CommunityPage.
- `INTEGRATIONS` — 6 hardcoded connectors in ConnectorsDrawer.
- `CODE_FILES` — 3 hardcoded filenames in PreviewPanel CodeEditor.
- `APP_ROUTES` — 5 hardcoded routes in PreviewPanel CodeEditor dropdown.
- `NEXT_STEP_POOL` — 10 hardcoded next-step chip suggestions in ConversationPanel.
- `PROMPT_SUGGESTIONS` — 4 hardcoded prompt chips in ConversationPanel.
- `QUOTES` — 30 hardcoded quotes in ForgeOverlay.

---

## 7. CURRENT API AND BACKEND CONNECTIONS

| Integration | Where Referenced | Status |
|-------------|-----------------|--------|
| GitHub OAuth | `AuthSheet.tsx` | **Mocked** — `handleOAuth()` calls `setCurrentUser()` directly, no redirect |
| Google OAuth | `AuthSheet.tsx` | **Mocked** — same as above |
| Magic Link (email) | `AuthSheet.tsx` | **Mocked** — shows success state, no email sent |
| Supabase | ConnectorsDrawer, SkillsPage (listed) | **Not connected** — UI only |
| Vercel | ConnectorsDrawer, DeploymentPage (listed) | **Not connected** — UI only |
| Paystack | ConnectorsDrawer (listed) | **Not connected** — UI only |
| OpenAI | ConnectorsDrawer (listed) | **Not connected** — UI only |
| Cloudflare | ConnectorsDrawer (listed) | **Not connected** — UI only |
| Anthropic API | SettingsPage (API key input) | **Not connected** — key stored in UI state only |
| OpenRouter | SettingsPage (API key input) | **Not connected** — key stored in UI state only |
| AI/LLM (any) | BuilderScreen, ConversationPanel | **Mocked** — `buildAIResponse()` uses keyword matching |
| Discord | Sidebar Community item | **Real** — `window.open('https://discord.gg/shango', '_blank')` |
| `navigator.clipboard` | ShareModal | **Real** — browser clipboard API |
| localStorage | SettingsPage, HomePage, Sidebar | **Real** — reads/writes functional |

---

## 8. CURRENT BUILD FLOW

### User enters a prompt on HomePage → clicks Build
1. `handleSubmit()` called in HomePage.
2. `createProject(omniValue)` called — generates a `Project` object with mock data.
3. `dispatch({ type: 'ADD_PROJECT', payload: project })` — adds to context state.
4. `navigate('/project/' + project.id)` — routes to BuilderScreen.
5. BuilderScreen mounts, reads `projectId` from URL params, finds project in `state.projects`.
6. `ForgeOverlay` shown (cycling quotes animation for ~7 seconds).
7. `isGenerating` set to `true` — ConversationPanel shows typing indicator.
8. After timeout (~2–3s): mock AI response appended to `messages[]`, `isGenerating` → `false`.
9. `buildSuccess` briefly set `true` for visual feedback.
10. `MockAppPreview` renders keyword-matched UI based on project name.

### User sends a message in ConversationPanel
1. `handleSend()` in ConversationPanel (or ForgeInput in BuilderScreen).
2. User message appended to `messages[]` local state.
3. `isGenerating` → `true`.
4. `buildAIResponse(content)` called (keyword matching, returns string).
5. After 1.5–3s timeout: assistant message appended, `isGenerating` → `false`.
6. `previewKey` incremented → `MockAppPreview` re-renders.
7. `NextStepChips` shown below the new assistant message.

### User changes viewport
1. Viewport cycle button or `⌘1/2/3`.
2. `viewport` state updated: `'desktop' | 'tablet' | 'mobile'`.
3. `VIEWPORT_W` map applied to preview container width: `100% | 768px | 390px`.

### User opens Code Inspector (`⌘E`)
1. `codeView` toggle → `true`.
2. `CodeEditor` panel slides in from right (440px).
3. Default tab: "File Explorer" showing `CODE_FILES[0]` (App.tsx) with fake syntax highlighting.
4. Console tab: shows `consoleLogs[]` — fake build output entries.
5. Export button: calls `onExport()` prop → opens export modal (UNKNOWN: DeployModal or separate component).

### User opens Version History (`⌘Y`)
1. `historyOpen` → `true`.
2. `VersionHistoryPanel` mounts with `project.versions[]` (2 seed versions).
3. Click a version node → detail panel shown at bottom.
4. "Restore" → dispatches `UPDATE_PROJECT` with selected version's content. Toast shown.
5. "Fork" → dispatches `FORK_PROJECT`. Toast shown.

### User opens Connectors
1. Via sidebar Connectors item → `setConnectorsOpen(true)` in Sidebar.
2. Via ProjectContextMenu "Project Connectors" → `setConnectorsOpen(true)` in BuilderScreen.
3. `ConnectorsDrawer` renders full-screen overlay.
4. Toggle button → `dispatch({ type: 'CONNECT_CONNECTOR' | 'DISCONNECT_CONNECTOR', payload: id })`.
5. No real credential exchange.

---

## 9. CURRENT DATA MODELS

**File**: `src/store/AppContext.tsx`

```typescript
interface User {
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro'
  creditsUsed: number
  creditsTotal: number
}

interface Project {
  id: string
  name: string
  status: 'LIVE' | 'DRAFT' | 'ARCHIVED'
  messages: ChatMessage[]
  versions: Version[]
  createdAt: string
  updatedAt: string
  owner: string
  description?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Version {
  id: string
  number: number
  label: string
  timestamp: string
  prompt?: string
  isCurrent: boolean
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'default'
  action?: { label: string; onClick: () => void }
}

interface Notification {
  id: string
  message: string
  read: boolean
  timestamp: string
  link?: string
  // NOTE: no `type` field — TS6133 errors if type is added
}

interface Skill {
  id: string
  name: string
  monogram: string
  category: string
  languages: string[]
  version: string
  purpose: string
  enabled: boolean
}

interface Connector {
  id: string
  name: string
  desc: string
  monogram: string
  category: ConnectorCategory
  authType: 'oauth' | 'api-key' | 'token'
  requiredSkills: string[]
  usageCount: number
  featured: boolean
}

interface DeploymentRecord {
  id: string
  projectName: string
  status: 'pending' | 'deploying' | 'live' | 'failed'
  timestamp: string
  duration: number
  url: string
  shortUrl: string
  version: string
  target: DeployTargetId
  domains: Domain[]
  envVars: EnvVar[]
  buildLogs: string[]
  performance: PerformanceMetrics
}
```

---

## 10. CURRENT FILE STRUCTURE

```
/workspaces/default/code/
├── src/
│   ├── App.tsx                          # Router, RootLayout, AppShell
│   ├── main.tsx                         # React entry point
│   ├── index.css                        # Design tokens, keyframes, utility classes
│   ├── store/
│   │   └── AppContext.tsx               # Global state: useReducer + Context
│   ├── pages/
│   │   ├── HomePage.tsx                 # / route (signed-out hero + signed-in hub)
│   │   ├── BuilderScreen.tsx            # /project/:id route (workspace)
│   │   ├── ProjectsPage.tsx             # /projects route
│   │   ├── SettingsPage.tsx             # /settings route
│   │   ├── TemplatesPage.tsx            # /templates route
│   │   ├── CommunityPage.tsx            # /community route
│   │   ├── SkillsPage.tsx               # /skills route
│   │   ├── DeploymentPage.tsx           # /deployments route
│   │   └── IntegrationsPage.tsx         # /integrations route
│   ├── components/
│   │   ├── Sidebar.tsx                  # Global nav rail
│   │   ├── ConversationPanel.tsx        # Chat + tabs (History, Context)
│   │   ├── PreviewPanel.tsx             # Preview canvas + CodeEditor
│   │   ├── ProfilePanel.tsx             # User popover
│   │   ├── ConnectorsDrawer.tsx         # Full-screen integrations overlay
│   │   ├── CommandPalette.tsx           # ⌘K global command launcher
│   │   ├── ShareModal.tsx               # Share dialog
│   │   ├── VersionHistoryPanel.tsx      # Version timeline panel
│   │   ├── AuthSheet.tsx                # Login/signup dialog
│   │   ├── ToastStack.tsx               # Notification toasts
│   │   ├── KeyboardShortcutOverlay.tsx  # ⌘/ shortcut reference
│   │   ├── NetworkErrorBanner.tsx       # Top error banner
│   │   ├── ForgeOverlay.tsx             # Full-screen build animation
│   │   ├── IntroSequence.tsx            # Boot particle animation
│   │   ├── ConfirmationModal.tsx        # Confirm destructive actions
│   │   └── icons.tsx                    # All SVG icon components
│   └── imports/
│       ├── Animated_wallpaper_particles_energy_202607151634.mp4  # Hero background video
│       ├── image.png                    # Reference screenshots (handoff)
│       ├── image-1.png
│       ├── image-2.png
│       └── pasted_text/
│           └── shango-current-ui-inventory.md   # This brief
├── plans/
│   └── iridescent-drifting-squid.md    # Approved 6-phase polish plan
├── public/                              # Static assets (Vite served)
├── SHANGO_CURRENT_UI_INVENTORY.md       # This document
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .mise.toml                           # Node/pnpm toolchain versions
```

**Dependencies (package.json):**
- `react` 19, `react-dom` 19
- `react-router-dom` 7.18.1
- `lucide-react` 1.24.0 (installed, not currently imported — icons.tsx uses inline SVGs)
- `typescript` 5.7
- `vite` 8.0
- `tailwindcss` 4.0 (via Vite plugin)

---

## 11. CURRENTLY MISSING OR INCOMPLETE

### No backend / no persistence beyond localStorage
- All project data is lost on page refresh.
- No database connection (Supabase or otherwise).
- No session management — auth state resets on refresh.

### No real AI/LLM integration
- `buildAIResponse()` is a keyword-matching string switch, not an LLM call.
- No streaming, no context window management, no actual code generation.
- `PreviewPanel` shows category-matched mockup, not generated output.

### Authentication not functional
- OAuth redirects are simulated (no actual GitHub/Google OAuth flow).
- Magic link email is not sent.
- `currentUser` is set directly in client state — resets on refresh.
- No JWT, session token, or cookie management.

### No real deployment pipeline
- Deploy action dispatches a toast and appends a fake `DeploymentRecord`.
- No actual build execution (Vite build, Docker, Vercel API, etc.).
- `BuildLogs` are client-generated fake strings.

### DeployModal component
- `setDeployOpen(true)` referenced in BuilderScreen keyboard shortcut (`⌘D`).
- No separate `DeployModal.tsx` file found — UNKNOWN how this is currently rendered.

### GitHub integration
- GitHub button in header is present but its `onClick` behavior is UNKNOWN / possibly no-op.

### Export functionality
- Export button in CodeEditor calls `onExport()` prop.
- `onExport` is passed from BuilderScreen but the modal it opens is UNKNOWN.

### /community route unreachable from nav
- Sidebar Community item now opens Discord externally.
- `/community` route still exists and renders `CommunityPage` but no sidebar nav points to it.

### API keys not used
- OpenRouter and Anthropic keys entered in SettingsPage are stored in component state only — not persisted to localStorage, not passed to any API call.

### Skills not functional
- Enabled/disabled skills are tracked in context but not passed to or used by any build process.

### Connector credentials not stored
- API key fields in ConnectorsDrawer are controlled inputs but values are not persisted anywhere.

### Version history not persistent
- Versions array is seeded with 2 mock versions on project creation.
- Restore/Fork update in-memory state only — lost on refresh.

### Mobile/responsive layout
- Most pages are designed for desktop widths (min 1024px assumed).
- No `@media` breakpoints observed in index.css.
- BuilderScreen has no mobile layout — two-column layout collapses awkwardly.

### Console logs not real
- `buildConsoleLogs()` generates fake timestamped strings — no actual build output piped.

### Template "Use" action
- TemplatesPage template cards have a "Use template" / "Start building" interaction but where it navigates or how it pre-fills the omnibox is UNKNOWN.

---

## 12. ENGINEERING HANDOFF SUMMARY

### What already works
- Full React routing (all 9 routes functional, nav transitions smooth)
- Complete design system (tokens, typography, motion, dark theme)
- localStorage persistence (sidebar state, user settings)
- Toast system (fully wired to AppContext)
- CommandPalette with ⌘K (navigate + modal actions)
- Keyboard shortcut overlay (⌘/ reference)
- Intro sequence boot animation
- AuthSheet UI (OAuth + magic link form, no backend)
- ShareModal with real `navigator.clipboard` copy
- Sidebar collapse, badge counts, profile popover
- ProjectsPage CRUD UI (in-memory)
- ConversationPanel tabs, version timeline nodes, context panel
- Code Inspector sub-tabs (file explorer + console) inside ⌘E drawer
- Viewport cycling (desktop/tablet/mobile)
- ForgeOverlay build animation
- NetworkErrorBanner (Shift+E demo trigger)
- ConnectorsDrawer full-screen overlay

### What is UI-only (no backend)
- Build / AI response generation
- MockAppPreview (keyword-matched fake UI, not generated code)
- Template selection
- Version restore/fork (in-memory only)
- Deployment pipeline
- Skills install/enable
- Connector credentials management
- GitHub button in builder header
- Export action from CodeEditor

### What is mocked
- `buildAIResponse()` — keyword string switch
- `createProject()` — client-side object construction
- `buildConsoleLogs()` — fake build output strings
- Auth (OAuth + magic link) — `setCurrentUser()` called directly
- All DeploymentRecord data — constructed client-side
- All community/builder/team data — hardcoded arrays

### What is connected (real)
- `navigator.clipboard` (ShareModal copy)
- `localStorage` reads/writes (settings, sidebar)
- `window.open('https://discord.gg/shango')` (Community nav item)
- React Router navigation (all routes)
- All CSS animations and transitions

### What an engineering agent should inspect first
1. **`src/store/AppContext.tsx`** — replace mock CRUD with real API calls here. All state mutations flow through the reducer.
2. **`src/pages/BuilderScreen.tsx`** — `buildAIResponse()` is the stub to replace with real LLM streaming. `handleSend()` is the call site.
3. **`src/components/AuthSheet.tsx`** — `handleOAuth()` and `handleMagicLink()` are the auth stubs.
4. **`src/components/PreviewPanel.tsx`** — `MockAppPreview` is the stub to replace with a real sandboxed preview (iframe with generated output).
5. **`src/pages/SettingsPage.tsx`** — API key inputs need to persist to a secure store and be passed to LLM calls.
