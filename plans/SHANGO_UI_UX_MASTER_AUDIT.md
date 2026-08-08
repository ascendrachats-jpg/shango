# SHANGO UI/UX Master Audit
**Complete UI/UX Implementation Reference · 2026-07-21**
> Do not modify the UI. This document is the source of truth for the current SHANGO design.

---

## Phase 1 — Complete File Inventory

### A. Application Entry Files
| File | Purpose | Contains UI | Contains Logic | Mock Data | Needed in VS Code |
|------|---------|-------------|----------------|-----------|-------------------|
| `src/main.tsx` | React DOM root, mounts `<App />` | No | No | No | Yes |
| `src/App.tsx` | Router, RootLayout, AppShell, IntroSequence | Minimal | Yes | No | Yes |

### B. Routing Files
| File | Purpose | Notes |
|------|---------|-------|
| `src/App.tsx` | `createBrowserRouter` with 9 routes + RootLayout | Route definitions inline |

### C. Page / Screen Files
| File | Route | Purpose | UI | Logic | Mock Data | Needed |
|------|-------|---------|-----|-------|-----------|--------|
| `src/pages/HomePage.tsx` | `/` | Hero omnibox + signed-in hub | Yes | Partial | Yes (HUB_TEMPLATES) | Yes |
| `src/pages/BuilderScreen.tsx` | `/project/:id` | Main workspace | Yes | Partial | Yes (AI mock) | Yes |
| `src/pages/ProjectsPage.tsx` | `/projects` | Project library | Yes | Partial | No | Yes |
| `src/pages/SettingsPage.tsx` | `/settings` | User preferences | Yes | Yes (localStorage) | No | Yes |
| `src/pages/TemplatesPage.tsx` | `/templates` | Template browser | Yes | None | Yes | Yes |
| `src/pages/CommunityPage.tsx` | `/community` | Community hub | Yes | None | Yes | Yes (orphaned) |
| `src/pages/SkillsPage.tsx` | `/skills` | Skill library | Yes | Partial (mock toggle) | Yes | Yes |
| `src/pages/DeploymentPage.tsx` | `/deployments` | Deploy history | Yes | None | Yes | Yes |
| `src/pages/IntegrationsPage.tsx` | `/integrations` | Connector browser | Yes | None | Yes | Yes |

### D. Shared UI Components
| File | Purpose | UI | Reusable | Needed |
|------|---------|-----|---------|--------|
| `src/components/Sidebar.tsx` | Global nav rail | Yes | No (app-specific) | Yes |
| `src/components/ConversationPanel.tsx` | Chat + history + context tabs | Yes | No | Yes |
| `src/components/PreviewPanel.tsx` | Preview canvas + code inspector | Yes | No | Yes |
| `src/components/ProfilePanel.tsx` | User identity popover (sidebar) | Yes | No | Yes |
| `src/components/icons.tsx` | All SVG icon components | Yes | Yes | Yes |

### E. Modals and Sheets
| File | Purpose | Needed |
|------|---------|--------|
| `src/components/AuthSheet.tsx` | Login/signup | Yes |
| `src/components/ShareModal.tsx` | Project sharing | Yes |
| `src/components/ConfirmationModal.tsx` | Confirm destructive actions | Yes |
| `src/components/KeyboardShortcutOverlay.tsx` | Shortcut reference | Yes |

### F. Panels and Drawers
| File | Purpose | Needed |
|------|---------|--------|
| `src/components/ConnectorsDrawer.tsx` | Integration management | Yes |
| `src/components/VersionHistoryPanel.tsx` | Version timeline | Yes |

### G. State Management
| File | Purpose | Needed |
|------|---------|--------|
| `src/store/AppContext.tsx` | Global React Context + useReducer | Yes (major modifications needed) |

### H. Utility Files
| File | Purpose | Needed |
|------|---------|--------|
| `src/components/NetworkErrorBanner.tsx` | Top error banner | Yes |
| `src/components/ToastStack.tsx` | Toast notifications | Yes |

### I. Styling Files
| File | Purpose | Needed |
|------|---------|--------|
| `src/index.css` | Design tokens, keyframes, utility classes | Yes — copy verbatim |

### J–M. Asset Files
| File | Type | Used In | Needed |
|------|------|---------|--------|
| `src/imports/Animated_wallpaper_particles_energy_202607151634.mp4` | Video | HomePage hero background | Yes |
| `src/imports/image.png` | Image | Handoff reference only | No |
| `src/imports/image-1.png` | Image | Handoff reference only | No |
| `src/imports/image-2.png` | Image | Handoff reference only | No |

### N. Icons
| File | Description | Needed |
|------|-------------|--------|
| `src/components/icons.tsx` | ~25 inline SVG components: HomeIcon, AppsIcon, TemplatesIcon, IntegrationsIcon, DeployIcon, LockIcon, ZapIcon, CommunityIcon, SettingsIcon, DesktopIcon, TabletIcon, MobileIcon, etc. | Yes |

### O. Mock / Demo Data
All mock data is inline in the files that use it:
| Data | Location | Replace With |
|------|----------|-------------|
| `HUB_TEMPLATES` (6 items) | `HomePage.tsx` | Backend API |
| `buildAIResponse()` keyword switch | `BuilderScreen.tsx`, `ConversationPanel.tsx` | LLM API |
| `buildConsoleLogs()` | `BuilderScreen.tsx` | Real build output |
| `SEED_NOTIFICATIONS` (3 items) | `AppContext.tsx` | DB query |
| `createProject()` factory | `AppContext.tsx` | POST /api/projects |
| `ALL_BUILDERS`, `ALL_SHOWCASE_PROJECTS` etc. | `CommunityPage.tsx` | Backend API |
| `INTEGRATIONS` (6 hardcoded) | `ConnectorsDrawer.tsx` | Backend API |

### P. Files NOT to copy
| File | Reason |
|------|--------|
| `src/imports/pasted_text/*.md` | Handoff/audit docs only |
| `plans/*.md` | Planning docs only |
| `SHANGO_*.md` (root docs) | Handoff docs only |

---

## Phase 2 — Route and Screen Map

### Route: `/`
**Screen:** Home (Hero + Hub)
**Entry file:** `src/pages/HomePage.tsx`
**Purpose:** Entry point. Signed-out: omnibox prompt. Signed-in: project hub.
**How reached:** App root, `⌘H`, "Go to Dashboard", any `<Navigate to="/" />`
**How left:** Submit prompt → `/project/:id`; sidebar nav items
**Required state:** `currentUser` (AppContext) to branch signed-in/out view
**Possible states:**
- Signed-out hero: video BG + omnibox + keyboard hints
- Signed-in hub: sidebar + my projects + recently viewed + templates tabs
**Child components:** `Sidebar` (signed-in), hero omnibox (inline), HUB_TEMPLATES grid

### Route: `/projects`
**Screen:** Projects Library
**Entry file:** `src/pages/ProjectsPage.tsx`
**Purpose:** Browse, filter, search, manage all projects
**How reached:** Sidebar "Projects", `⌘K` "Projects"
**How left:** Click project → `/project/:id`; sidebar nav
**Required state:** `projects[]` from AppContext
**Possible states:**
- Loading (SkeletonGrid)
- Populated — grid view
- Populated — list view
- Filtered (all/live/draft/archived)
- Search active
- Empty (no projects)
**Child components:** `Sidebar`, `ProjectCard` (grid/list), `SkeletonGrid`, ConfirmationModal (delete)

### Route: `/project/:projectId`
**Screen:** Builder Workspace
**Entry file:** `src/pages/BuilderScreen.tsx`
**Purpose:** AI-powered project builder — conversation, preview, code, version history
**How reached:** ProjectsPage "Open", HomePage submit, template "Use"
**How left:** `⌘H` / "Go to Dashboard" → `/`; browser back
**Required state:** `projectId` param, matching `project` in AppContext
**Possible states:**
- Project not found → redirect to `/projects`
- Normal (conversation + preview)
- Conversation collapsed (preview full-width)
- Generating (AI response in progress)
- Code view open (inspector drawer)
- Fullscreen preview
- History panel open
- Any modal open (share/deploy/export/settings/connectors)
**Child components:** Header (inline), `ConversationPanel`, `PreviewPanel`, `ProjectContextMenu`, `BuilderProfilePopover`, `ForgeInput`, `VersionHistoryPanel`, `ShareModal`, `ConnectorsDrawer`, DeployModal, ExportModal, ProjectSettingsSheet

### Route: `/settings`
**Entry file:** `src/pages/SettingsPage.tsx`
**Purpose:** User preferences — model, appearance, API keys, billing, shortcuts
**How reached:** ProfilePanel → Settings; `⌘K` "Settings"; `⌘,` in builder
**How left:** Sidebar nav or browser back
**Tabs:** general, api-keys, models, skills, appearance, billing, shortcuts, privacy
**Persistence:** `localStorage('shango_settings')` → `{ model, motion, telemetry, crashReports, accent, density }`

### Route: `/templates`
**Entry file:** `src/pages/TemplatesPage.tsx`
**Purpose:** Browse 15 hardcoded template cards by category
**Categories:** all, saas, ecommerce, dashboard, portfolio, api, mobile
**Status:** Visual-only — "Use template" action behavior UNKNOWN

### Route: `/community`
**Entry file:** `src/pages/CommunityPage.tsx`
**Status:** Visual-only, orphaned (sidebar Community nav opens Discord externally)
**Tabs:** home, explore, projects, builders, knowledge, teams, events

### Route: `/skills`
**Entry file:** `src/pages/SkillsPage.tsx`
**Purpose:** Browse/install/enable AI skills
**Status:** Mock toggles update AppContext only

### Route: `/deployments`
**Entry file:** `src/pages/DeploymentPage.tsx`
**Tabs:** overview, history, domains, variables, performance
**Status:** Visual-only, all mock data

### Route: `/integrations`
**Entry file:** `src/pages/IntegrationsPage.tsx`
**Status:** Visual-only, no sidebar nav entry (direct URL only)

---

## Phase 3 — Complete Interaction Audit

### HomePage Interactions

**Omnibox Textarea**
- File: `HomePage.tsx` ~line 293
- Action: Type text → `setOmniValue(e.target.value)`
- Focus: `setOmniFocused(true)` → scale(1.02) on omnibox container + border-orbit animation
- Blur: `setOmniFocused(false)`
- Enter key: calls `handleSubmit()` if `canSubmit`
- Shift+Enter: newline

**Submit Button (Omnibox)**
- Disabled when `omniValue.trim().length === 0`
- onClick: `handleSubmit()` → `createProject(omniValue)` → `dispatch(ADD_PROJECT)` → `navigate('/project/:id')`
- No loading state currently (MOCK — should show spinner)

**Plan/Build Capsule Toggle**
- Two buttons: PLAN / BUILD
- Active: white background, dark text
- Inactive: transparent, muted text
- onClick: sets `mode` state

**Model Selector Dropdown**
- Trigger: button showing current model label
- Dropdown: fast / balanced / deep options
- onClick: sets `selectedModel` state

**Attach/Voice Buttons (Omnibox toolbar)**
- Attach: icon button, onClick shows toast "Attach files" (MOCK)
- Voice: icon button, onClick simulates voice input (2s delay, MOCK)

### BuilderScreen Header Interactions

**Profile Avatar (left)**
- 26×26px circle, top-left of header
- onClick: `setProfileOpen(v => !v)`
- Popover opens left-anchored, `position: absolute`, `top: calc(100% + 8px)`, `left: 0`

**Panel Toggle**
- Icon-only button (chevron left/right)
- onClick: `setConversationCollapsed(v => !v)`
- Icon changes: arrow-left when expanded, arrow-right when collapsed

**ProjectContextMenu Trigger**
- Shows project name + version count
- onClick: opens 260px dropdown
- Dropdown items: Go to Dashboard, Project Settings, Project Connectors, Remix/Duplicate, Move to Folder

**Open in New Tab (URL bar)**
- Small ↗ icon button
- onClick: `window.open('https://shango.local/{slug}', '_blank')`
- MOCK — not a real URL

**Viewport Cycle Button**
- Icon changes: monitor → tablet → phone based on `viewport` state
- onClick: cycles `desktop → tablet → mobile → desktop`
- Title: "Viewport: Desktop ⌘1/2/3"

**Code Inspector Button (⌘E)**
- onClick: `setCodeView(v => !v)`
- Opens 440px right drawer with file explorer + console

**GitHub Button**
- onClick: `addToast('Connect GitHub repository', 'default')` (MOCK)

**Fullscreen Button**
- onClick: `setFullscreen(v => !v)`
- Icon: expand / compress based on state
- ESC key also exits fullscreen

**Share Button**
- White background, labeled
- onClick: `setShareOpen(true)` → renders `<ShareModal />`

**Deploy Button**
- onClick: `setDeployOpen(true)` → renders `<DeployModal />`

**Resize Handle (between panels)**
- 6px draggable strip
- onMouseDown: initiates drag, tracks mousemove, constrains 240–560px
- Double-click: resets to 380px

### ConversationPanel Interactions

**Tab Bar (Chat / History / Context)**
- onClick: `setActiveTab(tab.id)`
- Active underline: 1.5px bar, scaleX animation 0.24s
- History tab shows version count badge

**Model Selector**
- Trigger button: lightning icon + model code ("S2-B/F/P")
- Dropdown popover: 3 model options
- Selection: `setSelectedModel(id)` + `addToast('Model switched...')` (MOCK)

**Message Bubble — User**
- Hover: reveals copy button + timestamp
- Copy button: `navigator.clipboard.writeText(message.content)` → toast

**Message Bubble — Assistant**
- Hover: reveals copy + regenerate buttons
- Copy: same as user
- Regenerate: triggers `handleWorkspaceSend` with last user message (MOCK)

**NextStepChips**
- 3 chips seeded from project name
- Click: no current implementation (chip label fills input — UNKNOWN, verify in code)

**ForgeInput — Textarea**
- Placeholder: "What should SHANGO build next?"
- Enter: calls `handleWorkspaceSend()`
- Shift+Enter: newline
- Grows up to `maxHeight: 160px`

**ForgeInput — Send Button**
- Disabled: `!input.trim() || isGenerating`
- onClick: `handleWorkspaceSend()`
- Title: "Build ↵"

**ForgeInput — Stop Button**
- Appears only when `isGenerating`
- Pulsing breathing animation
- onClick: `stopGeneration()` → clears AI timer, `setIsGenerating(false)`, toast

**ForgeInput — Plan/Build Toggle**
- Two-button capsule
- onClick: sets local `planMode` state (not connected to real routing)

**HistoryTimeline — Version Node**
- Hover: reveals Restore + Fork buttons
- Restore: marks version as current, toast "Version restored" (in-memory only)
- Fork: `dispatch({ type: 'FORK_PROJECT' })`, toast

### PreviewPanel Interactions

**Floating Chat Toggle (when collapsed)**
- Left edge, 22×44px
- onClick: `setConversationCollapsed(false)`

**Console Close Button**
- onClick: `setConsoleOpen(false)`

**Console Clear Button**
- onClick: `setConsoleLogs([])`

**CodeEditor — Sync Button**
- onClick: rotates 360° over 0.55s, `setPreviewKey(k => k + 1)` (MOCK refresh)

**CodeEditor — Console Toggle**
- onClick: toggles `inspectorTab` between 'files' and 'console'
- Badge shows log count during build

**CodeEditor — Export Button**
- onClick: calls `onExport()` → `setExportOpen(true)` in BuilderScreen
- MOCK — no actual export

**CodeEditor — File Tabs**
- onClick: `setActiveFile(filename)`
- Active tab: lighter background + bottom border indicator

**CodeEditor — Route Dropdown**
- Trigger: button with current route and grid icon
- Dropdown: 5 app routes (/, /dashboard, /checkout, /profile, /settings)
- onClick: selects route (display only — MOCK)

---

## Phase 4 — Builder Workspace Audit

### Layout Structure

```
BuilderScreen (flex-row, 100vw × 100vh)
├── Header (52px height, fixed top)
│   ├── LEFT: profile(26px) + divider + projectMenu(flexible) + panelToggle(30px)
│   ├── CENTER: URLbar(flexible) + openNewTab(26px)
│   └── RIGHT: viewport(28px) + divider + inspector(28px) + github(28px) + fullscreen(28px) + divider + share(70px) + deploy(80px)
├── Main content (flex-row, calc(100vh - 52px))
│   ├── ConversationPanel (width: panelWidth px, min 240, max 560)
│   │   default: 380px
│   ├── Resize handle (6px)
│   └── PreviewPanel (flex: 1, remaining width)
```

### Conversation Panel Detail

**Panel width**: controlled by drag resize (240–560px, default 380px)
**Collapsed state**: `width: 0`, `overflow: hidden`, content invisible

**Tab bar** (38px height):
- Chat / History / Context
- Separator line below: `1px solid rgba(255,255,255,0.04)`

**Chat tab content**:
- Scrollable message list (auto-scroll on new message)
- Empty state: "Start building something incredible" heading + "Describe what you want to build..." subtext
- Message area flex-grows to fill available space
- NextStepChips at bottom (after last assistant message)
- GeneratingIndicator at bottom when `isGenerating`

**History tab content**:
- Reversed version list (newest first)
- Vertical rail: 1px centered line
- Current version: white dot + glow shadow
- Past versions: smaller dot, reduced opacity
- Restore/Fork on hover

**Context tab content**:
- MODEL section: model name, tier, "Change" link
- CONTEXT section: token estimate bar (128k total), message count, version count
- SKILLS section: enabled skill tags or "No skills active"
- PROJECT section: name, stack, runtime

**ForgeInput** (below tab content, `flex-shrink: 0`):
- Height: auto (2 rows default, grows to max 160px)
- Border-top: `1px solid rgba(255,255,255,0.06)`
- Background: `rgba(10,10,12,0.8)`
- Toolbar row: model indicator · plan/build · attach · voice · skill pills · char count · stop/send

### Preview Panel Detail

**Normal layout**: flex-column, overflows scrollable vertically
**Fullscreen**: `position: fixed; inset: 0; z-index: 50`

**Preview canvas container** (centered, horizontal scroll if viewport < panel):
- White card with 12px radius, heavy shadow
- Viewport width transitions in 0.42s spring
- `key={previewKey}` — re-mounts on build

**Keyboard shortcuts in BuilderScreen**:
| Shortcut | Action | Condition |
|----------|--------|-----------|
| `⌘P` | Toggle conversation panel | Always |
| `⌘Y` | Toggle version history | Always |
| `⌘D` | Open deploy modal | Always |
| `⌘S` | Open share modal | Always |
| `⌘H` | Navigate to `/` | Always |
| `⌘E` | Toggle code inspector | Always |
| `⌘,` | Open project settings | Always |
| `⌘1` | Set viewport: desktop | Always |
| `⌘2` | Set viewport: tablet | Always |
| `⌘3` | Set viewport: mobile | Always |
| `⌘R` | Regenerate last response | Not generating |
| `Escape` | Exit fullscreen | Fullscreen active |

---

## Phase 5 — Generation Experience Audit

### State: Idle
- ForgeInput: enabled, empty, placeholder visible
- Send button: disabled (grayed)
- Preview: shows last MockAppPreview or empty
- Console: closed unless manually opened

### State: Typing
- ForgeInput textarea grows as user types
- Character count appears at `> 200` chars
- Send button: enabled
- `canSubmit = input.trim().length > 0`

### State: Submitted (handleWorkspaceSend called)
1. `input.trim()` read → `prompt` variable
2. `setInput('')` — clears textarea
3. `setIsGenerating(true)` — shows GeneratingIndicator, disables send, shows stop button
4. User message appended to `localMessages[]`
5. `handleSend(prompt)` called → new Version created, project updated in AppContext
6. AI timer starts (1900ms)

### State: Generating (isGenerating = true)
- GeneratingIndicator shown: avatar with breathing pulse + "crafting" + 3 bouncing dots
- Stop button visible with breathing animation
- Send button hidden
- ForgeInput still accepts text (new message queued)
- Version history detects change → triggers build sequence (useEffect line 126)

### State: Build Sequence (triggered by version count change)
Duration: ~1100ms
1. `setIsRebuilding(true)` — progress bar animates (1.1s, fills to 85% then 100%)
2. Console logs generated by `buildConsoleLogs()` — 6 fake entries at 160ms intervals
3. `setPreviewKey(k => k + 1)` — MockAppPreview re-mounts with new phase
4. `setIsRebuilding(false)`, `setBuildSuccess(true)`
5. Progress bar fades out (green color, `fadeOut 0.8s ease 0.4s forwards`)
6. After 2000ms: `setBuildSuccess(false)` — success state ends

### State: AI Response Arrives (~1900ms after submit)
1. Assistant message appended to `localMessages[]`
2. `setIsGenerating(false)` — GeneratingIndicator removed, send button returns
3. `addToast('Version saved', 'success')` — green toast appears
4. NextStepChips re-render below new assistant message
5. Auto-scroll to bottom of message list

### State: Stop Generation
1. User clicks Stop button
2. `aiTimerRef.current` cleared (prevents AI response from appearing)
3. `setIsGenerating(false)` immediately
4. `addToast('Stopped', 'default')` — gray toast
5. Partial user message remains; no assistant response added
6. Build sequence does NOT trigger (no version was created)

### State: Error (currently not implemented)
- No error state exists in the current mock flow
- `isGenerating` would need to be reset on API failure

---

## Phase 6 — Preview Audit

### Viewport Behavior
| Viewport | Width | Transition |
|----------|-------|------------|
| desktop | 100% of panel | 0.42s spring |
| tablet | 768px fixed | 0.42s spring |
| mobile | 390px fixed | 0.42s spring |

Non-desktop: centered in panel, horizontal scroll if needed, `min-height: 700px`

### Preview Loading State
- During `isRebuilding`: 2px progress bar at top of PreviewPanel
- Animation: `buildProgress 1.1s cubic-bezier(0.4,0,0.2,1) forwards`
- Fills 0% → 85% → 100%, then `opacity: 0`

### Preview Success State
- After build: 2px green bar at top (`rgba(74,222,128,0.5)`)
- Fades out: `fadeOut 0.8s ease 0.4s forwards`

### Preview Empty State
- Initial (no builds yet): skeleton shimmer loading animation
- `@keyframes sk-shimmer`: 1.4s moving gradient

### Preview Content (MockAppPreview)
- White card, 100% width
- Category detected from project name keywords
- Phase-based disclosure: phase 0 (skeleton) → phase 1 (basic) → phase 2 (full)
- Phase determined by version count: `v ≤ 1 → 0`, `v ≤ 3 → 1`, `v > 3 → 2`
- NOT a real running app — all content is static JSX

### Code Inspector
- Right drawer, 440px, slides in from right (0.26s spring)
- z-index: 20
- File explorer: 3 hardcoded files, fake content with syntax coloring
- Console: fake build logs, clear button functional (clears array)
- Route dropdown: 5 fake routes, display only

### Fullscreen Mode
- `position: fixed; inset: 0; z-index: 50`
- Header removed from view
- Exit button: top-right, 30×30px, ESC key also exits
- Viewport controls still functional

---

## Phase 7 — Project Lifecycle Audit

### Create Project
**Trigger**: Omnibox submit on HomePage
**Flow**: `createProject(prompt)` → generates project object with fake id → `dispatch(ADD_PROJECT)` → `navigate('/project/:id')`
**Confirmation**: None
**Persistence**: In-memory (AppContext) only — LOST on refresh
**Expected**: POST /api/projects + redirect with real ID

### Open Project
**Trigger**: ProjectsPage "Open" button or context menu
**Flow**: `navigate('/project/:id')`
**Persistence**: Project read from AppContext.state.projects[]
**Expected**: GET /api/projects/:id if not cached

### Rename Project
**Trigger**: ProjectsPage context menu "Rename"
**Flow**: Inline edit mode → blur/Enter → `dispatch(UPDATE_PROJECT, { name })`
**Confirmation**: None
**Persistence**: In-memory only

### Delete Project
**Trigger**: ProjectsPage context menu "Delete"
**Flow**: Opens ConfirmationModal → confirm → `dispatch(DELETE_PROJECT, id)` + toast
**Confirmation**: Yes — ConfirmationModal required

### Archive Project
**Trigger**: ProjectsPage context menu "Archive"
**Flow**: `dispatch(ARCHIVE_PROJECT, id)` + toast "Project archived"
**Confirmation**: None
**Persistence**: In-memory only

### Duplicate Project
**Trigger**: ProjectsPage context menu "Duplicate" OR ProjectContextMenu in builder "Remix/Duplicate"
**Flow**: `dispatch(DUPLICATE_PROJECT, id)` + toast "Project duplicated"
**Confirmation**: None

### Restore Version
**Trigger**: VersionHistoryPanel "Restore" button on a version node
**Flow**: Marks selected version as `isCurrent`, updates project messages, toast "Version restored"
**Confirmation**: None
**Persistence**: In-memory only

---

## Phase 8 — Modal and Sheet Audit

### AuthSheet
- **Trigger**: Profile panel "Sign in", Sidebar lock icon, `openModal('auth')`
- **File**: `src/components/AuthSheet.tsx`
- **Open animation**: `shango-modal-enter 0.2s cubic-bezier(0.16,1,0.3,1)`
- **Backdrop**: Semi-transparent dark, `onClick` closes
- **ESC**: Closes via `onClose`
- **Actions**: GitHub OAuth (MOCK), Google OAuth (MOCK), Email magic link (MOCK)
- **Success state**: Email form shows confirmation message (MOCK)

### ShareModal
- **Trigger**: Share button in header, `⌘S`
- **File**: `src/components/ShareModal.tsx`
- **Open animation**: `shango-modal-enter 0.2s`
- **Backdrop**: `rgba(0,0,0,0.5)`, click closes
- **ESC**: Closes
- **Privacy options**: Private / Public / Embed
- **Copy link**: `navigator.clipboard.writeText()` — REAL browser API
- **Email invite**: Input validation only — NOT sent
- **URL format**: `shango.app/p/{projectId}` (fake domain)

### VersionHistoryPanel
- **Trigger**: `⌘Y`, history header button
- **File**: `src/components/VersionHistoryPanel.tsx`
- **Open animation**: Slides from right
- **Close**: X button or `⌘Y` toggle
- **Backdrop**: None
- **Actions**: Restore (in-memory), Fork (in-memory)
- **Empty state**: "No versions yet" message

### CommandPalette
- **Trigger**: `⌘K` global
- **File**: `src/components/CommandPalette.tsx`
- **Open animation**: `commandSettle` keyframe
- **Backdrop**: `rgba(0,0,0,0.4)`, click closes
- **ESC**: Closes
- **Groups**: Actions (5), Navigate (5), Appearance (3), Recent Projects (≤5), Skills, Connectors
- **Navigation**: Arrow keys ↑↓, Enter to execute
- **Search**: Real-time filter across all commands

### ConnectorsDrawer
- **Trigger**: Sidebar Connectors item, ProjectContextMenu "Project Connectors"
- **File**: `src/components/ConnectorsDrawer.tsx`
- **Open animation**: `connDrawerSlide` right-to-left
- **Backdrop**: Full-screen dimmer
- **ESC**: Closes
- **Close**: X button
- **Content**: 6 hardcoded integrations with toggle + manage panel
- **Toggle**: Updates `AppContext.connectedConnectors[]` — MOCK

### KeyboardShortcutOverlay
- **Trigger**: `⌘/`
- **File**: `src/components/KeyboardShortcutOverlay.tsx`
- **Backdrop**: Yes, `onClick` closes
- **Groups**: Navigation, Builder, Conversation, Preview, System

### NetworkErrorBanner
- **Trigger**: `Shift+E` (demo only)
- **File**: `src/components/NetworkErrorBanner.tsx`
- **Auto-dismiss**: After 8 seconds
- **Manual dismiss**: X button
- **ARIA**: `role="alert"`, `aria-live="assertive"`

---

## Phase 9 — Authentication UX Audit

### Unauthenticated State
- Sidebar shows lock icon instead of avatar
- Profile zone shows "Anonymous" + "Sign in →"
- ProfilePanel (anonymous): "Work not saved" warning + "Save my work →" button
- BuilderProfilePopover (anonymous): "Your work isn't saved yet" + "Save my work →" button

### Sign In Flow
1. User clicks lock/avatar or "Save my work →"
2. `openModal('auth')` dispatched
3. `AuthSheet` renders with slide-up animation
4. User sees: GitHub button, Google button, separator, email input + "Send magic link"
5. **GitHub/Google**: `handleOAuth()` — directly calls `setCurrentUser({ name: 'Alex Chen', ... })` (MOCK)
6. **Magic link**: `handleMagicLink()` — validates email format, shows success state (MOCK — no email sent)

### Authenticated State
- Sidebar shows user initial in circle
- ProfilePanel shows: avatar, name, email, plan badge, credit bar, Settings link, sign out
- Builder header: user initial in avatar

### Sign Out
1. ProfilePanel or BuilderProfilePopover "Sign out"
2. `dispatch(SET_CURRENT_USER, null)`
3. Toast "Signed out" (default style)
4. UI reverts to anonymous state

### Session Behavior
- **No persistence** — auth state resets on page refresh
- No JWT, no cookie, no localStorage auth key

---

## Phase 10 — Export and Deployment UX Audit

### Export
- **Trigger**: CodeEditor Export button → `onExport()` → `setExportOpen(true)`
- **UI**: ExportModal (exact implementation UNKNOWN — not found as separate file)
- **Status**: UI ONLY / NOT IMPLEMENTED
- **Expected**: ZIP download of project files

### Share
- **Trigger**: Header Share button, `⌘S`
- **UI**: ShareModal — copy link, privacy toggle, embed code, email invite
- **Copy link**: REAL (`navigator.clipboard`)
- **Email invite**: NOT IMPLEMENTED (UI only)
- **URL**: MOCK (`shango.app/p/:id` — fake domain)

### GitHub
- **Trigger**: Header GitHub button
- **UI**: Toast "Connect GitHub repository"
- **Status**: NOT IMPLEMENTED
- **Expected**: OAuth → repo push

### Deployment
- **Trigger**: Header Deploy button, `⌘D`
- **UI**: DeployModal (UNKNOWN — not found as separate file)
- **Status**: NOT IMPLEMENTED
- **Expected**: Trigger build + Vercel/Netlify deploy, show progress

### Download
- **Status**: NOT IMPLEMENTED — no download button exists outside ExportModal

---

## Phase 11 — State Machine Map (see `SHANGO_UI_STATE_MACHINE.md`)

---

## Phase 12 — Visual Design System Audit

### Colors (CSS Custom Properties — `src/index.css`)
```css
/* Surfaces */
--surface-0: #060606
--surface-1: #0d0d0d
--surface-2: #121212
--surface-3: #1a1a1a
--surface-4: #222222

/* Text */
--text-primary:   rgba(255,255,255,0.9)
--text-secondary: rgba(255,255,255,0.55)
--text-muted:     rgba(255,255,255,0.3)
--text-disabled:  rgba(255,255,255,0.12)

/* Borders */
--border-subtle:  rgba(255,255,255,0.04)
--border-default: rgba(255,255,255,0.08)
--border-strong:  rgba(255,255,255,0.16)

/* Semantic */
--color-live:  #4ade80   /* green, active/success */
--color-warn:  #f59e0b   /* amber */
--color-error: #ef4444   /* red */
```

### Typography
```
UI font:    Geist (var(--font-geist)) — Google Fonts
Code font:  JetBrains Mono (var(--font-mono-jetbrains)) — Google Fonts

Sizes used (px):
  9 — metadata, badges, monogram labels
  10 — timestamps, sub-labels
  11 — small labels, tags
  12 — body text, menu items, nav labels
  13 — medium body
  14 — standard body
  15–16 — omnibox input, section headings
  20–24 — page headings
  32+ — hero titles

Weights: 400 (body), 500 (medium), 600 (semi-bold), 700 (headings/brand)
Letter-spacing: 0.1–0.2em on ALL-CAPS labels
```

### Borders
```
Radius system:
  4px  — badges, pills
  6px  — small buttons
  8px  — medium buttons, tooltips
  10px — nav items
  12px — cards, preview canvas
  14px — dropdowns, popover panels
  16px — omnibox container
  50%  — avatars, circular buttons

Thickness: 1px (standard), 1.5px (active indicators)
Opacity range: 0.04–0.16
```

### Shadows
```
Toast/small:     0 8px 24px rgba(0,0,0,0.5)
Card/medium:     0 16px 48px rgba(0,0,0,0.5)
Popover/large:   0 24px 60px rgba(0,0,0,0.65)
Preview canvas:  0 28px 72px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.3)
```

### Motion Easing
```css
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)   /* spring out */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)     /* smooth in-out */
--ease-gentle: cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

### Animation Keyframes (all in `src/index.css`)
| Name | Duration | Effect | Used By |
|------|---------|--------|---------|
| `shango-modal-enter` | 0.2s spring | scale(0.97→1) + translateY(6px→0) + fade | AuthSheet, ShareModal |
| `shango-fade-up` | 0.18–0.28s | opacity + translateY(4px→0) | Popovers, chips |
| `border-orbit` | 7s linear | Rotating conic-gradient border | Omnibox focus |
| `pageFadeIn` | 0.22s spring | opacity + translateY(3px→0) | Route entry |
| `live-pulse` | 2s | Opacity 0.6→1→0.6 | Status dots |
| `buildProgress` | 1.1s | Width 0→85→100% + fade | Build progress bar |
| `fadeOut` | 0.8s | opacity 1→0 | Build success bar |
| `slideInFromRight` | 0.26s spring | translateX(24px→0) | Code inspector |
| `shango-msg-enter` | 0.22s | Entry animation | Chat messages |
| `loadingDot` | 1.4s | Scale + opacity pulse | Generating dots |
| `shango-fade-breathe` | 1.4–1.8s | Opacity pulse | Avatar, status |
| `sk-shimmer` | 1.4s | Moving gradient | Preview skeleton |
| `toastIn/toastOut` | 0.22s / 0.18s | Slide + fade | Toast stack |
| `commandSettle` | 0.18s | Scale + translate | Command palette |

---

## Phase 13 — Responsive Behavior

The current SHANGO UI is **desktop-first only**. No `@media` breakpoints exist in `src/index.css`.

### Desktop (1024px+)
- Full sidebar (52px collapsed / 200px expanded)
- Two-column BuilderScreen (conversation + preview)
- All panels and drawers visible

### Tablet / Mobile
- **No responsive layout implemented**
- BuilderScreen two-column layout collapses but not gracefully
- Preview viewport switcher (tablet/mobile) resizes the preview *content area* only, not the app shell
- AuthSheet uses slide-up animation (better for mobile) but layout is not optimized

---

## Phase 14 — Accessibility Audit

### Keyboard Navigation
- `⌘K`: CommandPalette with full keyboard navigation (↑↓ arrows, Enter, Esc)
- `⌘/`: KeyboardShortcutOverlay
- All modals: Escape closes
- ForgeInput: Enter submits, Shift+Enter newlines
- Builder shortcuts: ⌘P/Y/D/S/H/E/,/1/2/3/R

### ARIA
- NetworkErrorBanner: `role="alert"`, `aria-live="assertive"` ✅
- Buttons: most have `title` props ✅
- Modals: no `role="dialog"` or `aria-modal` ❌
- No `aria-label` on icon-only buttons ❌
- No focus trap in modals ❌
- No `aria-expanded` on dropdowns ❌

### Focus Behavior
- No `.shango-focus-ring` utility applied globally
- No `:focus-visible` styles on custom buttons
- Tab order: not explicitly managed

---

## Phase 15 — Mock vs Real Functionality

| Feature | Status | UI Exists | Logic Exists | Backend Needed |
|---------|--------|-----------|--------------|----------------|
| Authentication | MOCK | Yes | Partial stub | Yes — OAuth + session |
| Project CRUD | MOCK | Yes | Partial (in-memory) | Yes — REST API |
| AI Generation | MOCK | Yes | Stub only | Yes — LLM streaming |
| Preview | MOCK | Yes | Keyword-match stub | Yes — sandboxed iframe |
| Code Inspector | MOCK | Yes | Fake files | Yes — real file system |
| Console | MOCK | Yes | Fake logs | Yes — real build output |
| Version History | MOCK | Yes | In-memory only | Yes — DB persistence |
| Export | NOT IMPLEMENTED | Partial | None | Yes |
| Deployment | NOT IMPLEMENTED | Partial (DeployModal unknown) | None | Yes — Vercel/Netlify API |
| Sharing | PARTIAL | Yes | Clipboard real | Yes — short URL service |
| GitHub Integration | NOT IMPLEMENTED | Button only | None | Yes — GitHub API |
| Connectors | MOCK | Yes | Toggle only | Yes — credential vault |
| Skills | MOCK | Yes | Toggle only | Yes — skill runner |
| Settings persistence | REAL | Yes | Yes (localStorage) | Optional (user prefs API) |
| Toast notifications | REAL | Yes | Yes | No |
| Routing | REAL | Yes | Yes | No |
| Keyboard shortcuts | REAL | Yes | Yes | No |
| Animations | REAL | Yes | Yes | No |
