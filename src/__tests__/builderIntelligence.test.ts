import { describe, expect, it } from "vitest"
import {
  classifyUserIntent,
  createInitialMemory,
  evaluateDecisionNeed,
  recordDecision,
  constructBuildIntent,
} from "../lib/builderIntelligence"

describe("Experience Evolution Slice 3 — Builder Intelligence Engine", () => {
  it("classifies user intent accurately across distinct categories", () => {
    expect(classifyUserIntent("Build me a task management app", { hasExistingFiles: false })).toBe("new_product")
    expect(classifyUserIntent("Add authentication to the app", { hasExistingFiles: true })).toBe("authentication_request")
    expect(classifyUserIntent("Add Paystack checkout integration", { hasExistingFiles: true })).toBe("integration_request")
    expect(classifyUserIntent("Move local storage to Firebase", { hasExistingFiles: true })).toBe("architecture_change")
    expect(classifyUserIntent("Make the buttons amber and rounded", { hasExistingFiles: true })).toBe("visual_change")
    expect(classifyUserIntent("Fix runtime crash in TaskList", { hasDiagnostics: true })).toBe("runtime_error")
    expect(classifyUserIntent("Yes, use Google auth", { pendingQuestion: true })).toBe("clarification_response")
  })

  it("evaluates decision needs: surfaces consequential decisions while acting on low-risk iterations", () => {
    const memory = createInitialMemory()

    // Consequential request without auth model specified
    const authEval = evaluateDecisionNeed("authentication_request", "Add authentication", memory)
    expect(authEval.requiresClarification).toBe(true)
    expect(authEval.question).toContain("sign in individually")

    // Consequential integration request without provider specified
    const payEval = evaluateDecisionNeed("integration_request", "Add payment processing", memory)
    expect(payEval.requiresClarification).toBe(true)
    expect(payEval.question).toContain("payment provider")

    // Low-risk visual request -> acts immediately without asking
    const visualEval = evaluateDecisionNeed("visual_change", "Make completed filter button amber", memory)
    expect(visualEval.requiresClarification).toBe(false)
  })

  it("persists decisions in ProjectMemory for project continuity", () => {
    let memory = createInitialMemory()
    memory = recordDecision(memory, "authentication", "google_auth", "user")
    memory = recordDecision(memory, "paymentProvider", "Paystack", "user")

    expect(memory.decisions).toHaveLength(2)
    expect(memory.decisions.find((d) => d.key === "authentication")?.value).toBe("google_auth")

    // Subsequent auth request with stored decision does not require clarification
    const reAuthEval = evaluateDecisionNeed("authentication_request", "Add login button to navbar", memory)
    expect(reAuthEval.requiresClarification).toBe(false)
  })

  it("constructs a structured BuildIntent handoff object for pipeline execution", () => {
    let memory = createInitialMemory()
    memory = recordDecision(memory, "persistence", "local_storage", "user")

    const intent = constructBuildIntent(
      "Add a clear completed tasks button",
      "feature_request",
      ["src/App.tsx", "src/components/TaskList.tsx"],
      memory,
    )

    expect(intent.intentType).toBe("feature_request")
    expect(intent.targetFiles).toContain("src/components/TaskList.tsx")
    expect(intent.acceptedDecisions.persistence).toBe("local_storage")
    expect(intent.constraints).toContain("do_not_rewrite_unrelated_components")
  })
})
