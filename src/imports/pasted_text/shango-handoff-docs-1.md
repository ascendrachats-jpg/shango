We are now preparing SHANGO V1 for transfer to VS Code / Antigravity for backend logic and real integrations.

You have already created:

SHANGO_CURRENT_UI_INVENTORY.md

This file is now the source of truth for the current UI implementation.

Do not redesign the UI.
Do not create a new architecture.
Do not create a new /hub, dashboard system, mode system, workspace system, or alternative navigation system.
Do not rename existing concepts.
Do not replace working components.

The purpose of this task is to prepare a clean handoff from the current Figma implementation to an engineer working in VS Code.

Step 1 — Read the current inventory

Read:

SHANGO_CURRENT_UI_INVENTORY.md

Use it to understand the actual current implementation, including:

all routes
current navigation
current project flow
current workspace
current components
current state
current mock data
current API integrations
current data models
current file structure
known gaps

Do not assume anything that is not present in the inventory.

Step 2 — Create these three files

Create exactly these files at the project root:

SHANGO_ARCHITECTURE.md
SHANGO_MODEL_ROUTING_SPEC.md
SHANGO_WIRING_ROADMAP.md

These documents must describe the existing SHANGO implementation, not an imagined future product.

1. SHANGO_ARCHITECTURE.md

Document the current architecture based strictly on:

SHANGO_CURRENT_UI_INVENTORY.md

Include:

Current route structure

For every existing route:

route
purpose
current components
current navigation entry
current status
Current component hierarchy

Document the real component tree.

Example:

App
├── AppContext
├── AppRouter
├── GlobalNavigation
├── Dashboard
│   ├── ProjectList
│   └── ProjectCard
└── BuilderScreen
    ├── WorkspaceHeader
    ├── ConversationPanel
    ├── ForgeInput
    ├── PreviewPanel
    ├── CodeEditor
    ├── VersionHistoryPanel
    └── ConnectorsDrawer

Do not invent components that do not exist.

Current state architecture

Document:

AppContext
reducer actions
localStorage keys
project state
active project state
workspace state
editor state
drawer state
version state

Show where state currently lives.

Current data models

Document every existing TypeScript interface and its actual file location.

Current API/integration status

Clearly classify every integration as:

REAL
MOCKED
UI ONLY
NOT CONNECTED

Do not make assumptions.

Current architecture risks

Document only real problems found in the inventory.

Do not turn this into a redesign proposal.

2. SHANGO_MODEL_ROUTING_SPEC.md

This document should describe how the current SHANGO UI will eventually communicate with AI models.

Do not rebuild the UI.

Do not create a new AI architecture unrelated to the current implementation.

Design the specification around the existing workspace flow:

User
↓
ForgeInput / Omnibox
↓
Plan or Build intent
↓
Backend model router
↓
AI model
↓
Structured response
↓
Workspace state update
↓
Preview / Files / Code / Console

The specification must define:

Request structure

Describe the payload the frontend should eventually send.

For example:

{
  projectId: string;
  prompt: string;
  mode: "plan" | "build";
  activeFile?: string;
  projectContext?: unknown;
  fileContext?: unknown;
}

Only include fields that make sense for the existing UI.

Response structure

Define a structured response that can support:

plan responses
code changes
file creation
file modification
preview updates
console events
errors

The response must be machine-readable.

Model routing

Define a clean routing layer that can later support:

Frontend
↓
SHANGO backend model router
↓
Provider adapter
├── OpenRouter
└── Google Gemini

Do not place provider API keys in the frontend.

Do not hardcode provider-specific logic throughout UI components.

Important

Do not implement the model APIs yet unless they already exist.

This file is a wiring specification, not an instruction to fake a working AI backend.

Clearly mark:

CURRENTLY EXISTS
TO BE WIRED
FUTURE
3. SHANGO_WIRING_ROADMAP.md

Create a practical implementation roadmap for the engineer moving this project into VS Code / Antigravity.

The roadmap must be based on the actual gaps identified in:

SHANGO_CURRENT_UI_INVENTORY.md

Organize the roadmap in this order:

Phase 0 — Preserve the existing UI

Before changing logic:

preserve current routes
preserve current components
preserve current styling
preserve current navigation
preserve existing working interactions
create a git checkpoint

The engineer must not rebuild the interface from scratch.

Phase 1 — Make the current state persistent

Identify:

which mock state must become persistent
which localStorage state exists
which state should eventually move to a database
which project data needs a real backend
Phase 2 — Connect project lifecycle

Document the wiring required for:

Create project
↓
Project appears in dashboard
↓
Open project
↓
Enter workspace
↓
Continue working
↓
Save changes
Phase 3 — Connect the Omnibox / ForgeInput

Document the exact current UI event flow:

User enters prompt
↓
Current handler
↓
Current state update
↓
Current UI result

Then describe what must replace the mocked behavior.

Do not change the UI.

Phase 4 — Connect AI model routing

Connect the existing UI to the model router defined in:

SHANGO_MODEL_ROUTING_SPEC.md

Phase 5 — Connect workspace output

Document how real AI responses should eventually update:

conversation
files
code
preview
console
project state
Phase 6 — Connect real integrations

Use the inventory to identify the actual integrations that are currently mocked or disconnected.

Examples may include:

GitHub
Supabase
Paystack
Vercel

Only include integrations that actually exist in the current codebase.

Phase 7 — Testing

Create a testing checklist covering:

project creation
project persistence
opening a project
workspace loading
prompt submission
plan/build behavior
file updates
preview updates
drawer behavior
version history
connectors
reload persistence
Final requirement

After creating the three files:

Run the TypeScript check.
Run the existing build.
Confirm that no existing UI behavior was intentionally removed.
Do not make unrelated UI changes.
Do not add new product concepts.
Do not create new routes unless absolutely required by the existing implementation.
Do not modify the current visual design.

Then provide a concise summary containing:

Files created:
- SHANGO_ARCHITECTURE.md
- SHANGO_MODEL_ROUTING_SPEC.md
- SHANGO_WIRING_ROADMAP.md

UI changes:
None

Routes changed:
None

Existing components removed:
None

Existing components renamed:
None

TypeScript:
PASS / FAIL

Build:
PASS / FAIL

Known remaining work:
...