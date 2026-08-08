/**
 * Canonical Gemini model registry for Shango.
 *
 * Single source of truth for the models shown in the UI and used by the
 * generation pipeline and model router.
 */

export interface ShangoModelCapability {
  reasoning: boolean
  coding: boolean
  streaming: boolean
  toolCalling: boolean
  structuredOutput: boolean
}

export type ModelTier = "fast" | "balanced" | "pro" | "latest"

export interface ShangoModel {
  id: string
  displayName: string
  provider: "gemini" | "openrouter"
  providerModelId: string
  capability: ShangoModelCapability
  tier?: ModelTier
  enabled: boolean
  isDefault?: boolean
  desc?: string
}

export interface GeminiModelOption {
  id: string
  slug: string
  label: string
  desc: string
  recommended?: boolean
  tier?: ModelTier
}

export const DEFAULT_MODEL_ID = "default"
export const DEFAULT_SHANGO_MODEL = "gemini-3.6-flash"
export const DEFAULT_GEMINI_SLUG = DEFAULT_SHANGO_MODEL

export const SHANGO_MODELS: Record<string, ShangoModel> = {
  "gemini-3.6-flash": {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    provider: "gemini",
    providerModelId: "gemini-3.6-flash",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "fast",
    enabled: true,
    isDefault: true,
    desc: "Default — balanced speed & intelligence",
  },
  "gemini-3.5-flash-lite": {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    providerModelId: "gemini-3.5-flash-lite",
    capability: { reasoning: false, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "fast",
    enabled: true,
    desc: "Fastest, most cost-effective 3.5 model",
  },
  "gemini-3.5-flash": {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    provider: "gemini",
    providerModelId: "gemini-3.5-flash",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "balanced",
    enabled: true,
    desc: "Most intelligent for agentic & coding tasks",
  },
  "gemini-3.1-pro-preview": {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    provider: "gemini",
    providerModelId: "gemini-3.1-pro-preview",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "pro",
    enabled: true,
    desc: "Advanced intelligence & complex problem-solving",
  },
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    provider: "gemini",
    providerModelId: "gemini-3.1-flash-lite",
    capability: { reasoning: false, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "fast",
    enabled: true,
    desc: "Frontier-class performance at low cost",
  },
  "gemini-3-flash-preview": {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    provider: "gemini",
    providerModelId: "gemini-3-flash-preview",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "balanced",
    enabled: true,
    desc: "Frontier-class performance, fraction of the cost",
  },
  "gemini-pro-latest": {
    id: "gemini-pro-latest",
    displayName: "Gemini Pro Latest",
    provider: "gemini",
    providerModelId: "gemini-pro-latest",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "pro",
    enabled: true,
    desc: "Latest Pro release — max capability",
  },
  "gemini-flash-latest": {
    id: "gemini-flash-latest",
    displayName: "Gemini Flash Latest",
    provider: "gemini",
    providerModelId: "gemini-flash-latest",
    capability: { reasoning: true, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "balanced",
    enabled: true,
    desc: "Latest Flash release — speed & value",
  },
  "gemini-flash-lite-latest": {
    id: "gemini-flash-lite-latest",
    displayName: "Gemini Flash-Lite Latest",
    provider: "gemini",
    providerModelId: "gemini-flash-lite-latest",
    capability: { reasoning: false, coding: true, streaming: true, toolCalling: true, structuredOutput: true },
    tier: "fast",
    enabled: true,
    desc: "Latest Flash-Lite release — lowest cost",
  },
}

export const GEMINI_MODEL_OPTIONS: readonly GeminiModelOption[] = [
  {
    id: "default",
    slug: DEFAULT_GEMINI_SLUG,
    label: "Default (Gemini 3.6 Flash)",
    desc: "Gemini 3.6 Flash — balanced speed & intelligence",
    recommended: true,
    tier: "fast",
  },
  ...Object.values(SHANGO_MODELS).map((m) => ({
    id: m.id,
    slug: m.providerModelId,
    label: m.displayName,
    desc: m.desc ?? m.displayName,
    tier: m.tier,
  })),
] as const

const GEMINI_MODEL_BY_ID: ReadonlyMap<string, GeminiModelOption> = new Map(
  GEMINI_MODEL_OPTIONS.map((option) => [option.id, option]),
)

const VALID_MODEL_IDS: ReadonlySet<string> = new Set(
  GEMINI_MODEL_OPTIONS.map((option) => option.id.toLowerCase()),
)

const VALID_MODEL_SLUGS: ReadonlySet<string> = new Set(
  GEMINI_MODEL_OPTIONS.map((option) => option.slug.toLowerCase()),
)

export function resolveModelSlug(model?: string | null): string {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : ""
  if (!normalized) return DEFAULT_GEMINI_SLUG

  if (GEMINI_MODEL_BY_ID.has(normalized)) {
    return GEMINI_MODEL_BY_ID.get(normalized)!.slug
  }

  if (VALID_MODEL_SLUGS.has(normalized)) {
    return normalized
  }

  switch (normalized) {
    case "fast":
      return "gemini-3.5-flash-lite"
    case "balanced":
      return DEFAULT_GEMINI_SLUG
    case "deep":
    case "powerful":
      return "gemini-pro-latest"
    default:
      return DEFAULT_GEMINI_SLUG
  }
}

export function resolveModelId(model?: string | null): string {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : ""
  if (!normalized) return DEFAULT_MODEL_ID

  if (VALID_MODEL_IDS.has(normalized)) return normalized

  const match = GEMINI_MODEL_OPTIONS.find(
    (option) => option.slug.toLowerCase() === normalized,
  )
  if (match) return match.id

  switch (normalized) {
    case "fast":
      return "gemini-3.5-flash-lite"
    case "balanced":
      return DEFAULT_MODEL_ID
    case "deep":
    case "powerful":
      return "gemini-pro-latest"
    default:
      return DEFAULT_MODEL_ID
  }
}

export function isKnownModel(model?: string | null): boolean {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : ""
  if (!normalized) return false
  return (
    VALID_MODEL_IDS.has(normalized) ||
    VALID_MODEL_SLUGS.has(normalized) ||
    normalized === "fast" ||
    normalized === "balanced" ||
    normalized === "deep" ||
    normalized === "powerful"
  )
}

export function getModelOption(model?: string | null): GeminiModelOption {
  const id = resolveModelId(model)
  return GEMINI_MODEL_BY_ID.get(id) ?? GEMINI_MODEL_OPTIONS[0]
}

export const GEMINI_MODEL_SLUGS: readonly string[] = Array.from(
  new Set(GEMINI_MODEL_OPTIONS.map((option) => option.slug)),
)

export function buildGeminiFallbackChain(selectedModel?: string | null): string[] {
  const primary = resolveModelSlug(selectedModel)
  const chain: string[] = [primary]

  const safetyNet = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-pro-latest",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
  ]

  for (const slug of safetyNet) {
    if (!chain.includes(slug)) chain.push(slug)
  }

  return chain
}

export function saveModelSelection(modelId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return
  const id = resolveModelId(modelId)
  try {
    const raw = window.localStorage.getItem("shango_settings") ?? "{}"
    const settings = raw ? JSON.parse(raw) : {}
    settings.model = id
    window.localStorage.setItem("shango_settings", JSON.stringify(settings))
    window.dispatchEvent(new Event("shango-preferences-changed"))
  } catch {
    // Ignore parse errors
  }
}
