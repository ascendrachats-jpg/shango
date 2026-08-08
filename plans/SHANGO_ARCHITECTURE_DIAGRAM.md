# SHANGO Architecture Diagram

## Current State (Phase 1 Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHANGO BUILDER OS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (React)                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  HomePage / ProjectsPage / BuilderScreen / etc    │  │   │
│  │  │                                                    │  │   │
│  │  │  • 9 Pages + Full UI                              │  │   │
│  │  │  • Generation trigger interface                   │  │   │
│  │  │  • Version history view                           │  │   │
│  │  │  • Deployment dashboard                           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 APPLICATION LAYER (Vite)                 │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  AppContext (State Management)                     │  │   │
│  │  │  • Projects state                                 │  │   │
│  │  │  • Modal/Toast state                              │  │   │
│  │  │  • Auth state (user, session)                     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│          │                      │                    │           │
│          ▼                      ▼                    ▼           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  STORE LAYER     │  │  GENERATION      │  │  PERSISTENCE │ │
│  │  ────────────────│  │  ────────────────│  │  ────────────│ │
│  │  • Projects      │  │  • Versions      │  │  • localStorage
│  │  • Files         │  │  • Provenance    │  │  • IndexedDB  │
│  │  • Artifacts     │  │  • Messages      │  │  • Network    │
│  │  • Deployments   │  │                  │  │    Sync       │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│          │                      │                    │           │
│          └──────────────────────┼────────────────────┘           │
│                                 │                                 │
│                                 ▼                                 │
│                  ┌───────────────────────────┐                   │
│                  │   ANTIGRAVITY ENGINE      │                   │
│                  │   (Phase 1 - NEW)         │                   │
│                  ├───────────────────────────┤                   │
│                  │ • buildAntigravityMerge() │                   │
│                  │ • normalizeOperations()   │                   │
│                  │ • recordProvenance()      │                   │
│                  │                           │                   │
│                  │ Enforces:                 │                   │
│                  │ • Project.files canonical │                   │
│                  │ • Protected file safety   │                   │
│                  │ • Deterministic merging   │                   │
│                  │ • Full auditability       │                   │
│                  └───────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              VITE MIDDLEWARE API (In-Memory)             │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Routes:                                           │  │   │
│  │  │  • POST   /api/build             (generate)        │  │   │
│  │  │  • POST   /api/projects          (create/sync)     │  │   │
│  │  │  • GET    /api/projects          (list)            │  │   │
│  │  │  • GET    /api/projects/:id      (get)             │  │   │
│  │  │  • PATCH  /api/projects/:id      (update)          │  │   │
│  │  │  • DELETE /api/projects/:id      (delete)          │  │   │
│  │  │  • GET    /api/me                (current user)    │  │   │
│  │  │  • POST   /api/auth/*            (auth flows)      │  │   │
│  │  │                                                    │  │   │
│  │  │  Stores (In-Memory):                               │  │   │
│  │  │  • ProjectStore                                    │  │   │
│  │  │  • AuthStore                                       │  │   │
│  │  │  • DeploymentStore                                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            GENERATION PIPELINE (Stubbed)                │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Provider Abstraction:                             │  │   │
│  │  │  • generateCode()  (template responses)            │  │   │
│  │  │  • buildArtifact() (mock compiler)                 │  │   │
│  │  │                                                    │  │   │
│  │  │  Result Format:                                    │  │   │
│  │  │  {                                                 │  │   │
│  │  │    fileChanges: [...],  // Raw provider output     │  │   │
│  │  │    artifact: { ... },   // Rendered result         │  │   │
│  │  │    messages: [...]      // Error/info messages     │  │   │
│  │  │  }                                                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            LOCAL PERSISTENCE                            │   │
│  │  • localStorage   (user preferences)                    │   │
│  │  • localStorage   (project snapshots)                   │   │
│  │  • IndexedDB      (large file storage)                  │   │
│  │  • Service Worker (optional offline support)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • AI Providers (Mocked): OpenAI, Anthropic, Mistral            │
│  • Auth Providers (OAuth): GitHub, Google                        │
│  • Deployment: Vercel (not yet integrated)                       │
│  • Analytics: None yet                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 2 Integration Point

```
Current Flow (Phase 1):
┌─────────────────────────────────────────────┐
│ User clicks "Generate"                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Call /api/build      │
        │ (Vite middleware)    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Provider Pipeline    │
        │ (mock/template)      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Return FileChanges[] │
        │ + Artifact           │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ MERGE INTO PROJECT (OLD) │
        │ mergeWorkspaceFiles()    │
        │ (artifact-based)         │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Update Project in Memory     │
        │ (localStorage)               │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Update UI                    │
        └──────────────────────────────┘


Phase 2 Flow (AFTER Integration):
┌─────────────────────────────────────────────┐
│ User clicks "Generate"                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Call /api/build      │
        │ (Vite middleware)    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Provider Pipeline    │
        │ (mock/template)      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ NORMALIZE OPERATIONS (NEW)   │
        │ normalizeProviderOps()       │
        │ Convert artifact → BuildFileOp[]
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ APPLY ANTIGRAVITY MERGE (NEW)│
        │ buildAntigravityMerge()      │
        │ • Validate operations        │
        │ • Apply to current workspace │
        │ • Protect system files       │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ RECORD PROVENANCE (NEW)      │
        │ recordMergeProvenance()      │
        │ • Capture all metadata       │
        │ • Enable full rollback       │
        │ • Store in version history   │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Create Version Entry         │
        │ (with provenance)            │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Update Project in Memory     │
        │ (localStorage)               │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Update UI with Deterministic │
        │ Result + Audit Trail         │
        └──────────────────────────────┘
```

## Phase 3+ Expansion

```
After Phase 3 (Backend Services):
┌─────────────────────────────────────────────┐
│          SHANGO BACKEND (New)                │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Real API (Express/Next.js Routes)   │   │
│  │  ───────────────────────────────────── │   │
│  │  • POST   /api/projects             │   │
│  │  • GET    /api/projects             │   │
│  │  • PATCH  /api/projects/:id         │   │
│  │  • POST   /api/projects/:id/generate│   │
│  │  • POST   /api/projects/:id/deploy  │   │
│  │  • GET    /api/versions/:id         │   │
│  │  • POST   /api/versions/:id/restore │   │
│  │  etc...                              │   │
│  └──────────────────────────────────────┘   │
│            │                                 │
│            ▼                                 │
│  ┌──────────────────────────────────────┐   │
│  │    Database (PostgreSQL)             │   │
│  │    ─────────────────────────────     │   │
│  │  • Projects table                   │   │
│  │  • Files table                      │   │
│  │  • Versions table (+ provenance)    │   │
│  │  • Deployments table                │   │
│  │  • Users & Sessions                 │   │
│  │  • Activity logs                    │   │
│  └──────────────────────────────────────┘   │
│            │                                 │
│            ▼                                 │
│  ┌──────────────────────────────────────┐   │
│  │  Real Generation Pipeline            │   │
│  │  ─────────────────────────────────   │   │
│  │  • OpenAI API                       │   │
│  │  • Anthropic API                    │   │
│  │  • Mistral API                      │   │
│  │  • Multi-provider fallback          │   │
│  └──────────────────────────────────────┘   │
│            │                                 │
│            ▼                                 │
│  ┌──────────────────────────────────────┐   │
│  │  File Storage (Vercel Blob)          │   │
│  │  ─────────────────────────────────   │   │
│  │  • Store generated artifacts        │   │
│  │  • Version history archival         │   │
│  │  • Deployment builds                │   │
│  └──────────────────────────────────────┘   │
│            │                                 │
│            ▼                                 │
│  ┌──────────────────────────────────────┐   │
│  │  Build Infrastructure                │   │
│  │  ─────────────────────────────────   │   │
│  │  • Vite bundler                     │   │
│  │  • Build optimization               │   │
│  │  • Output artifacts                 │   │
│  └──────────────────────────────────────┘   │
│            │                                 │
│            ▼                                 │
│  ┌──────────────────────────────────────┐   │
│  │  Deployment System (Vercel)          │   │
│  │  ─────────────────────────────────   │   │
│  │  • One-click deploy                 │   │
│  │  • Custom domains                   │   │
│  │  • Environment management           │   │
│  │  • Preview deployments              │   │
│  └──────────────────────────────────────┘   │
│                                              │
└─────────────────────────────────────────────┘
        │               │              │
        │               │              │
        ▼               ▼              ▼
   ┌────────┐    ┌──────────┐   ┌──────────┐
   │Vercel  │    │CDN       │   │Analytics │
   │Deploy  │    │(Blob)    │   │Services  │
   └────────┘    └──────────┘   └──────────┘
```

## Data Model at Each Phase

### Phase 1 (Current)
```typescript
Project {
  id: string
  name: string
  prompt: string
  files: ProjectFile[]        // Canonical source of truth
  artifact: ProjectArtifact   // Derived from files
  versions: Version[]         // History
  messages: Message[]         // Conversation
  lastGeneration?: GenerationProvenance  // Recent metadata
}

ProjectFile {
  path: string
  content: string
  language: string
  lastModified: string
}

ProjectArtifact {
  id: string
  html: string
  css: string
  js: string
  dependencies?: Record<string, string>
}
```

### Phase 2 (Versioning Integrated)
```typescript
// Same as Phase 1, but with enhanced Version entries:

Version {
  id: string
  timestamp: string
  provenance: GenerationProvenance  // Full operation record
  operations: BuildFileOperation[]    // Deterministic ops
  files: ProjectFile[]                // Snapshot
  artifact: ProjectArtifact           // Result
}

GenerationProvenance {
  id: string
  timestamp: string
  provider: string
  model: string
  mode: 'plan' | 'build'
  prompt: string
  operations: Array<{
    path: string
    operation: 'create' | 'modify' | 'delete'
  }>
  rejectedOperations?: Array<{
    path: string
    reason: string
  }>
}
```

### Phase 3 (Backend Persisted)
```typescript
// All Phase 2 data stored in PostgreSQL:

projects table
  id, userId, name, prompt, model, files, artifact, created_at, updated_at

files table
  id, projectId, path, content, language, version, created_at, updated_at

versions table
  id, projectId, timestamp, provenance, operations, created_at

deployments table
  id, projectId, url, status, logs, created_at

users table
  id, email, provider, created_at, updated_at
```

## Test Coverage

```
Current (Phase 1):
✓ 147 tests passing
  ├── 124 existing tests
  │   ├── Generation tests
  │   ├── Versioning tests
  │   ├── Persistence tests
  │   └── Workspace tests
  └── 23 new Antigravity tests
      ├── Merge engine tests
      ├── Operation normalization
      ├── Protected file enforcement
      ├── Provenance recording
      └── Integration workflows

Required for Phase 2:
✓ All 147 tests must still pass (backwards compatible)
✓ New versioning flow covered by existing tests
✓ No new tests needed (coverage already exists)

Phase 3+:
□ Backend API tests (new)
□ Database schema tests (new)
□ Provider integration tests (new)
□ E2E deployment tests (new)
```

## Deployment Architecture (Phase 4+)

```
┌────────────────────────────────────────────────────────────┐
│  SHANGO User Creates "React Dashboard" Project             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Prompt: "Build me a beautiful React dashboard"        │
│     ↓                                                       │
│  2. Generation Engine creates files:                       │
│     • App.tsx, Dashboard.tsx, styles.css, package.json    │
│     ↓                                                       │
│  3. Antigravity merge applies changes deterministically    │
│     ↓                                                       │
│  4. System creates buildable artifact                      │
│     ↓                                                       │
│  5. User clicks "Deploy"                                   │
│     ↓                                                       │
│  6. Build Pipeline:                                        │
│     • Vite bundles the React app                          │
│     • Generates optimized index.html                       │
│     • Creates production artifacts                         │
│     ↓                                                       │
│  7. Vercel Deployment:                                     │
│     • Creates new deployment                              │
│     • Assigns unique preview URL                           │
│     • Optionally binds custom domain                       │
│     ↓                                                       │
│  8. Live on Web:                                           │
│     • https://dashboard-user123.vercel.app               │
│     • Or https://dashboard.company.com                    │
│                                                             │
│  9. SHANGO tracks deployment:                             │
│     • Build logs                                          │
│     • Performance metrics                                 │
│     • Version history                                     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Key Invariants Enforced Throughout

```
1. WORKSPACE OWNERSHIP
   Project.files = canonical source of truth
   Project.artifact = always derived from files
   
2. PROTECTED FILES
   ✗ Cannot modify: package.json, tsconfig.json, .env*
   ✗ Cannot delete: core system files
   ✗ Cannot overwrite: build configuration
   
3. DETERMINISM
   Same input → Same output always
   No hidden state mutations
   Full operation history preserved
   
4. AUDITABILITY
   Every change recorded with:
   • What changed (operation)
   • When it changed (timestamp)
   • Why it changed (provider, model, prompt)
   • Who changed it (user)
   
5. REVERSIBILITY
   Every change can be undone via version restore
   No destructive operations
   Full rollback capability
```

This architecture ensures SHANGO remains a user-owned workspace OS at all scales.
