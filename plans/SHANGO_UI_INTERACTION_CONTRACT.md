# SHANGO UI Interaction Contract
**Every Interactive Element · Expected Behavior · 2026-07-21**
> Source of truth for how every interaction must behave in the final implementation.

---

## Contract Format

Each entry follows this structure:
- **Element** — visual description
- **Location** — file + approximate line
- **Trigger** — user action
- **Expected result** — what must happen
- **State change** — which state variables change
- **Navigation** — if any
- **Backend dependency** — what API call is needed
- **Current status** — REAL / MOCK / NOT IMPLEMENTED

---

## 1. HomePage (`/`)

### 1.1 Omnibox Textarea
- **Element**: Full-width textarea, placeholder "What do you want to build?"
- **Location**: `HomePage.tsx` ~line 293
- **Trigger**: User types
- **Expected result**: `omniValue` updates; `canSubmit` becomes true when non-empty
- **State change**: `omniValue: string`
- **Focus**: `omniFocused = true` → scale(1.02) spring, border-orbit animation starts
- **Blur**: `omniFocused = false` → animation stops, scale returns
- **Enter key**: Submits if `canSubmit` (same as submit button)
- **Shift+Enter**: Inserts newline
- **Backend**: None (input capture only)
- **Status**: REAL

### 1.2 Submit Button (Omnibox)
- **Element**: Arrow-right icon button, right of textarea
- **Location**: `HomePage.tsx` ~line 470
- **Trigger**: Click or Enter key
- **Disabled**: `omniValue.trim().length === 0`
- **Expected result**: `createProject(omniValue)` → new project → navigate to workspace
- **State change**: New project in `AppContext.projects[]`; navigate to `/project/:id`
- **Backend**: POST /api/projects `{ name, prompt, mode }`
- **Loading state needed**: Spinner / disabled state during POST
- **Status**: MOCK — project created client-side instantly

### 1.3 Plan/Build Capsule Toggle
- **Element**: Two-button capsule "PLAN | BUILD"
- **Location**: `HomePage.tsx` omnibox toolbar
- **Trigger**: Click PLAN or BUILD
- **Expected result**: Active button gets white background, `mode` state updates
- **State change**: `mode: 'plan' | 'build'`
- **Backend**: `mode` must be included in POST /api/projects payload
- **Status**: REAL (UI state), MOCK (not yet forwarded to backend)

### 1.4 Model Selector
- **Element**: Dropdown — "fast / balanced / deep" options
- **Location**: `HomePage.tsx` omnibox toolbar
- **Trigger**: Click current model label → dropdown opens; click option → select
- **State change**: `selectedModel: string`
- **Backend**: `selectedModel` forwarded in build request
- **Status**: REAL (UI state only)

### 1.5 Attach Button (Omnibox)
- **Element**: Paperclip icon button
- **Location**: `HomePage.tsx` omnibox toolbar
- **Trigger**: Click
- **Current**: Toast "Attach files" (MOCK)
- **Expected**: File picker → attach context to prompt
- **Status**: NOT IMPLEMENTED

### 1.6 Voice Button (Omnibox)
- **Element**: Microphone icon
- **Location**: `HomePage.tsx` omnibox toolbar
- **Trigger**: Click
- **Current**: 2s delay simulation (MOCK)
- **Expected**: Browser speech-to-text API → fills textarea
- **Status**: NOT IMPLEMENTED

### 1.7 Hub Template Cards (signed-in)
- **Element**: 6 template cards in signed-in hub
- **Location**: `HomePage.tsx` HUB_TEMPLATES grid
- **Trigger**: Click
- **Expected**: Pre-fills omnibox with template prompt, or navigates to builder
- **Backend**: None (template prompts only)
- **Status**: MOCK — click behavior UNKNOWN (verify in code)

---

## 2. Header (BuilderScreen)

### 2.1 Profile Avatar Button
- **Element**: 26×26px circle, user initial or person icon, top-left
- **Location**: `BuilderScreen.tsx` ~line 302
- **Trigger**: Click
- **Expected result**: `BuilderProfilePopover` opens (left-anchored below button)
- **State change**: `profileOpen: boolean`
- **Status**: REAL

### 2.2 Panel Toggle Button
- **Element**: Chevron icon button (left/right direction)
- **Location**: `BuilderScreen.tsx` ~line 351
- **Trigger**: Click
- **Expected result**: ConversationPanel collapses/expands (width 0 ↔ panelWidth)
- **State change**: `conversationCollapsed: boolean`
- **Animation**: Width transition 0.3s
- **Status**: REAL

### 2.3 ProjectContextMenu Trigger
- **Element**: Project name + version badge, clickable
- **Location**: `BuilderScreen.tsx` ~line 337, `ProjectContextMenu` component
- **Trigger**: Click
- **Expected result**: 260px dropdown opens below
- **State change**: `open: boolean` inside ProjectContextMenu
- **Status**: REAL (UI opens), menu items partially MOCK

### 2.4 Open in New Tab Button
- **Element**: ↗ icon button, right of URL bar
- **Location**: `BuilderScreen.tsx` ~line 429
- **Trigger**: Click
- **Expected result**: `window.open('https://shango.local/{slug}', '_blank')`
- **Backend**: Real preview URL needed
- **Status**: MOCK (fake URL)

### 2.5 Viewport Cycle Button
- **Element**: Monitor/tablet/phone icon, cycles through viewports
- **Location**: `BuilderScreen.tsx` ~line 453
- **Trigger**: Click
- **Expected result**: `viewport` cycles desktop→tablet→mobile→desktop
- **State change**: `viewport: 'desktop' | 'tablet' | 'mobile'`
- **Preview change**: Width transition 0.42s spring
- **Shortcuts**: `⌘1` desktop, `⌘2` tablet, `⌘3` mobile
- **Status**: REAL

### 2.6 Code Inspector Button (⌘E)
- **Element**: Code icon button in right cluster
- **Location**: `BuilderScreen.tsx` ~line 465
- **Trigger**: Click or `⌘E`
- **Expected result**: `CodeEditor` drawer slides in from right (440px)
- **State change**: `codeView: boolean`
- **Animation**: `slideInFromRight 0.26s spring`
- **Status**: REAL (UI), MOCK (content)

### 2.7 GitHub Button
- **Element**: GitHub icon button
- **Location**: `BuilderScreen.tsx` ~line 476
- **Trigger**: Click
- **Current**: Toast "Connect GitHub repository"
- **Expected**: GitHub OAuth → push generated files to repo
- **Status**: NOT IMPLEMENTED

### 2.8 Fullscreen Button
- **Element**: Expand/compress icon
- **Location**: `BuilderScreen.tsx` ~line 483
- **Trigger**: Click or `Escape` to exit
- **Expected result**: PreviewPanel goes `position: fixed; inset: 0; z-index: 50`
- **State change**: `fullscreen: boolean`
- **Status**: REAL

### 2.9 Share Button
- **Element**: "Share" labeled button, white background
- **Location**: `BuilderScreen.tsx` ~line 502
- **Trigger**: Click or `⌘S`
- **Expected result**: `ShareModal` opens
- **State change**: `shareOpen: boolean`
- **Status**: REAL (UI), PARTIAL (clipboard real, invite MOCK)

### 2.10 Deploy Button
- **Element**: "Deploy" labeled button, primary style
- **Location**: `BuilderScreen.tsx` ~line 523
- **Trigger**: Click or `⌘D`
- **Expected result**: `DeployModal` opens
- **State change**: `deployOpen: boolean`
- **Status**: NOT IMPLEMENTED

---

## 3. ProjectContextMenu Dropdown

### 3.1 Go to Dashboard
- **Trigger**: Click
- **Expected**: `navigate('/')` + close menu
- **Shortcut**: `⌘H`
- **Status**: REAL

### 3.2 Project Settings
- **Trigger**: Click
- **Expected**: ProjectSettingsSheet opens → `setProjectSettingsOpen(true)`
- **Status**: MOCK (sheet exists, content UNKNOWN)

### 3.3 Project Connectors
- **Trigger**: Click
- **Expected**: `setConnectorsOpen(true)` → ConnectorsDrawer
- **Status**: REAL (UI opens), MOCK (connectors)

### 3.4 Remix / Duplicate
- **Trigger**: Click
- **Expected**: `dispatch(DUPLICATE_PROJECT)` + toast "Project duplicated"
- **Backend**: POST /api/projects/:id/duplicate
- **Status**: MOCK (in-memory)

### 3.5 Star / Favorite Toggle
- **Trigger**: Click star icon
- **State change**: `starred: boolean` (local to ProjectContextMenu)
- **Persistence**: NOT IMPLEMENTED
- **Status**: MOCK (UI only)

### 3.6 Notification Row Expand
- **Trigger**: Click notification row in dropdown
- **State change**: `notifExpanded: boolean`
- **Expected**: Expands to show first 5 notifications, marks as read
- **Status**: REAL (UI state), MOCK (notifications are seeded)

### 3.7 Resource Meter
- **Element**: Credit usage bar in dropdown
- **Data**: `currentUser.creditsUsed / currentUser.creditsTotal`
- **Color**: Gray (< 60%), amber (60–79%), red (≥ 80%)
- **Status**: MOCK (hardcoded user credits)

---

## 4. BuilderProfilePopover

### 4.1 Profile & Settings
- **Trigger**: Click
- **Expected**: Navigate to `/settings`
- **Current**: Just closes popover (MOCK — navigate missing)
- **Status**: MOCK

### 4.2 Keyboard Shortcuts
- **Trigger**: Click
- **Expected**: `dispatch(TOGGLE_SHORTCUTS)` → KeyboardShortcutOverlay
- **Current**: Closes popover only
- **Status**: MOCK

### 4.3 Sign Out
- **Trigger**: Click
- **Expected**: `dispatch(SET_CURRENT_USER, null)` + toast + close popover
- **Status**: REAL (UI mock auth)

### 4.4 Save My Work → (anonymous)
- **Trigger**: Click
- **Expected**: `openModal('auth')` → AuthSheet
- **Status**: REAL

---

## 5. ConversationPanel

### 5.1 Tab: Chat
- **Trigger**: Click "Chat" tab
- **State change**: `activeTab = 'chat'`
- **Status**: REAL

### 5.2 Tab: History
- **Trigger**: Click "History" tab
- **State change**: `activeTab = 'history'`
- **Status**: REAL

### 5.3 Tab: Context
- **Trigger**: Click "Context" tab
- **State change**: `activeTab = 'context'`
- **Status**: REAL

### 5.4 Model Selector Button
- **Element**: Lightning icon + model code
- **Trigger**: Click
- **State change**: `modelOpen: boolean`
- **Status**: REAL (UI), MOCK (doesn't affect actual AI)

### 5.5 Model Option (Balanced / Fast / Powerful)
- **Trigger**: Click in model dropdown
- **State change**: `selectedModel: string`
- **Expected**: Toast "Switched to {model}" + close dropdown
- **Backend**: Must be forwarded in build request
- **Status**: MOCK

### 5.6 Message Copy Button
- **Trigger**: Hover message → click copy icon
- **Expected**: `navigator.clipboard.writeText(content)` → toast "Copied"
- **Status**: REAL

### 5.7 Message Regenerate Button (assistant)
- **Trigger**: Hover assistant message → click regenerate
- **Expected**: Re-sends last user message through AI
- **Backend**: POST /api/build with last user message
- **Status**: MOCK

### 5.8 NextStepChips
- **Element**: 3 chip buttons below last assistant message
- **Trigger**: Click
- **Expected**: Fill ForgeInput with chip text
- **Status**: UNKNOWN (verify click handler)

### 5.9 History — Restore Button
- **Trigger**: Hover version node → click Restore
- **Expected**: Marks version as current, restores project state
- **Backend**: POST /api/projects/:id/restore/:versionId
- **Status**: MOCK (in-memory only)

### 5.10 History — Fork Button
- **Trigger**: Hover version node → click Fork
- **Expected**: Creates new project from that version's state
- **Backend**: POST /api/projects/:id/fork/:versionId
- **Status**: MOCK

### 5.11 Context — Change Model Link
- **Trigger**: Click "Change" in Context tab MODEL section
- **Expected**: Opens model selector popover
- **Status**: MOCK (no onClick handler visible)

---

## 6. ForgeInput (Conversation)

### 6.1 Textarea
- **Placeholder**: "What should SHANGO build next?"
- **Enter**: `handleWorkspaceSend()`
- **Shift+Enter**: Newline
- **Grows**: Up to `maxHeight: 160px`, auto-resize
- **Status**: REAL

### 6.2 Send Button
- **Element**: Arrow-right icon, right side of toolbar
- **Disabled**: `!input.trim() || isGenerating`
- **Trigger**: Click
- **Expected**: `handleWorkspaceSend()` → user message → AI response → build
- **Status**: REAL (trigger), MOCK (AI response)

### 6.3 Stop Button
- **Element**: Square stop icon, breathing pulse animation
- **Visible**: Only when `isGenerating === true`
- **Trigger**: Click
- **Expected**: Cancels pending AI timer, `setIsGenerating(false)`, toast "Stopped"
- **Status**: REAL (timer cancel)

### 6.4 Plan/Build Toggle (ForgeInput)
- **Trigger**: Click PLAN or BUILD
- **State change**: `planMode: boolean` (local to ForgeInput)
- **Expected**: Affects build request `mode` field
- **Status**: REAL (UI), MOCK (not forwarded to backend)

### 6.5 Attach Button (ForgeInput)
- **Trigger**: Click
- **Current**: Toast "Attach context"
- **Expected**: File/context picker
- **Status**: NOT IMPLEMENTED

### 6.6 Voice Button (ForgeInput)
- **Trigger**: Click
- **Current**: No visible action
- **Expected**: Speech-to-text
- **Status**: NOT IMPLEMENTED

### 6.7 Skill Pills
- **Element**: Up to 3 enabled skill monograms in toolbar
- **Trigger**: Click (UNKNOWN)
- **Expected**: Navigate to skill or toggle
- **Status**: DISPLAY ONLY

### 6.8 Character Counter
- **Visible**: When `input.length > 200`
- **Color**: Default at 200-899, red at ≥ 900
- **Format**: `{n}/1000`
- **Status**: REAL

---

## 7. PreviewPanel

### 7.1 Floating Chat Toggle
- **Element**: Left-edge chevron, visible when `conversationCollapsed`
- **Trigger**: Click
- **Expected**: `setConversationCollapsed(false)`
- **Status**: REAL

### 7.2 Console Clear Button
- **Element**: "CLEAR" text button in console header
- **Trigger**: Click
- **Expected**: `setConsoleLogs([])`
- **Status**: REAL (clears mock data)

### 7.3 Console Close Button
- **Element**: X icon in console header
- **Trigger**: Click
- **Expected**: `setConsoleOpen(false)` → console panel slides up
- **Status**: REAL

### 7.4 Code Sync Button (CodeEditor)
- **Element**: Refresh/sync icon in inspector header
- **Trigger**: Click
- **Expected**: Rotates 360° over 0.55s, refreshes preview
- **State change**: `syncPulse: boolean` (drives animation); `previewKey` increment
- **Status**: REAL (animation + previewKey), MOCK (no real file sync)

### 7.5 Console Toggle (CodeEditor header)
- **Trigger**: Click
- **Expected**: Switches `inspectorTab` to 'console'
- **Badge**: Shows log count during build
- **Status**: REAL

### 7.6 Export Button (CodeEditor header)
- **Trigger**: Click
- **Expected**: `onExport()` → `setExportOpen(true)` in BuilderScreen
- **Status**: NOT IMPLEMENTED (ExportModal behavior unknown)

### 7.7 File Tab (CodeEditor)
- **Trigger**: Click a file name
- **Expected**: `setActiveFile(filename)` → shows file content below
- **Status**: REAL (UI), MOCK (content)

### 7.8 Route Dropdown (CodeEditor)
- **Trigger**: Click route selector button
- **Expected**: Dropdown of 5 fake routes opens
- **State change**: `routeOpen: boolean`
- **Animation**: `codeInspectorDrop 0.16s`
- **Status**: MOCK (routes are hardcoded, selection does nothing)

### 7.9 Fullscreen Exit Button
- **Element**: Compress icon, top-right of preview
- **Trigger**: Click or `Escape`
- **Expected**: `setFullscreen(false)`
- **Status**: REAL

---

## 8. Sidebar

### 8.1 Logo / Brand Mark
- **Trigger**: Click
- **Expected**: `navigate('/')`
- **Status**: REAL

### 8.2 Collapse Toggle Button
- **Element**: Hamburger/reversed hamburger icon in logo bar
- **Trigger**: Click
- **Expected**: `setCollapsed(v => !v)`, width 52→200px spring transition
- **Persistence**: `localStorage.setItem('shango_sidebar', String(!collapsed))`
- **Status**: REAL

### 8.3 Home Nav Item
- **Trigger**: Click
- **Expected**: `navigate('/')`
- **Status**: REAL

### 8.4 Projects Nav Item
- **Trigger**: Click
- **Expected**: `navigate('/projects')`
- **Status**: REAL

### 8.5 Templates Nav Item
- **Trigger**: Click
- **Expected**: `navigate('/templates')`
- **Status**: REAL

### 8.6 Community Nav Item
- **Trigger**: Click
- **Expected**: `window.open('https://discord.gg/shango', '_blank', 'noopener,noreferrer')`
- **Status**: REAL (external link)

### 8.7 Deployments Nav Item (bottom)
- **Trigger**: Click
- **Expected**: `navigate('/deployments')`
- **Status**: REAL

### 8.8 Connectors Nav Item (bottom)
- **Trigger**: Click
- **Expected**: `setConnectorsOpen(true)` → ConnectorsDrawer full-screen overlay
- **Badge**: Count of `connectedConnectors[]`
- **Status**: REAL (UI), MOCK (connectors)

### 8.9 Skills Nav Item (bottom)
- **Trigger**: Click
- **Expected**: `navigate('/skills')`
- **Badge**: Count of `enabledSkills[]`
- **Status**: REAL

### 8.10 Profile Avatar (bottom of sidebar)
- **Authenticated trigger**: `setProfileOpen(true)` → `ProfilePanel` popover
- **Anonymous trigger**: `openModal('auth')` → AuthSheet
- **Position**: `position: fixed`, `bottom: 56`, `left: 60/8` based on collapsed state
- **Status**: REAL

---

## 9. CommandPalette (⌘K)

### 9.1 Search Input
- **Trigger**: Type
- **Expected**: Real-time filter across all command groups
- **Status**: REAL

### 9.2 Arrow Key Navigation
- **↑↓**: Move selection
- **Enter**: Execute selected command
- **Escape**: Close palette
- **Status**: REAL

### 9.3 Group: Actions — Deploy Latest
- **Trigger**: Click or Enter
- **Expected**: `openModal('deploy')`
- **Status**: MOCK (modal opens, no real deploy)

### 9.4 Group: Actions — Share Project
- **Trigger**: Click or Enter
- **Expected**: `openModal('share')`
- **Status**: REAL (ShareModal opens)

### 9.5 Group: Actions — Export Code
- **Trigger**: Click or Enter
- **Expected**: `openModal('export')`
- **Status**: NOT IMPLEMENTED

### 9.6 Group: Actions — Keyboard Shortcuts
- **Trigger**: Click or Enter
- **Expected**: `dispatch(TOGGLE_SHORTCUTS)`
- **Status**: REAL

### 9.7 Group: Actions — New Project
- **Trigger**: Click or Enter
- **Expected**: `navigate('/')`
- **Status**: REAL

### 9.8 Group: Navigate — Projects/Templates/etc.
- **Trigger**: Click or Enter
- **Expected**: `navigate('/projects')` etc.
- **Status**: REAL

### 9.9 Group: Appearance — Switch Model
- **Trigger**: Click model option
- **Expected**: `dispatch({ type: 'SET_MODEL', payload: 'balanced' } as never)` + toast
- **Note**: SET_MODEL action not verified in reducer — may be no-op
- **Status**: MOCK

---

## 10. AuthSheet

### 10.1 GitHub OAuth Button
- **Trigger**: Click
- **Current**: `handleOAuth()` → `setCurrentUser({ name: 'Alex Chen', ... })`
- **Expected**: Redirect to GitHub OAuth → callback → real session
- **Status**: MOCK

### 10.2 Google OAuth Button
- **Trigger**: Click
- **Current**: Same as GitHub (MOCK)
- **Status**: MOCK

### 10.3 Email Input
- **Trigger**: Type email address
- **Expected**: Validates email format on submit
- **Status**: REAL (validation), MOCK (no email sent)

### 10.4 Send Magic Link Button
- **Trigger**: Click
- **Current**: `handleMagicLink()` → validates → shows "Check your email" success state
- **Expected**: POST /api/auth/magic-link → real email sent
- **Status**: MOCK

### 10.5 Backdrop Click / Escape
- **Trigger**: Click outside or Escape
- **Expected**: `closeModal()`
- **Status**: REAL

---

## 11. ShareModal

### 11.1 Privacy Options (Private / Public / Embed)
- **Trigger**: Click option
- **State change**: `privacy: 'private' | 'public' | 'embed'`
- **Status**: REAL (UI state)

### 11.2 Copy Link Button
- **Trigger**: Click
- **Expected**: `navigator.clipboard.writeText('https://shango.app/p/{id}')` → toast "Link copied!"
- **Status**: REAL (clipboard), MOCK (URL is fake)

### 11.3 Embed Code Copy
- **Trigger**: Click
- **Expected**: Copies `<iframe>` embed code
- **Status**: REAL (clipboard), MOCK (URL is fake)

### 11.4 Email Invite Input + Send
- **Trigger**: Enter email, click Send
- **Current**: UI input only — no email sent
- **Status**: NOT IMPLEMENTED

### 11.5 Escape / Backdrop
- **Trigger**: Escape or click outside
- **Expected**: `setShareOpen(false)`
- **Status**: REAL

---

## 12. ConnectorsDrawer

### 12.1 Search Input
- **Trigger**: Type
- **Expected**: Filter connector list in real-time
- **Status**: REAL (client-side filter)

### 12.2 Connector Toggle
- **Trigger**: Click toggle
- **Expected**: `dispatch(CONNECT_CONNECTOR | DISCONNECT_CONNECTOR, id)` + toast
- **Backend**: OAuth flow or API key validation needed
- **Status**: MOCK

### 12.3 Manage Panel
- **Trigger**: Click "Manage" button on connected connector
- **Expected**: Expands inline panel with API key + region fields
- **Status**: REAL (UI expand), MOCK (fields not persisted)

### 12.4 Configure Credentials Button
- **Trigger**: Click
- **Current**: No action (MOCK)
- **Expected**: Open credential input flow
- **Status**: NOT IMPLEMENTED

### 12.5 Escape / Close Button
- **Trigger**: Escape or X button
- **Expected**: `setConnectorsOpen(false)`
- **Status**: REAL

---

## 13. VersionHistoryPanel

### 13.1 Version Node Click
- **Trigger**: Click a node
- **Expected**: Expand detail panel at bottom showing prompt + timestamp
- **Status**: REAL (UI)

### 13.2 Restore Button
- **Trigger**: Hover node → click Restore
- **Expected**: `setLocalCurrent(version.id)`, update project in context, toast "Version restored"
- **Backend**: POST /api/projects/:id/restore/:versionId
- **Status**: MOCK (in-memory)

### 13.3 Fork Button
- **Trigger**: Hover node → click Fork
- **Expected**: Creates new project from version state, navigates to it
- **Backend**: POST /api/projects/:id/fork/:versionId
- **Status**: MOCK

### 13.4 Close Button
- **Trigger**: Click X or `⌘Y`
- **Expected**: `setHistoryOpen(false)` / panel slides out
- **Status**: REAL

---

## 14. Settings Page

### 14.1 Model Selection (Models tab)
- **Trigger**: Click model card
- **State change**: `selectedModel` → `localStorage.setItem('shango_settings', ...)`
- **Status**: REAL (localStorage)

### 14.2 Accent Color (Appearance tab)
- **Trigger**: Click color swatch
- **State change**: `accentColor` → saved to localStorage
- **Status**: REAL (localStorage)

### 14.3 Theme Density (Appearance tab)
- **Trigger**: Click density option
- **State change**: `themeDensity` → saved to localStorage
- **Status**: REAL (localStorage)

### 14.4 Reduce Motion Toggle
- **State change**: `motionReduced` → saved to localStorage
- **Status**: REAL (localStorage), NOT APPLIED (no CSS prefers-reduced-motion handler)

### 14.5 Telemetry Toggle
- **State change**: `telemetry` → saved to localStorage
- **Status**: REAL (localStorage), NOT CONNECTED (no analytics)

### 14.6 API Key Inputs (OpenRouter, Anthropic)
- **Trigger**: Type key → blur or submit
- **Current**: Stored in component state only (NOT persisted, NOT used)
- **Expected**: POST /api/settings/keys `{ provider, encryptedKey }`
- **Status**: NOT IMPLEMENTED

---

## 15. ProjectsPage

### 15.1 Filter Tabs (All / Live / Draft / Archived)
- **Trigger**: Click tab
- **State change**: `filter: string` → filters `projects[]`
- **Status**: REAL (client filter)

### 15.2 Search Input
- **Trigger**: Type
- **Expected**: Filters project list by name
- **Shortcut**: `⌘F` focuses this input
- **Status**: REAL (client filter)

### 15.3 Grid/List Toggle
- **Trigger**: Click grid or list icon
- **State change**: `viewMode: 'grid' | 'list'`
- **Status**: REAL

### 15.4 Project Card — Open
- **Trigger**: Click card or "Open" in context menu
- **Expected**: `navigate('/project/:id')`
- **Status**: REAL

### 15.5 Project Card — Rename
- **Trigger**: Context menu "Rename" → inline edit mode
- **Submit**: Enter or blur
- **Expected**: `dispatch(UPDATE_PROJECT, { name })`
- **Backend**: PATCH /api/projects/:id `{ name }`
- **Status**: MOCK (in-memory)

### 15.6 Project Card — Delete
- **Trigger**: Context menu "Delete"
- **Expected**: ConfirmationModal → confirm → `dispatch(DELETE_PROJECT, id)` + toast
- **Backend**: DELETE /api/projects/:id
- **Status**: MOCK (in-memory)

### 15.7 Project Card — Archive
- **Trigger**: Context menu "Archive"
- **Expected**: `dispatch(ARCHIVE_PROJECT, id)` + toast
- **Backend**: PATCH /api/projects/:id `{ status: 'ARCHIVED' }`
- **Status**: MOCK

### 15.8 Project Card — Duplicate
- **Trigger**: Context menu "Duplicate"
- **Expected**: `dispatch(DUPLICATE_PROJECT, id)` + toast
- **Backend**: POST /api/projects/:id/duplicate
- **Status**: MOCK

---

## 16. Keyboard Shortcuts Reference

| Shortcut | Screen | Action | Status |
|----------|--------|--------|--------|
| `⌘K` | Global | Open CommandPalette | REAL |
| `⌘/` | Global | Open KeyboardShortcutOverlay | REAL |
| `⌘H` | Builder | Navigate to `/` | REAL |
| `⌘P` | Builder | Toggle conversation panel | REAL |
| `⌘Y` | Builder | Toggle version history | REAL |
| `⌘D` | Builder | Open deploy modal | REAL (modal), MOCK (deploy) |
| `⌘S` | Builder | Open share modal | REAL |
| `⌘E` | Builder | Toggle code inspector | REAL |
| `⌘,` | Builder | Open project settings | REAL (UI), UNKNOWN (sheet content) |
| `⌘1` | Builder | Viewport: desktop | REAL |
| `⌘2` | Builder | Viewport: tablet | REAL |
| `⌘3` | Builder | Viewport: mobile | REAL |
| `⌘R` | Builder | Regenerate last response | MOCK |
| `Escape` | Builder | Exit fullscreen | REAL |
| `Shift+E` | Global | Demo network error banner | REAL (demo only, remove in prod) |
| `Enter` | Omnibox/ForgeInput | Submit | REAL |
| `Shift+Enter` | Omnibox/ForgeInput | New line | REAL |
| `↑↓` | CommandPalette | Navigate items | REAL |
| `Enter` | CommandPalette | Execute selected | REAL |
| `Escape` | Any modal | Close | REAL |
| `⌘F` | ProjectsPage | Focus search | REAL |
