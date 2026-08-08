import { ProjectFile } from "./store"
import { generateId } from "./store"

export interface BuildArtifact {
  id: string
  projectId: string
  files: Array<{
    path: string
    content: string
    size: number
  }>
  metadata: {
    buildTime: number
    timestamp: string
    entryPoint: string
    framework: string
  }
}

export interface BuildResult {
  success: boolean
  artifact?: BuildArtifact
  error?: string
  buildLog: string
}

/**
 * Extract build metadata from project files
 * Determines the build framework and entry point
 */
export function extractBuildMetadata(
  files: ProjectFile[],
): {
  framework: string
  entryPoint: string
} {
  const fileMap = new Map(files.map((f) => [f.path, f]))

  // Detect framework by looking for key files
  if (fileMap.has("index.html")) {
    if (fileMap.has("src/main.tsx") || fileMap.has("src/main.ts")) {
      return { framework: "vite-react", entryPoint: "src/main.tsx" }
    }
    if (fileMap.has("src/main.jsx") || fileMap.has("src/main.js")) {
      return { framework: "vite-react", entryPoint: "src/main.jsx" }
    }
    return { framework: "vite", entryPoint: "index.html" }
  }

  if (fileMap.has("app.ts") || fileMap.has("app.tsx")) {
    return { framework: "next", entryPoint: "app.ts" }
  }

  return { framework: "vite", entryPoint: "index.html" }
}

/**
 * Create build manifest from project files
 * This represents what would be built and deployed
 */
export function createBuildManifest(
  files: ProjectFile[],
  projectId: string,
): BuildArtifact {
  const metadata = extractBuildMetadata(files)

  // Calculate total build size
  const buildFiles = files.map((f) => ({
    path: f.path,
    content: f.content,
    size: Buffer.byteLength(f.content, "utf8"),
  }))

  return {
    id: generateId(),
    projectId,
    files: buildFiles,
    metadata: {
      buildTime: Date.now(),
      timestamp: new Date().toISOString(),
      entryPoint: metadata.entryPoint,
      framework: metadata.framework,
    },
  }
}

/**
 * Validate project files are buildable
 * Checks for required files and detects build issues
 */
export function validateBuildable(
  files: ProjectFile[],
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const fileMap = new Map(files.map((f) => [f.path, f]))

  // Check for index.html
  if (!fileMap.has("index.html")) {
    errors.push("Missing index.html - required for web deployment")
  }

  // Check for package.json in app
  if (!fileMap.has("package.json") && fileMap.size > 1) {
    warnings.push("No package.json found - may affect build")
  }

  // Check file sizes
  for (const file of files) {
    const size = Buffer.byteLength(file.content, "utf8")
    if (size > 10 * 1024 * 1024) {
      warnings.push(
        `Large file ${file.path} (${size / 1024 / 1024}MB) may slow deployment`,
      )
    }
  }

  // Verify no protected files have dangerous content
  const protectedFiles = ["package.json", "tsconfig.json", ".env"]
  for (const protectedFile of protectedFiles) {
    const file = fileMap.get(protectedFile)
    if (file) {
      // Just verify it exists - content should be validated by schema
      if (file.content.length === 0) {
        warnings.push(`${protectedFile} is empty`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Prepare project files for deployment
 * Optimizes and validates files for production
 */
export function prepareBuild(
  files: ProjectFile[],
  projectId: string,
): BuildResult {
  const logs: string[] = []

  try {
    logs.push(`[Build] Starting build for project ${projectId}`)

    // Validate buildable
    const validation = validateBuildable(files)
    if (!validation.valid) {
      logs.push(`[Error] Build validation failed:`)
      validation.errors.forEach((e) => logs.push(`  - ${e}`))
      return {
        success: false,
        error: validation.errors.join(", "),
        buildLog: logs.join("\n"),
      }
    }

    if (validation.warnings.length > 0) {
      logs.push(`[Warning] Build warnings:`)
      validation.warnings.forEach((w) => logs.push(`  - ${w}`))
    }

    logs.push(`[Build] Analyzing project structure`)
    const metadata = extractBuildMetadata(files)
    logs.push(`[Build] Detected framework: ${metadata.framework}`)
    logs.push(`[Build] Entry point: ${metadata.entryPoint}`)

    logs.push(`[Build] Creating build artifact`)
    const artifact = createBuildManifest(files, projectId)
    logs.push(`[Build] Build artifact created: ${artifact.id}`)

    const totalSize = artifact.files.reduce((sum, f) => sum + f.size, 0)
    logs.push(`[Build] Total size: ${(totalSize / 1024).toFixed(2)}KB`)

    logs.push(`[Build] Build completed successfully`)

    return {
      success: true,
      artifact,
      buildLog: logs.join("\n"),
    }
  } catch (error) {
    logs.push(
      `[Error] Build failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown build error",
      buildLog: logs.join("\n"),
    }
  }
}
