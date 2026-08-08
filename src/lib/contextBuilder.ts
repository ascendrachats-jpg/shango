import type { WorkspaceFileContextEntry } from "./generation"
import {
  createWorkspaceDependencyGraph,
  type WorkspaceDependencyGraph,
} from "./dependencyGraph"

export type WorkspaceContextFilePriority = "high" | "medium" | "low"

export interface WorkspaceContextFile {
  path: string
  language?: string
  priority: WorkspaceContextFilePriority
  reason: string
}

export interface WorkspaceContextProjectMetadata {
  fileCount: number
  rootFiles: string[]
  hasPackageJson: boolean
  hasTsconfig: boolean
  hasStyles: boolean
  activeFileLanguage?: string
}

export interface WorkspaceContext {
  activeFile?: string
  prompt: string
  relatedFiles: WorkspaceContextFile[]
  dependencyFiles: WorkspaceContextFile[]
  dependencyGraph: WorkspaceDependencyGraph
  projectMetadata: WorkspaceContextProjectMetadata
  builderMode: "plan" | "build"
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").trim()
}

function classifyFile(
  path: string,
  activeFile: string | undefined,
): WorkspaceContextFile["priority"] {
  if (!path) return "low"
  const normalizedPath = normalizePath(path)
  const normalizedActive = activeFile ? normalizePath(activeFile) : ""

  if (normalizedPath === normalizedActive) return "high"
  if (
    normalizedPath.includes("/components/") ||
    normalizedPath.includes("/pages/") ||
    normalizedPath.includes("/layouts/") ||
    normalizedPath.includes("/routes/") ||
    normalizedPath.includes("/router")
  )
    return "high"
  if (
    normalizedPath.includes("/lib/") ||
    normalizedPath.includes("/utils/") ||
    normalizedPath.includes("/hooks/") ||
    normalizedPath.includes("/styles/") ||
    normalizedPath.endsWith(".css")
  )
    return "medium"
  if (
    normalizedPath.startsWith("src/") ||
    normalizedPath.includes("App.") ||
    normalizedPath.includes("main.")
  )
    return "high"
  return "low"
}

function classifyReason(path: string, activeFile: string | undefined): string {
  const normalizedPath = normalizePath(path)
  const normalizedActive = activeFile ? normalizePath(activeFile) : ""

  if (normalizedPath === normalizedActive) return "active-file"
  if (
    normalizedPath === "package.json" ||
    normalizedPath === "tsconfig.json" ||
    normalizedPath === "vite.config.ts"
  )
    return "dependency"
  if (
    normalizedPath === "index.html" ||
    normalizedPath.endsWith("/App.tsx") ||
    normalizedPath.endsWith("/App.jsx") ||
    normalizedPath.endsWith("/main.tsx")
  )
    return "root-entry"
  if (
    normalizedPath.includes("/pages/") ||
    normalizedPath.includes("/routes/") ||
    normalizedPath.includes("/router")
  )
    return "routing"
  if (normalizedPath.includes("/styles/") || normalizedPath.endsWith(".css"))
    return "related-style"
  if (normalizedPath.includes("/components/")) return "related-component"
  if (normalizedPath.includes("/utils/") || normalizedPath.includes("/lib/"))
    return "related-utility"
  return "unrelated-file"
}

export function buildWorkspaceContext(
  prompt: string,
  options: {
    activeFile?: string
    builderMode?: "plan" | "build"
    workspaceFiles?: WorkspaceFileContextEntry[]
  },
): WorkspaceContext {
  const workspaceFiles = (options.workspaceFiles ?? [])
    .map((file) => ({
      path: normalizePath(file.path),
      language: file.language,
      content: file.content,
      priority: classifyFile(file.path, options.activeFile),
      reason: classifyReason(file.path, options.activeFile),
    }))
    .filter((file) => file.path)

  const graph = createWorkspaceDependencyGraph(workspaceFiles)

  const activeFile = options.activeFile
    ? normalizePath(options.activeFile)
    : undefined
  const activeFileEntry = workspaceFiles.find(
    (file) => file.path === activeFile,
  )
  const relatedFiles = [
    ...(activeFileEntry
      ? [activeFileEntry]
      : activeFile
        ? [
            {
              path: activeFile,
              language: undefined,
              priority: "high" as const,
              reason: "active-file",
              content: "",
            },
          ]
        : []),
    ...workspaceFiles
      .filter((file) => file.path !== activeFile && file.priority === "high")
      .slice(0, 6),
    ...workspaceFiles
      .filter((file) => file.path !== activeFile && file.priority === "medium")
      .slice(0, 4),
  ].slice(0, 8)

  const dependencyPathSet = new Set(
    graph.edges.flatMap((edge) => [edge.source, edge.target]),
  )
  const dependencyFiles = workspaceFiles.filter(
    (file) =>
      dependencyPathSet.has(file.path) ||
      file.reason === "dependency" ||
      file.path === "package.json" ||
      file.path === "tsconfig.json" ||
      file.path === "vite.config.ts",
  )
  const rootFiles = Array.from(
    new Set([
      ...workspaceFiles
        .filter(
          (file) => file.reason === "root-entry" || file.reason === "routing",
        )
        .map((file) => file.path),
      ...graph.entryPoints,
    ]),
  ).slice(0, 6)
  const hasStyles = workspaceFiles.some(
    (file) => file.path.endsWith(".css") || file.path.includes("/styles/"),
  )

  return {
    activeFile,
    prompt,
    relatedFiles,
    dependencyFiles,
    dependencyGraph: graph,
    projectMetadata: {
      fileCount: workspaceFiles.length,
      rootFiles,
      hasPackageJson: workspaceFiles.some(
        (file) => file.path === "package.json",
      ),
      hasTsconfig: workspaceFiles.some((file) => file.path === "tsconfig.json"),
      hasStyles,
      activeFileLanguage: activeFileEntry?.language,
    },
    builderMode: options.builderMode ?? "build",
  }
}
