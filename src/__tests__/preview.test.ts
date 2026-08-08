import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildArtifactPreviewDocument,
  buildInspectorFilesFromArtifact,
  buildInspectorFilesFromProject,
  createArtifactPreviewUrl,
} from "../lib/preview"
import type { Project, ProjectArtifact } from "../lib/store"

describe("buildArtifactPreviewDocument", () => {
  it("wraps fragment HTML with artifact CSS and JavaScript", () => {
    const artifact: ProjectArtifact = {
      html: "<section><h1>Hello</h1></section>",
      css: "body { background: #111; color: white; }",
      js: 'console.log("ready")',
      title: "Preview test",
      description: "Artifact preview",
      createdAt: "2026-07-28T00:00:00.000Z",
    }

    const document = buildArtifactPreviewDocument(artifact)

    expect(document).toContain("<style>")
    expect(document).toContain("body { background: #111; color: white; }")
    expect(document).toContain('console.log("ready")')
    expect(document).toContain("<section><h1>Hello</h1></section>")
  })

  it("builds inspector files from the current artifact content", () => {
    const files = buildInspectorFilesFromArtifact(
      {
        html: "<main><h1>Launch</h1><p>Welcome</p></main>",
        css: "body { margin: 0; color: #111; }",
        js: 'console.log("ready")',
        title: "Launch preview",
        description: "A polished product landing page",
        createdAt: "2026-07-28T00:00:00.000Z",
      },
      "Launch preview",
    )

    expect(files.map((file) => file.path)).toEqual([
      "src/App.tsx",
      "src/styles.css",
      "index.html",
    ])
    expect(files[0].content).toContain("return (")
    expect(files[0].content).toContain("Launch")
    expect(files[1].content).toContain("body { margin: 0; color: #111; }")
    expect(files[2].content).toContain(
      "<main><h1>Launch</h1><p>Welcome</p></main>",
    )
  })

  it("builds inspector files from the current workspace when available", () => {
    const project = {
      name: "Workspace preview",
      artifact: {
        html: "<main><h1>Legacy</h1></main>",
        css: "body { color: #111; }",
        js: 'console.log("legacy")',
        title: "Legacy preview",
        description: "Provisioned from the legacy artifact",
        createdAt: "2026-07-28T00:00:00.000Z",
      },
      files: [
        {
          id: "1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "export const value = 42",
          createdAt: "2026-07-28T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          kind: "file" as const,
        },
        {
          id: "2",
          path: "src/styles.css",
          name: "styles.css",
          extension: "css",
          language: "css",
          content: "body { background: #000; }",
          createdAt: "2026-07-28T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          kind: "file" as const,
        },
        {
          id: "3",
          path: "index.html",
          name: "index.html",
          extension: "html",
          language: "html",
          content: "<main>Workspace</main>",
          createdAt: "2026-07-28T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          kind: "file" as const,
        },
      ],
    } as Project

    const files = buildInspectorFilesFromProject(project)

    expect(files.map((file) => file.path)).toEqual([
      "src/App.tsx",
      "src/styles.css",
      "index.html",
    ])
    expect(files[0].content).toContain("export const value = 42")
    expect(files[1].content).toContain("background: #000")
    expect(files[2].content).toContain("Workspace")
  })

  it("creates a preview URL from the current artifact document", () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    const createObjectURL = vi.fn(() => "blob:preview-url")
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    })

    const artifact: ProjectArtifact = {
      html: "<main><h1>Preview</h1></main>",
      css: "body { font-family: sans-serif; }",
      js: 'console.log("preview")',
      title: "Preview Page",
      description: "A preview page",
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const previewUrl = createArtifactPreviewUrl(artifact, "Preview Project")

    expect(previewUrl).toBe("blob:preview-url")
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it("uses streamed file snapshots to enrich preview output when the artifact is incomplete", () => {
    const artifact: ProjectArtifact = {
      html: "",
      css: "",
      js: "",
      title: "Live Preview",
      description: "A live preview",
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const document = buildArtifactPreviewDocument(artifact, [
      {
        path: "src/styles.css",
        content: "body { background: #111; color: white; }",
      },
      { path: "index.html", content: "<main><h1>Streaming update</h1></main>" },
    ])

    expect(document).toContain("Streaming update")
    expect(document).toContain("background: #111")
  })

  it("uses streamed file snapshots when creating a preview URL for incomplete artifacts", () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
      return "blob:preview-url"
    })
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    })

    const artifact: ProjectArtifact = {
      html: "",
      css: "",
      js: "",
      title: "Live Preview",
      description: "A live preview",
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const previewUrl = createArtifactPreviewUrl(artifact, "Live Preview", [
      {
        path: "src/styles.css",
        content: "body { background: #111; color: white; }",
      },
      { path: "index.html", content: "<main><h1>Streaming update</h1></main>" },
      { path: "src/main.tsx", content: 'console.log("streamed")' },
    ])

    expect(previewUrl).toBe("blob:preview-url")
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it("resolves external third-party package imports without module specifier errors", () => {
    const artifact: ProjectArtifact = {
      files: [
        {
          path: "src/App.tsx",
          language: "tsx",
          content: `
            import React from 'react'
            import { LineChart } from 'recharts'
            import { motion } from 'framer-motion'
            import confetti from 'canvas-confetti'
            import { clsx } from 'clsx'

            export default function App() {
              return <div className={clsx("app")}>Dynamic Packages</div>
            }
          `,
        },
      ],
      title: "Package Test",
      description: "Package test",
      createdAt: "2026-07-28T00:00:00.000Z",
    }

    const document = buildArtifactPreviewDocument(artifact)
    expect(document).toContain("createUniversalPkgProxy")
    expect(document).toContain("recharts")
    expect(document).toContain("framer-motion")
    expect(document).toContain("canvas-confetti")
  })
})
