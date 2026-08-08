import { runProviderPipeline } from "./pipeline.ts"
import type { BuildRequest, BuildResponse } from "./types.ts"

function normalizeWorkspaceFileEntry(
  entry: unknown,
): { path: string; content: string; language: string } | null {
  if (!entry || typeof entry !== "object") return null
  const fileEntry = entry as {
    path?: unknown
    content?: unknown
    language?: unknown
  }
  if (typeof fileEntry.path !== "string") return null

  const path = fileEntry.path.replace(/\\/g, "/").trim()
  if (!path) return null

  return {
    path,
    content: typeof fileEntry.content === "string" ? fileEntry.content : "",
    language:
      typeof fileEntry.language === "string" ? fileEntry.language : "text",
  }
}

export function mapBuildRequestToCurrentFiles(
  request: BuildRequest,
): Array<{ path: string; content: string; language: string }> {
  const fileEntries = [
    ...(Array.isArray(request.currentFiles) ? request.currentFiles : []),
    ...(request.fileContext?.files && Array.isArray(request.fileContext.files)
      ? request.fileContext.files
      : []),
  ]

  const normalizedMap = new Map<string, {
    path: string
    content: string
    language: string
  }>()

  for (const entry of fileEntries) {
    const normalized = normalizeWorkspaceFileEntry(entry)
    if (!normalized) continue
    normalizedMap.set(normalized.path, normalized)
  }

  return Array.from(normalizedMap.values())
}

export async function generateBuildResponse(
  request: BuildRequest,
  emitEvent?: (event: string, data: unknown) => void,
): Promise<BuildResponse> {
  const currentFiles = mapBuildRequestToCurrentFiles(request)
  return runProviderPipeline(request, currentFiles, emitEvent)
}
