import type { BuildFileOperation, BuildResponse } from "./types"

interface StructuredArtifact {
  html?: string
  css?: string
  js?: string
  title?: string
  description?: string
}

function safeString(value: string | undefined): string {
  return (value ?? "").trim()
}

function parseStructuredArtifact(
  responseText: string,
): StructuredArtifact | null {
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
    // ignore malformed JSON
  }

  return null
}

function extractHtmlBody(responseText: string): string | null {
  const trimmed = responseText.trim()
  if (!trimmed) return null

  const htmlMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (htmlMatch?.[1]) {
    return htmlMatch[1].trim()
  }

  if (
    /<(?:div|section|article|main|h1|p|img|svg|button|form)[^>]*>/i.test(
      trimmed,
    )
  ) {
    return trimmed
  }

  return null
}

function buildAppTsxContent(
  html: string,
  title: string,
  description: string,
): string {
  const safeHtml = JSON.stringify(html)
  const safeTitle = title || "Generated app"
  const safeDescription =
    description || "Generated from the current build request."

  return `import React from 'react'

export default function App() {
  return (
    <main>
      <h1>${safeTitle}</h1>
      <p>${safeDescription}</p>
      <div dangerouslySetInnerHTML={{ __html: ${safeHtml} }} />
    </main>
  )
}
`
}

export function deriveBuildFileOperations(
  responseText: string,
  prompt: string,
): BuildFileOperation[] {
  const artifact = parseStructuredArtifact(responseText)
  const operations: BuildFileOperation[] = []

  if (artifact) {
    if (safeString(artifact.html)) {
      operations.push({
        path: "src/App.tsx",
        operation: "modify",
        language: "tsx",
        content: buildAppTsxContent(
          artifact.html!,
          safeString(artifact.title) || prompt.slice(0, 80),
          safeString(artifact.description) || prompt.slice(0, 120),
        ),
      })
    }

    if (safeString(artifact.css)) {
      operations.push({
        path: "src/styles.css",
        operation: "modify",
        language: "css",
        content: artifact.css!,
      })
    }

    if (safeString(artifact.js)) {
      operations.push({
        path: "src/main.tsx",
        operation: "modify",
        language: "tsx",
        content: artifact.js!,
      })
    }

    return operations
  }

  const htmlBody = extractHtmlBody(responseText)
  if (htmlBody) {
    operations.push({
      path: "src/App.tsx",
      operation: "modify",
      language: "tsx",
      content: buildAppTsxContent(
        htmlBody,
        prompt.slice(0, 80),
        "Generated from the latest build response.",
      ),
    })
    return operations
  }

  const fallbackContent = buildAppTsxContent(
    `
<section>
  <h1>${prompt.slice(0, 60)}</h1>
  <p>${responseText.replace(/\s+/g, " ").trim()}</p>
</section>
    `.trim(),
    prompt.slice(0, 80),
    "Generated fallback page content.",
  )

  operations.push({
    path: "src/App.tsx",
    operation: "modify",
    language: "tsx",
    content: fallbackContent,
  })

  return operations
}

export function buildBuildResponse(
  responseText: string,
  provider: string,
  prompt: string,
  diagnostics?: unknown,
): BuildResponse {
  return {
    response: responseText,
    provider,
    message: {
      role: "assistant",
      content: responseText,
    },
    build: {
      files: deriveBuildFileOperations(responseText, prompt),
    },
    diagnostics,
  }
}
