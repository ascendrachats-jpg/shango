import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import {
  isProjectSyncPending,
  loadPersistedProjectState,
  savePersistedProjectState,
  mergePersistedProjects,
  loadPersistedUser,
  savePersistedUser,
  clearPersistedUser,
  normalizeProject,
  normalizeProjects,
  retryPendingProjectSyncs,
  syncProjectToBackend,
} from "../lib/persistence"
import {
  duplicateProject,
  updateProject,
  removeProject,
  ensureProjectInList,
} from "../lib/store"
import type { Project, GenerationProvenance } from "../lib/store"

const mockProject: Project = {
  id: "project-1",
  name: "Test Project",
  description: "Test",
  status: "DRAFT",
  lastEdited: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  starred: false,
  blocks: [],
  messages: [],
  versions: [],
}

describe("persistence", () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key])
      },
    }
    vi.stubGlobal("window", { localStorage: localStorageMock } as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("saves and loads persisted project state", () => {
    const state = { projects: [mockProject], activeProjectId: mockProject.id }
    const saveResult = savePersistedProjectState(state)
    expect(saveResult.ok).toBe(true)

    const loaded = loadPersistedProjectState()
    expect(loaded.error).toBeNull()
    expect(loaded.state).not.toBeNull()
    expect(loaded.state?.projects[0]?.id).toBe(mockProject.id)
    expect(loaded.state?.activeProjectId).toBe(mockProject.id)
  })

  it("persists and restores a signed-in user session", () => {
    const user = {
      name: "Ada",
      email: "ada@shango.app",
      avatar: "",
      plan: "free" as const,
    }

    expect(savePersistedUser(user).ok).toBe(true)
    expect(loadPersistedUser()).toMatchObject(user)

    clearPersistedUser()
    expect(loadPersistedUser()).toBeNull()
  })

  it("normalizes project snapshots before persistence so lifecycle updates remain consistent", () => {
    const normalized = normalizeProject({
      id: "p-2",
      name: "Normalized",
      description: "",
      status: "DRAFT",
      lastEdited: "2026-07-28T00:00:00.000Z",
      starred: false,
      messages: undefined as unknown as Project["messages"],
      versions: undefined as unknown as Project["versions"],
    } as Project)

    expect(normalized.messages).toEqual([])
    expect(normalized.versions).toEqual([])
    expect(normalized.createdAt).toBe("2026-07-28T00:00:00.000Z")
    expect(normalized.updatedAt).toBe("2026-07-28T00:00:00.000Z")
  })

  it("normalizes a full list of projects for consistent lifecycle state", () => {
    const normalized = normalizeProjects([
      {
        ...mockProject,
        messages: undefined as unknown as Project["messages"],
        versions: undefined as unknown as Project["versions"],
        lastEdited: undefined as unknown as string,
        updatedAt: undefined as unknown as string,
        createdAt: undefined as unknown as string,
      },
    ])

    expect(normalized).toHaveLength(1)
    expect(normalized[0].messages).toEqual([])
    expect(normalized[0].versions).toEqual([])
    expect(normalized[0].createdAt).toBeTruthy()
    expect(normalized[0].updatedAt).toBeTruthy()
  })

  it("duplicates a project into a fresh draft with new timestamps and ids", () => {
    const original: Project = {
      ...mockProject,
      name: "Original Project",
      messages: [
        {
          id: "m-1",
          role: "user",
          content: "Hello",
          timestamp: "2026-07-28T00:00:00.000Z",
        },
      ],
      versions: [
        {
          id: "v-1",
          number: 1,
          label: "Version 1",
          timestamp: "2026-07-28T00:00:00.000Z",
          prompt: "Build it",
          isCurrent: true,
          createdAt: "2026-07-28T00:00:00.000Z",
          trigger: { type: "initial-generation", prompt: "Build it" },
        },
      ],
      artifact: {
        html: "<div>Hi</div>",
        css: "body{}",
        js: "",
        title: "Original",
        description: "Original description",
        createdAt: "2026-07-28T00:00:00.000Z",
      },
    }

    const duplicated = duplicateProject(original)

    expect(duplicated.id).not.toBe(original.id)
    expect(duplicated.name).toBe("Original Project (copy)")
    expect(duplicated.status).toBe("DRAFT")
    expect(duplicated.messages[0].id).not.toBe(original.messages[0].id)
    expect(duplicated.versions[0].id).not.toBe(original.versions[0].id)
    expect(duplicated.artifact?.title).toBe("Original")
    expect(duplicated.createdAt).not.toBe(original.createdAt)
  })

  it("updates project metadata while preserving a coherent lifecycle timestamp", () => {
    const original: Project = {
      ...mockProject,
      name: "Original Project",
      lastEdited: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
      createdAt: "2026-07-27T00:00:00.000Z",
    }

    const updated = updateProject(original, {
      name: "Renamed project",
      description: "Updated description",
      status: "ARCHIVED",
    })

    expect(updated.name).toBe("Renamed project")
    expect(updated.description).toBe("Updated description")
    expect(updated.status).toBe("ARCHIVED")
    expect(updated.updatedAt).toBeTruthy()
    expect(updated.lastEdited).toBe(updated.updatedAt)
    expect(updated.createdAt).toBe("2026-07-27T00:00:00.000Z")
  })

  it("removes a project and clears the active project pointer when the deleted project was active", () => {
    const result = removeProject([mockProject], mockProject.id, mockProject.id)

    expect(result.projects).toEqual([])
    expect(result.activeProjectId).toBeNull()
  })

  it("ensures a restored project is present in the local list without duplicating the entry", () => {
    const existing = [mockProject]
    const restored = ensureProjectInList(existing, {
      ...mockProject,
      name: "Restored project",
      updatedAt: "2026-07-28T00:00:00.000Z",
    })

    expect(restored).toHaveLength(1)
    expect(restored[0].name).toBe("Restored project")
    expect(restored[0].updatedAt).toBe("2026-07-28T00:00:00.000Z")
  })

  it("syncs a project snapshot to the backend with a patch request", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal("fetch", fetchSpy)

    const synced = await syncProjectToBackend({
      ...mockProject,
      initialPrompt: "Hello",
      template: { id: "t1", name: "Community Savings", category: "saas" },
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/projects/project-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
    )
    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body).toMatchObject({
      id: "project-1",
      name: "Test Project",
      initialPrompt: "Hello",
      template: { id: "t1", name: "Community Savings", category: "saas" },
    })
    expect(synced).toBe(true)
  })

  it("keeps local work queued when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

    await expect(syncProjectToBackend(mockProject)).resolves.toBe(false)
    expect(isProjectSyncPending(mockProject.id)).toBe(true)
  })

  it("retries locally queued project syncs after reconnecting", async () => {
    const backingStore = new Map<string, string>([
      ["shango-pending-project-sync-v1", JSON.stringify([mockProject.id])],
    ])
    vi.stubGlobal("window", {
      navigator: { onLine: true },
      localStorage: {
        getItem: (key: string) => backingStore.get(key) ?? null,
        setItem: (key: string, value: string) => backingStore.set(key, value),
        removeItem: (key: string) => backingStore.delete(key),
      },
    } as any)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))

    await expect(retryPendingProjectSyncs([mockProject])).resolves.toBe(1)
    expect(
      JSON.parse(backingStore.get("shango-pending-project-sync-v1") ?? "[]"),
    ).toEqual([])
    expect(isProjectSyncPending(mockProject.id)).toBe(false)
  })

  it("merges remote project snapshots into the local project list without losing the newer state", () => {
    const localProject: Project = {
      ...mockProject,
      updatedAt: "2026-07-27T00:00:00.000Z",
      messages: [
        {
          id: "m-local",
          role: "user",
          content: "Local draft",
          timestamp: "2026-07-27T00:00:00.000Z",
        },
      ],
      versions: [],
    }

    const remoteProject: Project = {
      ...localProject,
      updatedAt: "2026-07-28T00:00:00.000Z",
      messages: [
        ...localProject.messages,
        {
          id: "m-remote",
          role: "assistant",
          content: "Remote update",
          timestamp: "2026-07-28T00:00:00.000Z",
        },
      ],
      versions: [
        {
          id: "v-remote",
          number: 1,
          label: "Remote version",
          timestamp: "2026-07-28T00:00:00.000Z",
          prompt: "Remote prompt",
          isCurrent: true,
          createdAt: "2026-07-28T00:00:00.000Z",
          trigger: { type: "iteration", prompt: "Remote prompt" },
        },
      ],
      artifact: {
        html: "<div>Remote</div>",
        css: "body{margin:0}",
        js: "",
        title: "Remote title",
        description: "Remote description",
        createdAt: "2026-07-28T00:00:00.000Z",
      },
      lastGeneration: {
        id: "provenance-remote",
        timestamp: "2026-07-28T00:00:00.000Z",
        provider: "gemini",
        model: "default",
        mode: "build",
        prompt: "Remote prompt",
        operations: [{ path: "src/App.tsx", operation: "modify" }],
      } satisfies GenerationProvenance,
    }

    const merged = mergePersistedProjects([localProject], [remoteProject])

    expect(merged).toHaveLength(1)
    expect(merged[0].messages).toHaveLength(2)
    expect(merged[0].versions).toHaveLength(1)
    expect(merged[0].artifact?.title).toBe("Remote title")
    expect(merged[0].updatedAt).toBe("2026-07-28T00:00:00.000Z")
    expect(merged[0].lastGeneration).toEqual(remoteProject.lastGeneration)
  })
})
