import { readFileSync, appendFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { parseProviderResponse as _parseProviderStructuredResponse } from "./generationPipeline/structuredParser.ts"
import {
  buildGeminiFallbackChain,
  DEFAULT_GEMINI_SLUG,
} from "../src/lib/models.ts"
// import {  } from "./generationPipeline/promptBuilder.ts"  // (all bindings removed — unused)

// The default Gemini model slug used when no model preference is supplied.
// The full ordered model list & fallback chain live in src/lib/models.ts so
// the frontend dropdown and the server pipeline stay in sync.
const CURRENT_GEMINI_MODEL = DEFAULT_GEMINI_SLUG

export interface GenerateWithProviderOptions {
  selectedModel?: string
}

function isPlaceholderKey(val?: string | null): boolean {
  if (!val) return true
  const trimmed = val.trim()
  if (!trimmed) return true
  if (
    trimmed === "MY_GEMINI_API_KEY" ||
    trimmed === "YOUR_GEMINI_API_KEY" ||
    trimmed === "your_api_key_here" ||
    trimmed === "YOUR_API_KEY" ||
    trimmed === "placeholder" ||
    trimmed === "CHANGE_ME" ||
    trimmed.startsWith("MY_") ||
    trimmed.startsWith("YOUR_")
  ) {
    return true
  }
  return false
}

function loadServerEnv() {
  const candidates = [".env.local", ".env", ".env.example"]

  for (const filename of candidates) {
    const filePath = resolve(process.cwd(), filename)
    try {
      const content = readFileSync(filePath, "utf8")
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue

        const separatorIndex = trimmed.indexOf("=")
        if (separatorIndex <= 0) continue

        const key = trimmed.slice(0, separatorIndex).trim()
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "")
        if (!key) continue

        // If the current env variable is unset or contains a placeholder, override it with valid value from file
        const currentVal = process.env[key]
        if (!currentVal || isPlaceholderKey(currentVal)) {
          if (!isPlaceholderKey(value)) {
            process.env[key] = value
          }
        }
      }
    } catch {
      // Ignore missing env files; the process may already have the values available.
    }
  }
}

loadServerEnv()

export interface ProviderGenerationResult {
  response: string
  provider: string
}

interface ProviderConfig {
  provider: "gemini" | "openrouter"
  apiKey: string
  endpoint: string
  headers: Record<string, string>
  body: unknown
  model: string
}

function getGeminiApiKey(): string | null {
  loadServerEnv()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey && !isPlaceholderKey(geminiKey)) {
    return geminiKey
  }
  const googleKey = process.env.GOOGLE_API_KEY?.trim()
  if (googleKey && !isPlaceholderKey(googleKey)) {
    return googleKey
  }
  return null
}

function getOpenRouterApiKey(): string | null {
  loadServerEnv()
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (key && !isPlaceholderKey(key)) {
    return key
  }
  return null
}

function buildGeminiProviderConfig(
  apiKey: string,
  model: string,
): ProviderConfig {
  return {
    provider: "gemini",
    apiKey,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: {
      contents: [{ parts: [{ text: "" }] }],
      generationConfig: { temperature: 0.2 },
    },
    model,
  }
}

function normalizeRequestedModel(model: unknown): string | undefined {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : ""
  if (!normalized) return undefined
  // Pass through any known model id / slug (e.g. "default",
  // "gemini-3.6-flash", "gemini-pro-latest") as-is. Legacy abstract modes
  // ("balanced" / "fast" / "deep" / "powerful") are preserved too so the
  // downstream resolver can map them to concrete slugs.
  return normalized
}

function resolveGeminiModelFallbacks(selectedModel?: string): string[] {
  // Resolve whatever the caller passed (a model id, a raw slug, a legacy
  // abstract mode, or nothing) into an ordered fallback chain of real
  // Gemini API slugs.
  return buildGeminiFallbackChain(selectedModel)
}

function getConfiguredProvider(
  options: GenerateWithProviderOptions = {},
): ProviderConfig | null {
  const geminiKey = getGeminiApiKey()
  if (geminiKey) {
    const preferredModel = resolveGeminiModelFallbacks(options.selectedModel)[0]
    return buildGeminiProviderConfig(geminiKey, preferredModel)
  }

  const openRouterKey = getOpenRouterApiKey()
  if (openRouterKey) {
    // openrouter/free automatically routes to available free models — no credits needed.
    // See: https://openrouter.ai/openrouter/free
    const orModel = "openrouter/free"
    return {
      provider: "openrouter",
      apiKey: openRouterKey,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8443",
        "X-Title": "Shango",
      },
      body: {
        model: orModel,
        messages: [{ role: "user", content: "" }],
      },
      model: orModel,
    }
  }

  return null
}

function buildProviderRequest(prompt: string, config: ProviderConfig) {
  if (config.provider === "gemini") {
    return {
      ...config,
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      },
    }
  }

  // OpenRouter — use the model slug from config (e.g. 'openrouter/free')
  return {
    ...config,
    body: {
      model: config.model,
      messages: [{ role: "user", content: prompt }],
    },
  }
}

class ProviderRequestError extends Error {
  readonly category: string
  readonly status: number
  attempts?: number
  model?: string
  provider?: string
  retryAfterSeconds?: number

  constructor(message: string, category: string, status: number) {
    super(message)
    this.name = "ProviderRequestError"
    this.category = category
    this.status = status
  }
}

async function executeProviderRequest(
  prompt: string,
  config: ProviderConfig,
): Promise<ProviderGenerationResult> {
  const requestConfig = buildProviderRequest(prompt, config)
  const response = await fetch(requestConfig.endpoint, {
    method: "POST",
    headers: requestConfig.headers,
    body: JSON.stringify(requestConfig.body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const classification = classifyGeminiError(payload, response.status)
    throw new ProviderRequestError(
      classification.message,
      classification.category,
      response.status,
    )
  }

  return {
    response: parseProviderResponse(payload, requestConfig.provider),
    provider: requestConfig.provider,
  }
}

function parseProviderResponse(
  payload: unknown,
  provider: ProviderConfig["provider"],
): string {
  if (provider === "gemini") {
    const data = payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data?.candidates?.[0]?.content?.parts?.find(
      (part) => typeof part.text === "string",
    )?.text
    if (typeof text === "string" && text.trim()) return text.trim()
    throw new Error("Malformed Gemini response")
  }

  const data = payload as {
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> }
    }>
  }
  const content = data?.choices?.[0]?.message?.content
  if (typeof content === "string" && content.trim()) return content.trim()
  if (Array.isArray(content)) {
    const text = content.find(
      (part) => part?.type === "text" && typeof part.text === "string",
    )?.text
    if (text?.trim()) return text.trim()
  }
  throw new Error("Malformed OpenRouter response")
}

function classifyGeminiError(
  payload: unknown,
  statusCode: number,
): { category: string; message: string; retryAfterSeconds?: number } {
  const errorPayload = payload as {
    error?: { message?: unknown; status?: unknown }
  } | null
  const rawMessage =
    typeof errorPayload?.error?.message === "string"
      ? errorPayload.error.message
      : "Gemini request failed."
  const statusName =
    typeof errorPayload?.error?.status === "string"
      ? errorPayload.error.status
      : ""
  const retryMatch = rawMessage.match(/retry in\s+([0-9.]+)s/i)
  const retryAfterSeconds = retryMatch ? Number(retryMatch[1]) : undefined

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    /api key|authentication|permission/i.test(rawMessage) ||
    /PERMISSION_DENIED|UNAUTHENTICATED/i.test(statusName)
  ) {
    return {
      category: "authentication",
      message: rawMessage,
      retryAfterSeconds,
    }
  }
  if (
    statusCode === 404 ||
    /not found|model.*not|not.*found/i.test(rawMessage) ||
    /NOT_FOUND/i.test(statusName)
  ) {
    return {
      category: "model-availability",
      message: rawMessage,
      retryAfterSeconds,
    }
  }
  if (
    statusCode === 429 ||
    /quota|rate limit|resource exhausted|too many requests/i.test(rawMessage) ||
    /RESOURCE_EXHAUSTED|RESOURCE_EXHAUSTED/i.test(statusName)
  ) {
    return { category: "quota", message: rawMessage, retryAfterSeconds }
  }
  if (
    statusCode === 400 ||
    /invalid|malformed|unsupported/i.test(rawMessage) ||
    /INVALID_ARGUMENT/i.test(statusName)
  ) {
    return {
      category: "request-format",
      message: rawMessage,
      retryAfterSeconds,
    }
  }
  return { category: "unknown", message: rawMessage, retryAfterSeconds }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pushProviderLog(entry: Record<string, any>) {
  try {
    const key = "__SHANGO_PROVIDER_LOGS"
    // @ts-ignore
    if (!globalThis[key]) globalThis[key] = []
    // @ts-ignore
    globalThis[key].push(entry)
    // keep last 200 entries
    // @ts-ignore
    if (globalThis[key].length > 200) globalThis[key].shift()
  } catch (e) {
    // ignore
  }
}

function parseStructuredArtifact(
  responseText: string,
): {
  html?: string
  css?: string
  js?: string
  title?: string
  description?: string
} | null {
  const trimmed = responseText.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const candidate = parsed as Record<string, unknown>
      return {
        html: typeof candidate.html === "string" ? candidate.html : undefined,
        css: typeof candidate.css === "string" ? candidate.css : undefined,
        js: typeof candidate.js === "string" ? candidate.js : undefined,
        title:
          typeof candidate.title === "string" ? candidate.title : undefined,
        description:
          typeof candidate.description === "string"
            ? candidate.description
            : undefined,
      }
    }
  } catch {
    // ignore parse failures and fall back to heuristics
  }

  return null
}

function buildDerivedMilestones(
  prompt: string,
  responseText: string,
  metadata?: {
    files?: Array<{
      path: string
      operation: string
      language: string
      content?: string
    }>
    version?: { label: string; prompt?: string }
  },
) {
  if (Array.isArray(metadata?.files) && metadata.files.length > 0) {
    return {
      files: metadata.files,
      version: metadata.version ?? {
        label: `v1 — ${prompt.trim().slice(0, 40) || "build"}`,
        prompt,
      },
    }
  }

  const structured = parseStructuredArtifact(responseText)
  const files: Array<{
    path: string
    operation: string
    language: string
    content?: string
  }> = []

  if (structured?.html) {
    files.push({
      path: "src/App.tsx",
      operation: "modify",
      language: "tsx",
      content: structured.html,
    })
  }
  if (structured?.css) {
    files.push({
      path: "src/styles.css",
      operation: "modify",
      language: "css",
      content: structured.css,
    })
  }
  if (structured?.js) {
    files.push({
      path: "src/main.tsx",
      operation: "modify",
      language: "tsx",
      content: structured.js,
    })
  }

  if (files.length === 0) {
    return null
  }

  return {
    files,
    version: metadata?.version ?? {
      label: `v1 — ${prompt.trim().slice(0, 40) || "build"}`,
      prompt,
    },
  }
}

function persistProviderLog(entry: Record<string, any>) {
  try {
    const dir = resolve(process.cwd(), ".cache")
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, "provider-logs.jsonl")
    appendFileSync(file, JSON.stringify(entry) + "\n", { encoding: "utf8" })
  } catch (e) {
    // ignore file write failures in dev
  }
}

function toSafeGeminiModel(model: unknown) {
  const entry = model as {
    name?: string
    displayName?: string
    supportedGenerationMethods?: unknown[]
    inputTokenLimit?: number
    outputTokenLimit?: number
  }
  return {
    name: typeof entry?.name === "string" ? entry.name : undefined,
    displayName:
      typeof entry?.displayName === "string" ? entry.displayName : undefined,
    supportedGenerationMethods: Array.isArray(entry?.supportedGenerationMethods)
      ? entry.supportedGenerationMethods.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    inputTokenLimit:
      typeof entry?.inputTokenLimit === "number"
        ? entry.inputTokenLimit
        : undefined,
    outputTokenLimit:
      typeof entry?.outputTokenLimit === "number"
        ? entry.outputTokenLimit
        : undefined,
  }
}

export function buildGenerationSseStream(
  prompt: string,
  responseText: string,
  provider: string,
  consoleMessages: string[] = [],
  metadata?: {
    files?: Array<{
      path: string
      operation: string
      language: string
      content?: string
    }>
    version?: { label: string; prompt?: string }
  },
): string {
  const normalizedPrompt =
    prompt.trim() || "Generate a polished web experience."
  const normalizedResponse =
    responseText.trim() || "The generation request completed."
  const consoleMessage =
    consoleMessages[0] ??
    `Generating response for ${normalizedPrompt.slice(0, 80)}`
  const events: string[] = [
    "event: delta",
    `data: ${JSON.stringify({ content: normalizedResponse })}`,
    "",
    "event: console",
    `data: ${JSON.stringify({ level: "info", message: consoleMessage })}`,
    "",
  ]

  const derivedMilestones = buildDerivedMilestones(
    normalizedPrompt,
    normalizedResponse,
    metadata,
  )

  if (derivedMilestones?.files) {
    for (const file of derivedMilestones.files) {
      events.push("event: file")
      events.push(`data: ${JSON.stringify({ file })}`)
      events.push("")
    }
  }

  if (derivedMilestones?.version) {
    events.push("event: version")
    events.push(
      `data: ${JSON.stringify({ version: derivedMilestones.version })}`,
    )
    events.push("")
  }

  events.push("event: done")
  events.push(
    `data: ${JSON.stringify({ response: normalizedResponse, provider, prompt: normalizedPrompt })}`,
  )
  events.push("")

  return events.join("\n")
}

export async function generateWithProvider(
  prompt: string,
  options: GenerateWithProviderOptions = {},
): Promise<ProviderGenerationResult> {
  const config = getConfiguredProvider(options)
  if (!config) {
    throw new Error("No provider API key is configured on the server.")
  }

  if (config.provider === "gemini") {
    let lastError: ProviderRequestError | null = null
    const maxAttempts = 3
    const fallbackModels = resolveGeminiModelFallbacks(options.selectedModel)
    for (const model of fallbackModels) {
      const modelConfig = buildGeminiProviderConfig(config.apiKey, model)
      let attempt = 0
      let _modelSucceeded = false

      while (attempt < maxAttempts) {
        try {
          const result = await executeProviderRequest(prompt, modelConfig)
          return result
        } catch (error) {
          attempt += 1
          if (error instanceof ProviderRequestError) {
            error.attempts = attempt
            error.model = model
            error.provider = "gemini"
            lastError = error
            const logEntry = {
              time: new Date().toISOString(),
              provider: "gemini",
              model,
              attempt,
              category: error.category,
              status: error.status,
              message: error.message,
            }
            console.warn("[generateWithProvider]", logEntry)
            pushProviderLog(logEntry)
            persistProviderLog(logEntry)

            // If authentication failed, stop entirely as the key itself is invalid
            if (error.category === "authentication") {
              throw error
            }

            // If quota or model availability error, immediately try the next model instead of stalling
            if (
              error.category === "quota" ||
              error.category === "model-availability"
            ) {
              break
            }

            // For transient server errors, retry with exponential backoff if attempts remain
            if (attempt < maxAttempts) {
              const backoff = 250 * Math.pow(2, attempt - 1)
              await sleep(backoff)
              continue
            }
          }

          // Attempts exhausted for this model, break inner loop to try next fallback model
          const e =
            error instanceof Error
              ? error
              : new Error("Provider request failed.")
          ;(e as any).provider = "gemini"
          ;(e as any).model = model
          ;(e as any).attempts = attempt
          lastError = e as ProviderRequestError
          break
        }
      }
    }
    if (lastError) {
      throw lastError
    }
  }

  // Non-gemini providers: apply a short retry loop for transient server errors
  const maxAttempts = 3
  let attempt = 0
  let lastErr: unknown = null
  while (attempt < maxAttempts) {
    try {
      return await executeProviderRequest(prompt, config)
    } catch (error) {
      attempt += 1
      // attach attempt metadata for diagnostics
      if (error instanceof ProviderRequestError) {
        error.attempts = attempt
        error.model = config.model
        error.provider = config.provider
        const logEntry = {
          time: new Date().toISOString(),
          provider: config.provider,
          model: config.model,
          attempt,
          category: error.category,
          status: error.status,
          message: error.message,
        }
        console.warn("[generateWithProvider]", logEntry)
        pushProviderLog(logEntry)
        persistProviderLog(logEntry)
        lastErr = error
      } else {
        lastErr = error
      }
      if (error instanceof ProviderRequestError) {
        if (error.retryAfterSeconds && attempt < maxAttempts) {
          await sleep(Math.max(100, Math.floor(error.retryAfterSeconds * 1000)))
          continue
        }
        if (
          (error.category === "quota" || error.category === "unknown") &&
          attempt < maxAttempts
        ) {
          const backoff = 300 * Math.pow(2, attempt - 1)
          const jitter = Math.floor(Math.random() * 150)
          await sleep(backoff + jitter)
          continue
        }
      }
      break
    }
  }
  // normalize thrown error to include provider/model/attempts when possible
  if (lastErr instanceof Error) {
    if ((lastErr as any).provider === undefined)
      (lastErr as any).provider = config.provider
    if ((lastErr as any).model === undefined)
      (lastErr as any).model = config.model
    if ((lastErr as any).attempts === undefined)
      (lastErr as any).attempts = attempt
    throw lastErr
  }
  const finalErr = new Error("Provider request failed.")
  ;(finalErr as any).provider = config.provider
  ;(finalErr as any).model = config.model
  ;(finalErr as any).attempts = attempt
  throw finalErr
}

export async function diagnoseGeminiAccess() {
  const geminiKey = getGeminiApiKey()
  const configured = Boolean(geminiKey)
  const requestedModel = CURRENT_GEMINI_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${requestedModel}:generateContent`
  const environmentVariableUsed = process.env.GEMINI_API_KEY?.trim()
    ? "GEMINI_API_KEY"
    : process.env.GOOGLE_API_KEY?.trim()
      ? "GOOGLE_API_KEY"
      : "GEMINI_API_KEY/GOOGLE_API_KEY"

  if (!configured) {
    return {
      geminiApiKeyConfigured: false,
      currentRequestedModel: requestedModel,
      currentEndpoint: endpoint,
      environmentVariableUsed,
      models: [],
      requestedModelAvailable: false,
      requestedModelSupportsGenerateContent: false,
      requestedModelIsPreview: /exp|preview|experimental/i.test(requestedModel),
      error: null,
      generationTest: null,
    }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey!)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    )
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const classification = classifyGeminiError(payload, response.status)
      return {
        geminiApiKeyConfigured: true,
        currentRequestedModel: requestedModel,
        currentEndpoint: endpoint,
        environmentVariableUsed,
        models: [],
        requestedModelAvailable: false,
        requestedModelSupportsGenerateContent: false,
        requestedModelIsPreview: /exp|preview|experimental/i.test(
          requestedModel,
        ),
        error: {
          statusCode: response.status,
          classification: classification.category,
          message: classification.message,
          retryAfterSeconds: classification.retryAfterSeconds,
        },
        generationTest: null,
      }
    }

    const safeModels = Array.isArray(
      (payload as { models?: unknown[] } | null)?.models,
    )
      ? (payload as { models?: unknown[] })
          .models!.map((model) => toSafeGeminiModel(model))
          .filter((model) => typeof model.name === "string")
      : []

    const requestedModelMatch = safeModels.find((model) => {
      if (!model.name) return false
      return (
        model.name === `models/${requestedModel}` ||
        model.name === requestedModel ||
        model.name.endsWith(`/${requestedModel}`)
      )
    })

    return {
      geminiApiKeyConfigured: true,
      currentRequestedModel: requestedModel,
      currentEndpoint: endpoint,
      environmentVariableUsed,
      models: safeModels,
      requestedModelAvailable: Boolean(requestedModelMatch),
      requestedModelSupportsGenerateContent: Boolean(
        requestedModelMatch?.supportedGenerationMethods.includes(
          "generateContent",
        ),
      ),
      requestedModelIsPreview: /exp|preview|experimental/i.test(requestedModel),
      error: null,
      generationTest: null,
    }
  } catch (error) {
    return {
      geminiApiKeyConfigured: true,
      currentRequestedModel: requestedModel,
      currentEndpoint: endpoint,
      environmentVariableUsed,
      models: [],
      requestedModelAvailable: false,
      requestedModelSupportsGenerateContent: false,
      requestedModelIsPreview: /exp|preview|experimental/i.test(requestedModel),
      error: {
        statusCode: 0,
        classification: "unknown",
        message:
          error instanceof Error ? error.message : "Gemini diagnostic failed.",
      },
      generationTest: null,
    }
  }
}

export async function runGeminiGenerationSmokeTest() {
  const config = getConfiguredProvider()
  if (!config || config.provider !== "gemini") {
    return {
      success: false,
      status: 0,
      model: CURRENT_GEMINI_MODEL,
      provider: "gemini",
      error: {
        classification: "authentication",
        message: "Gemini key is not configured.",
      },
      responseText: null,
    }
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Return exactly: SHANGO_TEST_OK" }] }],
      generationConfig: { temperature: 0.2 },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const classification = classifyGeminiError(payload, response.status)
    return {
      success: false,
      status: response.status,
      model: CURRENT_GEMINI_MODEL,
      provider: "gemini",
      error: {
        classification: classification.category,
        message: classification.message,
        retryAfterSeconds: classification.retryAfterSeconds,
      },
      responseText: null,
    }
  }

  const responseText =
    typeof payload?.candidates?.[0]?.content?.parts?.find(
      (part: unknown) => typeof (part as { text?: string }).text === "string",
    )?.text === "string"
      ? (payload.candidates[0].content.parts.find(
          (part: unknown) =>
            typeof (part as { text?: string }).text === "string",
        ) as { text?: string }).text
      : null

  return {
    success: true,
    status: response.status,
    model: CURRENT_GEMINI_MODEL,
    provider: "gemini",
    error: null,
    responseText,
  }
}
