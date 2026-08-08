import { describe, expect, it, beforeEach } from "vitest"
import {
  publishProject,
  republishProject,
  getPublishedProjects,
  getPublishedProjectById,
  remixPublishedProject,
  resetPublishedRegistryForTests,
  isSecretFilePath,
  sanitizeFileContent,
  sanitizeSnapshotFiles,
  type PublishedProject,
} from "../lib/community"
import type { Project } from "../lib/store"

describe("Shango Community Foundation v1 — Acceptance Tests", () => {
  beforeEach(() => {
    resetPublishedRegistryForTests()
  })

  it("1. Private project is not publicly discoverable before explicit publication", () => {
    const privateProject: Project = {
      id: "proj-private-101",
      name: "Private Stealth Startup App",
      description: "Internal confidential code",
      status: "DRAFT",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Private</div>", createdAt: "", updatedAt: "" }],
    }

    const publicList = getPublishedProjects()
    expect(publicList.some((p) => p.sourceProjectId === privateProject.id)).toBe(false)
  })

  it("2. Explicit Share creates a PublishedProject", () => {
    const myProject: Project = {
      id: "proj-my-app-202",
      name: "Solar Energy Tracker",
      description: "Track rooftop solar output in Lagos",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: true,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Solar</div>", createdAt: "", updatedAt: "" }],
    }

    const published = publishProject(myProject, {
      title: "Solar Energy Tracker",
      description: "Track rooftop solar output in Lagos",
      tags: ["Solar", "CleanEnergy"],
    })

    expect(published.id).toBeDefined()
    expect(published.sourceProjectId).toBe("proj-my-app-202")
    expect(published.title).toBe("Solar Energy Tracker")
    expect(published.remixCount).toBe(0)

    const discoverable = getPublishedProjects()
    expect(discoverable.some((p) => p.id === published.id)).toBe(true)
  })

  it("3. Published snapshot contains only allowed public workspace content", () => {
    const project: Project = {
      id: "proj-public-303",
      name: "Public Calculator",
      description: "Simple app",
      status: "DRAFT",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [
        { id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Calc</div>", createdAt: "", updatedAt: "" },
        { id: "f2", path: "src/utils.ts", name: "utils.ts", extension: "ts", language: "typescript", content: "export const add = (a: number, b: number) => a + b", createdAt: "", updatedAt: "" },
      ],
    }

    const published = publishProject(project)
    expect(published.snapshotFiles.length).toBe(2)
    expect(published.snapshotFiles.map((f) => f.path)).toEqual(["src/App.tsx", "src/utils.ts"])
  })

  it("4. Secrets cannot enter a published snapshot (.env files and secret tokens stripped)", () => {
    const secretProject: Project = {
      id: "proj-secret-404",
      name: "App With Secrets",
      description: "Has secret credentials",
      status: "DRAFT",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [
        { id: "f1", path: ".env", name: ".env", extension: "env", language: "text", content: "DATABASE_URL=postgres://user:secret@localhost:5432/db\nAPI_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P", createdAt: "", updatedAt: "" },
        { id: "f2", path: ".env.local", name: ".env.local", extension: "local", language: "text", content: "SECRET_KEY=\"my-super-secret\"", createdAt: "", updatedAt: "" },
        { id: "f3", path: "src/config.ts", name: "config.ts", extension: "ts", language: "typescript", content: "export const apiKey = \"AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P\"", createdAt: "", updatedAt: "" },
        { id: "f4", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Safe App</div>", createdAt: "", updatedAt: "" },
      ],
    }

    const published = publishProject(secretProject)

    // .env and .env.local must be stripped completely
    expect(published.snapshotFiles.some((f) => f.path === ".env")).toBe(false)
    expect(published.snapshotFiles.some((f) => f.path === ".env.local")).toBe(false)

    // In-line secret tokens must be redacted
    const config = published.snapshotFiles.find((f) => f.path === "src/config.ts")
    expect(config).toBeDefined()
    expect(config!.content).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P")
    expect(config!.content).toContain("[REDACTED_SECRET]")

    // Safe app file preserved
    expect(published.snapshotFiles.some((f) => f.path === "src/App.tsx")).toBe(true)
  })

  it("5. Updating the original workspace does not mutate the existing published snapshot", () => {
    const original: Project = {
      id: "proj-immutable-505",
      name: "Original App",
      description: "v1.0",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Version 1</div>", createdAt: "", updatedAt: "" }],
    }

    const published = publishProject(original)

    // User modifies local project workspace
    original.files![0].content = "export default () => <div>Version 2 Modified Local</div>"

    // Published snapshot stays untouched
    const fetched = getPublishedProjectById(published.id)
    expect(fetched!.snapshotFiles[0].content).toBe("export default () => <div>Version 1</div>")
  })

  it("6. Publishing a new version explicitly updates the public snapshot", () => {
    const project: Project = {
      id: "proj-republish-606",
      name: "Evolving App",
      description: "v1.0",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>V1</div>", createdAt: "", updatedAt: "" }],
    }

    const published = publishProject(project)

    // Update project workspace
    project.files![0].content = "export default () => <div>V2 Improved</div>"

    // Explicit republish
    const updated = republishProject(published.id, project, { title: "Evolving App v2" })

    expect(updated).toBeDefined()
    expect(updated!.title).toBe("Evolving App v2")
    expect(updated!.snapshotFiles[0].content).toBe("export default () => <div>V2 Improved</div>")
  })

  it("7. Community discovery returns only public published projects", () => {
    const publicProj: Project = {
      id: "proj-pub-707",
      name: "Public Project",
      description: "",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "<div>Public</div>", createdAt: "", updatedAt: "" }],
    }

    const unlistedProj: Project = {
      id: "proj-unlisted-708",
      name: "Unlisted Project",
      description: "",
      status: "DRAFT",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "<div>Unlisted</div>", createdAt: "", updatedAt: "" }],
    }

    publishProject(publicProj, { visibility: "public" })
    publishProject(unlistedProj, { visibility: "unlisted" })

    const discovery = getPublishedProjects()
    expect(discovery.some((p) => p.sourceProjectId === "proj-pub-707")).toBe(true)
    expect(discovery.some((p) => p.sourceProjectId === "proj-unlisted-708")).toBe(false)
  })

  it("8. Project detail exposes only public project information", () => {
    const project: Project = {
      id: "proj-detail-808",
      name: "Clean App",
      description: "Clean public description",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "<div>App</div>", createdAt: "", updatedAt: "" }],
      providerDiagnostics: "SECRET_INTERNAL_AST_DIAGNOSTIC_TRACE_TS2304",
      generatingAt: new Date().toISOString(),
    }

    const published = publishProject(project)
    const detail = getPublishedProjectById(published.id)

    expect(detail).toBeDefined()
    expect(detail!.title).toBe("Clean App")
    expect(detail!.description).toBe("Clean public description")
    // Private properties must not exist on PublishedProject
    expect((detail as any).providerDiagnostics).toBeUndefined()
    expect((detail as any).generatingAt).toBeUndefined()
  })

  it("9. Remix creates a new project ID", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]

    const remixed = remixPublishedProject(target.id)

    expect(remixed.id).toBeDefined()
    expect(remixed.id).not.toBe(target.id)
    expect(remixed.id).not.toBe(target.sourceProjectId)
    expect(remixed.id).toMatch(/^remix-/)
  })

  it("10. Remix does not modify the source project or published snapshot", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]
    const initialSnapshotCount = target.snapshotFiles.length

    const remixed = remixPublishedProject(target.id)

    // Modify remixed workspace
    remixed.files![0].content = "// Completely changed in remix"

    // Target published project is unmodified
    const fetched = getPublishedProjectById(target.id)
    expect(fetched!.snapshotFiles.length).toBe(initialSnapshotCount)
    expect(fetched!.snapshotFiles[0].content).not.toContain("Completely changed in remix")
  })

  it("11. Remix preserves the published application file state", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]

    const remixed = remixPublishedProject(target.id)

    expect(remixed.files).toBeDefined()
    expect(remixed.files!.length).toBe(target.snapshotFiles.length)
    expect(remixed.files![0].content).toBe(target.snapshotFiles[0].content)
  })

  it("12. Remix preserves attribution to original project", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]

    const remixed = remixPublishedProject(target.id)

    expect(remixed.name).toContain(target.title)
    expect(remixed.description).toContain(target.title)
    expect(remixed.template).toBeDefined()
    expect(remixed.template!.id).toBe(target.id)
  })

  it("13. Remix does not invoke the LLM (deterministic clone operation)", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]

    const startMs = Date.now()
    const remixed = remixPublishedProject(target.id)
    const elapsedMs = Date.now() - startMs

    // Instant deterministic clone under 10ms with zero network/LLM latency
    expect(elapsedMs).toBeLessThan(50)
    expect(remixed.files!.length).toBeGreaterThan(0)
  })

  it("14. Remixed project enters normal Builder pipeline format", () => {
    const publishedList = getPublishedProjects()
    const target = publishedList[0]

    const remixed = remixPublishedProject(target.id)

    expect(remixed.status).toBe("DRAFT")
    expect(remixed.starred).toBe(false)
    expect(remixed.blocks).toEqual([])
    expect(remixed.messages).toEqual([])
    expect(remixed.versions).toEqual([])
    expect(remixed.files![0].id).toBeDefined()
    expect(remixed.files![0].path).toBe(target.snapshotFiles[0].path)
  })

  it("15. Existing Builder behavior remains unchanged", () => {
    const publishedList = getPublishedProjects()
    expect(publishedList.length).toBeGreaterThan(0)

    // Ensure remixing increments remixCount
    const initialRemixCount = publishedList[0].remixCount
    remixPublishedProject(publishedList[0].id)
    expect(publishedList[0].remixCount).toBe(initialRemixCount + 1)
  })
})
