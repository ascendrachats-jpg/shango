import type { Project, ProjectFile, ProjectArtifactFile } from "./store.ts"
import type { ProjectArtifact } from "./store.ts"

export type WorkspaceDiffOperation = "create" | "modify" | "delete"

export interface WorkspaceDiffEntry {
  path: string
  content?: string
  language?: string
  operation?: WorkspaceDiffOperation
}

export function deriveArtifactFromWorkspace(
  files: ProjectFile[] | undefined,
): ProjectArtifact {
  const fileMap = new Map((files ?? []).map((file) => [file.path, file]))
  const indexHtml = fileMap.get("index.html")?.content?.trim() || ""
  const appTsx = fileMap.get("src/App.tsx")?.content?.trim() || ""
  const stylesCss = fileMap.get("src/styles.css")?.content?.trim() || ""

  const htmlMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = (htmlMatch?.[1]?.trim() || indexHtml)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .trim()
  const titleMatch = indexHtml.match(/<title>([\s\S]*?)<\/title>/i)
  const title = titleMatch?.[1]?.trim() || "Generated Page"
  const description =
    bodyHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Generated from the current workspace."

  return {
    html: bodyHtml || `<main><h1>${title}</h1><p>${description}</p></main>`,
    css: stylesCss || ":root { color-scheme: light; }",
    js: appTsx || `console.log('Workspace-derived artifact ready');`,
    title,
    description,
    createdAt: new Date().toISOString(),
    files: (files ?? []).map((file) => ({
      path: file.path,
      content: file.content,
      language: (file.language || "text") as ProjectArtifactFile["language"],
    })),
  }
}

function inferWorkspaceLanguage(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase()
  if (normalizedPath.endsWith(".tsx") || normalizedPath.endsWith(".ts"))
    return normalizedPath.endsWith(".tsx") ? "tsx" : "ts"
  if (normalizedPath.endsWith(".jsx") || normalizedPath.endsWith(".js"))
    return normalizedPath.endsWith(".jsx") ? "jsx" : "js"
  if (normalizedPath.endsWith(".css")) return "css"
  if (normalizedPath.endsWith(".html") || normalizedPath.endsWith(".htm"))
    return "html"
  if (normalizedPath.endsWith(".json")) return "json"
  if (normalizedPath.endsWith(".md")) return "md"
  return "text"
}

export function buildWorkspaceFile(
  path: string,
  content: string,
  language: string,
  createdAt: string,
): ProjectFile {
  const normalizedPath = path.replace(/\\/g, "/")
  const name = normalizedPath.split("/").pop() ?? normalizedPath
  const extension = name.includes(".")
    ? (name.split(".").pop()?.toLowerCase() ?? "")
    : ""

  return {
    id: `${normalizedPath}-${createdAt}`,
    path: normalizedPath,
    name,
    extension,
    language,
    content,
    createdAt,
    updatedAt: createdAt,
    lastModified: createdAt,
    size: content.length,
    kind: "file",
  }
}

function normalizeDiffEntry(entry: {
  path?: string
  content?: string
  language?: string
  operation?: string
}): WorkspaceDiffEntry | null {
  const normalizedPath = (entry.path ?? "").replace(/\\/g, "/").trim()
  if (!normalizedPath) return null

  const operation =
    entry.operation === "delete"
      ? "delete"
      : entry.operation === "create"
        ? "create"
        : "modify"

  return {
    path: normalizedPath,
    content: typeof entry.content === "string" ? entry.content : undefined,
    language: typeof entry.language === "string" ? entry.language : undefined,
    operation,
  }
}

export function updateProjectFile(
  files: ProjectFile[] | undefined,
  path: string,
  content: string,
  updatedAt: string,
): ProjectFile[] {
  const normalizedPath = path.replace(/\\/g, "/").trim()
  const existingFiles = Array.isArray(files) ? files : []
  const fileMap = new Map(existingFiles.map((f) => [f.path, f]))
  const existing = fileMap.get(normalizedPath)

  const updatedFile: ProjectFile = existing
    ? {
        ...existing,
        content,
        updatedAt,
        lastModified: updatedAt,
        size: content.length,
        userModified: true,
      }
    : {
        ...buildWorkspaceFile(
          normalizedPath,
          content,
          inferWorkspaceLanguage(normalizedPath),
          updatedAt,
        ),
        userModified: true,
      }

  fileMap.set(normalizedPath, updatedFile)
  return Array.from(fileMap.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  )
}

export function mergeWorkspaceFilesWithArtifact(
  files: ProjectFile[] | undefined,
  artifact: ProjectArtifact | undefined,
  createdAt: string,
): ProjectFile[] {
  const existingFiles = Array.isArray(files) ? files : []

  if (!artifact) {
    return existingFiles
  }

  const generatedEntries =
    Array.isArray(artifact.files) && artifact.files.length > 0
      ? artifact.files
          .map((entry) => normalizeDiffEntry(entry))
          .filter((entry): entry is WorkspaceDiffEntry => entry !== null)
      : undefined

  const sourceEntries =
    generatedEntries ??
    deriveWorkspaceFilesFromArtifact(artifact, createdAt).map((file) => ({
      path: file.path,
      content: file.content,
      language: file.language,
      operation: "modify" as WorkspaceDiffOperation,
    }))

  if (!generatedEntries && existingFiles.length > 0) {
    return existingFiles
  }

  const mergedFiles = new Map(existingFiles.map((file) => [file.path, file]))

  for (const entry of sourceEntries) {
    const normalizedPath = entry.path.replace(/\\/g, "/")

    if (entry.operation === "delete") {
      mergedFiles.delete(normalizedPath)
      continue
    }

    const existingFile = mergedFiles.get(normalizedPath)
    const content =
      typeof entry.content === "string"
        ? entry.content
        : (existingFile?.content ?? "")
    const language =
      entry.language ||
      existingFile?.language ||
      inferWorkspaceLanguage(normalizedPath)

    const nextFile: ProjectFile = existingFile
      ? {
          ...existingFile,
          path: normalizedPath,
          name: normalizedPath.split("/").pop() ?? normalizedPath,
          extension: normalizedPath.includes(".")
            ? (normalizedPath.split(".").pop()?.toLowerCase() ?? "")
            : "",
          language,
          content,
          updatedAt: createdAt,
          lastModified: createdAt,
          size: content.length,
          kind: "file",
          userModified: existingFile.userModified,
        }
      : buildWorkspaceFile(normalizedPath, content, language, createdAt)

    mergedFiles.set(normalizedPath, nextFile)
  }

  return Array.from(mergedFiles.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  )
}

export function deriveWorkspaceFilesFromArtifact(
  artifact: ProjectArtifact | undefined,
  createdAt: string,
): ProjectFile[] {
  if (!artifact) return []

  const title = artifact.title?.trim() || "Generated Page"
  const description =
    artifact.description?.trim() || "Generated from the latest prompt."

  return [
    buildWorkspaceFile(
      "index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    ${artifact.html?.trim() || `<main><h1>${title}</h1><p>${description}</p></main>`}
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>`,
      "html",
      createdAt,
    ),
    buildWorkspaceFile(
      "src/App.tsx",
      `import React from 'react'

export default function App() {
  return (
    <main>
      <h1>${title}</h1>
      <p>${description}</p>
      <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(artifact.html?.trim() || `<main><h1>${title}</h1><p>${description}</p></main>`)} }} />
    </main>
  )
}`,
      "tsx",
      createdAt,
    ),
    buildWorkspaceFile(
      "src/styles.css",
      artifact.css?.trim() || ":root { color-scheme: light; }",
      "css",
      createdAt,
    ),
  ]
}

export function ensureProjectWorkspace(
  project: Project,
  createdAt: string,
): Project {
  if (Array.isArray(project.files) && project.files.length > 0) {
    return project
  }

  const activeArtifact =
    project.artifact ?? deriveProjectArtifact(project, createdAt)
  const derivedFiles = mergeWorkspaceFilesWithArtifact(
    project.files,
    activeArtifact,
    createdAt,
  )
  const finalFiles =
    derivedFiles.length > 0
      ? derivedFiles
      : deriveWorkspaceFilesFromArtifact(activeArtifact, createdAt)

  return {
    ...project,
    files: finalFiles,
  }
}

export function deriveProjectArtifact(
  project: Project,
  createdAt?: string,
): ProjectArtifact {
  if (Array.isArray(project.files) && project.files.length > 0) {
    const derived = deriveArtifactFromWorkspace(project.files)
    return {
      ...derived,
      createdAt: createdAt ?? derived.createdAt,
    }
  }

  return {
    ...(project.artifact ?? {
      html: "<main><h1>Start building</h1><p>Your generated app will appear here.</p></main>",
      css: "body { margin: 0; padding: 2rem; font-family: Inter, system-ui, sans-serif; } main { max-width: 720px; margin: 0 auto; } h1 { font-size: 2rem; } p { color: #475569; line-height: 1.6; }",
      js: "",
      title: project.name || "Shango Preview",
      description: "Generated app preview",
      createdAt: createdAt ?? new Date().toISOString(),
    }),
    createdAt:
      createdAt ?? project.artifact?.createdAt ?? new Date().toISOString(),
  }
}
