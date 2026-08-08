import { beforeEach, describe, expect, it } from "vitest"
import { createProjectStore, resetProjectStore } from "../../server/projects"

const UID = "test-user-1"

describe("project API store", () => {
  beforeEach(() => {
    resetProjectStore()
  })

  it("creates, lists, updates, and duplicates projects", () => {
    const store = createProjectStore()

    const created = store.createProject(UID, {
      prompt: "Build a booking app",
      mode: "build",
      model: "default",
    })
    expect(created.name).toContain("Booking App")

    const listed = store.listProjects(UID)
    expect(listed).toHaveLength(1)

    const updated = store.updateProject(UID, created.id, {
      name: "Booking App v2",
      status: "LIVE",
    })
    expect(updated?.name).toBe("Booking App v2")
    expect(updated?.status).toBe("DRAFT")

    const duplicated = store.duplicateProject(UID, created.id)
    expect(duplicated?.id).not.toBe(created.id)
    expect(duplicated?.name).toContain("copy")
  })

  it("scopes projects per user — user B cannot see user A projects", () => {
    const store = createProjectStore()
    store.createProject(UID, {
      prompt: "Build a booking app",
      mode: "build",
      model: "default",
    })
    expect(store.listProjects("other-user").length).toBe(0)
  })

  it("returns isolated project snapshots so callers cannot mutate store state", () => {
    const store = createProjectStore()
    const created = store.createProject(UID, {
      prompt: "Build a learning portal",
      mode: "build",
      model: "default",
    })
    const snapshot = store.getProject(UID, created.id)!
    snapshot.name = "Mutated outside the store"
    snapshot.messages[0]!.content = "Mutated message"
    snapshot.versions[0]!.artifact!.title = "Mutated artifact"

    const current = store.getProject(UID, created.id)!
    expect(current.name).toContain("Learning Portal")
    expect(current.messages[0]?.content).toBe("Build a learning portal")
    expect(current.versions[0]?.artifact?.title).not.toBe("Mutated artifact")
  })

  it("copies caller-owned write payloads before retaining them", () => {
    const store = createProjectStore()
    const created = store.createProject(UID, {
      prompt: "Build an operations dashboard",
      mode: "build",
      model: "default",
    })
    const updates = {
      files: [
        {
          id: "app",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "export default function App() { return null }",
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      ],
      lastGeneration: {
        id: "build-safe",
        timestamp: created.updatedAt,
        provider: "test",
        mode: "build" as const,
        prompt: "Build an operations dashboard",
        operations: [{ path: "src/App.tsx", operation: "modify" as const }],
      },
    }
    store.updateProject(UID, created.id, updates)
    updates.files[0]!.content = "mutated outside store"
    updates.lastGeneration.operations[0]!.path = "../escape.ts"

    const current = store.getProject(UID, created.id)!
    expect(current.files?.[0]?.content).toContain("return null")
    expect(current.lastGeneration?.operations[0]?.path).toBe("src/App.tsx")
  })

  it("restores a version and forks from it", () => {
    const store = createProjectStore()

    const project = store.createProject(UID, {
      prompt: "Build a dashboard",
      mode: "build",
      model: "default",
    })
    const versionId = project.versions[0]?.id
    expect(versionId).toBeDefined()
    const versionFiles = [
      {
        id: "legacy-app",
        path: "src/App.tsx",
        name: "App.tsx",
        extension: "tsx",
        language: "tsx",
        content: "export default function App() { return <main>Legacy</main> }",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    ]
    store.updateProject(UID, project.id, {
      files: [
        {
          ...versionFiles[0]!,
          id: "current-app",
          content:
            "export default function App() { return <main>Current</main> }",
        },
      ],
      versions: project.versions.map((version) => ({
        ...version,
        files: versionFiles,
      })),
    })

    const restored = store.restoreVersion(UID, project.id, versionId!)
    expect(restored?.artifact).toBeDefined()
    expect(restored?.files?.[0]?.content).toContain("Legacy")

    const forked = store.forkVersion(
      UID,
      project.id,
      versionId!,
      "Dashboard fork",
    )
    expect(forked?.name).toBe("Dashboard fork")
    expect(forked?.id).not.toBe(project.id)
    expect(forked?.files?.[0]?.content).toContain("Legacy")
  })

  it("upserts a project from a client payload and syncs an array of projects", () => {
    const store = createProjectStore()

    const created = store.createProject(UID, {
      prompt: "Build a support workspace",
      mode: "build",
      model: "default",
    })
    const synced = store.upsertProject(UID, {
      id: created.id,
      name: "Support Workspace",
      description: "Updated from client sync",
      status: "LIVE",
      lastEdited: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      createdAt: created.createdAt,
      starred: true,
      messages: created.messages,
      versions: created.versions,
      artifact: created.artifact,
      providerDiagnostics: "Synced",
      files: [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "export default function App() {}",
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      ],
      lastGeneration: {
        id: "build-1",
        timestamp: created.updatedAt,
        provider: "test",
        mode: "build",
        prompt: "Build a support workspace",
        operations: [{ path: "src/App.tsx", operation: "modify" }],
        rejectedOperations: [
          { path: "package.json", reason: "protected-file" },
        ],
      },
      template: {
        id: "t-community-savings",
        name: "Community Savings",
        category: "saas",
      },
    })

    expect(synced?.name).toBe("Support Workspace")
    expect(store.getProject(UID, created.id)?.status).toBe("DRAFT")
    expect(store.getProject(UID, created.id)?.files?.[0]?.path).toBe(
      "src/App.tsx",
    )
    expect(
      store.getProject(UID, created.id)?.lastGeneration?.operations,
    ).toEqual([{ path: "src/App.tsx", operation: "modify" }])
    expect(
      store.getProject(UID, created.id)?.lastGeneration?.rejectedOperations,
    ).toEqual([{ path: "package.json", reason: "protected-file" }])
    expect(store.getProject(UID, created.id)?.template).toEqual({
      id: "t-community-savings",
      name: "Community Savings",
      category: "saas",
    })

    const syncedProjects = store.syncProjects(UID, [
      {
        id: "remote-1",
        name: "Remote project",
        description: "Imported from remote sync",
        status: "DRAFT",
        lastEdited: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        createdAt: "2024-01-02T00:00:00.000Z",
        starred: false,
        messages: [],
        versions: [],
      },
    ])

    expect(syncedProjects).toHaveLength(1)
    expect(store.listProjects(UID)[0]?.id).toBe("remote-1")
  })
})
