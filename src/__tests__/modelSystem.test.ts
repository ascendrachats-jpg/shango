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

  it("5. Bounded fallback chain provides safe fallback sequence", () => {
    const chain = buildGeminiFallbackChain("gemini-3.1-pro-preview")
    expect(chain[0]).toBe("gemini-3.1-pro-preview")
    expect(chain).toContain("gemini-3.6-flash")
    expect(chain).toContain("gemini-3.5-flash")
  })
})
