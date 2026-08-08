export type ResponseType = "JSON" | "HTML" | "Markdown" | "PlainText" | "Unknown"

export function classifyProviderResponse(rawResponse: string): ResponseType {
  const trimmed = rawResponse.trim()
  if (!trimmed) return "Unknown"

  const isJson = (() => {
    try {
      const parsed = JSON.parse(trimmed)
      return parsed && typeof parsed === "object"
    } catch {
      return false
    }
  })()

  if (isJson) return "JSON"
  if (/^```(?:json|html|md|markdown|js|jsx|tsx)?[\s\S]*```/.test(trimmed))
    return "Markdown"
  if (/^<!doctype html|^<html|<body[\s\S]*<\/body>/i.test(trimmed))
    return "HTML"
  if (
    /^#{1,6}\s+/.test(trimmed) ||
    /\*\*.*\*\*/.test(trimmed) ||
    /\[[^\]]+\]\([^\)]+\)/.test(trimmed)
  )
    return "Markdown"
  if (/^\s*$/.test(trimmed)) return "Unknown"
  return "PlainText"
}
