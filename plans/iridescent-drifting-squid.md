# SHANGO — Final UI/UX Polish & Completion Plan

## Context

SHANGO is a fully scaffolded AI builder platform — design system, motion, modals, builder workspace, community, and settings are largely in place. This plan covers the remaining gap between "impressive demo" and "best-in-class product." Work is organized in 6 atomic phases, each shippable independently. Nothing here breaks existing surfaces — all changes are surgical additions or fixes.

---

## Audit Summary (what exists vs. what needs work)

| Area | Status | Gap |
|------|--------|-----|
| Design tokens, motion, icons | ✅ Complete | — |
| BuilderScreen header, omnibox, panels | ✅ Complete | — |
| HomePage (signed-out + signed-in hub) | ✅ Complete | — |
| ProjectsPage, TemplatesPage, CommunityPage | ✅ Complete | — |
| AuthSheet, ToastStack, ConnectorsDrawer | ✅ Complete | — |
| **Sidebar navigation** | ⚠️ Broken | History + Workspace dead ends; Deployments missing path |
| **Settings persistence** | ❌ Missing | All settings reset on refresh — no localStorage |
| **CommandPalette commands** | ⚠️ Partial | Navigate-only; no modal/action commands |
| **ForgeInput** | ⚠️ Partial | No model indicator, no character count |
| **Page transitions** | ❌ Missing | Hard cuts between routes |
| **ConversationPanel tabs** | ⚠️ Partial | History + Context tabs render components but need verification |
| **VersionHistoryPanel** | ⚠️ Partial | Restore interaction needs polishing |

---

## Phase 1 — Sidebar Restructure (Navigation Coherence)

**Problem:** Two nav items (`History`, `Workspace/Files`) lead nowhere, destroying trust. `Deployments` has no path despite a full page existing.

**Solution — New sidebar structure:**

```
NAV_ITEMS (primary):
  Home          path: '/'
  Projects      path: '/projects'
  Templates     path: '/templates'
  Community     path: '/community'

BOTTOM_ITEMS (workspace utilities):
  Deployments   path: '/deployments'   ← fix: add path
  Connectors    (opens drawer)         ← move down from primary
  Skills        path: '/skills'
```

**Changes to `src/components/Sidebar.tsx`:**
- Remove `{ id: 'history' }` and `{ id: 'files' }` from NAV_ITEMS
- Move `{ id: 'integrations' }` (Connectors) from NAV_ITEMS → BOTTOM_ITEMS
- Add `path: '/deployments'` to the deployments bottom item
- NAV_ITEMS shrinks to 4 clean primary destinations
- BOTTOM_ITEMS remains 3 utility items

---

## Phase 2 — Settings Persistence (localStorage)

**Problem:** Every setting (model, accent color, theme density, motion, sidebar collapsed) resets on page refresh. This destroys the illusion of a real product.

**What to persist:**
- `selectedModel` — user's preferred AI model
- `accentColor` — appearance accent
- `themeDensity` (dark/darker/obsidian) — surface variant
- `motionReduced` — accessibility preference
- Sidebar `collapsed` state

**Where to write the code:**

In `src/pages/SettingsPage.tsx`:
```tsx
// On mount, load from localStorage
useEffect(() => {
  const saved = localStorage.getItem('shango_settings')
  if (saved) {
    const s = JSON.parse(saved)
    setSelectedModel(s.model ?? 'balanced')
    setAccentColor(s.accent ?? 'white')
    setThemeDensity(s.density ?? 'dark')
    setMotionReduced(s.motion ?? false)
  }
}, [])

// On any setting change, save
useEffect(() => {
  localStorage.setItem('shango_settings', JSON.stringify({
    model: selectedModel, accent: accentColor,
    density: themeDensity, motion: motionReduced,
  }))
}, [selectedModel, accentColor, themeDensity, motionReduced])
```

In `src/components/Sidebar.tsx`:
```tsx
// Persist sidebar collapsed state
const [collapsed, setCollapsed] = useState(() =>
  localStorage.getItem('shango_sidebar') === 'true'
)
// On change: localStorage.setItem('shango_sidebar', String(v))
```

---

## Phase 3 — CommandPalette Full Command Set

**Problem:** CommandPalette navigates but can't open modals, trigger builder actions, or toggle UI state — making it feel shallow.

**Current implementation** in `src/components/CommandPalette.tsx`: Already uses `navigate()` + `useApp()`. Just needs more command groups added.

**New command groups to add:**

```
GROUP: Actions
  Deploy latest        → dispatch OPEN_MODAL 'deploy'
  Share project        → dispatch OPEN_MODAL 'share'  
  Export code          → dispatch OPEN_MODAL 'export'
  Keyboard shortcuts   → dispatch TOGGLE_SHORTCUTS
  New project          → navigate('/') + focus omnibox

GROUP: Appearance  
  Toggle sidebar       → setCollapsed(v => !v)  [via ref/context]
  Switch to Balanced   → setSelectedModel('balanced')
  Switch to Fast       → setSelectedModel('fast')
  Switch to Deep       → setSelectedModel('deep')
```

**Implementation:** Add these to the `COMMANDS` array at the top of `CommandPalette.tsx`. Use `useApp()` dispatch for modal commands. Group them with a `group` label field and render group headers in the list.

---

## Phase 4 — ForgeInput: Model Indicator + Character Count

**Problem:** The ForgeInput in BuilderScreen has a Plan/Build toggle and attach button, but nothing shows which AI model is active or how close the user is to a character limit.

**Changes to the ForgeInput sub-component in `src/pages/BuilderScreen.tsx`:**

1. **Model indicator** — bottom-left of the toolbar row, before the Plan/Build capsule:
```tsx
<button
  onClick={() => setModelOpen(true)}
  style={{
    fontSize: 9.5, color: 'rgba(255,255,255,0.22)',
    fontFamily: 'var(--font-mono-jetbrains)', letterSpacing: '0.06em',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '2px 6px', borderRadius: 4,
    transition: 'color 0.14s ease',
  }}
>
  {currentModel.toUpperCase()} ·
</button>
```
Use `currentModel` from `useApp()` (or local state matching ConversationPanel's `selectedModel`).

2. **Character count** — appears when `value.length > 200`, right-aligned in the toolbar:
```tsx
{value.length > 200 && (
  <span style={{
    fontSize: 9, fontFamily: 'var(--font-mono-jetbrains)',
    color: value.length > 900 ? '#ef4444' : 'rgba(255,255,255,0.2)',
  }}>
    {value.length}/1000
  </span>
)}
```

3. **Active skill pills** — up to 3 tiny skill icon pills in the toolbar (matching existing ForgeInput style from ConversationPanel):
```tsx
{enabledSkills.slice(0, 3).map(s => (
  <span key={s} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono-jetbrains)' }}>
    {s.slice(0,3).toUpperCase()}
  </span>
))}
```

---

## Phase 5 — Page Transition Animation

**Problem:** Navigating between routes is a hard cut. Every polished web app has cross-fade or slide transitions.

**Approach:** Wrap `<Routes>` in `App.tsx` with a keyed wrapper that triggers a CSS fade-in on route change.

**Implementation in `src/App.tsx`:**
```tsx
const location = useLocation()
// ...
<div key={location.pathname} style={{ animation: 'pageFadeIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
  <Routes location={location}>
    ...
  </Routes>
</div>
```

**Add to `src/index.css`:**
```css
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

This is a single wrapper — no per-page changes needed.

---

## Phase 6 — Final Polish Pass

### 6A — VersionHistoryPanel: Restore CTA
In `src/components/VersionHistoryPanel.tsx`: When a non-current version is selected, show a full-width "Restore this version" CTA at the bottom (currently it exists but needs to be more prominent and wired to a toast + setProjects update).

### 6B — ProjectsPage: Cmd+F shortcut to search
Add `useEffect` keydown listener in `src/pages/ProjectsPage.tsx` that fires `searchRef.current?.focus()` on `⌘F`.

### 6C — EmptyState SVG illustrations
Three places that need a polished illustrated empty state (currently just text):
- ConversationPanel empty chat (currently `<EmptyConversationState />` — verify quality, upgrade if plain)
- ProjectsPage zero results after filter
- Deployments page empty history

Each gets a minimal geometric SVG illustration (no external deps) + headline + sub-text.

### 6D — Keyboard shortcut wiring audit
Ensure these are actually wired in `BuilderScreen.tsx` `useEffect`:
- `⌘H` → navigate('/')  ✅ (already present)
- `⌘D` → setDeployOpen(true)  ✅
- `⌘S` → setShareOpen(true)  ✅
- `⌘E` → setCodeView toggle  ✅
- `⌘P` → setConversationCollapsed toggle  ✅
- `⌘Y` → setHistoryOpen toggle  ✅
- Missing: `⌘,` → setProjectSettingsOpen(true)

### 6E — Consistent focus rings
Add `.shango-focus-ring` utility class to `index.css` and apply to all interactive buttons that currently lack `:focus-visible` styles. Critical for accessibility and keyboard navigation feel.

---

## Implementation Order

| Phase | File(s) | Risk | Impact |
|-------|---------|------|--------|
| 1 — Sidebar restructure | `Sidebar.tsx` | Low | High — removes dead ends |
| 2 — Settings persistence | `SettingsPage.tsx`, `Sidebar.tsx` | Low | High — product feels real |
| 3 — CommandPalette | `CommandPalette.tsx` | Low | Medium — power-user delight |
| 4 — ForgeInput enhancements | `BuilderScreen.tsx` (ForgeInput) | Low | Medium — builder UX completeness |
| 5 — Page transitions | `App.tsx`, `index.css` | Low | High — immediately noticeable |
| 6 — Polish pass | Multiple (spot edits) | Low | Medium — cumulative quality |

---

## Verification

After each phase:
- `npx tsc --noEmit` — zero errors
- Open preview: verify sidebar nav hits real pages
- Check localStorage in DevTools after settings change
- `⌘K` → verify new command groups appear and execute correctly
- Navigate between routes — verify fade-in animation fires
- Open builder → type long prompt → verify character counter appears
