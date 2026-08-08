import { describe, it, expect } from "vitest"
import {
  updateProjectFile,
  deriveProjectArtifact,
  mergeWorkspaceFilesWithArtifact,
} from "../lib/workspace"
import {
  applyFileChangesToWorkspace,
  findSensitiveWorkspaceChanges,
  validateWorkspaceFileChanges,
} from "../lib/versioning"
import type { ProjectFile } from "../lib/store"

describe("Phase 12 — Workspace Editing & Ownership", () => {
  it("updates a canonical workspace file and marks it userModified", () => {
    const initialFiles: ProjectFile[] = [
      {
        id: "f1",
        path: "src/App.tsx",
        name: "App.tsx",
        extension: "tsx",
        language: "tsx",
        content: "export default function App() { return <div>Original</div> }",
        createdAt: "2026-07-30T00:00:00Z",
        updatedAt: "2026-07-30T00:00:00Z",
      },
    ]

    const updated = updateProjectFile(
      initialFiles,
      "src/App.tsx",
      "export default function App() { return <div>Edited by Builder</div> }",
      "2026-07-30T01:00:00Z",
    )

    expect(updated).toHaveLength(1)
    expect(updated[0].content).toContain("Edited by Builder")
    expect(updated[0].userModified).toBe(true)
  })

  it("automatically re-derives Project.artifact from updated Project.files", () => {
    const files: ProjectFile[] = [
      {
        id: "f1",
        path: "index.html",
        name: "index.html",
        extension: "html",
        language: "html",
        content:
          "<!doctype html><html><body><main><h1>Direct Edit Title</h1></main></body></html>",
        createdAt: "2026-07-30T00:00:00Z",
        updatedAt: "2026-07-30T00:00:00Z",
      },
      {
        id: "f2",
        path: "src/App.tsx",
        name: "App.tsx",
        extension: "tsx",
        language: "tsx",
        content: 'console.log("App loaded");',
        createdAt: "2026-07-30T00:00:00Z",
        updatedAt: "2026-07-30T00:00:00Z",
      },
      {
        id: "f3",
        path: "src/styles.css",
        name: "styles.css",
        extension: "css",
        language: "css",
        content: "body { background: #000; }",
        createdAt: "2026-07-30T00:00:00Z",
        updatedAt: "2026-07-30T00:00:00Z",
      },
    ]

    const derivedArtifact = deriveProjectArtifact({
      id: "p1",
      name: "Test Project",
      description: "",
      status: "DRAFT",
      lastEdited: "2026-07-30T01:00:00Z",
      createdAt: "2026-07-30T00:00:00Z",
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
      files,
    })

    expect(derivedArtifact.html).toContain("Direct Edit Title")
    expect(derivedArtifact.css).toBe("body { background: #000; }")
    expect(derivedArtifact.files).toHaveLength(3)
  })

  it("preserves userModified metadata across workspace file merge passes", () => {
    const existingFiles: ProjectFile[] = [
      {
        id: "f1",
        path: "src/App.tsx",
        name: "App.tsx",
        extension: "tsx",
        language: "tsx",
        content:
          "export default function App() { return <div>User Edit</div> }",
        createdAt: "2026-07-30T00:00:00Z",
        updatedAt: "2026-07-30T00:00:00Z",
        userModified: true,
      },
    ]

    const merged = mergeWorkspaceFilesWithArtifact(
      existingFiles,
      {
        title: "AI Update",
        description: "AI description",
        html: "<div>AI content</div>",
        css: "",
        js: "",
        createdAt: "2026-07-30T02:00:00Z",
        files: [
          {
            path: "src/App.tsx",
            content:
              "export default function App() { return <div>AI Updated</div> }",
            language: "tsx",
          },
          {
            path: "src/components/Header.tsx",
            content: "export function Header() {}",
            language: "tsx",
          },
        ],
      },
      "2026-07-30T02:00:00Z",
    )

    const appFile = merged.find((f: ProjectFile) => f.path === "src/App.tsx")
    expect(appFile).toBeDefined()
    expect(appFile?.userModified).toBe(true)

    const nextWorkspace = applyFileChangesToWorkspace(
      existingFiles,
      [
        {
          path: "src/components/Footer.tsx",
          operation: "create",
          content: "export function Footer() {}",
          language: "tsx",
        },
      ],
      "2026-07-30T02:00:00Z",
    )

    const preservedAppFile = nextWorkspace.find(
      (f: ProjectFile) => f.path === "src/App.tsx",
    )
    expect(preservedAppFile?.userModified).toBe(true)
  })

  it("rejects unsafe paths and protected-file deletions before merging", () => {
    const result = validateWorkspaceFileChanges([
      { path: "../secrets.txt", operation: "create", content: "no" },
      { path: "package.json", operation: "delete" },
      {
        path: "src/App.tsx",
        operation: "modify",
        content: "safe",
        language: "tsx",
      },
    ])

    expect(result.accepted).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        content: "safe",
        language: "tsx",
      },
    ])
    expect(result.rejected).toEqual([
      { path: "../secrets.txt", reason: "invalid-path" },
      { path: "package.json", reason: "protected-file" },
    ])
  })

  it("requires review before AI overwrites a builder-modified file", () => {
    const files: ProjectFile[] = [
      {
        id: "app",
        path: "src/App.tsx",
        name: "App.tsx",
        extension: "tsx",
        language: "tsx",
        content: "manual work",
        createdAt: "now",
        updatedAt: "now",
        userModified: true,
      },
    ]

    expect(
      findSensitiveWorkspaceChanges(files, [
        {
          path: "src/App.tsx",
          operation: "modify",
          content: "AI replacement",
          language: "tsx",
        },
        {
          path: "src/styles.css",
          operation: "create",
          content: "body {}",
          language: "css",
        },
      ]),
    ).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        content: "AI replacement",
        language: "tsx",
      },
    ])
  })
})
