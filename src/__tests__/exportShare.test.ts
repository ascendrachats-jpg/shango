import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildProjectExportBundle,
  createEmbedCode,
  createShareLink,
  isValidInviteEmail,
  requestProjectExport,
  requestProjectInvite,
  requestProjectShare,
} from "../lib/exportShare"
import type { Project } from "../lib/store"

describe("export/share helpers", () => {
  const project: Project = {
    id: "proj-123",
    name: "Aurora Studio",
    description: "A creative studio landing page",
    status: "DRAFT",
    lastEdited: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    createdAt: "2023-12-31T00:00:00.000Z",
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
    artifact: {
      html: "<main><h1>Aurora</h1></main>",
      css: "body { font-family: sans-serif; }",
      js: 'console.log("hi")',
      title: "Aurora Studio",
      description: "A creative studio landing page",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  }

  it("builds export files from canonical workspace files and includes package.json", () => {
    const projectWithFiles: Project = {
      ...project,
      files: [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content:
            "export default function App() { return <div>Aurora Custom Workspace</div> }",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }
    const files = buildProjectExportBundle(projectWithFiles)
    expect(
      files.some(
        (file) =>
          file.path === "src/App.tsx" &&
          file.content.includes("Aurora Custom Workspace"),
      ),
    ).toBe(true)
    expect(files.some((file) => file.path === "package.json")).toBe(true)
  })

  it("creates share links and embed snippets from the project id", () => {
    expect(createShareLink(project.id)).toBe("shango.local/p/proj-123")
    expect(createEmbedCode(project.name, project.id, "public")).toContain(
      "shango.local/p/proj-123",
    )
  })

  it("validates invite emails", () => {
    expect(isValidInviteEmail("builder@example.com")).toBe(true)
    expect(isValidInviteEmail("not-an-email")).toBe(false)
  })

  describe("backend-aware share/export helpers", () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
      vi.stubGlobal("fetch", fetchMock)
      fetchMock.mockReset()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("uses a backend share payload when available", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: "https://shango.app/p/proj-123",
          embedCode: '<iframe src="https://shango.app/p/proj-123"></iframe>',
        }),
      })

      await expect(
        requestProjectShare("proj-123", "public", project.name),
      ).resolves.toEqual({
        url: "https://shango.app/p/proj-123",
        embedCode: '<iframe src="https://shango.app/p/proj-123"></iframe>',
        privacy: "public",
      })
    })

    it("falls back gracefully for export requests that do not return a signed URL", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false })

      const result = await requestProjectExport("proj-123", "zip", project.name)

      expect(result.format).toBe("zip")
      expect(result.downloadUrl).toBeUndefined()
      expect(result.files?.some((file) => file.path === "index.html")).toBe(
        true,
      )
    })

    it("sends collaborator invites through the project invite endpoint", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })

      await expect(
        requestProjectInvite("proj-123", "builder@example.com"),
      ).resolves.toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/proj-123/invite",
        expect.objectContaining({ method: "POST" }),
      )
    })
  })
})
