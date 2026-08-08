# SHANGO — Model Routing Specification
## Version 2
**Wiring Spec for AI Integration · 2026-07-28**
> Updated after Phase 1–3 implementation.
> Defines the runtime architecture that now exists in SHANGO and the contract that future agents must preserve.
> Does not change any UI. Does not implement model APIs. Clearly marks what exists vs. what must be built.

---

## Current Build Flow (Existing UI)

```
User types prompt in ForgeInput / HomePage Omnibox
        ↓
mode: 'plan' | 'build'  (Plan|Build capsule toggle — CURRENTLY EXISTS)
        ↓
handleSend() / handleSubmit()  (CURRENTLY EXISTS — calls buildAIResponse() mock)
        ↓
buildAIResponse(prompt)  ← keyword switch, returns string  (MOCK — TO BE REPLACED)
        ↓
assistant ChatMessage appended to messages[]  (CURRENTLY EXISTS)
        ↓
MockAppPreview re-renders  (MOCK — TO BE REPLACED with real output)
```

---

## Target Build Flow (After Wiring)

```
User types prompt in ForgeInput / HomePage Omnibox
        ↓
mode: 'plan' | 'build'
        ↓
handleSend() → POST /api/build  (TO BE WIRED)
        ↓
SHANGO Backend Model Router  (TO BE BUILT)
        ↓
Provider Adapter
  ├── OpenRouter  (TO BE CONNECTED)
  └── Google Gemini  (FUTURE)
        ↓
Provider returns GeneratedArtifact (temporary transport)
        ↓
GeneratedArtifact is applied to Project.files
        ↓
Project.artifact is derived from Project.files
        ↓
Frontend state updates:
  ├── messages[] ← assistant message  (CURRENTLY EXISTS)
  ├── Project.files ← canonical workspace update  (TO BE WIRED)
  ├── consoleLogs[] ← real build events  (TO BE WIRED)
  └── preview refresh  (TO BE WIRED)
```

---

## Request Structure

The frontend should send this payload when the user submits a prompt:

```typescript
interface BuildRequest {
  // Project identity
  projectId: string                    // from URL param :projectId — CURRENTLY EXISTS
  
  // User intent
  prompt: string                       // ForgeInput / Omnibox value — CURRENTLY EXISTS
  mode: 'plan' | 'build'              // Plan|Build toggle state — CURRENTLY EXISTS
  
  // Active context
  activeFile?: string                  // currently selected file in CodeEditor — CURRENTLY EXISTS
  selectedModel: 'balanced' | 'fast' | 'powerful'  // model selector state — CURRENTLY EXISTS
  
  // Project context (to be populated once persistence exists)
  projectContext?: {
    name: string
    description?: string
    status: 'LIVE' | 'DRAFT' | 'ARCHIVED'
    versions: Version[]                // for continuity — TO BE WIRED
  }
  
  // File context (to be populated once real files exist)
  fileContext?: {
    files: FileSnapshot[]             // current project files — TO BE WIRED
  }
  
  // Active skills (affect model behavior)
  enabledSkills?: string[]            // from AppContext enabledSkills — CURRENTLY EXISTS (mock)
}

interface FileSnapshot {
  path: string
  content: string
  language: string
}
```

**Fields that currently exist in the UI:**
- `projectId` — available via `useParams()` in BuilderScreen
- `prompt` — ForgeInput `inputValue` / Omnibox `omniValue`
- `mode` — `mode` state in ConversationPanel / HomePage
- `activeFile` — `activeFile` state in BuilderScreen
- `selectedModel` — `selectedModel` state in ConversationPanel
- `enabledSkills` — `enabledSkills` from AppContext

**Fields that require backend before they work:**
- `projectContext.versions` — currently in-memory only
- `fileContext.files` — MockAppPreview does not hold real files

---

## Response Structure

The backend must return a structured response the frontend can parse without UI changes. Providers never directly own project state. GeneratedArtifact is a temporary transport object only; the canonical workspace remains Project.files.

```typescript
interface BuildResponse {
  // Required
  requestId: string                   // for deduplication / retry
  projectId: string
  mode: 'plan' | 'build'
  status: 'success' | 'error' | 'partial'
  
  // Conversation
  message: {
    role: 'assistant'
    content: string                   // narrative explanation, markdown allowed
    timestamp: string
  }
  
  // Plan mode response (mode === 'plan')
  plan?: {
    steps: PlanStep[]
    estimatedComplexity: 'low' | 'medium' | 'high'
    suggestedModel: 'fast' | 'balanced' | 'deep'
  }
  
  // Build mode response (mode === 'build')
  build?: {
    files: FileChange[]              // all file mutations from this build
    entryPoint: string               // primary file to show in CodeEditor
    previewRoute?: string            // route to load in preview iframe
  }
  
  // Console events (replaces fake buildConsoleLogs())
  consoleEvents?: ConsoleEvent[]
  
  // Version snapshot to persist
  version?: {
    label: string
    prompt: string
  }
  
  // Error (when status === 'error')
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

interface PlanStep {
  order: number
  title: string
  description: string
  affectedFiles?: string[]
}

interface FileChange {
  path: string
  operation: 'create' | 'modify' | 'delete'
  content?: string                   // undefined for delete
  language: string
  diff?: string                      // optional unified diff for display
}

interface ConsoleEvent {
  level: 'info' | 'success' | 'warn' | 'error'
  message: string
  timestamp: string
  source?: string                    // e.g. 'compiler', 'linter', 'runtime'
}
```

---

## Model Routing Layer

The backend model router sits between the SHANGO frontend and AI providers. Provider API keys must never appear in frontend code.

### Provider Fallback Strategy

The verified fallback order is:

```text
gemini-3.6-flash

↓
gemini-3.5-flash

↓
gemini-flash-latest

↓
Provider unavailable
```

Fallback only occurs on provider/model failure. Fallback never changes frontend behavior. Fallback is invisible to the user.

```
Frontend  →  POST /api/build  (BuildRequest)
                  ↓
         SHANGO Model Router (backend)
                  ↓
         Select provider based on:
           - selectedModel field
           - available API keys (env vars, never frontend)
           - fallback chain
                  ↓
         Provider Adapter
           ├── OpenRouter adapter    (TO BE CONNECTED)
           │     endpoint: https://openrouter.ai/api/v1/chat/completions
           │     key: process.env.OPENROUTER_API_KEY
           │
           └── Google Gemini adapter  (FUTURE)
                 endpoint: https://generativelanguage.googleapis.com/v1beta/
                 key: process.env.GEMINI_API_KEY
                  ↓
         Structured response parsing
           └── Transform provider output → BuildResponse
                  ↓
         POST response to frontend  (BuildResponse)
```

### Model → Provider Mapping

The backend router selects the provider and model. The frontend must never hardcode model IDs. Model selection belongs exclusively to the backend provider adapter.

The verified Google AI Studio catalogue is:

| Display Name | API Model ID |
|--------------|--------------|
| Gemini 3.6 Flash | `gemini-3.6-flash` |
| Gemini 3.5 Flash | `gemini-3.5-flash` |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` |
| Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite` |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` |
| Gemini Pro Latest | `gemini-pro-latest` |
| Gemini Flash Latest | `gemini-flash-latest` |
| Gemini Flash-Lite Latest | `gemini-flash-lite-latest` |

These models are selectable by the backend router.

### Streaming

The frontend `isGenerating` boolean maps naturally to a streaming response:

```
POST /api/build
  → 200 OK with Content-Type: text/event-stream
  → SSE events:
      data: { type: 'delta', content: '...' }   ← stream assistant message chunks
      data: { type: 'file', file: FileChange }   ← stream file updates
      data: { type: 'console', event: ConsoleEvent }
      data: { type: 'done', response: BuildResponse }
      data: { type: 'error', error: { code, message } }
```

Frontend sets `isGenerating = true` on request start, `isGenerating = false` on `done` or `error` event.

---

## GenerationResult Contract

The verified runtime contract for generation output is:

```typescript
interface GenerationResult {
  assistant: string
  raw: string
  artifact: GeneratedArtifact
  provider: string
  model: string
}
```

### Contract responsibilities

- `assistant`
  - Human-readable explanation only.
  - Displayed inside chat.

- `raw`
  - Original provider response.
  - Never rendered.
  - Never shown in UI.
  - Used only for parsing/debugging.

- `artifact`
  - Structured build output.
  - Temporary transport object only.
  - Applied to Project.files.
  - Project.artifact is derived from Project.files for PreviewPanel.
  - Never rendered inside chat.

- `provider`
  - Provider name.
  - Used for diagnostics.

- `model`
  - Actual runtime model ID used.

---

## Artifact Generation Pipeline

The verified runtime flow is:

```text
User Prompt

↓

BuilderScreen

↓

POST /api/generate

↓

Provider Adapter

↓

Raw Provider Response

↓

Artifact Extraction

↓

Artifact Validation

↓

GenerationResult

↓

Project.files updated

↓

Project.artifact derived for UI

↓

Persistence

↓

PreviewPanel
```

Artifact extraction occurs before project persistence. Preview never consumes raw provider text. GeneratedArtifact is a temporary transport object; Project.files is the canonical workspace.

---

## Runtime Boundary

```text
Browser

↓

generation.ts

↓

fetch('/api/generate')

↓

Vite Plugin

↓

server/generation.ts

↓

Google AI Studio
```

Browser code must never use `process.env`. Browser code uses `import.meta.env` only. Server code may use `process.env`. Provider secrets never enter the browser.

---

## Persistence Flow

```text
GenerationResult

↓

Project.messages updated

↓

Project.files updated

↓

Project.artifact derived for UI

↓

Version created from Project.files

↓

savePersistedProjectState()

↓

localStorage

↓

Hydration after refresh
```

Assistant text persists. Artifact persists. Versions persist. Preview survives refresh.

---

## Version Lifecycle

```text
Successful generation

↓

Project.files snapshot

↓

Assistant snapshot

↓

Version created

↓

Marked current

↓

Persisted

↓

Available inside Version History
```

Failed generations do not create versions. Restore replaces the current artifact. Version IDs never change.

---

## Runtime Rules

- Assistant messages are never HTML.
- Assistant messages are never JSON.
- Assistant messages are never source code.
- Project.files is the canonical workspace.
- Project.artifact is derived for preview UI.
- PreviewPanel never parses provider responses.
- Chat never renders `GeneratedArtifact`.
- Raw provider text is never shown to users.

---

## Engineering Rules

- Never replace working functionality.
- Never introduce mocks over verified runtime paths.
- Fix the first failing boundary.
- Preserve UI unless explicitly requested.
- Backend changes must not alter frontend UX.
- Every implementation phase must end with:

```bash
pnpm test
pnpm build
npx tsc --noEmit
Browser verification
```

---

## Future Provider Support

The provider adapter architecture already supports multiple providers.

- OpenRouter
- Anthropic
- OpenAI
- DeepSeek
- Azure OpenAI
- Local models

Frontend must remain provider-agnostic. Only backend routing changes when adding providers.

---

## Frontend Integration Points

These are the exact locations in the current UI where the mock must be replaced:

### 1. HomePage — `handleSubmit()` (`src/pages/HomePage.tsx`)
```
CURRENTLY:  createProject(omniValue) → navigate('/project/:id')
TO BE WIRED: POST /api/projects { prompt, mode } → receive projectId → navigate
```

### 2. BuilderScreen — `handleSend()` (`src/pages/BuilderScreen.tsx`)
```
CURRENTLY:  buildAIResponse(content) → append mock assistant message
TO BE WIRED: POST /api/build (BuildRequest) → stream BuildResponse → update state
```

### 3. ConversationPanel — message append
```
CURRENTLY:  messages[] updated locally via useState
TO BE WIRED: messages[] updated from BuildResponse.message + streamed deltas
```

### 4. PreviewPanel — MockAppPreview (`src/components/PreviewPanel.tsx`)
```
CURRENTLY:  category-matched static fake UI based on project name
TO BE WIRED: sandboxed iframe rendering real generated files from BuildResponse.build.files
```

### 5. PreviewPanel — CodeEditor consoleLogs
```
CURRENTLY:  buildConsoleLogs() generates fake strings
TO BE WIRED: consoleLogs[] populated from BuildResponse.consoleEvents stream
```

### 6. VersionHistoryPanel — versions[]
```
CURRENTLY:  2 seed versions from createProject(), stored in local state
TO BE WIRED: versions[] persisted to database, BuildResponse.version appended on each build
```

---

## Security Constraints

- Provider API keys (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`) must live in backend environment variables only.
- SettingsPage API key inputs (OpenRouter, Anthropic) should be removed or repurposed — they currently store nothing and connect to nothing. If retained, keys should be sent to the backend for storage, never held in frontend state or localStorage.
- User auth tokens must be sent as `Authorization: Bearer <token>` headers on all `/api/*` calls.
- Project data must be scoped per authenticated user — `projectId` alone is not sufficient authorization.

---

## Status Legend

| Marker | Meaning |
|--------|---------|
| **CURRENTLY EXISTS** | Present and functional in the current codebase |
| **TO BE WIRED** | UI stub exists; backend or integration needed |
| **FUTURE** | Not yet started; lower priority |
| **MOCK** | Currently simulated client-side; must be replaced |
