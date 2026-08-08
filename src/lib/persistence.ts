import { type Project } from "./store"
import { deriveProjectArtifact } from "./workspace"

export interface PersistedProjectState {
  projects: Project[]
  activeProjectId: string | null
}

export interface PersistedUser {
  name: string
  email: string
  avatar?: string
  plan: "free" | "pro"
}

const STORAGE_KEY = "shango-project-state-v1"
const USER_STORAGE_KEY = "shango-user-session-v1"
const PENDING_SYNC_STORAGE_KEY = "shango-pending-project-sync-v1"
export const PROJECT_SYNC_QUEUE_EVENT = "shango-project-sync-queue"

function getPendingSyncProjectIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(
      window.localStorage.getItem(PENDING_SYNC_STORAGE_KEY) ?? "[]",
    )
    return Array.isArray(value)
      ? value.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : []
  } catch {
    return []
  }
}

function setPendingSyncProjectIds(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      PENDING_SYNC_STORAGE_KEY,
      JSON.stringify([...new Set(ids)]),
    )
  } catch {
    /* local saving remains best effort */
  }
}

function notifyProjectSyncQueueChanged(): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof Event === "undefined"
  )
    return
  window.dispatchEvent(new Event(PROJECT_SYNC_QUEUE_EVENT))
}

function markProjectSyncPending(projectId: string): void {
  setPendingSyncProjectIds([...getPendingSyncProjectIds(), projectId])
  notifyProjectSyncQueueChanged()
}

function clearProjectSyncPending(projectId: string): void {
  setPendingSyncProjectIds(
    getPendingSyncProjectIds().filter((id) => id !== projectId),
  )
  notifyProjectSyncQueueChanged()
}

export function isProjectSyncPending(projectId: string | undefined): boolean {
  return Boolean(projectId && getPendingSyncProjectIds().includes(projectId))
}

export function normalizeProject(project: Project): Project {
  const fallbackTimestamp = new Date().toISOString()
  const safeLastEdited =
    project.lastEdited ??
    project.updatedAt ??
    project.createdAt ??
    fallbackTimestamp
  const safeUpdatedAt = project.updatedAt ?? safeLastEdited
  const safeCreatedAt = project.createdAt ?? safeUpdatedAt
  const safeMessages = Array.isArray(project.messages) ? project.messages : []
  const safeVersions = Array.isArray(project.versions) ? project.versions : []
  const normalizedFiles = Array.isArray(project.files)
    ? project.files
    : undefined
  const normalizedArtifact =
    normalizedFiles && normalizedFiles.length > 0
      ? deriveProjectArtifact(
          { ...project, files: normalizedFiles },
          safeUpdatedAt,
        )
      : (project.artifact ?? undefined)

  return {
    ...project,
    updatedAt: safeUpdatedAt,
    createdAt: safeCreatedAt,
    messages: safeMessages,
    versions: safeVersions,
    lastEdited: safeLastEdited,
    files: normalizedFiles,
    artifact: normalizedArtifact,
    providerDiagnostics: project.providerDiagnostics ?? undefined,
  }
}

export function normalizeProjects(projects: Project[]): Project[] {
  return projects.map(normalizeProject)
}

// Threshold (ms) within which a locally generating project is considered
// in-flight and immune from remote overwrites (10 minutes).
const IN_FLIGHT_WINDOW_MS = 600_000

/** Merge two arrays of items that each have a unique `id` field.
 *  Local items take precedence; remote items whose id is absent locally are appended. */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>(local.map((item) => [item.id, item]))
  for (const remoteItem of remote) {
    if (!byId.has(remoteItem.id)) {
      byId.set(remoteItem.id, remoteItem)
    }
  }
  return Array.from(byId.values())
}

export function mergePersistedProjects(
  localProjects: Project[],
  remoteProjects: Project[],
): Project[] {
  const byId = new Map<string, Project>()
  const now = Date.now()

  // Pass 1 — seed map with normalized local projects (local is canonical).
  for (const project of localProjects) {
    byId.set(project.id, normalizeProject(project))
  }

  // Pass 2 — integrate remote projects.
  for (const remoteProject of remoteProjects) {
    const normalizedRemote = normalizeProject(remoteProject)
    const existing = byId.get(normalizedRemote.id)

    // Remote-only: add without touching local state.
    if (!existing) {
      byId.set(normalizedRemote.id, normalizedRemote)
      continue
    }

    // Guardrail: In-flight protection.
    // If the local project has a generatingAt timestamp within the last
    // IN_FLIGHT_WINDOW_MS milliseconds, it is actively being generated.
    // Preserve local state completely — do not apply remote snapshot.
    if (existing.generatingAt) {
      const generatingMs = now - new Date(existing.generatingAt).getTime()
      if (generatingMs >= 0 && generatingMs < IN_FLIGHT_WINDOW_MS) {
        // Local project is in-flight. Skip remote update entirely.
        continue
      }
    }

    // Conflict resolution: compare updatedAt timestamps.
    // ISO 8601 strings are safely comparable as strings.
    const existingUpdatedAt = existing.updatedAt ?? existing.lastEdited ?? ""
    const remoteUpdatedAt =
      normalizedRemote.updatedAt ?? normalizedRemote.lastEdited ?? ""
    const shouldPreferRemote = remoteUpdatedAt > existingUpdatedAt

    if (!shouldPreferRemote) {
      // Local is newer or equal — preserve entirely.
      continue
    }

    // Remote is definitively newer: merge explicitly, field by field.
    // Arrays are merged by unique ID (additive union) — never replaced wholesale.
    const merged: Project = {
      // Identity — local always wins
      id: existing.id,
      createdAt: existing.createdAt ?? normalizedRemote.createdAt,
      // Metadata — remote wins (it is newer)
      name: normalizedRemote.name ?? existing.name,
      description: normalizedRemote.description ?? existing.description,
      status: normalizedRemote.status ?? existing.status,
      starred: normalizedRemote.starred ?? existing.starred,
      initialPrompt: existing.initialPrompt ?? normalizedRemote.initialPrompt,
      thumbnail: normalizedRemote.thumbnail ?? existing.thumbnail,
      template: existing.template ?? normalizedRemote.template,
      // Timestamps — remote wins
      updatedAt: normalizedRemote.updatedAt ?? existing.updatedAt,
      lastEdited: normalizedRemote.lastEdited ?? existing.lastEdited,
      // Arrays — non-destructive ID-union (local items kept, remote items appended if new)
      blocks: mergeById(existing.blocks ?? [], normalizedRemote.blocks ?? []),
      messages: mergeById(existing.messages, normalizedRemote.messages),
      versions: mergeById(existing.versions, normalizedRemote.versions),
      files:
        existing.files && normalizedRemote.files
          ? mergeById(existing.files, normalizedRemote.files)
          : (existing.files ?? normalizedRemote.files),
      // Artifact — prefer whichever is newer by createdAt
      artifact:
        normalizedRemote.artifact && existing.artifact
          ? normalizedRemote.artifact.createdAt >= existing.artifact.createdAt
            ? normalizedRemote.artifact
            : existing.artifact
          : (existing.artifact ?? normalizedRemote.artifact),
      // Diagnostics — remote can supplement local
      providerDiagnostics:
        normalizedRemote.providerDiagnostics ?? existing.providerDiagnostics,
      // Provenance — remote wins (it is newer), with local fallback
      lastGeneration:
        normalizedRemote.lastGeneration ?? existing.lastGeneration,
      // Never copy generatingAt from remote — only local runtime sets it
      generatingAt: existing.generatingAt,
    }

    byId.set(existing.id, merged)
  }

  return Array.from(byId.values())
}

export function buildPersistedProjectState(
  projects: Project[],
  activeProjectId: string | null,
): PersistedProjectState {
  const normalizedProjects = normalizeProjects(projects)
  const resolvedActiveProjectId =
    activeProjectId &&
    normalizedProjects.some((project) => project.id === activeProjectId)
      ? activeProjectId
      : null

  return {
    projects: normalizedProjects,
    activeProjectId: resolvedActiveProjectId,
  }
}

export function saveProjectStateSnapshot(
  projects: Project[],
  activeProjectId: string | null,
): { ok: true } | { ok: false; error: string } {
  return savePersistedProjectState(
    buildPersistedProjectState(projects, activeProjectId),
  )
}

export function loadPersistedProjectState(): {
  state: PersistedProjectState | null
  error: string | null
} {
  if (typeof window === "undefined") return { state: null, error: null }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: null, error: null }

    const parsed = JSON.parse(raw) as Partial<PersistedProjectState>
    if (!parsed || !Array.isArray(parsed.projects)) {
      return { state: null, error: null }
    }

    return {
      state: {
        projects: normalizeProjects(parsed.projects as Project[]),
        activeProjectId:
          typeof parsed.activeProjectId === "string" ||
          parsed.activeProjectId === null
            ? parsed.activeProjectId
            : null,
      },
      error: null,
    }
  } catch (error) {
    return {
      state: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load saved projects.",
    }
  }
}

export function savePersistedProjectState(
  state: PersistedProjectState,
): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "Persistence is unavailable in this environment.",
    }
  }

  try {
    const payload = JSON.stringify({
      projects: normalizeProjects(state.projects),
      activeProjectId: state.activeProjectId,
    })
    try {
      window.localStorage.setItem(STORAGE_KEY, payload)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save your project changes.",
    }
  }
}

export function savePersistedUser(
  user: PersistedUser | null,
): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "Persistence is unavailable in this environment.",
    }
  }

  try {
    if (!user) {
      window.localStorage.removeItem(USER_STORAGE_KEY)
      return { ok: true }
    }

    const payload = JSON.stringify(user)
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, payload)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save your session.",
    }
  }
}

export function loadPersistedUser(): PersistedUser | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PersistedUser>
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null
    }

    return {
      name: parsed.name,
      email: parsed.email,
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : undefined,
      plan: parsed.plan === "pro" ? "pro" : "free",
    }
  } catch {
    return null
  }
}

export async function syncProjectToBackend(project: Project): Promise<boolean> {
  if (typeof window === "undefined" || window.navigator?.onLine === false) {
    markProjectSyncPending(project.id)
    return false
  }

  const normalized = normalizeProject(project)
  const payload = {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    status: normalized.status,
    messages: normalized.messages,
    versions: normalized.versions,
    initialPrompt: normalized.initialPrompt,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    lastEdited: normalized.lastEdited,
    artifact: normalized.artifact,
    files: normalized.files,
    providerDiagnostics: normalized.providerDiagnostics,
    lastGeneration: normalized.lastGeneration,
    template: normalized.template,
  }

  try {
    const response = await fetch(
      `/api/projects/${encodeURIComponent(normalized.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      },
    )
    // 401 = unauthenticated — do not queue for retry, it will never succeed
    // until the user signs in, at which point the session bootstrap re-syncs.
    if (response.status === 401) return false
    if (response.ok) clearProjectSyncPending(project.id)
    else markProjectSyncPending(project.id)
    return response.ok
  } catch {
    markProjectSyncPending(project.id)
    return false
  }
}

export async function retryPendingProjectSyncs(
  projects: Project[],
): Promise<number> {
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const pending = getPendingSyncProjectIds()
  const results = await Promise.all(
    pending.map((id) => {
      const project = projectsById.get(id)
      return project ? syncProjectToBackend(project) : Promise.resolve(false)
    }),
  )
  return results.filter(Boolean).length
}

export function clearPersistedUser(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(USER_STORAGE_KEY)
}
