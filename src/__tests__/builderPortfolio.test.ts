import { describe, expect, it, beforeEach } from "vitest"
import {
  createBuilderProfile,
  updateBuilderProfile,
  getBuilderProfile,
  getBuilderProfileByOwnerId,
  getDiscoverableBuilderProfiles,
  getBuilderPortfolio,
  publishProject,
  getPublishedProjects,
  getPublishedProjectById,
  remixPublishedProject,
  resetPublishedRegistryForTests,
  type BuilderProfile,
  type PublishedProject,
} from "../lib/community"
import type { Project } from "../lib/store"

describe("Shango Community Slice 2 — Builder Portfolios Acceptance Tests", () => {
  beforeEach(() => {
    resetPublishedRegistryForTests()
  })

  it("1. Builder profile can be created", () => {
    const profile = createBuilderProfile({
      username: "kofi",
      displayName: "Kofi Mensah",
      bio: "Building mobile applications for Accra transit",
      school: "Kwame Nkrumah University",
      location: "Accra, Ghana",
      visibility: "public",
    })

    expect(profile.id).toBeDefined()
    expect(profile.username).toBe("kofi")
    expect(profile.displayName).toBe("Kofi Mensah")
    expect(profile.school).toBe("Kwame Nkrumah University")
  })

  it("2. Builder profile can be retrieved by username", () => {
    createBuilderProfile({
      username: "fatima",
      displayName: "Fatima B.",
      bio: "Data science and web developer",
      visibility: "public",
    })

    const fetched = getBuilderProfile("fatima")
    expect(fetched).toBeDefined()
    expect(fetched!.displayName).toBe("Fatima B.")
  })

  it("3. Builder profile can be retrieved by owner ID", () => {
    const profile = createBuilderProfile({
      ownerId: "owner-99",
      username: "zane",
      displayName: "Zane O.",
      visibility: "public",
    })

    const fetched = getBuilderProfileByOwnerId("owner-99")
    expect(fetched).toBeDefined()
    expect(fetched!.username).toBe("zane")
  })

  it("4. Explicitly published projects appear in the owner's portfolio", () => {
    const profile = createBuilderProfile({
      ownerId: "owner-tobi-100",
      username: "tobi_dev",
      displayName: "Tobi Dev",
      visibility: "public",
    })

    const myProject: Project = {
      id: "proj-tobi-pub-1",
      name: "Lagos Bus Tracker",
      description: "Live BRT route tracking",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>Bus Tracker</div>", createdAt: "", updatedAt: "" }],
    }

    publishProject(myProject, {
      title: "Lagos Bus Tracker",
      ownerId: profile.ownerId,
      ownerName: profile.displayName,
    })

    const portfolio = getBuilderPortfolio("tobi_dev")
    expect(portfolio.length).toBeGreaterThan(0)
    expect(portfolio.some((p) => p.title === "Lagos Bus Tracker")).toBe(true)
  })

  it("5. Private projects never appear in the portfolio", () => {
    const profile = createBuilderProfile({
      ownerId: "owner-stealth-101",
      username: "stealth_dev",
      displayName: "Stealth Dev",
      visibility: "public",
    })

    // Project exists in Builder state but is NEVER published via publishProject()
    const privateProject: Project = {
      id: "proj-secret-draft",
      name: "Stealth Unannounced Product",
      description: "Confidential",
      status: "DRAFT",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "<div>Private</div>", createdAt: "", updatedAt: "" }],
    }

    const portfolio = getBuilderPortfolio("stealth_dev")
    expect(portfolio.some((p) => p.title === privateProject.name)).toBe(false)
  })

  it("6. Unpublished projects never appear in the portfolio", () => {
    const portfolio = getBuilderPortfolio("amara")
    expect(portfolio.length).toBe(0)
  })

  it("7. Updating original workspace does not mutate the published portfolio snapshot", () => {
    const profile = createBuilderProfile({
      ownerId: "owner-kwame-102",
      username: "kwame",
      displayName: "Kwame K.",
      visibility: "public",
    })

    const project: Project = {
      id: "proj-kwame-app",
      name: "Accra Trade App",
      description: "v1.0 release",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [{ id: "f1", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>V1</div>", createdAt: "", updatedAt: "" }],
    }

    publishProject(project, { ownerId: profile.ownerId })

    // User modifies local project workspace
    project.files![0].content = "export default () => <div>V2 Modified Local Workspace</div>"

    // Portfolio returns pristine snapshot
    const portfolio = getBuilderPortfolio("kwame")
    expect(portfolio[0].snapshotFiles[0].content).toBe("export default () => <div>V1</div>")
  })

  it("8. Portfolio exposes only sanitized public project information (.env stripped)", () => {
    const profile = createBuilderProfile({
      ownerId: "owner-sanitized-103",
      username: "sanitized_user",
      displayName: "Sanitized User",
      visibility: "public",
    })

    const project: Project = {
      id: "proj-with-secrets",
      name: "Secure App",
      description: "App with env secrets",
      status: "LIVE",
      lastEdited: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files: [
        { id: "f1", path: ".env", name: ".env", extension: "env", language: "text", content: "API_KEY=AIzaSy123456789012345678901234567890", createdAt: "", updatedAt: "" },
        { id: "f2", path: "src/App.tsx", name: "App.tsx", extension: "tsx", language: "typescript", content: "export default () => <div>App</div>", createdAt: "", updatedAt: "" },
      ],
    }

    publishProject(project, { ownerId: profile.ownerId })

    const portfolio = getBuilderPortfolio("sanitized_user")
    expect(portfolio[0].snapshotFiles.some((f) => f.path === ".env")).toBe(false)
  })

  it("9. Private builder profiles are not discoverable in public listings", () => {
    createBuilderProfile({
      username: "private_builder",
      displayName: "Private Builder",
      visibility: "private",
    })

    const discoverable = getDiscoverableBuilderProfiles()
    expect(discoverable.some((p) => p.username === "private_builder")).toBe(false)
  })

  it("10. Public builder profiles are discoverable in public listings", () => {
    createBuilderProfile({
      username: "public_builder",
      displayName: "Public Builder",
      visibility: "public",
    })

    const discoverable = getDiscoverableBuilderProfiles()
    expect(discoverable.some((p) => p.username === "public_builder")).toBe(true)
  })

  it("11. Project cards link back to the builder profile ownerId / username", () => {
    const portfolio = getBuilderPortfolio("tobi")
    expect(portfolio.length).toBeGreaterThan(0)
    expect(portfolio[0].ownerId).toBe("builder-lagos")
  })

  it("12. Portfolio project links resolve to public project detail snapshot", () => {
    const portfolio = getBuilderPortfolio("tobi")
    const project = portfolio[0]

    const detail = getPublishedProjectById(project.id)
    expect(detail).toBeDefined()
    expect(detail!.title).toBe(project.title)
  })

  it("13. Remix continues to create an independent project workspace", () => {
    const portfolio = getBuilderPortfolio("tobi")
    const target = portfolio[0]

    const remixed = remixPublishedProject(target.id)
    expect(remixed.id).toBeDefined()
    expect(remixed.id).not.toBe(target.id)
  })

  it("14. Remix attribution remains intact", () => {
    const portfolio = getBuilderPortfolio("tobi")
    const target = portfolio[0]

    const remixed = remixPublishedProject(target.id)
    expect(remixed.name).toContain(target.title)
    expect(remixed.description).toContain(target.title)
  })

  it("15. Remix performs zero LLM calls (instant deterministic clone)", () => {
    const portfolio = getBuilderPortfolio("tobi")
    const target = portfolio[0]

    const startMs = Date.now()
    const remixed = remixPublishedProject(target.id)
    const elapsedMs = Date.now() - startMs

    expect(elapsedMs).toBeLessThan(50)
    expect(remixed.files!.length).toBeGreaterThan(0)
  })

  it("16. School information is optional (profile without school is valid)", () => {
    const profile = createBuilderProfile({
      username: "noschool",
      displayName: "Independent Builder",
      visibility: "public",
    })

    expect(profile.school).toBeUndefined()
    expect(profile.displayName).toBe("Independent Builder")
  })

  it("17. Private school/student information is never exposed unless intentionally provided", () => {
    const profileNoSchool = createBuilderProfile({
      username: "anon",
      displayName: "Anon Builder",
      visibility: "public",
    })

    const fetched = getBuilderProfile("anon")
    expect(fetched!.school).toBeUndefined()
  })

  it("18. Portfolio contains no internal diagnostics", () => {
    const portfolio = getBuilderPortfolio("tobi")
    for (const proj of portfolio) {
      expect((proj as any).providerDiagnostics).toBeUndefined()
    }
  })

  it("19. Portfolio contains no model/provider metadata", () => {
    const portfolio = getBuilderPortfolio("tobi")
    for (const proj of portfolio) {
      expect((proj as any).model).toBeUndefined()
      expect((proj as any).provider).toBeUndefined()
    }
  })

  it("20. Empty portfolio returns empty array without throwing", () => {
    const portfolio = getBuilderPortfolio("amara")
    expect(portfolio).toEqual([])
  })
})
