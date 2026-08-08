import {
  generateWithProvider,
  type ProviderGenerationResult,
} from "../generation.ts"

export function normalizeRequestedModel(model?: string): string | undefined {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : ""
  if (!normalized) return undefined
  // Pass through any model id / slug (e.g. "default",
  // "gemini-3.6-flash", "gemini-pro-latest") or legacy abstract mode
  // ("balanced" / "fast" / "deep" / "powerful") unchanged. The downstream
  // resolver in server/generation.ts maps these to concrete Gemini slugs.
  return normalized
}

export async function invokeProvider(
  prompt: string,
  model?: string,
): Promise<ProviderGenerationResult> {
  const selectedModel = normalizeRequestedModel(model)
  return await generateWithProvider(prompt, { selectedModel })
}
