# SHANGO UI State Machine
**Application and Feature State Transitions · 2026-07-21**

---

## 1. Application State

```
                    ┌─────────────┐
              ┌────▶│    ERROR     │◀────┐
              │     └──────┬──────┘     │
              │            │ retry       │
              │            ▼             │
┌─────────────┤       ┌────────┐        │ network fail
│ INITIALIZING│──────▶│ READY  │────────┤
└─────────────┘ boot  └────┬───┘        │
                           │            │
              ┌────────────┴──────────┐ │
              │                       │ │
              ▼                       ▼ │
    ┌──────────────┐      ┌─────────────────┐
    │ UNAUTHENTICATED│    │  AUTHENTICATED  │
    └──────┬──────┘      └────────┬────────┘
           │                      │
           │ sign in               │ sign out
           └──────────────────────┘
```

### Application State Variables
| State | Source | Controls |
|-------|--------|----------|
| `INITIALIZING` | App mount (IntroSequence playing) | IntroSequence visible |
| `READY` | `introDone = true` | RouterProvider visible |
| `UNAUTHENTICATED` | `currentUser === null` | Lock icon in sidebar, anonymous profile zone |
| `AUTHENTICATED` | `currentUser !== null` | User avatar, ProfilePanel, signed-in hub |
| `ERROR` | (not yet implemented) | NetworkErrorBanner (currently demo only) |

---

## 2. Project States

```
                 ┌───────────┐
     ┌──────────▶│  CREATING │
     │           └─────┬─────┘
     │                 │ createProject() success
     │                 ▼
     │           ┌───────────┐
     │           │   DRAFT   │◀──────────────┐
     │           └─────┬─────┘               │
     │                 │ build success        │ restore version
     │                 ▼                      │
     │           ┌───────────┐               │
     │           │    LIVE   │               │
     │           └─────┬─────┘               │
     │                 │ archive              │
     │                 ▼                      │
     │           ┌───────────┐               │
     │           │ ARCHIVED  │               │
     │           └─────┬─────┘               │
     │                 │ restore              │
     │                 └───────────────────────┘
     │
     │ delete
     ▼
 ┌─────────┐
 │ DELETED │
 └─────────┘
```

### Project State Variables
| Field | Type | Values | Where stored |
|-------|------|--------|-------------|
| `project.status` | string | `'LIVE' | 'DRAFT' | 'ARCHIVED'` | AppContext `projects[]` |

### Project State Transitions
| From | To | Trigger | Handler |
|------|----|---------|---------|
| — | DRAFT | `dispatch(ADD_PROJECT)` | `createProject()` from omnibox submit |
| DRAFT | LIVE | First successful deploy (NOT IMPLEMENTED) | — |
| LIVE/DRAFT | ARCHIVED | Context menu "Archive" | `dispatch(ARCHIVE_PROJECT)` |
| ARCHIVED | DRAFT | "Restore" from archived state (NOT IMPLEMENTED) | — |
| Any | DELETED | Context menu "Delete" + confirm | `dispatch(DELETE_PROJECT)` |

---

## 3. Generation States

```
              ┌─────────────┐
    ┌─────────│    IDLE     │◀──────────────────┐
    │         └─────────────┘                    │
    │               │ user submits               │
    │               ▼                            │
    │         ┌─────────────┐                    │
    │         │ SUBMITTING  │                    │
    │         └──────┬──────┘                    │
    │                │ timer starts              │
    │                ▼                            │
    │         ┌─────────────┐    stop button      │
    │         │ GENERATING  │──────────────────▶ │
    │         └──────┬──────┘                    │ STOPPED
    │                │ 1900ms                    │
    │                ▼                            │
    │         ┌─────────────┐                    │
    │         │  COMPLETED  │──────────────────▶ │
    │         └──────┬──────┘                    │
    │                │ version count changes      │
    │                ▼                            │
    │         ┌─────────────┐                    │
    │         │  BUILDING   │                    │
    │         └──────┬──────┘                    │
    │                │ 1100ms                    │
    │                ▼                            │
    │         ┌─────────────┐                    │
    │         │   SUCCESS   │──────────────────▶ ┘
    │         └─────────────┘ 2000ms timeout
    │
    │  (FAILED state not yet implemented)
```

### Generation State Variables
| Variable | Type | Location |
|----------|------|----------|
| `isGenerating` | `boolean` | `BuilderScreen` local state |
| `isRebuilding` | `boolean` | `BuilderScreen` local state |
| `buildSuccess` | `boolean` | `BuilderScreen` local state |

### Generation State Effects

The generation flow is now defined as:

```text
Prompt
  → Provider
  → GeneratedArtifact
  → Project.files
  → Derived Artifact
  → Preview
```

GeneratedArtifact is temporary transport only. Project.files is the canonical workspace and Preview is derived from it.
| State | UI Indicator | Input | Send Button | Stop Button |
|-------|-------------|-------|-------------|-------------|
| IDLE | None | Enabled | Enabled (if content) | Hidden |
| SUBMITTING | — | Clears | Disabled | Hidden |
| GENERATING | GeneratingIndicator (3 dots + breathing avatar) | Enabled | Hidden | Visible |
| BUILDING | Progress bar (0%→85%→100%) | Enabled | Hidden | Hidden |
| SUCCESS | Green 2px bar, `buildSuccess=true` 2s | Enabled | Enabled | Hidden |
| COMPLETED | Toast "Version saved" | Enabled | Enabled | Hidden |
| STOPPED | Toast "Stopped" | Enabled | Enabled | Hidden |
| FAILED | (not implemented) | — | — | — |

---

## 4. Preview States

```
   ┌──────────┐
   │  EMPTY   │ (no builds yet — skeleton shimmer)
   └────┬─────┘
        │ build triggered
        ▼
   ┌──────────┐
   │ BUILDING │ (progress bar animation)
   └────┬─────┘
        │ buildProgress complete + previewKey++
        ▼
   ┌──────────┐
   │  READY   │◀─────────────────────────────────┐
   └────┬─────┘                                   │
        │ new build                               │
        ▼                                         │
   ┌──────────────┐                              │
   │ REBUILDING   │ (progress bar restarts)      │
   └──────┬───────┘                              │
          │ complete                              │
          └──────────────────────────────────────┘
```

### Preview State Variables
| Variable | Type | Controls |
|----------|------|---------|
| `previewKey` | `number` | Forces re-mount of `MockAppPreview` |
| `isRebuilding` | `boolean` | Shows/hides progress bar |
| `buildSuccess` | `boolean` | Shows green completion bar |
| `viewport` | `'desktop'|'tablet'|'mobile'` | Preview container width |
| `fullscreen` | `boolean` | Fixed overlay mode |

### Preview Phase (MockAppPreview content)
| Phase | Trigger | Content |
|-------|---------|---------|
| 0 | versions ≤ 1 | Skeleton shimmer only |
| 1 | versions 2–3 | Basic metrics + data list |
| 2 | versions > 3 | Full UI with charts + search + filters |

---

## 5. Panel States

### ConversationPanel
```
EXPANDED (default)
  conversationCollapsed = false
  width = panelWidth (240–560px, default 380px)
  overflow = visible
  
COLLAPSED
  conversationCollapsed = true  
  width = 0
  overflow = hidden
  FloatingChatToggle visible in PreviewPanel
```

### ConversationPanel Tabs
```
CHAT (default)     → messages, generating indicator, NextStepChips
HISTORY            → VersionTimeline nodes
CONTEXT            → model/token/skills/project info
```

### CodeEditor Drawer
```
CLOSED (default)   → codeView = false, drawer not in DOM
OPEN               → codeView = true, 440px right drawer
  ├── FILES tab    → inspectorTab = 'files'
  └── CONSOLE tab  → inspectorTab = 'console'
```

### Console Panel
```
CLOSED (default)   → consoleOpen = false
OPEN               → consoleOpen = true, 160px bottom panel
  ├── BUILDING     → orange pulse dot + "BUILDING" label
  └── READY        → green dot + "READY" label
```

---

## 6. Modal States

All modals use `boolean` open state in BuilderScreen:

| Modal | Open State Variable | Opens Via | Closes Via |
|-------|---------------------|-----------|------------|
| ShareModal | `shareOpen` | Share button, `⌘S` | X button, Escape, backdrop |
| DeployModal | `deployOpen` | Deploy button, `⌘D` | X button, Escape, backdrop |
| ExportModal | `exportOpen` | CodeEditor export, CommandPalette | X button, Escape |
| ConnectorsDrawer | `connectorsOpen` | Sidebar, ProjectContextMenu | X button, Escape |
| VersionHistoryPanel | `historyOpen` | `⌘Y`, history button | X button, `⌘Y` |
| ProjectSettingsSheet | `projectSettingsOpen` | ProjectContextMenu, `⌘,` | X button |
| AuthSheet | `state.modal === 'auth'` | `openModal('auth')` | `closeModal()`, Escape |
| BuilderProfilePopover | `profileOpen` | Profile avatar click | Click outside |
| ProjectContextMenu | internal `open` | Project title click | Click outside |
| CommandPalette | `state.commandPaletteOpen` | `⌘K` | Escape, backdrop |
| KeyboardShortcutOverlay | `state.shortcutOverlayOpen` | `⌘/`, CommandPalette | Escape, backdrop |

---

## 7. Sidebar States

```
COLLAPSED (52px)
  ├── Logo: icon only
  ├── Nav: icon only (tooltip on hover)
  └── Profile: avatar only

EXPANDED (200px)
  ├── Logo: icon + "SHANGO" text
  ├── Nav: icon + label + optional badge
  └── Profile: avatar + name + plan + caret
```

### Sidebar Persistence
- `collapsed` state → `localStorage.setItem('shango_sidebar', String(collapsed))`
- Loaded: `useState(() => localStorage.getItem('shango_sidebar') !== 'false')`

---

## 8. Toast State

```
Toast lifecycle:
  ADD_TOAST → toast appears (toastIn animation 0.22s)
            → auto-remove after duration
            → OR manual remove
            → toastOut animation 0.18s
```

**Types:**
- `'success'` — green glow, checkmark
- `'error'` — red border
- `'default'` — white/neutral

**Stack behavior:** Up to 5 toasts, each staggered with scale/opacity reduction for depth

---

## 9. Auth State

```
                UNAUTHENTICATED
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
      GitHub      Google      Magic Link
      OAuth       OAuth         Email
          │           │           │
          └───────────┼───────────┘
                      │ (all currently MOCK)
                      ▼
                AUTHENTICATED
                  currentUser set
                      │
                      │ sign out
                      ▼
                UNAUTHENTICATED
                  currentUser = null
```

**Session persistence:** None — `currentUser` resets on page refresh.

---

## 10. Settings State

### Source: `localStorage('shango_settings')`
```typescript
{
  model:       'fast' | 'balanced' | 'deep'  // default: 'balanced'
  motion:      boolean                        // default: false
  telemetry:   boolean                        // default: true
  crashReports: boolean                       // default: true
  accent:      'white'|'blue'|'purple'|'green'|'orange'|'pink'  // default: 'white'
  density:     'comfortable'|'compact'|'spacious'  // default: 'comfortable'
}
```

**Loaded:** Lazy init in each `useState` via `loadSettings()` helper
**Saved:** `useEffect` on any change → JSON.stringify to localStorage

---

## 11. Valid State Transition Summary

| Feature | From | Event | To |
|---------|------|-------|-----|
| App | INITIALIZING | IntroSequence complete | READY |
| App | READY | Auth detected | AUTHENTICATED |
| App | AUTHENTICATED | Sign out | UNAUTHENTICATED |
| Project | — | Submit omnibox | CREATING → DRAFT |
| Project | DRAFT | Archive | ARCHIVED |
| Project | Any | Delete + confirm | DELETED |
| Generation | IDLE | Submit | SUBMITTING |
| Generation | SUBMITTING | Timer starts | GENERATING |
| Generation | GENERATING | Timer fires (1900ms) | COMPLETED |
| Generation | GENERATING | Stop button | STOPPED |
| Generation | COMPLETED | Version count changes | BUILDING |
| Generation | BUILDING | 1100ms complete | SUCCESS |
| Generation | SUCCESS | 2000ms timeout | IDLE |
| Preview | EMPTY | First build | BUILDING |
| Preview | READY | New message | REBUILDING |
| Preview | REBUILDING | Complete | READY |
| Panel | EXPANDED | Toggle or `⌘P` | COLLAPSED |
| Panel | COLLAPSED | Toggle, `⌘P`, FloatingChatToggle | EXPANDED |
| Modal | CLOSED | Trigger button / shortcut | OPEN |
| Modal | OPEN | Escape / X / backdrop | CLOSED |
| Sidebar | EXPANDED | Toggle click | COLLAPSED |
| Sidebar | COLLAPSED | Toggle click | EXPANDED |
