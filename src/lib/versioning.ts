import {
  Project,
  ProjectArtifact,
  ProjectVersion,
  generateId,
  type ChatMessage,
  type GenerationProvenance,
  type ProjectFile,
} from "./store"
import type { GeneratedArtifact } from "./generatedArtifact"
import type { GenerationResult } from "./generation"
import {
  deriveProjectArtifact,
  mergeWorkspaceFilesWithArtifact,
} from "./workspace"
import {
  buildAntigravityMerge,
  normalizeProviderOperations,
  recordMergeProvenance,
} from "./antigravity"

const protectedWorkspaceFiles = new Set([
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
])

export interface RejectedWorkspaceChange {
  path: string
  reason: "invalid-path" | "protected-file"
}

export function findSensitiveWorkspaceChanges(
  files: ProjectFile[] | undefined,
  fileChanges: GenerationResult["fileChanges"] | undefined,
): NonNullable<GenerationResult["fileChanges"]> {
  const currentFiles = new Map((files ?? []).map((file) => [file.path, file]))
  return validateWorkspaceFileChanges(fileChanges).accepted.filter((change) => {
    if (change.operation === "delete") return true
    const existing = currentFiles.get(change.path)
    return Boolean(
      existing?.userModified &&
        typeof change.content === "string" &&
        change.content !== existing.content,
    )
  })
}

export function validateWorkspaceFileChanges(
  fileChanges: GenerationResult["fileChanges"] | undefined,
): {
  accepted: NonNullable<GenerationResult["fileChanges"]>
  rejected: RejectedWorkspaceChange[]
} {
  const latestChangeByPath =
    new Map<string, NonNullable<GenerationResult["fileChanges"]>[number]>()
  const rejected: RejectedWorkspaceChange[] = []

  for (const change of fileChanges ?? []) {
    const path = change.path.replace(/\\/g, "/").trim()
    const segments = path.split("/")
    if (
      !path ||
      path.startsWith("/") ||
      /^[a-zA-Z]:/.test(path) ||
      segments.some(
        (segment) => !segment || segment === "." || segment === "..",
      )
    ) {
      rejected.push({ path: change.path, reason: "invalid-path" })
      continue
    }
    if (change.operation === "delete" && protectedWorkspaceFiles.has(path)) {
      rejected.push({ path, reason: "protected-file" })
      continue
    }
    latestChangeByPath.set(path, { ...change, path })
  }

  return { accepted: Array.from(latestChangeByPath.values()), rejected }
}

export function applyFileChangesToWorkspace(
  files: ProjectFile[] | undefined,
  fileChanges: GenerationResult["fileChanges"] | undefined,
  createdAt: string,
): ProjectFile[] {
  const nextFiles = new Map((files ?? []).map((file) => [file.path, file]))

  for (const change of validateWorkspaceFileChanges(fileChanges).accepted) {
    const normalizedPath = change.path

    if (change.operation === "delete") {
      nextFiles.delete(normalizedPath)
      continue
    }

    const existingFile = nextFiles.get(normalizedPath)
    const content =
      typeof change.content === "string"
        ? change.content
        : (existingFile?.content ?? "")
    const language = change.language || existingFile?.language || "text"
    const normalizedFile: ProjectFile = existingFile
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
      : {
          id: `${normalizedPath}-${createdAt}`,
          path: normalizedPath,
          name: normalizedPath.split("/").pop() ?? normalizedPath,
          extension: normalizedPath.includes(".")
            ? (normalizedPath.split(".").pop()?.toLowerCase() ?? "")
            : "",
          language,
          content,
          createdAt,
          updatedAt: createdAt,
          lastModified: createdAt,
          size: content.length,
          kind: "file",
        }

    nextFiles.set(normalizedPath, normalizedFile)
  }

  return Array.from(nextFiles.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  )
}

function cloneArtifact(
  artifact: ProjectArtifact | GeneratedArtifact | undefined,
): ProjectArtifact | undefined {
  if (!artifact) return undefined
  return {
    ...artifact,
    createdAt: artifact.createdAt ?? new Date().toISOString(),
  }
}

function resolveVersionWorkspaceFiles(
  project: Project,
  version: ProjectVersion | undefined,
): ProjectFile[] | undefined {
  const versionFiles =
    Array.isArray(version?.files) && version.files.length > 0
      ? version.files
      : undefined
  if (versionFiles) return versionFiles

  const projectFiles =
    Array.isArray(project.files) && project.files.length > 0
      ? project.files
      : undefined
  if (projectFiles) return projectFiles

  if (version?.artifact) {
    const derivedFiles = mergeWorkspaceFilesWithArtifact(
      [],
      version.artifact,
      version.createdAt ?? version.timestamp ?? new Date().toISOString(),
    )
    if (derivedFiles.length > 0) return derivedFiles
  }

  return undefined
}

export function appendChatMessageToProject(
  project: Project,
  message: ChatMessage,
  completedAt?: string,
): Project {
  const timestamp = completedAt ?? new Date().toISOString()
  const pendingIndex = project.messages.findIndex(
    (item) => item.role === "assistant" && item.pending,
  )
  const nextMessages =
    message.role === "assistant" && pendingIndex >= 0
      ? project.messages.map((item, index) =>
          index === pendingIndex
            ? { ...item, ...message, pending: false }
            : item,
        )
      : [...project.messages, message]

  return {
    ...project,
    lastEdited: timestamp,
    updatedAt: timestamp,
    messages: nextMessages,
    versions: Array.isArray(project.versions) ? project.versions : [],
  }
}

export function createVersionFromGeneration(
  project: Project,
  prompt: string,
  assistantMessage: string,
  artifact: ProjectArtifact | GeneratedArtifact,
  provenance?: GenerationProvenance,
): { project: Project; version: ProjectVersion } | null {
  if (!artifact) return null
  const now = new Date().toISOString()
  const nextNumber = (project.versions?.length ?? 0) + 1

  const generatedWorkspaceFiles = applyFileChangesToWorkspace(
    mergeWorkspaceFilesWithArtifact(
      project.files,
      artifact as ProjectArtifact,
      now,
    ),
    (artifact as ProjectArtifact & {
      fileChanges?: GenerationResult["fileChanges"]
    }).fileChanges,
    now,
  )
  const workspaceSnapshot = {
    ...project,
    artifact: artifact as ProjectArtifact,
    files: generatedWorkspaceFiles,
  }
  const snapshot: ProjectArtifact = deriveProjectArtifact(
    workspaceSnapshot,
    now,
  )

  const version: ProjectVersion = {
    id: generateId(),
    number: nextNumber,
    label: `v${nextNumber} — ${prompt.slice(0, 40)}`,
    timestamp: now,
    prompt,
    isCurrent: true,
    createdAt: now,
    trigger: {
      type:
        project.versions && project.versions.length > 0
          ? "iteration"
          : "initial-generation",
      prompt,
    },
    assistantMessage,
    artifact: snapshot,
    files: generatedWorkspaceFiles,
    provenance,
  }

  // mark previous versions as not current
  const prior = (project.versions || []).map((v) => ({
    ...v,
    isCurrent: false,
  }))

  const nextProject: Project = {
    ...project,
    artifact: snapshot,
    files: generatedWorkspaceFiles,
    versions: [...prior, version],
    updatedAt: now,
    lastEdited: now,
    status: project.status ?? "DRAFT",
    messages: Array.isArray(project.messages) ? project.messages : [],
    lastGeneration: provenance,
  }

  return { project: nextProject, version }
}

export function restoreVersion(
  project: Project,
  versionId: string,
): Project | null {
  const v = (project.versions || []).find((x) => x.id === versionId)
  if (!v) return null
  const now = new Date().toISOString()
  const updated = project.versions.map((x) => ({
    ...x,
    isCurrent: x.id === versionId,
  }))
  const restoredWorkspaceFiles = resolveVersionWorkspaceFiles(project, v)

  if (!restoredWorkspaceFiles || restoredWorkspaceFiles.length === 0)
    return null

  const restoredProject = {
    ...project,
    artifact: cloneArtifact(
      v.artifact ??
        deriveProjectArtifact(
          { ...project, files: restoredWorkspaceFiles },
          now,
        ),
    ),
    versions: updated,
    updatedAt: now,
    lastEdited: now,
    status: project.status ?? "DRAFT",
    messages: Array.isArray(project.messages) ? project.messages : [],
  }

  return {
    ...restoredProject,
    files: restoredWorkspaceFiles,
    artifact: deriveProjectArtifact(
      { ...restoredProject, files: restoredWorkspaceFiles },
      now,
    ),
  }
}

export function revertFileOperations(
  project: Project,
  operationPaths: string[],
): Project | null {
  const versions = project.versions ?? []
  if (versions.length === 0) return null
  const currentVersion =
    versions.find((v) => v.isCurrent) ?? versions[versions.length - 1]
  const currentIndex = versions.indexOf(currentVersion)
  const previousVersion =
    currentIndex > 0 ? versions[currentIndex - 1] : undefined

  const currentFiles = new Map((project.files ?? []).map((f) => [f.path, f]))
  const previousFiles = previousVersion
    ? new Map(
        (resolveVersionWorkspaceFiles(project, previousVersion) ?? []).map(
          (f) => [f.path, f],
        ),
      )
    : new Map<string, ProjectFile>()

  const operationMap = new Map(
    (currentVersion.provenance?.operations ?? []).map((op) => [
      op.path,
      op.operation,
    ]),
  )

  for (const path of operationPaths) {
    const op = operationMap.get(path)
    if (!op) continue

    if (op === "create") {
      currentFiles.delete(path)
    } else {
      const prevFile = previousFiles.get(path)
      if (prevFile) {
        currentFiles.set(path, {
          ...prevFile,
          updatedAt: new Date().toISOString(),
        })
      } else {
        currentFiles.delete(path)
      }
    }
  }

  const now = new Date().toISOString()
  const nextFiles = Array.from(currentFiles.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  )

  const nextProject = {
    ...project,
    files: nextFiles,
    updatedAt: now,
    lastEdited: now,
  }

  return {
    ...nextProject,
    artifact: deriveProjectArtifact(nextProject, now),
  }
}

export type VersionActionKind = "restore" | "fork"

export function applyVersionAction(
  project: Project,
  versionId: string,
  action: VersionActionKind,
  nameOverride?: string,
): { kind: VersionActionKind; project: Project } | null {
  if (action === "restore") {
    const restored = restoreVersion(project, versionId)
    return restored ? { kind: "restore", project: restored } : null
  }

  const forked = forkProjectFromVersion(project, versionId, nameOverride)
  return forked ? { kind: "fork", project: forked } : null
}

export function forkProjectFromVersion(
  project: Project,
  versionId: string,
  nameOverride?: string,
): Project | null {
  const sourceVersion = (project.versions || []).find((x) => x.id === versionId)
  if (!sourceVersion) return null

  const now = new Date().toISOString()
  const restoredWorkspaceFiles = resolveVersionWorkspaceFiles(
    project,
    sourceVersion,
  )
  const derivedArtifact = restoredWorkspaceFiles
    ? deriveProjectArtifact({ ...project, files: restoredWorkspaceFiles }, now)
    : undefined
  const forkedProject: Project = {
    ...project,
    id: generateId(),
    name: nameOverride?.trim() || `${project.name} (fork)`,
    description:
      `${project.description || "Forked from"} ${sourceVersion.label}`.trim(),
    createdAt: now,
    updatedAt: now,
    lastEdited: now,
    starred: false,
    messages: [...project.messages],
    versions: project.versions.map((version) => ({
      ...version,
      isCurrent: version.id === sourceVersion.id,
    })),
    artifact: cloneArtifact(sourceVersion.artifact ?? derivedArtifact),
    files: restoredWorkspaceFiles,
    status: project.status ?? "DRAFT",
  }

  return forkedProject
}

export function forkProjectFromCurrentVersion(
  project: Project,
  nameOverride?: string,
): Project | null {
  const sourceVersion =
    (project.versions || []).find((version) => version.isCurrent) ??
    project.versions[0]
  if (!sourceVersion) return null

  return forkProjectFromVersion(project, sourceVersion.id, nameOverride)
}

export function mergeVersionActionProject(
  project: Project,
  remoteProject: Partial<Project> & Pick<Project, "id">,
): Project | null {
  if (!remoteProject || remoteProject.id !== project.id) return null

  const normalizedMessages =
    Array.isArray(remoteProject.messages) && remoteProject.messages.length > 0
      ? remoteProject.messages
      : project.messages

  const normalizedVersions =
    Array.isArray(remoteProject.versions) && remoteProject.versions.length > 0
      ? remoteProject.versions.map((version) => {
          const workspaceFiles =
            Array.isArray(version.files) && version.files.length > 0
              ? version.files
              : version.artifact
                ? mergeWorkspaceFilesWithArtifact(
                    [],
                    version.artifact,
                    version.createdAt ??
                      version.timestamp ??
                      new Date().toISOString(),
                  )
                : undefined

          return {
            ...version,
            artifact: version.artifact
              ? cloneArtifact(version.artifact)
              : undefined,
            files: workspaceFiles,
          }
        })
      : project.versions

  const mergedFiles =
    Array.isArray(remoteProject.files) && remoteProject.files.length > 0
      ? remoteProject.files
      : Array.isArray(project.files) && project.files.length > 0
        ? project.files
        : undefined
  const updatedAt =
    remoteProject.updatedAt ??
    remoteProject.lastEdited ??
    project.updatedAt ??
    project.lastEdited
  const lastEdited = remoteProject.lastEdited ?? updatedAt ?? project.lastEdited
  const mergedArtifact = mergedFiles
    ? deriveProjectArtifact(
        { ...project, ...remoteProject, files: mergedFiles },
        updatedAt,
      )
    : remoteProject.artifact
      ? cloneArtifact(remoteProject.artifact)
      : project.artifact

  return {
    ...project,
    ...remoteProject,
    name: remoteProject.name ?? project.name,
    status: remoteProject.status ?? project.status ?? "DRAFT",
    description: remoteProject.description ?? project.description,
    messages: normalizedMessages,
    versions: normalizedVersions,
    files: mergedFiles,
    artifact: mergedArtifact,
    updatedAt,
    lastEdited,
  }
}

export function applyGenerationResultToProject(
  project: Project,
  prompt: string,
  result: GenerationResult,
  completedAt: string,
  options: { addVersion: boolean; mode?: "plan" | "build" },
): Project | null {
  const assistantMessage: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content: result.assistant,
    timestamp: completedAt,
  }

  const artifactSnapshot = result.artifact
    ? { ...result.artifact, createdAt: completedAt }
    : project.artifact

  // Phase 2: Use Antigravity merge engine for deterministic operations
  // Normalize provider operations to deterministic BuildFileOperation[]
  const normalizedOps = result.artifact
    ? normalizeProviderOperations(result.artifact, project.files)
    : []

  // Apply normalized operations with Antigravity merge engine
  const mergeResult = buildAntigravityMerge(
    project.files,
    normalizedOps,
    completedAt,
  )

  // Validate file changes from result and combine with Antigravity results
  const fileChangeValidation = validateWorkspaceFileChanges(result.fileChanges)
  const allRejectedOps = [
    ...mergeResult.rejected,
    ...fileChangeValidation.rejected,
  ]

  // Record full provenance for audit trail, including rejected operations
  const provenance: GenerationProvenance = {
    ...recordMergeProvenance(
      mergeResult,
      prompt,
      result.provider ?? "unknown",
      result.model,
      options.mode ?? "build",
    ),
    // Include rejected file changes in provenance
    rejectedOperations:
      allRejectedOps.length > 0
        ? allRejectedOps.map((r) => ({
            path: r.path,
            reason: r.reason as "invalid-path" | "protected-file",
          }))
        : undefined,
  }

  // Combine Antigravity-applied files with any additional file changes from result
  const mergedWorkspaceFiles = applyFileChangesToWorkspace(
    mergeResult.files,
    result.fileChanges,
    completedAt,
  )

  const workspaceBootstrapProject = {
    ...project,
    artifact: artifactSnapshot,
    files: mergedWorkspaceFiles,
  }

  const nextBaseProject: Project = appendChatMessageToProject(
    workspaceBootstrapProject,
    assistantMessage,
    completedAt,
  )
  const derivedArtifact = deriveProjectArtifact(nextBaseProject, completedAt)

  if (!options.addVersion || !artifactSnapshot) {
    return { ...nextBaseProject, lastGeneration: provenance }
  }

  if (options.mode === "plan") {
    return appendChatMessageToProject(project, assistantMessage, completedAt)
  }

  const existingCurrentVersion = nextBaseProject.versions.find(
    (version) => version.isCurrent,
  )
  // A "placeholder" version is one created when the project was first started
  // but before any real generation produced files — it has no artifact (or an
  // artifact with no real content/files). The first real generation should
  // update such a placeholder in-place so the version count reflects a single
  // initial draft. Once a version holds a real generated artifact, subsequent
  // iterations MUST create a NEW version (so undo/version history accumulates).
  const isPlaceholderVersion =
    existingCurrentVersion &&
    (!existingCurrentVersion.artifact ||
      !existingCurrentVersion.files ||
      existingCurrentVersion.files.length === 0)

  if (existingCurrentVersion && isPlaceholderVersion) {
    const updatedVersions = nextBaseProject.versions.map((version) =>
      version.id === existingCurrentVersion.id
        ? {
            ...version,
            artifact: derivedArtifact,
            files: mergedWorkspaceFiles,
            assistantMessage: result.assistant,
            timestamp: completedAt,
            createdAt: version.createdAt ?? completedAt,
            prompt,
            label: version.label || `v${version.number}`,
            provenance,
          }
        : version,
    )

    return {
      ...nextBaseProject,
      versions: updatedVersions,
      updatedAt: completedAt,
      lastEdited: completedAt,
      artifact: derivedArtifact,
      lastGeneration: provenance,
    }
  }

  const versionResult = createVersionFromGeneration(
    nextBaseProject,
    prompt,
    result.assistant,
    artifactSnapshot,
    provenance,
  )
  if (!versionResult) return nextBaseProject

  return {
    ...versionResult.project,
    messages: nextBaseProject.messages,
    files: versionResult.project.files ?? nextBaseProject.files,
    artifact: deriveProjectArtifact(
      {
        ...versionResult.project,
        files: versionResult.project.files ?? nextBaseProject.files,
      },
      completedAt,
    ),
  }
}

export default {
  createVersionFromGeneration,
  restoreVersion,
  mergeVersionActionProject,
  applyGenerationResultToProject,
  forkProjectFromVersion,
  forkProjectFromCurrentVersion,
  applyVersionAction,
}
