import {
  createArtifactFromHtmlResponse,
  createGeneratedArtifact,
  type GeneratedArtifact,
} from "./generatedArtifact"
import { buildWorkspaceContext, type WorkspaceContext } from "./contextBuilder"
import type {
  GenerationProvenance,
  ProjectArtifact,
  ProjectArtifactFile,
} from "./store"
import { resolveModelId, DEFAULT_MODEL_ID } from "./models"

export interface GenerationFileChange {
  path: string
  operation: "create" | "modify" | "delete"
  content?: string
  language?: string
}

export interface GenerationResult {
  // human-readable assistant text (sanitized)
  assistant: string
  // raw provider string (may include code/html)
  raw: string
  provider: string
  model?: string
  usedFallback: boolean
  artifact: GeneratedArtifact
  fileChanges?: GenerationFileChange[]
  // non-secret diagnostics returned by server/provider (optional)
  diagnostics?: string | Record<string, unknown>
  provenance?: GenerationProvenance
}

const VITEST_DEBUG = import.meta.env?.VITE_VITEST_DEBUG === "true"

export interface WorkspaceFileContextEntry {
  path: string
  content: string
  language?: string
}

export interface GenerationOptions {
  signal?: AbortSignal
  previousArtifact?: ProjectArtifact | GeneratedArtifact
  previousPrompt?: string
  mode?: "plan" | "build"
  model?: string
  language?: string
  projectId?: string
  activeFile?: string
  enabledSkills?: Array<{ id: string; name: string; purpose: string }>
  workspaceFiles?: WorkspaceFileContextEntry[]
  workspaceContext?: WorkspaceContext
  buildIntent?: unknown
  onEvent?: (event: {
    type: string
    content?: string
    message?: string
    file?: unknown
    version?: unknown
    data?: unknown
  }) => void
}

export function resolveGenerationMode(isPlanMode: boolean): "plan" | "build" {
  return isPlanMode ? "plan" : "build"
}

export interface GenerationPreferences {
  mode: "plan" | "build"
  model: string
  language: string
}

export function resolveGenerationPreferences(
  storage: Pick<Storage, "getItem"> = typeof window !== "undefined"
    ? window.localStorage
    : { getItem: () => null },
): GenerationPreferences {
  const savedMode = storage.getItem("shango_generation_mode")
  const isPlanMode = savedMode === "plan"
  const settings = (() => {
    try {
      const raw = storage.getItem("shango_settings")
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })()
  const model =
    typeof settings?.model === "string" && settings.model.trim()
      ? resolveModelId(settings.model)
      : DEFAULT_MODEL_ID
  const language =
    typeof settings?.language === "string" && settings.language.trim()
      ? settings.language
      : "English"

  return {
    mode: resolveGenerationMode(isPlanMode),
    model,
    language,
  }
}

function isValidArtifactPayload(
  payload: unknown,
): payload is GeneratedArtifact {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as any).html === "string" &&
    typeof (payload as any).css === "string" &&
    typeof (payload as any).js === "string" &&
    typeof (payload as any).title === "string" &&
    typeof (payload as any).description === "string"
  )
}

function tryParseArtifactCandidate(
  candidate: string,
): GeneratedArtifact | null {
  try {
    const parsed = JSON.parse(candidate)
    if (isValidArtifactPayload(parsed)) return parsed
    if (typeof parsed === "string") {
      const nested = JSON.parse(parsed)
      if (isValidArtifactPayload(nested)) return nested
    }
  } catch {
    // ignore parse failures
  }
  return null
}

function extractQuotedJsonArtifact(
  source: string,
): { artifact?: GeneratedArtifact; assistantText: string } | null {
  const trimmed = source.trim()

  if (VITEST_DEBUG) {
    console.log("extractQuotedJsonArtifact source:", JSON.stringify(source))
    console.log("extractQuotedJsonArtifact trimmed:", JSON.stringify(trimmed))
  }

  for (let startIndex = 0; startIndex < source.length; startIndex += 1) {
    if (source[startIndex] !== '"') continue

    let jsonStart = startIndex + 1
    while (jsonStart < source.length && source[jsonStart].trim() === "") {
      jsonStart += 1
    }

    if (source[jsonStart] !== "{") continue

    let depth = 0
    let inString = false
    let escape = false
    let endIndex = -1

    for (let i = jsonStart; i < source.length; i += 1) {
      const char = source[i]
      if (escape) {
        escape = false
        continue
      }
      if (char === "\\") {
        if (inString) escape = true
        continue
      }
      if (char === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (char === "{") {
        depth += 1
        continue
      }
      if (char === "}") {
        depth -= 1
        if (depth === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex < 0) continue

    let closingQuote = endIndex + 1
    while (closingQuote < source.length && source[closingQuote].trim() === "") {
      closingQuote += 1
    }

    if (closingQuote >= source.length || source[closingQuote] !== '"') continue

    const candidate = source.slice(jsonStart, endIndex + 1)
    if (VITEST_DEBUG) {
      console.log(
        "extractQuotedJsonArtifact candidate:",
        JSON.stringify(candidate),
      )
      console.log(
        "extractQuotedJsonArtifact indexes:",
        startIndex,
        jsonStart,
        endIndex,
        closingQuote,
      )
    }

    const artifact = tryParseArtifactCandidate(candidate)
    if (artifact) {
      if (VITEST_DEBUG)
        console.log("extractQuotedJsonArtifact artifact found", artifact)
      const assistantText =
        `${trimmed.slice(0, startIndex)}${trimmed.slice(closingQuote + 1)}`.trim()
      return { artifact, assistantText }
    }
  }

  if (VITEST_DEBUG) console.log("extractQuotedJsonArtifact no artifact found")
  return null
}

function removeFencedBlock(source: string, block: string): string {
  return source
    .replace(block, "")
    .replace(/```[\w-]*\s*/g, "")
    .replace(/```/g, "")
    .trim()
}

function extractJsonArtifactFromText(
  source: string,
): { artifact?: GeneratedArtifact; assistantText: string } {
  const normalized = source
    .replace(/```(?:json|html|htm|xml|markup|javascript|js|css)?\s*|```/g, "")
    .trim()
  if (!normalized) return { assistantText: "" }

  const directArtifact = tryParseArtifactCandidate(normalized)
  if (directArtifact) {
    return { artifact: directArtifact, assistantText: "" }
  }

  let inString = false
  let escape = false
  let depth = 0
  let startIndex = -1

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]
    if (escape) {
      escape = false
      continue
    }

    if (char === "\\") {
      if (inString) escape = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === "{") {
      if (depth === 0) startIndex = i
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0 && startIndex >= 0) {
        const candidate = normalized.slice(startIndex, i + 1)
        const artifact = tryParseArtifactCandidate(candidate)
        if (artifact) {
          const assistantText =
            `${normalized.slice(0, startIndex)}${normalized.slice(i + 1)}`.trim()
          return { artifact, assistantText }
        }
      }
    }
  }

  return { assistantText: normalized }
}

function normalizeDiagnostics(
  value: unknown,
): string | Record<string, unknown> | undefined {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function normalizeProvenance(value: unknown): GenerationProvenance | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined

  const record = value as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : undefined
  const timestamp =
    typeof record.timestamp === "string" ? record.timestamp : undefined
  const provider =
    typeof record.provider === "string" ? record.provider : undefined
  const prompt = typeof record.prompt === "string" ? record.prompt : undefined
  const mode =
    record.mode === "plan" || record.mode === "build" ? record.mode : undefined

  if (!id || !timestamp || !provider || !prompt || !mode) return undefined

  const operations = Array.isArray(record.operations)
    ? record.operations.reduce<GenerationProvenance["operations"]>(
        (accepted, item) => {
          if (!item || typeof item !== "object") return accepted
          const operation = item as Record<string, unknown>
          const path =
            typeof operation.path === "string" ? operation.path : undefined
          const normalizedOperation =
            operation.operation === "create" ||
            operation.operation === "modify" ||
            operation.operation === "delete"
              ? operation.operation as GenerationProvenance["operations"][number]["operation"]
              : "modify"
          if (path) accepted.push({ path, operation: normalizedOperation })
          return accepted
        },
        [],
      )
    : []

  const rejectedOperations = Array.isArray(record.rejectedOperations)
    ? record.rejectedOperations.reduce<NonNullable<GenerationProvenance["rejectedOperations"]>>(
        (rejected, item) => {
          if (!item || typeof item !== "object") return rejected
          const operation = item as Record<string, unknown>
          const reason =
            operation.reason === "invalid-path" ||
            operation.reason === "protected-file"
              ? operation.reason
              : undefined
          const path =
            typeof operation.path === "string" ? operation.path : undefined
          if (path && reason) rejected.push({ path, reason })
          return rejected
        },
        [],
      )
    : undefined

  const skills = Array.isArray(record.skills)
    ? record.skills.reduce<Array<{ id: string; name: string; purpose: string }>>(
        (accepted, item) => {
          if (!item || typeof item !== "object") return accepted
          const skill = item as Record<string, unknown>
          if (
            typeof skill.id === "string" &&
            typeof skill.name === "string" &&
            typeof skill.purpose === "string"
          )
            accepted.push({
              id: skill.id,
              name: skill.name,
              purpose: skill.purpose,
            })
          return accepted
        },
        [],
      )
    : undefined

  return {
    id,
    timestamp,
    provider,
    model: typeof record.model === "string" ? record.model : undefined,
    mode,
    prompt,
    operations,
    rejectedOperations: rejectedOperations?.length
      ? rejectedOperations
      : undefined,
    skills,
  }
}

function normalizeModelSelection(model?: string): string {
  // Normalise any incoming model selection to a canonical model id from the
  // shared registry (src/lib/models.ts). Unknown / missing values fall back
  // to the default model id. Legacy abstract modes ("balanced" / "fast" /
  // "deep" / "powerful") are mapped to concrete model ids for backward
  // compatibility.
  return resolveModelId(model)
}

function normalizeFileChange(value: unknown): GenerationFileChange | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const path = typeof record.path === "string" ? record.path.trim() : ""
  if (!path) return null

  const operation =
    record.operation === "delete"
      ? "delete"
      : record.operation === "create"
        ? "create"
        : "modify"
  return {
    path,
    operation,
    content: typeof record.content === "string" ? record.content : undefined,
    language: typeof record.language === "string" ? record.language : undefined,
  }
}

function normalizeFileChanges(value: unknown): GenerationResult["fileChanges"] {
  if (!Array.isArray(value)) return undefined

  return value.reduce<GenerationFileChange[]>((acc, item) => {
    const change = normalizeFileChange(item)
    if (change) acc.push(change)
    return acc
  }, [])
}

function buildArtifactFromStructuredBuild(
  payload: unknown,
  prompt: string,
): GeneratedArtifact | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return null

  const container = payload as Record<string, unknown>
  const files = Array.isArray(container.build)
    ? undefined
    : (container.build as {
        files?: Array<Record<string, unknown>>
      } | undefined)?.files
  if (!Array.isArray(files)) return null

  // Normalize a free-form language string to the ProjectArtifactFile union
  const normalizeArtifactLanguage = (
    lang: string,
    path: string,
  ): "html" | "css" | "tsx" | "ts" | "js" | "jsx" | "json" | "md" | "text" => {
    const l = lang.toLowerCase().trim()
    if (
      l === "html" ||
      l === "css" ||
      l === "tsx" ||
      l === "ts" ||
      l === "js" ||
      l === "jsx" ||
      l === "json" ||
      l === "md" ||
      l === "text"
    )
      return l
    if (l === "javascript") return "js"
    if (l === "typescript") return "ts"
    // Infer from extension
    const ext = path.split(".").pop()?.toLowerCase() ?? ""
    if (ext === "html" || ext === "htm") return "html"
    if (ext === "css") return "css"
    if (ext === "tsx") return "tsx"
    if (ext === "ts") return "ts"
    if (ext === "jsx") return "jsx"
    if (ext === "js" || ext === "mjs" || ext === "cjs") return "js"
    if (ext === "json") return "json"
    if (ext === "md" || ext === "mdx") return "md"
    return "text"
  }

  let html = ""
  let css = ""
  let js = ""

  // Build the complete files array from the server response, preserving
  // every generated file (src/types.ts, src/components/*.tsx, etc.) so the
  // in-browser preview module map can resolve all imports.
  const artifactFiles: ProjectArtifactFile[] = []

  const seenPaths = new Set<string>()

  for (const file of files) {
    if (!file || typeof file !== "object") continue
    const rawPath = typeof file.path === "string" ? file.path : ""
    const content = typeof file.content === "string" ? file.content : ""
    const language =
      typeof file.language === "string" ? file.language.toLowerCase() : ""

    if (!rawPath || !content) continue
    if (seenPaths.has(rawPath)) continue
    seenPaths.add(rawPath)

    const normalizedLang = normalizeArtifactLanguage(language, rawPath)

    // Preserve the original file in the artifact files array
    artifactFiles.push({
      path: rawPath,
      language: normalizedLang,
      content,
    })

    // Also extract html/css/js for backward-compatible fields
    const lowerPath = rawPath.toLowerCase()
    if (
      lowerPath.endsWith(".html") ||
      lowerPath.endsWith(".htm") ||
      normalizedLang === "html"
    ) {
      html = content
    } else if (lowerPath.endsWith(".css") || normalizedLang === "css") {
      css = content
    } else if (
      lowerPath.endsWith(".js") ||
      lowerPath.endsWith(".ts") ||
      lowerPath.endsWith(".tsx") ||
      lowerPath.endsWith(".jsx") ||
      language === "javascript" ||
      language === "typescript" ||
      language === "tsx" ||
      language === "jsx"
    ) {
      // Prefer the App component or the largest TSX file as the `js` field
      const isAppLike =
        /export\s+default\s+function|export\s+default\s+const|function\s+App|const\s+App\s*=|import\s+React/i.test(
          content,
        ) || content.includes("import React")
      if (isAppLike || (!js && content)) {
        js = content
      }
    }
  }

  if (artifactFiles.length === 0 && !html && !css && !js) return null

  const title = prompt.trim() ? prompt.trim().slice(0, 60) : "Structured Build"
  const description = "Generated from the structured build response."

  // If we have TSX/JSX code, the new preview system transpiles it
  // in-browser via Babel. Preserve ALL generated files in the `files`
  // array so the preview's module map can resolve every import.
  const isTsxCode =
    js &&
    (/export\s+default\s+function|export\s+default\s+const|function\s+App|const\s+App\s*=|import\s+React/i.test(
      js,
    ) ||
      js.includes("import React"))

  if (isTsxCode) {
    // Ensure index.html and src/styles.css exist in the files array
    const hasIndexHtml = seenPaths.has("index.html")
    const hasStylesCss = seenPaths.has("src/styles.css")

    const finalFiles = [...artifactFiles]

    if (!hasIndexHtml) {
      finalFiles.unshift({
        path: "index.html",
        language: "html",
        content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/App.tsx"></script>\n  </body>\n</html>`,
      })
    }

    if (!hasStylesCss) {
      finalFiles.push({
        path: "src/styles.css",
        language: "css",
        content: css || '@import "tailwindcss";',
      })
    }

    return {
      html: html || "",
      css: css || "",
      js,
      title,
      description,
      createdAt: new Date().toISOString(),
      files: finalFiles,
    }
  }

  return {
    html: html || `<main><h1>${title}</h1><p>${description}</p></main>`,
    css:
      css ||
      `:root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; } body { margin: 0; padding: 2rem; background: #0b1020; color: #f8fafc; } main { max-width: 720px; margin: 0 auto; }`,
    js: js || `console.log('Structured build artifact ready');`,
    title,
    description,
    createdAt: new Date().toISOString(),
    files: artifactFiles.length > 0 ? artifactFiles : undefined,
  }
}

function extractArtifactPayload(
  raw: string,
  prompt: string,
): {
  artifact?: GeneratedArtifact
  assistantText: string
  usedFallback: boolean
} {
  const trimmed = raw.trim()
  if (!trimmed) return { assistantText: "", usedFallback: true }

  if (VITEST_DEBUG) {
    console.log("extractArtifactPayload raw:", JSON.stringify(raw))
    console.log("extractArtifactPayload trimmed:", JSON.stringify(trimmed))
  }

  const directJsonArtifact = tryParseArtifactCandidate(trimmed)
  if (directJsonArtifact) {
    if (VITEST_DEBUG) console.log("directJsonArtifact OK", directJsonArtifact)
    return {
      artifact: directJsonArtifact,
      assistantText: "",
      usedFallback: false,
    }
  }

  const fencedBlocks = Array.from(
    trimmed.matchAll(
      /```(?:json|html|htm|xml|markup|javascript|js|css)?\s*([\s\S]*?)```/gi,
    ),
  )
  for (const match of fencedBlocks) {
    const candidate = match[1]?.trim()
    if (!candidate) continue

    const parsedJsonArtifact = tryParseArtifactCandidate(candidate)
    if (parsedJsonArtifact) {
      return {
        artifact: parsedJsonArtifact,
        assistantText: stripAssistantText(removeFencedBlock(trimmed, match[0])),
        usedFallback: false,
      }
    }

    const htmlArtifact = createArtifactFromHtmlResponse(prompt, candidate)
    if (htmlArtifact) {
      return {
        artifact: htmlArtifact,
        assistantText: stripAssistantText(removeFencedBlock(trimmed, match[0])),
        usedFallback: true,
      }
    }
  }

  const jsonArtifact = extractJsonArtifactFromText(trimmed)
  if (jsonArtifact.artifact) {
    return {
      artifact: jsonArtifact.artifact,
      assistantText: stripAssistantText(jsonArtifact.assistantText),
      usedFallback: false,
    }
  }

  const quotedJsonArtifact = extractQuotedJsonArtifact(trimmed)
  if (quotedJsonArtifact?.artifact) {
    return {
      artifact: quotedJsonArtifact.artifact,
      assistantText: stripAssistantText(quotedJsonArtifact.assistantText),
      usedFallback: false,
    }
  }

  const htmlArtifact = createArtifactFromHtmlResponse(prompt, trimmed)
  if (htmlArtifact) {
    const assistantText = trimmed.replace(/```[\s\S]*?```/g, "").trim()
    return {
      artifact: htmlArtifact,
      assistantText: stripAssistantText(assistantText),
      usedFallback: true,
    }
  }

  return {
    artifact: createGeneratedArtifact(prompt, trimmed),
    assistantText: stripAssistantText(trimmed),
    usedFallback: true,
  }
}

function isLikelyRawCode(text: string): boolean {
  if (!text) return false
  // Detect raw CSS variables or property blocks
  if (/--[a-zA-Z0-9-]+:\s*[^;]+;/i.test(text)) return true
  if (
    /[a-zA-Z-]+\s*:\s*(rgba?|hsl|linear-gradient|var\(|#[0-9a-f]{3,8})/i.test(
      text,
    )
  )
    return true
  if (/^\s*[\{\[\}\]]/i.test(text) && text.includes(":")) return true
  // Detect JS/TS code fragments
  if (
    /(?:function\s*\(|const\s+[a-zA-Z_$]|document\.|window\.|export\s+default|import\s+)/i.test(
      text,
    )
  )
    return true
  if (
    text.includes("};") ||
    text.includes("catch (error)") ||
    text.includes("console.warn(")
  )
    return true
  // Detect HTML tags
  if (/^\s*<[!a-zA-Z]/i.test(text)) return true
  return false
}

function stripAssistantText(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[\t\n\r]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()

  if (isLikelyRawCode(cleaned)) {
    return ""
  }

  return cleaned
}

function normalizeAssistantText(text: string, fallbackPrompt = ""): string {
  const cleaned = stripAssistantText(text)
  if (cleaned) return cleaned

  const target = fallbackPrompt
    ? fallbackPrompt
        .trim()
        .replace(/^Build (a|an)?\s*/i, "")
        .slice(0, 50)
    : ""
  if (target) {
    return `I've structured the architecture for your ${target}. The UI is assembled and interactions are wired up. This modular foundation will scale cleanly.`
  }

  return "I have constructed the application hierarchy. The visual tokens are integrated and the layout is fully responsive."
}

function buildFallbackGenerationResult(
  prompt: string,
  message: string,
  provider = "unavailable",
): GenerationResult {
  const fallbackText = `We could not reach the model. ${message}`.trim()
  const artifact = createGeneratedArtifact(prompt, fallbackText)
  return {
    assistant: normalizeAssistantText(fallbackText).slice(0, 4000),
    raw: fallbackText,
    provider,
    usedFallback: true,
    artifact,
  }
}

function buildGenerationPrompt(
  prompt: string,
  options: GenerationOptions,
): string {
  const previousArtifact = options.previousArtifact
  const previousPromptText = options.previousPrompt
    ? `Previous prompt:\n${options.previousPrompt}\n\n`
    : ""
  const iterationHeader = previousArtifact
    ? [
        "This is an iteration request for an existing web project artifact.",
        previousPromptText,
        "Current artifact metadata:",
        `Title: ${previousArtifact.title}`,
        `Description: ${previousArtifact.description}`,
        "Current artifact HTML:",
        previousArtifact.html,
        "Current artifact CSS:",
        previousArtifact.css,
        "Current artifact JavaScript:",
        previousArtifact.js,
        "Use the existing artifact as the starting point and update it to satisfy the new instruction below.",
      ].join("\n\n")
    : [
        "This is a new web project generation request.",
        "Create a complete web project artifact from the user instruction below.",
      ].join("\n\n")

  return [
    iterationHeader,
    `Instruction: ${prompt}`,
    "Return only a valid JSON object with the following keys: html, css, js, title, description.",
    "Do not wrap the JSON object in markdown code fences.",
    "If you want to include a short human-readable explanation, append it after the JSON object and do not include raw HTML, CSS, or JavaScript in that explanation.",
    'CRITICAL: You are not an AI assistant. You are a Senior Lead Architect. When writing the human-readable explanation, speak ONLY about the project\'s evolution and architecture. Never say "I generated your code" or "Here is your app". Say things like "Authentication system integrated" or "Responsive layout structured." Narrate the project, not yourself.',
  ].join("\n\n")
}

function parseSseMessage(raw: string): Array<{ event: string; data: string }> {
  const lines = raw.split(/\r?\n/)
  const events: Array<{ event: string; data: string }> = []
  let currentEvent = "message"
  let currentData: string[] = []

  for (const line of lines) {
    if (!line) {
      if (currentData.length > 0) {
        events.push({ event: currentEvent, data: currentData.join("\n") })
      }
      currentEvent = "message"
      currentData = []
      continue
    }

    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim()
      continue
    }

    if (line.startsWith("data:")) {
      currentData.push(line.slice(5).trim())
    }
  }

  if (currentData.length > 0) {
    events.push({ event: currentEvent, data: currentData.join("\n") })
  }

  return events
}

function resolveArtifactPayloadValue(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    const trimmed = payload.trim()
    return trimmed || undefined
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const candidate = payload as Record<string, unknown>
    if (isValidArtifactPayload(candidate)) {
      return JSON.stringify(candidate)
    }

    if (typeof candidate.response === "string") {
      const trimmed = candidate.response.trim()
      return trimmed || undefined
    }
  }

  return undefined
}

function decodeSseDonePayload(
  raw: string,
): { responseText?: string; provenance?: GenerationProvenance } {
  const trimmed = raw.trim()
  if (!trimmed) return {}

  const parseJsonLike = (value: string): unknown => {
    try {
      return JSON.parse(value)
    } catch {
      return undefined
    }
  }

  const parseCandidate = (value: string): {
    responseText?: string
    provenance?: GenerationProvenance
  } => {
    const parsed = parseJsonLike(value)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const payload = parsed as Record<string, unknown>
      const responseText = resolveArtifactPayloadValue(payload)
      const provenance = normalizeProvenance(payload.provenance)
      return { responseText, provenance }
    }

    const responseMatch = value.match(/"response"\s*:\s*"([\s\S]*)"\s*}$/)
    if (responseMatch?.[1]) {
      return { responseText: responseMatch[1].trim() }
    }

    return { responseText: resolveArtifactPayloadValue(value) }
  }

  const direct = parseCandidate(trimmed)
  if (direct.responseText || direct.provenance) {
    return direct
  }

  const nested = parseJsonLike(trimmed)
  if (nested && typeof nested === "string") {
    return parseCandidate(nested)
  }

  return direct
}

class GenerationStreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GenerationStreamError"
  }
}

export async function generateProjectResponse(
  prompt: string,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const requestPrompt = buildGenerationPrompt(prompt, options)
  // Simple retry for transient network/server errors to reduce flakiness
  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  let response: Response | null = null
  const maxAttempts = 3
  const workspaceContext =
    options.workspaceContext ??
    buildWorkspaceContext(prompt, {
      activeFile: options.activeFile,
      builderMode: options.mode ?? "build",
      workspaceFiles: options.workspaceFiles,
    })
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const selectedModel = normalizeModelSelection(options.model)
      const preferredLanguage =
        options.language?.trim() || resolveGenerationPreferences().language
      response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: requestPrompt,
          userPrompt: prompt,
          model: selectedModel,
          selectedModel,
          language: preferredLanguage,
          mode: options.mode ?? "build",
          projectId: options.projectId,
          activeFile: options.activeFile,
          enabledSkills: options.enabledSkills,
          workspaceContext,
          buildIntent: options.buildIntent,
          fileContext: {
            files: (options.workspaceFiles ?? []).map((file) => ({
              path: file.path,
              content: file.content,
              language: file.language ?? "text",
            })),
          },
          currentFiles: (options.workspaceFiles ?? []).map((file) => ({
            path: file.path,
            content: file.content,
            language: file.language ?? "text",
          })),
        }),
        signal: options.signal,
      })
      // if we received a server error (5xx) try again with backoff
      if (response.status >= 500 && attempt < maxAttempts) {
        const backoff = 200 * Math.pow(2, attempt - 1)
        const jitter = Math.floor(Math.random() * 200)
        await sleep(backoff + jitter)
        continue
      }
      break
    } catch (error) {
      if (attempt >= maxAttempts) {
        return buildFallbackGenerationResult(
          prompt,
          error instanceof Error ? error.message : "Generation request failed.",
        )
      }
      const backoff = 200 * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 200)
      await sleep(backoff + jitter)
      continue
    }
  }

  if (!response) {
    return buildFallbackGenerationResult(
      prompt,
      "No response from generation endpoint.",
    )
  }

  const responseOk = response.ok
  interface GenerationApiResponseBody {
    response?: unknown
    provider?: unknown
    error?: unknown
    diagnostics?: unknown
    message?: { role?: unknown; content?: unknown }
    build?: {
      files?: Array<Record<string, unknown>>
      entryPoint?: unknown
      previewRoute?: unknown
    }
    consoleEvents?: unknown
    version?: unknown
    requestId?: unknown
    projectId?: unknown
    status?: unknown
    provenance?: unknown
  }
  let parsedBody: GenerationApiResponseBody | null = null

  if (!responseOk) {
    parsedBody = ((await response
      .json()
      .catch(() => null)) as GenerationApiResponseBody | null)
    const message =
      typeof parsedBody?.error === "string" && parsedBody.error.trim()
        ? parsedBody.error
        : `Generation request failed with status ${response.status}`
    return {
      ...buildFallbackGenerationResult(
        prompt,
        message,
        typeof parsedBody?.provider === "string"
          ? parsedBody.provider
          : "unavailable",
      ),
      diagnostics: normalizeDiagnostics(parsedBody?.diagnostics),
    }
  }

  const contentType =
    typeof response.headers?.get === "function"
      ? (response.headers.get("content-type") ?? "")
      : ""
  const isSse = contentType.includes("text/event-stream")

  if (isSse) {
    try {
      let streamed = ""
      const events: Array<{ event: string; data: string }> = []

      const processEvent = (event: { event: string; data: string }) => {
        events.push(event)
      }

      if (response.body && typeof response.body.getReader === "function") {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          streamed += chunk
          buffer += chunk
          const parts = buffer.split(/\r?\n\r?\n/)
          buffer = parts.pop() ?? ""
          for (const part of parts) {
            const parsed = parseSseMessage(part)
            for (const ev of parsed) {
              processEvent(ev)
              // Dispatch live events immediately to options.onEvent
              if (ev.event === "status") {
                try {
                  const payload = JSON.parse(ev.data)
                  options.onEvent?.({
                    type: "status",
                    data: payload,
                    message: typeof payload?.message === "string" ? payload.message : undefined,
                  })
                } catch {
                  // ignore
                }
              } else if (ev.event === "delta") {
                try {
                  const payload = JSON.parse(ev.data)
                  const content = typeof payload?.content === "string" ? payload.content : ""
                  options.onEvent?.({ type: "delta", content })
                } catch {
                  // ignore
                }
              } else if (ev.event === "console") {
                try {
                  const payload = JSON.parse(ev.data)
                  const message = typeof payload?.message === "string" ? payload.message : ""
                  options.onEvent?.({ type: "console", message })
                } catch {
                  // ignore
                }
              } else if (ev.event === "file") {
                try {
                  const payload = JSON.parse(ev.data)
                  options.onEvent?.({ type: "file", file: payload?.file })
                } catch {
                  // ignore
                }
              }
            }
          }
        }
        if (buffer.trim()) {
          const parsed = parseSseMessage(buffer)
          for (const ev of parsed) processEvent(ev)
        }
      } else {
        streamed = await response.text()
        const parsed = parseSseMessage(streamed)
        for (const ev of parsed) processEvent(ev)
      }

      let lastAssistantText = ""
      let lastConsoleMessage: string | undefined
      let finalPayload: string | undefined
      let terminalError: Error | undefined
      const streamedFileChanges: GenerationFileChange[] = []
      let streamedProvenance: GenerationProvenance | undefined

      for (const event of events) {
        if (event.event === "status") {
          try {
            const payload = JSON.parse(event.data)
            options.onEvent?.({
              type: "status",
              data: payload,
              message: typeof payload?.message === "string" ? payload.message : undefined,
            })
          } catch {
            // ignore
          }
          continue
        }

        if (event.event === "delta") {
          try {
            const payload = JSON.parse(event.data)
            const content =
              typeof payload?.content === "string" ? payload.content : ""
            lastAssistantText += content
            options.onEvent?.({ type: "delta", content })
          } catch {
            // ignore malformed event payloads
          }
          continue
        }

        if (event.event === "console") {
          try {
            const payload = JSON.parse(event.data)
            const message =
              typeof payload?.message === "string" ? payload.message : ""
            lastConsoleMessage = message
            options.onEvent?.({ type: "console", message })
          } catch {
            // ignore malformed event payloads
          }
          continue
        }

        if (event.event === "file") {
          try {
            const payload = JSON.parse(event.data)
            const file = payload?.file
            const change = normalizeFileChange(file)
            if (change) {
              streamedFileChanges.push(change)
            }
            options.onEvent?.({ type: "file", file })
          } catch {
            // ignore malformed event payloads
          }
          continue
        }

        if (event.event === "version") {
          try {
            const payload = JSON.parse(event.data)
            const version = payload?.version
            options.onEvent?.({ type: "version", version })
          } catch {
            // ignore malformed event payloads
          }
          continue
        }

        if (event.event === "error") {
          try {
            const payload = JSON.parse(event.data)
            const message =
              typeof payload?.error?.message === "string"
                ? payload.error.message
                : "Generation failed during streaming."
            terminalError = new GenerationStreamError(message)
          } catch {
            terminalError = new GenerationStreamError(
              "Generation failed during streaming.",
            )
          }
          continue
        }

        if (event.event === "done") {
          const donePayload = decodeSseDonePayload(event.data)
          finalPayload = donePayload.responseText
          streamedProvenance = donePayload.provenance ?? streamedProvenance
        }
      }

      if (terminalError) {
        throw terminalError
      }

      const raw = finalPayload ?? (lastAssistantText || streamed)
      const {
        artifact: parsedArtifact,
        assistantText,
        usedFallback,
      } = extractArtifactPayload(raw, prompt)
      const artifact = parsedArtifact ?? createGeneratedArtifact(prompt, raw)
      const assistant = normalizeAssistantText(
        (assistantText || lastAssistantText || "").trim(),
      ).slice(0, 4000)

      const fileChanges: GenerationResult["fileChanges"] =
        streamedFileChanges.length > 0
          ? streamedFileChanges
          : normalizeFileChanges((parsedBody as any)?.build?.files)

      return {
        assistant,
        raw,
        provider: "stream",
        usedFallback,
        artifact,
        fileChanges,
        diagnostics: lastConsoleMessage
          ? { console: lastConsoleMessage }
          : undefined,
        provenance: streamedProvenance,
      }
    } catch (error) {
      if (error instanceof GenerationStreamError) {
        throw error
      }
      return buildFallbackGenerationResult(
        prompt,
        error instanceof Error
          ? error.message
          : "The provider returned an invalid SSE response.",
      )
    }
  }

  try {
    parsedBody = ((await response.json()) as GenerationApiResponseBody)
    const structuredMessage =
      typeof parsedBody?.message?.content === "string"
        ? parsedBody.message.content.trim()
        : ""
    const structuredResponse =
      typeof parsedBody?.response === "string" ? parsedBody.response.trim() : ""
    const fallbackText = structuredMessage || structuredResponse

    if (fallbackText) {
      const raw = structuredResponse || structuredMessage
      const fileChanges: GenerationResult["fileChanges"] = Array.isArray(
        parsedBody?.build?.files,
      )
        ? parsedBody.build.files.reduce<GenerationFileChange[]>((acc, file) => {
            const path = typeof file.path === "string" ? file.path : ""
            if (!path) return acc
            acc.push({
              path,
              operation: (file.operation === "delete"
                ? "delete"
                : file.operation === "create"
                  ? "create"
                  : "modify") as GenerationFileChange["operation"],
              content:
                typeof file.content === "string" ? file.content : undefined,
              language:
                typeof file.language === "string" ? file.language : undefined,
            })
            return acc
          }, [])
        : undefined
      const structuredArtifact = buildArtifactFromStructuredBuild(
        parsedBody,
        prompt,
      )
      const provenance = normalizeProvenance(parsedBody?.provenance)
      const {
        artifact: parsedArtifact,
        assistantText,
        usedFallback,
      } = extractArtifactPayload(raw, prompt)
      const diagnostics =
        normalizeDiagnostics(parsedBody?.diagnostics) ??
        (parsedBody?.consoleEvents
          ? {
              consoleEvents: parsedBody.consoleEvents,
              version: parsedBody.version,
            }
          : undefined)

      if (parsedArtifact && !usedFallback) {
        const assistant = normalizeAssistantText(
          structuredMessage || assistantText,
        ).slice(0, 4000)
        return {
          assistant,
          raw,
          provider:
            typeof parsedBody.provider === "string"
              ? parsedBody.provider
              : "remote",
          usedFallback: false,
          artifact: parsedArtifact,
          fileChanges,
          diagnostics,
          provenance,
        }
      }

      if (structuredArtifact) {
        const assistant = normalizeAssistantText(structuredMessage).slice(
          0,
          4000,
        )
        return {
          assistant,
          raw,
          provider:
            typeof parsedBody.provider === "string"
              ? parsedBody.provider
              : "remote",
          usedFallback: false,
          artifact: structuredArtifact,
          fileChanges,
          diagnostics,
          provenance,
        }
      }

      const assistant = normalizeAssistantText(
        structuredMessage || assistantText,
      ).slice(0, 4000)
      const artifact = parsedArtifact ?? createGeneratedArtifact(prompt, raw)

      return {
        assistant,
        raw,
        provider:
          typeof parsedBody.provider === "string"
            ? parsedBody.provider
            : "remote",
        usedFallback,
        artifact,
        fileChanges,
        diagnostics,
        provenance,
      }
    }
  } catch (error) {
    return buildFallbackGenerationResult(
      prompt,
      error instanceof Error
        ? error.message
        : "The provider returned an invalid response.",
    )
  }

  return buildFallbackGenerationResult(
    prompt,
    "The provider returned an invalid response.",
  )
}
