export interface WorkspaceFileEntry {
  path: string
  content: string
  language?: string
}

export interface SelectedContextResult {
  selectedFiles: WorkspaceFileEntry[]
  intentCategory: "new_build" | "iteration" | "repair" | "clarification"
  matchedKeywords: string[]
}

export function selectWorkspaceContext(
  files: WorkspaceFileEntry[],
  prompt: string,
  activeFile?: string,
  runtimeDiagnostic?: { file?: string; message?: string },
): SelectedContextResult {
  if (!files || files.length === 0) {
    return {
      selectedFiles: [],
      intentCategory: "new_build",
      matchedKeywords: [],
    }
  }

  const promptLower = prompt.toLowerCase()
  const matchedKeywords: string[] = []

  let intentCategory: SelectedContextResult["intentCategory"] = "iteration"
  if (runtimeDiagnostic || promptLower.includes("fix") || promptLower.includes("error") || promptLower.includes("bug")) {
    intentCategory = "repair"
  } else if (promptLower.startsWith("build ") || promptLower.startsWith("create ")) {
    intentCategory = "new_build"
  }

  const fileMap = new Map<string, WorkspaceFileEntry>(files.map((f) => [f.path.replace(/\\/g, "/"), f]))
  const selectedPaths = new Set<string>()

  // 1. Always include entry points
  if (fileMap.has("src/App.tsx")) selectedPaths.add("src/App.tsx")
  if (fileMap.has("src/main.tsx")) selectedPaths.add("src/main.tsx")
  if (fileMap.has("index.html")) selectedPaths.add("index.html")

  // 2. Include active file
  if (activeFile && fileMap.has(activeFile)) {
    selectedPaths.add(activeFile)
  }

  // 3. Include file from runtime diagnostic
  if (runtimeDiagnostic?.file && fileMap.has(runtimeDiagnostic.file)) {
    selectedPaths.add(runtimeDiagnostic.file)
  }

  // 4. Keyword matching against file basenames and content
  for (const file of files) {
    const normalizedPath = file.path.replace(/\\/g, "/")
    const basename = normalizedPath.split("/").pop()?.split(".")[0]?.toLowerCase() ?? ""

    if (basename && promptLower.includes(basename)) {
      selectedPaths.add(normalizedPath)
      matchedKeywords.push(basename)
    }
  }

  // Fallback: If no specific file matched beyond entry point, select all files up to 10
  if (selectedPaths.size <= 1) {
    for (const file of files) {
      selectedPaths.add(file.path.replace(/\\/g, "/"))
      if (selectedPaths.size >= 10) break
    }
  }

  const selectedFiles = Array.from(selectedPaths)
    .map((p) => fileMap.get(p))
    .filter((f): f is WorkspaceFileEntry => f !== undefined)

  return {
    selectedFiles,
    intentCategory,
    matchedKeywords,
  }
}
