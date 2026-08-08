# SHANGO IMPLEMENTATION PLAN

This plan turns the experience vision into a staged rollout that prioritizes confidence, clarity, and emotional safety before visual flair.

## Phase 1 — Experience Foundation
Goal: establish the emotional structure of Shango before changing surface detail.

### Focus
- Define the core experience system:
  - calm visual language
  - motion language
  - interaction language
  - tone of voice
- Clarify the builder journey across:
  - first visit
  - first build
  - first success
  - first failure
  - returning use

### Deliverables
- experience principles
- interaction map
- state model for thinking / building / reviewing / recovering
- revised information hierarchy for the builder workspace

### Priority
P0

---

## Phase 2 — Core Builder Experience
Goal: make the builder feel guided, calm, and in control.

### Primary areas
- src/pages/BuilderScreen.tsx
- src/components/ConversationPanel.tsx
- src/components/PreviewPanel.tsx
- src/components/Sidebar.tsx

### What to redesign first
- activity/status card
- loading states
- empty states
- progress communication
- panel hierarchy
- error and retry states
- viewport and inspector behavior

### Success criteria
- a builder can understand the current state in under 2 seconds
- the interface feels less noisy and more reassuring
- waiting feels intentional rather than empty

### Priority
P0

---

## Phase 3 — Confidence and Trust Layer
Goal: make the AI feel like a calm collaborator, not a busy tool.

### Focus
- AI response tone and pacing
- reassurance during long operations
- clear next-step guidance
- recovery language after failure
- celebration of small wins

### Primary areas
- src/pages/HomePage.tsx
- src/pages/BuilderScreen.tsx
- src/store/AppContext.tsx

### Success criteria
- the product reduces anxiety during uncertainty
- the builder feels supported, not observed
- failures feel recoverable and non-judgmental

### Priority
P1

---

## Phase 4 — Workspace Evolution
Goal: transform the workspace from a functional builder into a lasting creative studio.

### Focus
- adaptive workspace modes
- emotional rhythm across project complexity
- long-term project memory
- calmer, more premium interaction patterns

### Success criteria
- the experience feels increasingly refined as the project grows
- the interface adapts without becoming more complicated
- the workspace feels personal and enduring

### Priority
P1

---

## Recommended First Slice
If we want the highest impact first, start with this sequence:

1. Rebuild the activity/status experience
2. Introduce calmer loading, empty, and error states
3. Simplify the builder’s primary information hierarchy
4. Add a stronger “what is happening / what next” pattern
5. Then evolve the AI personality and workspace mood

This gives the product a strong emotional foundation quickly without overbuilding too early.

---

## Delivery Rhythm
For each phase, we should ship in small reviewable slices:
- design direction
- interaction spec
- visual treatment
- implementation review
- polish pass

That keeps the work aligned with the core promise:
Shango should make builders feel more capable, not merely more productive.
