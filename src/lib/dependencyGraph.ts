export type WorkspaceDependencyEdgeType = "import" | "styleImport"

export interface WorkspaceDependencyEdge {
  source: string
  target: string
  type: WorkspaceDependencyEdgeType
  specifier: string
}

export interface WorkspaceDependencyNode {
  path: string
  language?: string
  imports: string[]
  importedBy: string[]
  exports: string[]
  isEntryPoint: boolean
  isUtility: boolean
  isPage: boolean
}

export interface WorkspaceDependencyGraph {
  nodes: WorkspaceDependencyNode[]
  edges: WorkspaceDependencyEdge[]
  entryPoints: string[]
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").trim()
}

function splitPath(path: string): string[] {
  return normalizePath(path).split("/").filter(Boolean)
}

function joinPath(parts: string[]): string {
  return parts.filter(Boolean).join("/")
}

function dirname(path: string): string {
  const parts = splitPath(path)
  if (parts.length <= 1) return ""
  parts.pop()
  return joinPath(parts)
}

function resolveRelativePath(
  basePath: string,
  specifier: string,
  filePaths: Set<string>,
): string | undefined {
  const normalizedSpecifier = normalizePath(specifier)
  const baseDir = dirname(basePath)
  const candidateParts = splitPath(baseDir)

  for (const segment of splitPath(normalizedSpecifier)) {
    if (segment === "." || segment === "") continue
    if (segment === "..") {
      candidateParts.pop()
      continue
    }
    candidateParts.push(segment)
  }

  const candidateBase = joinPath(candidateParts)
  const extensions = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".styl",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
  ]
  for (const ext of extensions) {
    const candidate = normalizePath(candidateBase + ext)
    if (filePaths.has(candidate)) return candidate
  }

  return undefined
}

function parseImportSpecifiers(content: string): string[] {
  const specifiers = new Set<string>()
  const patterns = [
    /import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /@import\s+['"]([^'"]+)['"]/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content))) {
      if (match[1]) specifiers.add(match[1].trim())
    }
  }

  return [...specifiers]
}

function parseExportNames(content: string): string[] {
  const exports = new Set<string>()
  const patterns = [
    /export\s+default\s+function\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:const|let|var|function|class|interface|type)\s+([A-Za-z0-9_]+)/g,
    /export\s*\{([^}]+)\}/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content))) {
      if (!match[1]) continue
      const names = match[1]
        .split(",")
        .map((name) => name.trim().split(/as/)[0].trim())
      for (const name of names) {
        if (name) exports.add(name)
      }
    }
  }

  return [...exports]
}

function isEntryPointPath(path: string): boolean {
  const normalized = normalizePath(path)
  return (
    normalized === "index.html" ||
    normalized === "src/App.tsx" ||
    normalized === "src/main.tsx" ||
    normalized.startsWith("src/pages/") ||
    normalized.includes("/routes/")
  )
}

function isUtilityPath(path: string): boolean {
  const normalized = normalizePath(path)
  return (
    normalized.includes("/lib/") ||
    normalized.includes("/utils/") ||
    normalized.includes("/hooks/") ||
    normalized.includes("/helpers/")
  )
}

export function createWorkspaceDependencyGraph(
  files: Array<{ path: string; language?: string; content: string }>,
): WorkspaceDependencyGraph {
  const normalizedFiles = files.map((file) => ({
    path: normalizePath(file.path),
    language: file.language,
    content: file.content,
  }))
  const filePathSet = new Set(normalizedFiles.map((file) => file.path))
  const nodes = new Map<string, WorkspaceDependencyNode>()
  const edges: WorkspaceDependencyEdge[] = []

  for (const file of normalizedFiles) {
    nodes.set(file.path, {
      path: file.path,
      language: file.language,
      imports: [],
      importedBy: [],
      exports: parseExportNames(file.content),
      isEntryPoint: isEntryPointPath(file.path),
      isUtility: isUtilityPath(file.path),
      isPage:
        file.path.startsWith("src/pages/") ||
        /Page\.(tsx|jsx|ts|js)$/.test(file.path),
    })
  }

  for (const file of normalizedFiles) {
    const sourceNode = nodes.get(file.path)
    if (!sourceNode) continue

    const specifiers = parseImportSpecifiers(file.content)
    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) continue
      const targetPath = resolveRelativePath(file.path, specifier, filePathSet)
      if (!targetPath) continue

      const importType: WorkspaceDependencyEdgeType =
        specifier.endsWith(".css") ||
        specifier.startsWith("..") ||
        specifier.includes("/styles/")
          ? "styleImport"
          : "import"
      sourceNode.imports.push(targetPath)
      edges.push({
        source: file.path,
        target: targetPath,
        type: importType,
        specifier,
      })

      const targetNode = nodes.get(targetPath)
      if (targetNode && !targetNode.importedBy.includes(file.path)) {
        targetNode.importedBy.push(file.path)
      }
    }
  }

  const nodeList = Array.from(nodes.values())
  const entryPoints = nodeList
    .filter((node) => node.isEntryPoint)
    .map((node) => node.path)

  return {
    nodes: nodeList,
    edges,
    entryPoints,
  }
}
