We are preparing the current SHANGO frontend for a handoff to an engineering agent working in VS Code / Antigravity.

Do NOT redesign anything.

Do NOT add new features.

Do NOT create a new architecture.

Do NOT create a new folder structure.

Do NOT invent new navigation items, menus, pages, modes, hubs, dashboards, or systems.

Your task is to inspect the current SHANGO project exactly as it exists and produce a complete implementation inventory for engineering handoff.

The current UI/UX is the source of truth.

Before changing anything, inspect the entire existing project carefully.

Create a single file at the project root:

SHANGO_CURRENT_UI_INVENTORY.md

This document must describe what currently exists in the project, not what you think should exist.

Document the following:

1. CURRENT ROUTES AND PAGES

List every route and page that currently exists.

For each one document:

- Route/path
- What the page is for
- What the user can do there
- What components it renders
- What navigation leads to it
- What navigation leads away from it
- Whether the page is currently functional, partially functional, or visual-only

Do not invent routes that do not exist.

2. CURRENT GLOBAL NAVIGATION

Document the existing global sidebar/navigation exactly as it currently exists.

For every item:

- Label
- Icon
- Destination
- Current behavior
- Whether it opens a page, drawer, external link, or other UI
- Whether it is currently functional

Do not rename or reorganize anything.

3. CURRENT PROJECT / DASHBOARD STRUCTURE

Document how projects are currently represented.

Include:

- Project list
- Project cards
- Project selection
- Project creation
- Project navigation
- Recent projects
- Any project metadata currently shown

Document actual existing behavior only.

4. CURRENT WORKSPACE

Document the existing workspace in detail.

Describe:

- Top navigation
- Project title/context control
- Conversation area
- Chat history
- Omnibox
- Plan/Build controls if they currently exist
- Preview area
- Viewport controls
- Inspector
- Console
- Version history
- Connectors
- GitHub integration UI
- Any drawers
- Any other workspace controls

For each element, document:

- Component name
- Location
- Visible states
- Interaction behavior
- Existing event handlers
- Whether the functionality is real or placeholder

Do not redesign the workspace.

5. CURRENT COMPONENT INVENTORY

Create a table of the important existing components.

For each component:

- Component name
- File path
- Purpose
- Where it is used
- Important props
- Important state
- Important callbacks
- Whether it is reusable
- Whether it appears to be a placeholder

6. CURRENT STATE

Document the state that currently exists.

Identify:

- React Context
- Zustand stores
- Other state managers
- Local state
- Local storage
- Session storage
- URL state
- Mock state
- Hardcoded state

For each state source, document what it controls.

Do not create new state management.

7. CURRENT API AND BACKEND CONNECTIONS

Document every existing connection to:

- APIs
- Server actions
- Supabase
- Authentication
- OpenRouter
- Gemini
- GitHub
- Paystack
- Vercel
- Any other external service

For each one, document whether it is:

- Real
- Mocked
- Placeholder
- Not yet connected

Do not create new integrations.

8. CURRENT BUILD FLOW

Trace what currently happens when the user:

- Enters a prompt
- Clicks Build
- Sends a message
- Changes project
- Opens the workspace
- Opens the preview
- Changes viewport
- Opens Inspector
- Opens Console
- Opens Version History
- Opens Connectors

Document the actual current flow.

If a flow is incomplete, clearly say so.

9. CURRENT DATA MODELS

Document any existing:

- TypeScript interfaces
- Types
- Schemas
- Project models
- User models
- Message models
- File models
- Version models
- Connector models

Include their file paths.

Do not create new models.

10. CURRENT FILE STRUCTURE

Create a concise map of the important project structure.

Example:

/app
/components
/hooks
/lib
/contexts
/types

Only document directories and files that actually exist.

11. KNOWN GAPS

At the end, create a section called:

CURRENTLY MISSING OR INCOMPLETE

List only functionality that is clearly missing or incomplete based on the current project.

Do not suggest solutions.

Do not redesign anything.

Do not make recommendations.

12. ENGINEERING HANDOFF SUMMARY

At the end, provide a short summary answering:

- What already works?
- What is UI-only?
- What is mocked?
- What is connected?
- What should an engineering agent inspect first?

IMPORTANT RULES:

- This is an inventory, not a redesign.
- Do not modify the existing UI.
- Do not create new pages.
- Do not create new components.
- Do not rename existing components.
- Do not reorganize the application.
- Do not add a new "Hub".
- Do not add new modes.
- Do not add new navigation items.
- Do not invent features.
- Do not assume an integration exists because the UI contains an icon for it.
- Verify the actual implementation before documenting it.
- If something is uncertain, mark it as UNKNOWN instead of guessing.

The goal is to produce an accurate snapshot of the current SHANGO project so that the next engineering agent can understand what already exists before we wire the real backend logic.

After creating SHANGO_CURRENT_UI_INVENTORY.md, do not make any other changes.