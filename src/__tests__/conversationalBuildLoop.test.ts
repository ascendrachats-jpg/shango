import { beforeEach, describe, expect, it } from "vitest"
import { processUserIntentAndOrchestrate } from "../lib/builderOrchestrator"
import {
  clearAllMemoryStore,
  getProjectMemory,
  recordProjectDecision,
} from "../lib/builderMemoryStore"

describe("Experience Evolution Slice 4 — The Conversational Build Loop Integration Test Suite", () => {
  const projectId = "proj-slice4-test"
  const sampleFiles = [
    { path: "src/App.tsx", content: "export default function App() {}" },
    { path: "src/components/TaskList.tsx", content: "export default function TaskList() {}" },
    { path: "src/styles.css", content: "body { background: #0f172a; }" },
  ]

  beforeEach(() => {
    clearAllMemoryStore()
  })

  it("1. Simple feature request executes immediately without unnecessary questions", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Add a completed tasks count to header", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.intentType).toBe("feature_request")
    expect(res.buildIntent).toBeDefined()
    expect(res.question).toBeUndefined()
  })

  it("2. Visual change executes targeted modification immediately", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Make the primary filter button amber", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.intentType).toBe("visual_change")
    expect(res.buildIntent?.constraints).toContain("do_not_rewrite_unrelated_components")
  })

  it("3. Consequential decision triggers ask_clarification without initiating code generation", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Add authentication", sampleFiles)
    expect(res.action).toBe("ask_clarification")
    expect(res.question).toBeDefined()
    expect(res.question).toContain("sign in individually")
    expect(res.buildIntent).toBeUndefined()
  })

  it("4. Clarification response resolves pending decision and resumes original build", () => {
    // Turn 1: Trigger question
    processUserIntentAndOrchestrate(projectId, "Add authentication", sampleFiles)

    // Turn 2: User answers question
    const res = processUserIntentAndOrchestrate(projectId, "Google authentication", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.resumedFromClarification).toBe(true)
    expect(res.memory.decisions.find((d) => d.key === "authentication")?.value).toBe("Google authentication")
    expect(res.memory.pendingDecision).toBeUndefined()
  })

  it("5. Stored decisions persist in ProjectMemory and prevent repeated questions", () => {
    recordProjectDecision(projectId, "authentication", "google_auth", "user")

    const res = processUserIntentAndOrchestrate(projectId, "Add login button to navbar", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.question).toBeUndefined()
  })

  it("6. Memory store maintains project facts, decisions, and constraints per project", () => {
    const mem = getProjectMemory(projectId)
    expect(mem.constraints).toContain("preserve_working_functionality")
    expect(mem.decisions).toHaveLength(0)
  })

  it("7. Bug fix intent constructs targeted repair context", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Fix task completion toggle bug", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.intentType).toBe("bug_fix")
  })

  it("8. Runtime diagnostic triggers repair_build route", () => {
    const diagnostic = { code: "TS2339", message: "Property 'toggle' does not exist", file: "src/components/TaskList.tsx" }
    const res = processUserIntentAndOrchestrate(projectId, "Fix runtime error", sampleFiles, "src/components/TaskList.tsx", diagnostic)
    expect(res.action).toBe("repair_build")
    expect(res.intentType).toBe("runtime_error")
    expect(res.selectedFiles?.some((f) => f.path === "src/components/TaskList.tsx")).toBe(true)
  })

  it("9. Undo intent returns restore_version, bypassing LLM code generation", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Undo that", sampleFiles)
    expect(res.action).toBe("restore_version")
    expect(res.intentType).toBe("undo_or_restore")
    expect(res.buildIntent).toBeUndefined()
  })

  it("10. Restore intent returns restore_version directly", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Restore previous version", sampleFiles)
    expect(res.action).toBe("restore_version")
    expect(res.intentType).toBe("undo_or_restore")
  })

  it("11. Multi-turn continuity preserves stored decisions across prompt turns", () => {
    // Turn 1: Add payment integration
    processUserIntentAndOrchestrate(projectId, "Add payment processing", sampleFiles)
    processUserIntentAndOrchestrate(projectId, "Paystack", sampleFiles)

    // Turn 2: Subsequent request automatically includes Paystack decision
    const turn2 = processUserIntentAndOrchestrate(projectId, "Add checkout button to navbar", sampleFiles)
    expect(turn2.buildIntent?.acceptedDecisions.paymentProvider).toBe("Paystack")
  })

  it("12. Context selection extracts surgical file context rather than entire workspace", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Update tasklist items spacing", sampleFiles, "src/components/TaskList.tsx")
    expect(res.selectedFiles?.some((f) => f.path === "src/components/TaskList.tsx")).toBe(true)
  })

  it("13. Detects architecture change intent for database migration requests", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Move local storage to Supabase", sampleFiles)
    expect(res.intentType).toBe("architecture_change")
  })

  it("14. Integration request for payments triggers clarification when provider unselected", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Add payment integration", sampleFiles)
    expect(res.action).toBe("ask_clarification")
    expect(res.question).toContain("payment provider")
  })

  it("15. Reverts pending decision state cleanly upon resolution", () => {
    processUserIntentAndOrchestrate(projectId, "Add payment integration", sampleFiles)
    const mem1 = getProjectMemory(projectId)
    expect(mem1.pendingDecision).toBeDefined()

    processUserIntentAndOrchestrate(projectId, "Paystack", sampleFiles)
    const mem2 = getProjectMemory(projectId)
    expect(mem2.pendingDecision).toBeUndefined()
  })

  it("16. BuildIntent includes accepted decisions and constraints handoff contract", () => {
    recordProjectDecision(projectId, "theme", "charcoal", "user")
    const res = processUserIntentAndOrchestrate(projectId, "Add export button", sampleFiles)
    expect(res.buildIntent?.acceptedDecisions.theme).toBe("charcoal")
    expect(res.buildIntent?.objective).toBe("Add export button")
  })

  it("17. Handles empty workspace gracefully for new product generation", () => {
    const res = processUserIntentAndOrchestrate(projectId, "Build me a task management app", [])
    expect(res.action).toBe("execute_build")
    expect(res.intentType).toBe("new_product")
  })

  it("18. Diagnostic repair includes diagnostic message in BuildIntent assumptions", () => {
    const diagnostic = { code: "TS2304", message: "Cannot find name 'React'", file: "src/App.tsx" }
    const res = processUserIntentAndOrchestrate(projectId, "Fix build error", sampleFiles, "src/App.tsx", diagnostic)
    expect(res.buildIntent?.assumptions.some((a) => a.includes("TS2304"))).toBe(true)
  })

  it("19. Memory update retains facts and decisions after build execution", () => {
    recordProjectDecision(projectId, "persistence", "local_storage", "user")
    const mem = getProjectMemory(projectId)
    expect(mem.decisions.find((d) => d.key === "persistence")?.value).toBe("local_storage")
  })

  it("20. Single build completion after clarification without duplicate requests", () => {
    processUserIntentAndOrchestrate(projectId, "Add authentication", sampleFiles)
    const res = processUserIntentAndOrchestrate(projectId, "Google auth", sampleFiles)
    expect(res.action).toBe("execute_build")
    expect(res.resumedFromClarification).toBe(true)
  })
})
