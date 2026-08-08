import type { Project } from "./store"
import { ensureProjectWorkspace } from "./workspace"
import { createZipBlob } from "./zip"

export interface ExportFile {
  path: string
  content: string
  language: "html" | "css" | "javascript" | "typescript" | "json" | "md" | "text"
}

function inferExportLanguage(path: string): ExportFile["language"] {
  const lower = path.toLowerCase()
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html"
  if (lower.endsWith(".css")) return "css"
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript"
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript"
  if (lower.endsWith(".json")) return "json"
  if (lower.endsWith(".md")) return "md"
  return "text"
}

export function buildProjectExportBundle(project: Project): ExportFile[] {
  const bootstrapped = ensureProjectWorkspace(project, new Date().toISOString())
  const rawFiles = bootstrapped.files ?? []

  const exportFiles: ExportFile[] = rawFiles.map((file) => ({
    path: file.path,
    content: file.content,
    language: inferExportLanguage(file.path),
  }))

  const hasPackageJson = exportFiles.some((f) => f.path === "package.json")
  if (!hasPackageJson) {
    const slug = (project.name || "shango-app")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
    exportFiles.push({
      path: "package.json",
      content: JSON.stringify(
        {
          name: slug || "shango-app",
          private: true,
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "@vitejs/plugin-react": "^6.0.0",
            typescript: "^5.7.0",
            vite: "^8.0.0",
          },
        },
        null,
        2,
      ),
      language: "json",
    })
  }

  return exportFiles.sort((left, right) => left.path.localeCompare(right.path))
}

export function createDownloadBlob(files: ExportFile[]): Blob {
  return createZipBlob(files)
}

export function triggerFileDownload(
  files: ExportFile[],
  fileName?: string,
): void {
  const blob = createDownloadBlob(files)
  const defaultName =
    fileName && fileName !== "shango-export.txt"
      ? fileName
      : "shango-project.zip"
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = defaultName
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function createShareLink(projectId: string): string {
  return `shango.local/p/${projectId}`
}

export function createEmbedCode(
  projectName: string,
  projectId: string,
  privacy: "private" | "public" | "embed" = "public",
): string {
  const url = createShareLink(projectId)
  return `<iframe src="${url}" width="100%" height="600" frameborder="0" allow="clipboard-write" title="${projectName}" data-privacy="${privacy}"></iframe>`
}

export function isValidInviteEmail(value: string): boolean {
  if (!value.trim()) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export interface ShareResponse {
  url: string
  embedCode: string
  privacy: "private" | "public" | "embed"
}

export interface ExportResponse {
  format: "zip" | "github"
  downloadUrl?: string
  files?: ExportFile[]
}

export async function requestProjectShare(
  projectId: string,
  privacy: "private" | "public" | "embed" = "public",
  projectName = "Shango Project",
): Promise<ShareResponse> {
  const fallback = {
    url: createShareLink(projectId),
    embedCode: createEmbedCode(projectName, projectId, privacy),
    privacy,
  }

  if (typeof fetch !== "function") return fallback

  try {
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/share`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy }),
      },
    )

    if (!response.ok) throw new Error("Share request failed")

    const payload = (await response
      .json()
      .catch(() => null)) as Partial<ShareResponse> | null
    if (payload?.url && payload.embedCode) {
      return { url: payload.url, embedCode: payload.embedCode, privacy }
    }
  } catch {
    // fall back to local share URL and embed snippet
  }

  return fallback
}

export async function requestProjectInvite(
  projectId: string,
  email: string,
): Promise<boolean> {
  if (typeof fetch !== "function") return false
  if (!isValidInviteEmail(email)) return false

  try {
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/invite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "viewer" }),
      },
    )
    return response.ok
  } catch {
    return false
  }
}

export async function requestProjectExport(
  projectId: string,
  format: "zip" | "github" = "zip",
  projectName = "Shango Project",
): Promise<ExportResponse> {
  const fallbackFiles = buildProjectExportBundle({
    id: projectId,
    name: projectName,
    description: "",
    status: "DRAFT",
    lastEdited: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  } as Project)

  if (typeof fetch !== "function") {
    return { format, files: fallbackFiles }
  }

  try {
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      },
    )

    if (!response.ok) throw new Error("Export request failed")

    const payload = (await response
      .json()
      .catch(() => null)) as Partial<ExportResponse> | null
    if (payload?.downloadUrl) {
      return { format, downloadUrl: payload.downloadUrl }
    }
  } catch {
    // fall back to local export bundle
  }

  return {
    format,
    files: fallbackFiles,
  }
}
