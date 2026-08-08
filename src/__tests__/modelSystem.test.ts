import { describe, expect, it } from "vitest"
import {
  DEFAULT_SHANGO_MODEL,
  resolveModelId,
  resolveModelSlug,
  SHANGO_MODELS,
  isKnownModel,
  buildGeminiFallbackChain,
} from "../lib/models"
import { resolveModelRoute } from "../../server/modelRouter"
import { constructBuildIntent, createInitialMemory } from "../lib/builderIntelligence"
import { processUserIntentAndOrchestrate } from "../lib/builderOrchestrator"
import { recordProjectDecision } from "../lib/builderMemoryStore"

describe("Model System Overhaul — Canonical Registry, Routing, Fallback & Provenance", () => {
  it("1. Registers all 9 requested Gemini models in canonical SHANGO_MODELS registry", () => {
    const requiredModels = [
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemini-pro-latest",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ]

    for (const modelId of requiredModels) {
      expect(SHANGO_MODELS[modelId]).toBeDefined()
      expect(SHANGO_MODELS[modelId].id).toBe(modelId)
    }
  })

  it("2. Explicitly sets Gemini 3.6 Flash as default model", () => {
    expect(DEFAULT_SHANGO_MODEL).toBe("gemini-3.6-flash")
    expect(resolveModelSlug("default")).toBe("gemini-3.6-flash")
    expect(resolveModelSlug()).toBe("gemini-3.6-flash")
  })

  it("3. Resolves user model selection and slugs cleanly", () => {
    expect(resolveModelSlug("gemini-3.1-pro-preview")).toBe("gemini-3.1-pro-preview")
    expect(resolveModelId("gemini-3.1-pro-preview")).toBe("gemini-3.1-pro-preview")
    expect(isKnownModel("gemini-3.1-pro-preview")).toBe(true)
  })

  it("4. Server Model Router resolves route and fallback chain", () => {
    const route = resolveModelRoute("gemini-3.1-pro-preview")
    expect(route.requestedModelId).toBe("gemini-3.1-pro-preview")
    expect(route.resolvedSlug).toBe("gemini-3.1-pro-preview")
    expect(route.provider).toBe("gemini")
    expect(route.fallbackChain).toContain("gemini-3.6-flash")
  })

  it("5. Propagates explicit model selection into BuildIntent contract", () => {
    const memory = createInitialMemory()
    const intent = constructBuildIntent(
      "Add login page",
      "authentication_request",
      ["src/App.tsx"],
      memory,
      undefined,
      "gemini-3.1-pro-preview",
    )

    expect(intent.modelPreference?.modelId).toBe("gemini-3.1-pro-preview")
  })

  it("6. Orchestrator carries selected model through to execution result", () => {
    const res = processUserIntentAndOrchestrate(
      "model-test-proj",
      "Make navbar amber",
      [{ path: "src/App.tsx", content: "export default function App(){}" }],
      "src/App.tsx",
      undefined,
      "gemini-pro-latest",
    )

    expect(res.action).toBe("execute_build")
    expect(res.buildIntent?.modelPreference?.modelId).toBe("gemini-pro-latest")
  })

  it("7. Preserves requested model during repair loops", () => {
    const diagnostic = { code: "TS2304", message: "Cannot find name 'React'", file: "src/App.tsx" }
    const res = processUserIntentAndOrchestrate(
      "model-repair-proj",
      "Fix error",
      [{ path: "src/App.tsx", content: "export default function App(){}" }],
      "src/App.tsx",
      diagnostic,
      "gemini-3.1-pro-preview",
    )

    expect(res.action).toBe("repair_build")
    expect(res.buildIntent?.modelPreference?.modelId).toBe("gemini-3.1-pro-preview")
  })

  it("8. User-selected model persists in ProjectMemory decisions without corruption", () => {
    let memory = createInitialMemory()
    memory = recordProjectDecision(memoryStoreId("p1"), "modelPreference", "gemini-3.1-pro-preview", "user")
    const stored = recordProjectDecision(memoryStoreId("p1"), "persistence", "local", "user")

    expect(stored.decisions.find((d) => d.key === "modelPreference")?.value).toBe("gemini-3.1-pro-preview")
  })

  it("9. Bounded fallback chain provides safe fallback sequence", () => {
    const chain = buildGeminiFallbackChain("gemini-3.1-pro-preview")
    expect(chain[0]).toBe("gemini-3.1-pro-preview")
    expect(chain).toContain("gemini-3.6-flash")
    expect(chain).toContain("gemini-3.5-flash")
  })
})

function memoryStoreId(id: string) {
  return id
}
