# SHANGO — Current Architecture
**Handoff Reference · Based on SHANGO_CURRENT_UI_INVENTORY.md · 2026-07-21**

---

## Route Structure

| Route | Purpose | Nav Entry | Status |
|-------|---------|-----------|--------|
| `/` | Hero omnibox (signed-out) + project hub (signed-in) | App root, `<Navigate to="/">`, `⌘H` | Functional |
| `/projects` | Project library — browse, filter, CRUD | Sidebar "Projects", `⌘K` | Functional (in-memory) |
| `/project/:projectId` | Builder workspace | HomePage submit, ProjectsPage "Open" | Functional (mock AI) |
| `/settings` | User preferences (8 tabs) | Sidebar → ProfilePanel → Settings | Functional (localStorage) |
| `/templates` | 15 hardcoded template cards | Sidebar "Templates" | Visual-only |
| `/community` | Community hub (mock data) | Unreachable from sidebar (Discord link replaced it) | Visual-only |
| `/skills` | AI skill library | Sidebar "Skills" | Visual-only (mock toggles) |
| `/deployments` | Deployment history + domains + perf | Sidebar "Deployments" | Visual-only (mock data) |
| `/integrations` | Connector browser | (No sidebar link — only accessible by direct URL) | Visual-only (mock toggles) |

---

## Component Hierarchy

```
App
├── AppProvider (AppContext + useReducer)
│   └── AppShell
│       ├── IntroSequence          (boot animation, unmounts after ~1.6s)
│       └── RouterProvider
│           └── RootLayout
│               ├── NetworkErrorBanner  (fixed top, conditional)
│               ├── Outlet              (page content)
│               ├── ForgeOverlay        (full-screen build animation, global)
│               ├── ToastStack          (fixed bottom-right, global)
│               ├── CommandPalette      (⌘K overlay, global)
│               ├── KeyboardShortcutOverlay  (⌘/ overlay, global)
│               ├── AuthSheet           (modal, open when state.modal === 'auth')
│               └── ConfirmationModal   (modal, open when state.modal === 'confirm')
│
├── / → HomePage
│   ├── Sidebar (signed-in only)
│   │   ├── NavItem × 4  (Home, Projects, Templates, Community)
│   │   ├── NavItem × 3  (Deployments, Connectors, Skills)
│   │   ├── ProfilePanel (popover, position: fixed)
│   │   └── ConnectorsDrawer (full-screen overlay)
│   └── Hero / HubContent (inline — no separate component)
│       ├── <video> background
│       ├── Omnibox textarea
│       ├── Plan|Build toggle
│       ├── Model selector dropdown
│       └── HUB_TEMPLATES grid (signed-in)
│
├── /projects → ProjectsPage
│   ├── Sidebar
│   └── ProjectCard × n  (grid or list variant)
│
├── /project/:id → BuilderScreen
│   ├── Header (inline — no separate component)
│   │   ├── LEFT: avatar · divider · ProjectContextMenu · panel-toggle
│   │   ├── CENTER: URL bar · "Open in New Tab" button
│   │   └── RIGHT: viewport-cycle · divider · CodeInspector · GitHub · fullscreen · divider · Share · Deploy
│   ├── ProjectContextMenu (dropdown, inline component)
│   ├── ConversationPanel
│   │   ├── Tab: Chat
│   │   │   ├── ChatMessage bubbles (user / assistant)
│   │   │   └── NextStepChips (after last assistant message)
│   │   ├── Tab: History (HistoryTimeline — version nodes)
│   │   ├── Tab: Context (model info · token bar · active skills · project info)
│   │   └── ForgeInput (bottom — textarea · Plan|Build · model · attach · submit · skill pills · char count)
│   ├── PreviewPanel
│   │   ├── BuildProgressBar (during isGenerating)
│   │   ├── MockAppPreview (category-matched fake UI)
│   │   ├── Fullscreen overlay controls
│   │   └── CodeEditor (right drawer, 440px, opens on ⌘E)
│   │       ├── Header: sync · console-toggle · export
│   │       ├── Pages & Routes dropdown
│   │       ├── Tab: File Explorer (CODE_FILES list + syntax view)
│   │       └── Tab: Console (consoleLogs entries)
│   ├── VersionHistoryPanel  (right slide-in, ⌘Y)
│   ├── ShareModal           (center modal, ⌘S)
│   └── ConnectorsDrawer     (full-screen overlay)
│
├── /settings → SettingsPage
│   └── Tabs: general · api-keys · models · skills · appearance · billing · shortcuts · privacy
│
├── /templates → TemplatesPage
│   ├── Sidebar
│   └── TemplateCard × 15
│
├── /community → CommunityPage
│   └── Tabs: home · explore · projects · builders · knowledge · teams · events
│
├── /skills → SkillsPage
│   └── SkillCard × n
│
├── /deployments → DeploymentPage
│   └── Tabs: overview · history · domains · variables · performance
│
└── /integrations → IntegrationsPage
    └── ConnectorCard × n
```

---

## State Architecture

### AppContext (`src/store/AppContext.tsx`)

Single global store. All components consume via `useApp()`.

```
AppContext (React Context)
└── AppProvider
    └── useReducer(reducer, initialState)
        │
        ├── currentUser: User | null
        │     Set by: AuthSheet handleOAuth/handleMagicLink (mock)
        │     Cleared by: ProfilePanel sign-out
        │
        ├── projects: Project[]
        │     Mutated by: ADD_PROJECT, UPDATE_PROJECT, DELETE_PROJECT,
        │                 DUPLICATE_PROJECT, FORK_PROJECT, ARCHIVE_PROJECT
        │     Source: createProject() client-side factory
        │
        ├── toasts: Toast[]
        │     Mutated by: ADD_TOAST, REMOVE_TOAST
        │     Consumed by: ToastStack
        │
        ├── modal: string | null
        │     Values: 'auth' | 'deploy' | 'share' | 'export' | 'confirm' | null
        │     Mutated by: OPEN_MODAL, CLOSE_MODAL
        │
        ├── confirmPayload: ConfirmPayload | null
        │     Mutated by: OPEN_MODAL 'confirm' with payload
        │
        ├── notifications: Notification[]
        │     Seeded: 3 items in initialState
        │     Mutated by: ADD_NOTIFICATION, REMOVE_NOTIFICATION, CLEAR_NOTIFICATIONS
        │
        ├── enabledSkills: string[]
        │     Mutated by: ENABLE_SKILL, DISABLE_SKILL
        │     Displayed: Sidebar badge, ConversationPanel Context tab, ForgeInput pills
        │
        ├── connectedConnectors: string[]
        │     Mutated by: CONNECT_CONNECTOR, DISCONNECT_CONNECTOR
        │     Displayed: Sidebar badge, ConnectorsDrawer toggle states
        │
        ├── commandPaletteOpen: boolean
        │     Mutated by: TOGGLE_COMMAND_PALETTE
        │     Consumed by: CommandPalette
        │
        ├── shortcutOverlayOpen: boolean
        │     Mutated by: TOGGLE_SHORTCUTS
        │     Consumed by: KeyboardShortcutOverlay
        │
        └── isForge: boolean
              Mutated by: SET_FORGE
              Consumed by: ForgeOverlay
```

### localStorage

| Key | Shape | Owner | Synced to server |
|-----|-------|-------|-----------------|
| `shango_sidebar` | `'true' \| 'false'` | HomePage, Sidebar | No |
| `shango_settings` | `{ model, motion, telemetry, crashReports, accent, density }` | SettingsPage | No |

### BuilderScreen Local State

All local to `BuilderScreen` component. Lost on unmount/refresh.

```
BuilderScreen (local useState / useReducer)
├── messages: ChatMessage[]          ← conversation thread
├── versions: Version[]              ← version history nodes
├── consoleLogs: ConsoleEntry[]      ← fake build output
├── isGenerating: boolean            ← AI response in progress
├── buildSuccess: boolean            ← brief visual feedback
├── previewKey: number               ← incremented to force re-render
├── activeTab: 'chat'|'history'|'context'
├── viewport: 'desktop'|'tablet'|'mobile'
├── codeView: boolean                ← CodeEditor drawer open
├── conversationCollapsed: boolean
├── fullscreen: boolean
├── shareOpen: boolean
├── historyOpen: boolean
├── connectorsOpen: boolean
├── activeFile: string               ← selected file in CodeEditor
├── consoleOpen: boolean
└── forgeInputValue: string
```

### ConversationPanel Local State

```
ConversationPanel (local useState)
├── selectedModel: 'balanced'|'fast'|'powerful'
├── inputValue: string
├── mode: 'plan'|'build'
└── voiceActive: boolean
```

---

## Data Models

All defined in `src/store/AppContext.tsx`.

### Canonical Ownership Model

```text
Project.files
        ↓
GeneratedArtifact (temporary transport)
        ↓
Project.artifact (derived render projection)
        ↓
Preview
```

Project.files is the canonical workspace. Project.artifact is derived for UI convenience and preview rendering. GeneratedArtifact exists only as a temporary transport object during generation.

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

## API / Integration Status

| Integration | Component | Status | Notes |
|-------------|-----------|--------|-------|
| GitHub OAuth | `AuthSheet.tsx` | **MOCKED** | `handleOAuth()` calls `setCurrentUser()` directly |
| Google OAuth | `AuthSheet.tsx` | **MOCKED** | Same as above |
| Email Magic Link | `AuthSheet.tsx` | **MOCKED** | No email sent, success state shown immediately |
| LLM / AI | `BuilderScreen.tsx`, `ConversationPanel.tsx` | **MOCKED** | `buildAIResponse()` keyword switch |
| Supabase | ConnectorsDrawer, SkillsPage | **NOT CONNECTED** | Listed as connector; no SDK imported |
| Vercel | ConnectorsDrawer, DeploymentPage | **NOT CONNECTED** | Listed as connector; no API calls |
| Paystack | ConnectorsDrawer | **NOT CONNECTED** | Listed as connector; no SDK imported |
| OpenAI | ConnectorsDrawer | **NOT CONNECTED** | Listed as connector only |
| Cloudflare | ConnectorsDrawer | **NOT CONNECTED** | Listed as connector only |
| Anthropic API | SettingsPage | **UI ONLY** | Key input stored in component state, never used |
| OpenRouter | SettingsPage | **UI ONLY** | Key input stored in component state, never used |
| GitHub (builder) | BuilderScreen header button | **UI ONLY** | Button present, behavior unknown |
| `navigator.clipboard` | `ShareModal.tsx` | **REAL** | Browser API, works in supported browsers |
| `localStorage` | SettingsPage, HomePage, Sidebar | **REAL** | Reads/writes confirmed functional |
| Discord | Sidebar Community item | **REAL** | `window.open('https://discord.gg/shango', '_blank')` |

---

## Architecture Risks

### 1. All project data is ephemeral
`projects[]` lives exclusively in `AppContext` (React state). A page refresh destroys all projects, messages, and versions. There is no persistence layer for project data.

### 2. Auth state resets on refresh
`currentUser` is set in React state with no session token, cookie, or localStorage backup. Every refresh requires re-authenticating.

### 3. No AI backend
`buildAIResponse()` is a keyword-matching string function. The preview is a static mock. No LLM calls are made. The entire build pipeline is simulated client-side.

### 4. API keys stored insecurely
SettingsPage API key inputs are controlled component state — not persisted, not encrypted, not passed to any server. An engineer connecting real model providers must implement secure key storage (env vars or server-side vault).

### 5. `/community` route is orphaned
The sidebar "Community" nav item now opens Discord externally. The `/community` route still exists and renders `CommunityPage` but is unreachable from the main navigation.

### 6. `/integrations` route has no nav entry
`IntegrationsPage` exists at `/integrations` but no sidebar item or page link points to it. It is only reachable by direct URL.

### 7. Single AppContext for all state
AppContext holds UI state (toasts, modals, command palette) alongside domain state (projects, users, connectors). These concerns should be separated before scaling.

### 8. No code splitting or lazy loading
All 9 pages and 15+ components are imported eagerly in `App.tsx`. First paint will be slow once the codebase grows.
