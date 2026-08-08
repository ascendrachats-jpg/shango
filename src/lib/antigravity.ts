/**
 * SHANGO Antigravity System
 *
 * Enforces workspace ownership and deterministic file operations.
 * Core invariants:
 * - Project.files is canonical source of truth
 * - All provider responses normalize to BuildFileOperation[]
 * - Every change is auditable via GenerationProvenance
 * - Protected system files cannot be modified
 */

import { ProjectFile, GenerationProvenance, generateId } from "./store"
import type { ProjectArtifact } from "./store"
import type { GenerationFileChange } from "./generation"

/**
 * File operation types - deterministic representation of all file changes
 */
export type BuildFileOperation = {
  type: "create"
  path: string
  content: string
  language: string
} | { type: "modify"; path: string; content: string; language: string } | {
  type: "delete"
  path: string
}

/**
 * Result of a merge operation with full audit trail
 */
export interface MergeResult {
  files: ProjectFile[]
  operations: BuildFileOperation[]
  rejected: Array<{ path: string; reason: string }>
  timestamp: string
}

/**
 * Protected system files that can never be modified by generation
 */
const PROTECTED_PATHS = new Set([
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  ".env",
  ".env.local",
  ".env.production",
])

/**
 * Normalizes a file path to forward slashes and validates structure
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").trim()
}

/**
 * Validates a path for safety
 */
function isValidPath(path: string): boolean {
  const normalized = normalizePath(path)
  const segments = normalized.split("/")

  // Path must not be empty, start with /, contain drive letters, or have invalid segments
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return false
  }

  return true
}

/**
 * Checks if a path is protected from modification
 */
function isProtectedPath(path: string): boolean {
  const normalized = normalizePath(path)
  return PROTECTED_PATHS.has(normalized)
}

/**
 * Normalizes provider artifact to deterministic file operations
 * Compares generated artifact files against current workspace state
 */
export function normalizeProviderOperations(
  artifact: ProjectArtifact | undefined,
  currentFiles: ProjectFile[] | undefined,
): BuildFileOperation[] {
  if (!artifact?.files) return []

  const operations: BuildFileOperation[] = []
  const currentMap = new Map((currentFiles ?? []).map((f) => [f.path, f]))

  // Process all artifact files
  // Only explicit operations are used - don't infer deletes from missing files
  for (const artifactFile of artifact.files) {
    const path = artifactFile.path

    if (!isValidPath(path)) continue
    if (isProtectedPath(path)) continue

    // Check if the artifact file has an explicit operation field
    const explicitOp = (artifactFile as any)?.operation

    if (explicitOp === "delete") {
      // Explicit delete operation
      operations.push({ type: "delete", path })
    } else {
      const currentFile = currentMap.get(path)

      if (!currentFile) {
        operations.push({
          type: "create",
          path,
          content: artifactFile.content,
          language: artifactFile.language,
        })
      } else if (currentFile.content !== artifactFile.content) {
        operations.push({
          type: "modify",
          path,
          content: artifactFile.content,
          language: artifactFile.language,
        })
      }
    }
  }

  return operations
}

/**
 * Core Antigravity merge engine
 * Applies normalized operations to current files, enforcing all invariants
 */
export function buildAntigravityMerge(
  currentFiles: ProjectFile[] | undefined,
  operations: BuildFileOperation[],
  timestamp: string,
): MergeResult {
  const fileMap = new Map((currentFiles ?? []).map((f) => [f.path, f]))
  const appliedOps: BuildFileOperation[] = []
  const rejected: Array<{ path: string; reason: string }> = []

  // Apply each operation in order, tracking rejections
  for (const op of operations) {
    const path = normalizePath(op.path)

    // Validate path structure
    if (!isValidPath(path)) {
      rejected.push({ path, reason: "invalid-path" })
      continue
    }

    // Protect system files
    if (isProtectedPath(path)) {
      rejected.push({ path, reason: "protected-file" })
      continue
    }

    // Apply operation
    if (op.type === "create") {
      fileMap.set(path, {
        id: `${path}-${timestamp}`,
        path,
        name: path.split("/").pop() ?? path,
        extension: path.includes(".")
          ? (path.split(".").pop()?.toLowerCase() ?? "")
          : "",
        language: op.language,
        content: op.content,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastModified: timestamp,
        size: op.content.length,
        kind: "file",
        userModified: false,
      })
      appliedOps.push(op)
    } else if (op.type === "modify") {
      const existing = fileMap.get(path)
      if (existing) {
        fileMap.set(path, {
          ...existing,
          path,
          language: op.language,
          content: op.content,
          updatedAt: timestamp,
          lastModified: timestamp,
          size: op.content.length,
        })
        appliedOps.push(op)
      }
    } else if (op.type === "delete") {
      // Idempotent delete - success regardless of whether file exists
      fileMap.delete(path)
      appliedOps.push(op)
    }
  }

  return {
    files: Array.from(fileMap.values()),
    operations: appliedOps,
    rejected,
    timestamp,
  }
}

/**
 * Records merge operation as provenance for audit trail
 * Captures all metadata needed for rollback and attribution
 */
export function recordMergeProvenance(
  mergeResult: MergeResult,
  prompt: string,
  provider: string,
  model: string | undefined,
  mode: "plan" | "build",
): GenerationProvenance {
  return {
    id: generateId(),
    timestamp: mergeResult.timestamp,
    provider,
    model,
    mode,
    prompt,
    operations: mergeResult.operations.map((op) => ({
      path: op.path,
      operation:
        op.type === "delete"
          ? "delete"
          : op.type === "create"
            ? "create"
            : "modify",
    })),
    rejectedOperations:
      mergeResult.rejected.length > 0
        ? mergeResult.rejected.map((r) => ({
            path: r.path,
            reason: r.reason as "invalid-path" | "protected-file",
          }))
        : undefined,
  }
}

/**
 * Converts legacy GenerationResult.fileChanges to normalized operations
 * Used for backward compatibility during integration phase
 */
export function legacyFileChangesToOperations(
  fileChanges: GenerationFileChange[] | undefined,
): BuildFileOperation[] {
  if (!fileChanges) return []

  // Track latest operation for each path (deduplication)
  const latestByPath = new Map<string, GenerationFileChange>()

  for (const change of fileChanges) {
    const path = normalizePath(change.path)

    if (!isValidPath(path) || isProtectedPath(path)) {
      continue
    }

    latestByPath.set(path, { ...change, path })
  }

  // Convert to operations
  const operations: BuildFileOperation[] = []
  for (const change of latestByPath.values()) {
    const path = change.path

    if (change.operation === "delete") {
      operations.push({ type: "delete", path })
    } else if (change.operation === "create" || change.operation === "modify") {
      operations.push({
        type: change.operation,
        path,
        content: typeof change.content === "string" ? change.content : "",
        language: change.language ?? "text",
      })
    }
  }

  return operations
}
