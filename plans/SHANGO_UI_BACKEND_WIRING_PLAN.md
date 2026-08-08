# SHANGO UI Backend Wiring Plan
**API Integration Points · Frontend → Backend Contract · 2026-07-21**
> Every place the frontend must connect to real backend logic.
> Status: CURRENTLY EXISTS / TO BE WIRED / NOT IMPLEMENTED

---

## API Base Structure

All endpoints prefixed `/api/`. Frontend reads `VITE_API_BASE_URL` from env.
All authenticated routes require `Authorization: Bearer {jwt}` header.

---

## 1. Authentication

### 1.1 GitHub OAuth
- **Frontend trigger**: `AuthSheet` → GitHub button `handleOAuth()`
- **Current code**: `setCurrentUser({ name: 'Alex Chen', ... })` (MOCK)
- **Replace with**:
  ```
  GET /api/auth/github  →  redirect to github.com/oauth
  GET /api/auth/github/callback  →  exchange code → JWT → redirect to app with session
  ```
- **Session storage**: httpOnly cookie OR localStorage JWT (httpOnly preferred)
- **Frontend response**: Read session cookie / JWT → `dispatch(SET_CURRENT_USER, user)`

### 1.2 Google OAuth
- **Frontend trigger**: `AuthSheet` → Google button
- **Same pattern as GitHub**: `/api/auth/google` + `/api/auth/google/callback`

### 1.3 Magic Link
- **Frontend trigger**: `AuthSheet` → email input → "Send magic link"
- **Current code**: Validates email format, shows success state (MOCK)
- **Replace with**:
  ```
  POST /api/auth/magic-link  { email: string }
  →  200 OK: { message: "Check your email" }  (email sent server-side)
  →  400: { error: "Invalid email" }
  ```
- **Link in email**: `https://shango.app/auth/verify?token={jwt}`
- **Verify endpoint**: `GET /api/auth/verify?token={jwt}` → set session → redirect to app

### 1.4 Session Restore
- **Frontend trigger**: `AppShell` on mount
- **Add to `AppShell`**:
  ```
  GET /api/me  (with session cookie / Bearer token)
  →  200: { user: User }  →  dispatch(SET_CURRENT_USER, user)
  →  401: unauthenticated → stay in unauthenticated state
  ```
- **File to modify**: `src/App.tsx` AppShell component

### 1.5 Sign Out
- **Frontend trigger**: ProfilePanel / BuilderProfilePopover "Sign out"
- **Replace with**:
  ```
  POST /api/auth/signout
  →  Clear session cookie
  →  dispatch(SET_CURRENT_USER, null)
  ```

---

## 2. Project Management

### 2.1 Create Project
- **Frontend trigger**: `HomePage.tsx` `handleSubmit()`
- **Current code**: `createProject(omniValue)` — client-side factory
- **Replace with**:
  ```
  POST /api/projects
  Body: { prompt: string, mode: 'plan'|'build', model: string, templateId?: string }
  →  201: { project: Project }
  →  Navigate to /project/:project.id
  ```
- **Loading state**: Disable submit button, show spinner during POST

### 2.2 List Projects
- **Frontend trigger**: `AppShell` mount (after auth) + `ProjectsPage` mount
- **Replace with**:
  ```
  GET /api/projects?status=all&sort=updatedAt&limit=50
  →  200: { projects: Project[] }
  →  dispatch(SET_PROJECTS, projects)
  ```

### 2.3 Get Single Project
- **Frontend trigger**: `BuilderScreen` mount (reads `projectId` from URL)
- **Replace with**:
  ```
  GET /api/projects/:id
  →  200: { project: Project }  (includes messages[] and versions[])
  →  404: redirect to /projects
  ```
- **File**: `BuilderScreen.tsx` — currently reads from `state.projects.find()`

### 2.4 Update Project
- **Frontend trigger**: Rename in ProjectsPage, status change, auto-save
- **Replace with**:
  ```
  PATCH /api/projects/:id
  Body: { name?: string, status?: string }
  →  200: { project: Project }
  →  dispatch(UPDATE_PROJECT, project)
  ```

### 2.5 Delete Project
- **Frontend trigger**: ProjectsPage context menu "Delete" + ConfirmationModal
- **Replace with**:
  ```
  DELETE /api/projects/:id
  →  204 No Content
  →  dispatch(DELETE_PROJECT, id)
  ```

### 2.6 Duplicate Project
- **Frontend trigger**: ProjectsPage / ProjectContextMenu "Remix/Duplicate"
- **Replace with**:
  ```
  POST /api/projects/:id/duplicate
  →  201: { project: Project }  (new project with forked content)
  →  dispatch(ADD_PROJECT, newProject)
  ```

### 2.7 Archive Project
- **Frontend trigger**: Context menu "Archive"
- **Same as Update**: `PATCH /api/projects/:id { status: 'ARCHIVED' }`

---

## 3. AI Build / Generation

### 3.1 Build Request (core feature)
- **Frontend trigger**: `BuilderScreen.tsx` `handleWorkspaceSend()`
- **Current code**: `buildAIResponse(prompt)` keyword switch + 1900ms timer
- **Replace with**: SSE stream
  ```
  POST /api/build
  Headers: Authorization, Content-Type: application/json
  Body: {
    projectId: string,
    prompt: string,
    mode: 'plan' | 'build',
    model: 'fast' | 'balanced' | 'powerful',
    activeFile?: string,
    enabledSkills?: string[]
  }
  →  Content-Type: text/event-stream
  
  SSE events:
    data: { type: 'delta', content: string }          // stream assistant message text
    data: { type: 'file', file: FileChange }           // stream file mutations
    data: { type: 'console', event: ConsoleEvent }     // build log entries
    data: { type: 'version', version: Version }        // new version created
    data: { type: 'done', projectId: string }          // build complete
    data: { type: 'error', error: { code, message } }  // build failed
  ```
- **Frontend stream consumer** (replace `buildAIResponse`):
  ```typescript
  const controller = new AbortController()
  const res = await fetch('/api/build', { method: 'POST', body, signal: controller.signal, ... })
  const reader = res.body.getReader()
  // parse SSE lines → dispatch to state
  ```
- **Stop button**: `controller.abort()`

### 3.2 Regenerate
- **Frontend trigger**: `⌘R`, message regenerate button
- **Same endpoint**: POST `/api/build` with last user message as prompt

---

## 4. Version History

### 4.1 List Versions
- **Frontend trigger**: Included in GET `/api/projects/:id` response (see §2.3)
- **Or**: `GET /api/projects/:id/versions`

### 4.2 Restore Version
- **Frontend trigger**: VersionHistoryPanel "Restore" button
- **Current code**: In-memory state update only
- **Replace with**:
  ```
  POST /api/projects/:id/versions/:versionId/restore
  →  200: { project: Project }  (updated with restored version's files)
  →  dispatch(UPDATE_PROJECT, project)
  →  setPreviewKey(k => k + 1)  (refresh preview)
  ```

### 4.3 Fork Version
- **Frontend trigger**: VersionHistoryPanel "Fork" button
- **Replace with**:
  ```
  POST /api/projects/:id/versions/:versionId/fork
  →  201: { project: Project }  (new project from that version)
  →  dispatch(ADD_PROJECT, newProject)
  →  navigate('/project/' + newProject.id)
  ```

---

## 5. File System

The canonical project workspace is Project.files. Backend APIs operate primarily on Project.files. Artifact generation is a derived service and should not be treated as the owner of project state.

### 5.1 List Files
- **Frontend trigger**: CodeEditor opens (⌘E)
- **Current code**: Hardcoded `CODE_FILES = ['App.tsx', 'styles.css', 'components/Header.tsx']`
- **Replace with**:
  ```
  GET /api/projects/:id/files
  →  200: { files: { path: string, language: string }[] }
  ```

### 5.2 Get File Content
- **Frontend trigger**: Click file tab in CodeEditor
- **Current code**: Fake syntax-highlighted content
- **Replace with**:
  ```
  GET /api/projects/:id/files/*path
  →  200: { content: string, language: string }
  ```

### 5.3 Preview URL
- **Frontend trigger**: Preview canvas `key={previewKey}` re-mount
- **Current code**: `MockAppPreview` static JSX
- **Replace with**: `<iframe src={previewUrl} sandbox="allow-scripts allow-same-origin" />`
  ```
  GET /api/projects/:id/preview
  →  301: Redirect to isolated sandbox URL serving generated files
  ```

---

## 6. Sharing & Export

### 6.1 Generate Share URL
- **Frontend trigger**: ShareModal — copy link button
- **Current code**: `navigator.clipboard.writeText('https://shango.app/p/${projectId}')`
- **Replace with**:
  ```
  POST /api/projects/:id/share { privacy: 'public'|'private'|'embed' }
  →  200: { url: string, embedCode: string }
  →  navigator.clipboard.writeText(url)
  ```

### 6.2 Email Invite
- **Frontend trigger**: ShareModal email input + send
- **Current code**: No action
- **Replace with**:
  ```
  POST /api/projects/:id/invite { email: string, role: 'viewer' }
  →  200: OK (email sent)
  →  400: { error: 'Invalid email' }
  ```

### 6.3 Export
- **Frontend trigger**: CodeEditor export button → ExportModal
- **Replace with**:
  ```
  POST /api/projects/:id/export { format: 'zip'|'github' }
  →  200: { downloadUrl: string }  (signed S3 URL)
  →  window.open(downloadUrl)
  ```

---

## 7. Deployment

### 7.1 Trigger Deploy
- **Frontend trigger**: Deploy button (⌘D) → DeployModal confirm
- **Replace with**:
  ```
  POST /api/projects/:id/deploy { target: 'vercel'|'netlify'|'aws', envVars?: Record<string,string> }
  →  202 Accepted: { deploymentId: string }
  →  SSE stream for deploy progress: /api/deployments/:id/stream
  ```

### 7.2 List Deployments
- **Frontend trigger**: DeploymentPage mount
- **Replace with**:
  ```
  GET /api/deployments?projectId=...
  →  200: { deployments: DeploymentRecord[] }
  ```

### 7.3 Rollback
- **Frontend trigger**: DeploymentPage rollback button
- **Replace with**:
  ```
  POST /api/deployments/:id/rollback
  →  202: { deploymentId: string }
  ```

---

## 8. Connectors / Integrations

### 8.1 List Available Connectors
- **Frontend trigger**: ConnectorsDrawer + IntegrationsPage mount
- **Replace with**:
  ```
  GET /api/connectors
  →  200: { connectors: Connector[] }
  ```

### 8.2 Connect Connector (OAuth)
- **Frontend trigger**: ConnectorsDrawer toggle ON (OAuth connectors: GitHub, Google)
- **Replace with**:
  ```
  GET /api/connectors/:id/oauth  →  redirect to provider OAuth
  GET /api/connectors/:id/oauth/callback  →  store token → redirect back
  ```

### 8.3 Connect Connector (API Key)
- **Frontend trigger**: ConnectorsDrawer manage panel → "Configure credentials →"
- **Replace with**:
  ```
  POST /api/connectors/:id/credentials { key: string, region?: string }
  →  200: { connected: true }
  →  dispatch(CONNECT_CONNECTOR, id)
  ```

### 8.4 Disconnect
- **Frontend trigger**: ConnectorsDrawer toggle OFF
- **Replace with**:
  ```
  DELETE /api/connectors/:id/credentials
  →  200: OK
  →  dispatch(DISCONNECT_CONNECTOR, id)
  ```

---

## 9. Notifications

### 9.1 Load Notifications
- **Frontend trigger**: App mount (after auth)
- **Current code**: 3 hardcoded `SEED_NOTIFICATIONS` in AppContext
- **Replace with**:
  ```
  GET /api/notifications
  →  200: { notifications: Notification[] }
  →  dispatch(SET_NOTIFICATIONS, notifications)
  ```

### 9.2 Mark as Read
- **Frontend trigger**: ProjectContextMenu notification expand
- **Replace with**:
  ```
  POST /api/notifications/read { ids: string[] }
  →  200: OK
  ```

---

## 10. Settings / API Keys

### 10.1 Save Provider API Key
- **Frontend trigger**: SettingsPage API Keys tab — save button
- **Replace with**:
  ```
  POST /api/settings/keys { provider: 'openrouter'|'anthropic', key: string }
  →  200: OK  (key stored server-side, encrypted)
  ```

### 10.2 Check Key Status
- **Frontend trigger**: SettingsPage API Keys tab mount
- **Replace with**:
  ```
  GET /api/settings/keys
  →  200: { openrouter: boolean, anthropic: boolean }  (presence only, never return key)
  ```

---

## 11. Skills

### 11.1 List Skills
- **Frontend trigger**: SkillsPage mount, CommandPalette
- **Replace with**:
  ```
  GET /api/skills
  →  200: { skills: Skill[] }
  ```

### 11.2 Install/Uninstall/Enable/Disable
- **Frontend trigger**: SkillsPage buttons
- **Replace with**:
  ```
  POST /api/skills/:id/install
  DELETE /api/skills/:id
  PATCH /api/skills/:id { enabled: boolean }
  ```

---

## Complete API Surface Summary

```
Auth
  GET  /api/me
  GET  /api/auth/github
  GET  /api/auth/github/callback
  GET  /api/auth/google
  GET  /api/auth/google/callback
  POST /api/auth/magic-link
  GET  /api/auth/verify
  POST /api/auth/signout

Projects
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PATCH  /api/projects/:id
  DELETE /api/projects/:id
  POST   /api/projects/:id/duplicate
  POST   /api/projects/:id/share

Build
  POST   /api/build   (SSE)

Versions
  GET    /api/projects/:id/versions
  POST   /api/projects/:id/versions/:vId/restore
  POST   /api/projects/:id/versions/:vId/fork

Files
  GET    /api/projects/:id/files
  GET    /api/projects/:id/files/*path
  GET    /api/projects/:id/preview

Deployment
  POST   /api/projects/:id/deploy
  GET    /api/deployments
  GET    /api/deployments/:id
  POST   /api/deployments/:id/rollback
  POST   /api/deployments/:id/redeploy
  GET    /api/deployments/:id/stream  (SSE)

Connectors
  GET    /api/connectors
  GET    /api/connectors/:id/oauth
  GET    /api/connectors/:id/oauth/callback
  POST   /api/connectors/:id/credentials
  DELETE /api/connectors/:id/credentials

Sharing & Export
  POST   /api/projects/:id/share
  POST   /api/projects/:id/invite
  POST   /api/projects/:id/export

Notifications
  GET    /api/notifications
  POST   /api/notifications/read

Settings
  GET    /api/settings/keys
  POST   /api/settings/keys

Skills
  GET    /api/skills
  POST   /api/skills/:id/install
  DELETE /api/skills/:id
  PATCH  /api/skills/:id
```
