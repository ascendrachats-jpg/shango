import { describe, expect, it, vi } from "vitest"
import { validateWorkspace } from "../../server/generationPipeline/validator"
import { runProviderPipeline } from "../../server/generationPipeline/pipeline"

describe("Phase 2 — Workspace Validation & Self-Repair", () => {
  it("passes validation for a clean workspace", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `
          import React from "react"
          export default function App() {
            return <div>Clean App</div>
          }
        `,
        language: "tsx",
      },
      {
        path: "index.html",
        content: "<html><body><div id='root'></div></body></html>",
        language: "html",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(true)
    expect(result.diagnostics).toHaveLength(0)
  })

  it("detects TSX syntax errors (unmatched delimiters)", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `
          export default function App() {
            return <div>Unmatched brace
        `,
        language: "tsx",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    expect(result.diagnostics.some((d) => d.code === "SYNTAX_ERROR")).toBe(true)
  })

  it("detects missing local module imports", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `
          import TaskList from "./TaskList"
          export default function App() {
            return <TaskList />
          }
        `,
        language: "tsx",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const missingModuleDiagnostic = result.diagnostics.find(
      (d) => d.code === "MODULE_NOT_FOUND",
    )
    expect(missingModuleDiagnostic).toBeDefined()
    expect(missingModuleDiagnostic?.message).toContain("Cannot resolve local import './TaskList'")
  })

  it("detects unsupported third-party package dependencies", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `
          import axios from "axios"
          export default function App() {
            return <div>Data</div>
          }
        `,
        language: "tsx",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const unsupportedDiagnostic = result.diagnostics.find(
      (d) => d.code === "UNSUPPORTED_DEPENDENCY",
    )
    expect(unsupportedDiagnostic).toBeDefined()
    expect(unsupportedDiagnostic?.message).toContain("Package 'axios' is not supported")
  })

  it("triggers self-repair loop when pre-flight validation fails and succeeds upon repaired response", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-gemini-key-for-test"

    let callCount = 0
    globalThis.fetch = vi.fn(async () => {
      callCount++
      if (callCount === 1) {
        // Initial generation introduces a missing import
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        html: "<div id='root'></div>",
                        css: "body{margin:0}",
                        js: `
                          import Header from "./Header"
                          export default function App() { return <Header /> }
                        `,
                        title: "Broken App",
                        description: "App with missing header module",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        } as Response
      }

      // Repair attempt returns fixed workspace with Header included
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      html: "<div id='root'></div>",
                      css: "body{margin:0}",
                      js: `
                        export default function App() { return <header>Header</header> }
                      `,
                      title: "Repaired App",
                      description: "App with inline header",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response
    })

    try {
      const emittedEvents: Array<{ event: string; data: any }> = []
      const response = await runProviderPipeline(
        { prompt: "Build app with missing component" },
        [],
        (event, data) => {
          emittedEvents.push({ event, data })
        },
      )

      expect(response).toBeDefined()
      expect(response.validationPassed).toBe(true)
      expect(response.repairAttempts).toBe(1)

      const statusList = emittedEvents
        .filter((e) => e.event === "status")
        .map((e) => e.data?.status)
      expect(statusList).toContain("validating")
      expect(statusList).toContain("validation_failed")
      expect(statusList).toContain("repair_started")
      expect(statusList).toContain("repair_completed")
      expect(statusList).toContain("validation_passed")
      expect(statusList).toContain("build_completed")
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey
      else delete process.env.GEMINI_API_KEY
    }
  })

  it("respects MAX_REPAIR_ATTEMPTS = 3 and fails build honestly when repair budget is exhausted", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-gemini-key-for-test"

    // Model persistently returns unfixable missing import
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    html: "<div id='root'></div>",
                    css: "body{margin:0}",
                    js: `import Broken from "./Broken"`,
                    title: "Broken App",
                    description: "Unfixable app",
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response))

    try {
      const emittedEvents: Array<{ event: string; data: any }> = []
      const response = await runProviderPipeline(
        { prompt: "Build app with unfixable error" },
        [],
        (event, data) => {
          emittedEvents.push({ event, data })
        },
      )

      expect(response).toBeDefined()
      expect(response.validationPassed).toBe(false)
      expect(response.repairAttempts).toBe(3)

      const statusList = emittedEvents
        .filter((e) => e.event === "status")
        .map((e) => e.data?.status)
      expect(statusList).toContain("validating")
      expect(statusList).toContain("validation_failed")
      expect(statusList).toContain("repair_failed")
      expect(statusList).toContain("build_failed")
      expect(statusList).not.toContain("build_completed")
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey
      else delete process.env.GEMINI_API_KEY
    }
  })
})
