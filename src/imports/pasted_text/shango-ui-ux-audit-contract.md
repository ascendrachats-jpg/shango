SHANGO UI/UX MASTER AUDIT — PREPARE THE IMPLEMENTATION CONTRACT
PROJECT

Shango is an AI-powered application builder.

This task is an audit and documentation task only.

Do not redesign the UI.

Do not change the UI.

Do not add new features.

Do not remove existing features.

The purpose is to thoroughly inspect the entire Shango UI/UX and produce a precise implementation contract that can later be given to a coding agent working in VS Code.

The final UI/UX must remain visually and behaviorally faithful to the current Shango design.

PRIMARY OBJECTIVE

Audit the complete Shango application from the user's perspective and from the implementation perspective.

Document:

every screen
every route
every component
every button
every input
every menu
every modal
every drawer
every panel
every keyboard shortcut
every animation
every loading state
every empty state
every success state
every error state
every navigation action
every user interaction
every state transition

The result must allow a future VS Code coding agent to understand:

“This is exactly what the Shango UI must look like, and this is exactly how every interaction must behave.”

IMPORTANT

This is NOT a visual redesign task.

This is NOT a feature-development task.

This is NOT a backend implementation task.

This is NOT a mock-data implementation task.

This is an audit.

Do not modify the UI while auditing.

Do not change layout, spacing, colors, typography, animations, or interaction behavior.

PHASE 1 — COMPLETE FILE INVENTORY

Inspect the entire project.

Create a complete inventory of all relevant files.

For each file, document:

file path
file type
purpose
whether it is actively used
which screen/component imports it
whether it contains UI
whether it contains interaction logic
whether it contains mock data
whether it contains assets
whether it will need to be included in the future VS Code implementation

Categorize files into:

A. Application entry files
B. Routing files
C. Page/screen files
D. Shared UI components
E. Modals and sheets
F. Panels and drawers
G. State management
H. Utility files
I. Styling files
J. Asset files
K. Fonts
L. Images
M. Videos
N. Icons
O. Mock/demo data
P. Files that should NOT be copied into the future implementation
PHASE 2 — ROUTE AND SCREEN MAP

Document every route.

For every route, provide:

Route:
Screen:
Entry file:
Main layout:
Purpose:
How the user reaches it:
How the user leaves it:
Required state:
Possible states:
Child components:

Example:

Route:
/projects

Screen:
Projects

Entry file:
ProjectsPage.tsx

Purpose:
Displays the user's projects.

User can:
- open a project
- rename a project
- delete a project
- archive a project
- create a new project

States:
- loading
- populated
- empty
- error

Do this for every screen.

PHASE 3 — COMPLETE INTERACTION AUDIT

Inspect every interactive element.

For every button, link, icon, menu item, input, dropdown, tab, toggle, or clickable area, document:

Element:
Visible label:
Component:
File:
Location:
User action:
Expected result:
State change:
Navigation:
API/backend dependency:
Loading state:
Success state:
Error state:
Empty state:
Disabled state:
Keyboard interaction:

Example:

Element:
Create Project button

File:
HomeScreen.tsx

Action:
User clicks button

Expected result:
Project creation flow begins

State change:
New project draft is created

Navigation:
Navigate to /project/:id

Backend dependency:
POST /api/projects

Loading:
Button shows loading state

Success:
Builder opens

Error:
Toast displays failure

Disabled:
Button disabled while request is running

Audit every single interactive element.

Do not skip small icons.

PHASE 4 — BUILDER WORKSPACE AUDIT

The Builder is the most important Shango experience.

Document every part of the Builder.

Builder layout

Document:

sidebar
top bar
project title
navigation
conversation panel
message list
user message
assistant message
input area
send button
stop button
generation state
preview panel
preview toolbar
code view
version history
project settings
export
deployment
share
notifications
command palette
keyboard shortcuts

For each area document:

exact location
size behavior
responsive behavior
interactions
state changes
animations
dependencies
PHASE 5 — GENERATION EXPERIENCE AUDIT

Document the entire generation flow.

Example:

User enters prompt
↓
User presses Send
↓
Input becomes disabled or changes state
↓
Generation begins
↓
Assistant message appears
↓
Streaming/loading state appears
↓
Preview updates
↓
Code updates
↓
Generation completes
↓
Actions become available

Document every stage.

Include:

initial state
typing state
submit state
streaming state
partial response state
completion state
stop-generation state
retry state
failure state
empty state
PHASE 6 — PREVIEW AUDIT

Document:

preview viewport
responsive controls
device controls
refresh button
code toggle
fullscreen
preview loading
preview error
preview empty state
generated app rendering
iframe behavior if applicable
code display behavior
scroll behavior

For each interaction, document exact expected behavior.

PHASE 7 — PROJECT LIFECYCLE AUDIT

Document:

Create project
Open project
Rename project
Delete project
Archive project
Restore project
Duplicate project
Project settings
Project persistence

For each one:

user action
UI state
expected result
confirmation required
error behavior
empty behavior
persistence expectations
PHASE 8 — MODAL AND SHEET AUDIT

Audit every modal and sheet.

For every one, document:

Name:
Trigger:
Component:
File:
Purpose:
Open animation:
Close animation:
Backdrop:
Close button:
Escape key:
Click outside behavior:
Internal actions:
Loading state:
Success state:
Error state:

Include:

authentication sheet
export modal
deployment modal
share modal
project settings
command palette
keyboard shortcut overlay
notification center
any other overlay
PHASE 9 — AUTHENTICATION UX AUDIT

Document the complete authentication experience.

Include:

unauthenticated state
sign-in
sign-up if present
OAuth buttons
loading state
success state
failure state
session state
user profile
sign-out
expired session behavior

Do not implement authentication.

Only document the UI contract.

PHASE 10 — EXPORT AND DEPLOYMENT UX AUDIT

Document the exact current UI behavior for:

export
download
copy
GitHub
deployment
share

For each:

Trigger:
UI:
User action:
Expected result:
Progress state:
Success state:
Failure state:
External dependency:

Clearly mark whether something is:

REAL
MOCK
UI-ONLY
NOT IMPLEMENTED

Do not falsely describe simulated behavior as real.

PHASE 11 — STATE MACHINE MAP

Create a state map for the application.

At minimum document:

Application states:
- unauthenticated
- authenticated
- loading
- ready
- error

Project states:
- creating
- loading
- ready
- generating
- generated
- failed
- archived
- deleted

Generation states:
- idle
- submitting
- streaming
- completed
- stopped
- failed
- retrying

Preview states:
- empty
- loading
- ready
- refreshing
- error

Document valid transitions between states.

PHASE 12 — VISUAL DESIGN SYSTEM AUDIT

Document the exact visual system.

Include:

Colors
background
surface
elevated surface
border
primary text
secondary text
muted text
accent colors
error
warning
success
Typography
font family
font files
font weights
heading sizes
body sizes
label sizes
code font
Spacing

Document the spacing system.

Borders

Document:

radius
thickness
opacity
style
Shadows

Document every shadow system.

Animation

Document:

duration
easing
transition behavior
entrance animations
exit animations
hover animations
loading animations
PHASE 13 — RESPONSIVE BEHAVIOR

Document the UI at:

desktop
tablet
mobile

For every major screen document:

what disappears
what collapses
what becomes a drawer
what becomes a modal
what remains fixed
what becomes scrollable
PHASE 14 — ACCESSIBILITY AUDIT

Document:

keyboard navigation
focus behavior
focus trapping
Escape behavior
ARIA labels
button labels
screen-reader considerations
contrast
disabled states
PHASE 15 — MOCK VS REAL FUNCTIONALITY

Create a table:

Feature	Current Status	UI Exists	Logic Exists	Backend Needed
Authentication	MOCK/REAL	Yes	...	...
Projects	...	...	...	...
Generation	...	...	...	...
Preview	...	...	...	...
Export	...	...	...	...
Deployment	...	...	...	...
Sharing	...	...	...	...

Be completely honest.

PHASE 16 — FUTURE VS CODE IMPLEMENTATION MAP

Create a precise file migration map.

For every current UI file, document:

Current file:
Current purpose:
Future destination:
Keep:
Modify:
Replace:
Dependencies:
Backend hooks required:

Example:

Current:
src/pages/BuilderScreen.tsx

Future:
src/pages/BuilderScreen.tsx

Keep:
- visual layout
- responsive behavior
- animations

Modify:
- mock generation state
- mock project data

Connect:
- project API
- chat API
- generation API
- preview API
PHASE 17 — FUTURE IMPLEMENTATION ORDER

Create the recommended implementation sequence.

The sequence must preserve the UI.

Recommended format:

Phase 0 — UI baseline
Phase 1 — Application state
Phase 2 — Project persistence
Phase 3 — Authentication
Phase 4 — Real AI generation
Phase 5 — Streaming
Phase 6 — Preview
Phase 7 — Version history
Phase 8 — Export
Phase 9 — Deployment
Phase 10 — Collaboration

For each phase document:

files involved
dependencies
risks
validation test
PHASE 18 — FINAL DELIVERABLES

Create these documents inside the project:

1. SHANGO_UI_UX_MASTER_AUDIT.md

Complete UI/UX audit.

2. SHANGO_UI_INTERACTION_CONTRACT.md

Every interactive element and expected behavior.

3. SHANGO_UI_FILE_MIGRATION_MAP.md

Exact file-by-file future implementation map.

4. SHANGO_UI_STATE_MACHINE.md

Application and feature state transitions.

5. SHANGO_UI_BACKEND_WIRING_PLAN.md

Future API/backend integration points.

6. SHANGO_UI_IMPLEMENTATION_ORDER.md

Recommended build sequence.

FINAL REQUIREMENTS

Before completing the audit:

Inspect the entire project.
Do not modify application UI code.
Do not redesign anything.
Do not add features.
Do not invent backend behavior.
Do not call mock behavior real.
Trace every visible interaction to its source file.
Identify every mock/demo behavior.
Identify every real behavior.
Identify every missing behavior.
Produce exact file paths.
Produce implementation dependencies.
Produce validation requirements.

The final output must allow a future coding agent to begin implementing the real Shango application without needing to rediscover the UI/UX architecture.

The UI/UX is the source of truth.

The future implementation must preserve it.