import { invokeProvider } from "./provider.ts"
import type { BuildRequest } from "./types.ts"
import { buildProviderPrompt } from "./promptBuilder.ts"

export interface ProviderAdapterResult {
  provider: string
  rawResponse: string
  metadata?: Record<string, unknown>
}

export async function invokeProviderAdapter(
  request: BuildRequest,
): Promise<ProviderAdapterResult> {
  const providerPrompt = buildProviderPrompt(request)
  const providerResult = await invokeProvider(
    providerPrompt,
    request.selectedModel ?? request.model,
  )

  return {
    provider: providerResult.provider,
    rawResponse: providerResult.response,
    metadata: {
      model: request.selectedModel ?? request.model,
      mode: request.mode,
      activeFile: request.activeFile,
    },
  }
}
