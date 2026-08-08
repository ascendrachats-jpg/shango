import {
  buildGeminiFallbackChain,
  resolveModelSlug,
  SHANGO_MODELS,
  type ShangoModel,
} from "../src/lib/models.ts"

export interface ModelRouteResult {
  requestedModelId: string
  resolvedSlug: string
  provider: "gemini" | "openrouter"
  fallbackChain: string[]
  modelEntry?: ShangoModel
}

export function resolveModelRoute(requestedModelId?: string | null): ModelRouteResult {
  const resolvedSlug = resolveModelSlug(requestedModelId)
  const fallbackChain = buildGeminiFallbackChain(requestedModelId)
  const modelEntry = SHANGO_MODELS[resolvedSlug]

  return {
    requestedModelId: requestedModelId || "default",
    resolvedSlug,
    provider: modelEntry?.provider ?? "gemini",
    fallbackChain,
    modelEntry,
  }
}
