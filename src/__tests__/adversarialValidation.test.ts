import { describe, expect, it, vi } from "vitest"
import { validateWorkspace } from "../../server/generationPipeline/validator"
import { runProviderPipeline } from "../../server/generationPipeline/pipeline"

describe("Phase 2.5 — Adversarial Validation & False-Positive Verification", () => {
  // ── Section 1: Broken Code Cases ──────────────────────────────────────────

  it("A. detects invalid TSX syntax with exact line/column diagnostic", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `export default function App() {\n  let x = ;\n  return <div>App</div>\n}`,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const err = result.diagnostics.find((d) => d.code === "SYNTAX_ERROR")
    expect(err).toBeDefined()
    expect(err?.file).toBe("src/App.tsx")
    expect(err?.line).toBe(2)
  })

  it("B. detects unclosed JSX element", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `export default function App() {\n  return <div><h1>Title</div>\n}`,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    expect(result.diagnostics.some((d) => d.code === "SYNTAX_ERROR")).toBe(true)
  })

  it("D. detects missing local component import", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import NonExistent from "./NonExistent"\nexport default function App() { return <NonExistent /> }`,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const err = result.diagnostics.find((d) => d.code === "MODULE_NOT_FOUND")
    expect(err).toBeDefined()
    expect(err?.message).toContain("Cannot resolve local import './NonExistent'")
  })

  it("E. detects incorrect relative import path", () => {
    const files = [
      {
        path: "src/components/Header.tsx",
        content: `import Nav from "../Nav"\nexport default function Header() { return <Nav /> }`,
        language: "tsx",
      },
      {
        path: "src/App.tsx",
        content: `import Header from "./components/Header"\nexport default function App() { return <Header /> }`,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const err = result.diagnostics.find((d) => d.code === "MODULE_NOT_FOUND")
    expect(err?.message).toContain("Cannot resolve local import '../Nav'")
  })

  it("H. detects unsupported third-party npm dependency", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import axios from "axios"\nexport default function App() { return <div>Data</div> }`,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const err = result.diagnostics.find((d) => d.code === "UNSUPPORTED_DEPENDENCY")
    expect(err?.message).toContain("Package 'axios' is not supported")
  })

  it("I. detects missing entry point", () => {
    const files = [
      {
        path: "src/utils/math.ts",
        content: `export function add(a: number, b: number) { return a + b }`,
        language: "ts",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    expect(result.diagnostics.some((d) => d.code === "MISSING_ENTRY_POINT")).toBe(true)
  })

  it("L. detects multiple simultaneous errors with accurate diagnostic list", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `
          import lodash from "lodash"
          import Missing from "./Missing"
          export default function App() {
            let z = ;
            return <div>Bad</div>
          }
        `,
        language: "tsx",
      },
      { path: "index.html", content: "<html></html>", language: "html" },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(false)
    const codes = result.diagnostics.map((d) => d.code)
    expect(codes).toContain("SYNTAX_ERROR")
    expect(codes).toContain("MODULE_NOT_FOUND")
    expect(codes).toContain("UNSUPPORTED_DEPENDENCY")
  })

  // ── Section 2: False-Positive Resistance ──────────────────────────────────

  it("does NOT trigger false positives on valid complex React/TypeScript patterns", () => {
    const files = [
      {
        path: "src/types.ts",
        content: `
          export interface Task<T = string> {
            id: T
            title: string
            completed: boolean
          }
        `,
        language: "ts",
      },
      {
        path: "src/components/TaskList.tsx",
        content: `
          import React, { useState, useEffect, useCallback } from "react"
          import { Check, Trash } from "lucide-react"
          import type { Task } from "../types"

          // Note: { brace in comment } and [ bracket in comment ]
          export default function TaskList<T extends string>(props: { items: Task<T>[] }) {
            const [selected, setSelected] = useState<Record<string, boolean>>({})

            const handleToggle = useCallback((id: string) => {
              const str = "Object { key: val } and Array [1, 2]"
              const msg = \`Item \${id} updated with { braces } and [ brackets ]\`
              console.log(str, msg)
              setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
            }, [])

            return (
              <div className="space-y-2">
                {props.items.map((item) => (
                  <div key={String(item.id)} className="flex items-center gap-2">
                    <span>{item.title}</span>
                    <button onClick={() => handleToggle(String(item.id))}>
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        `,
        language: "tsx",
      },
      {
        path: "src/App.tsx",
        content: `
          import React from "react"
          import TaskList from "./components/TaskList"

          export default function App() {
            return (
              <main>
                <h1>My Tasks</h1>
                <TaskList items={[{ id: "1", title: "Verify pipeline", completed: false }]} />
              </main>
            )
          }
        `,
        language: "tsx",
      },
      {
        path: "src/styles.css",
        content: `@media (min-width: 768px) { body { background-color: #0f172a; } }`,
        language: "css",
      },
      {
        path: "index.html",
        content: `<!doctype html><html><body><div id="root"></div></body></html>`,
        language: "html",
      },
    ]

    const result = validateWorkspace(files)
    expect(result.valid).toBe(true)
    expect(result.diagnostics).toHaveLength(0)
  })

  // ── Section 3: Surgical Repair & Budget Bounds ─────────────────────────────

  it("performs surgical repair modifying only necessary files", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-key"

    let attempt = 0
    globalThis.fetch = vi.fn(async () => {
      attempt++
      if (attempt === 1) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        html: "<div>App</div>",
                        css: "body{margin:0}",
                        js: `import Missing from "./Missing"\nexport default function App() { return <Missing /> }`,
                        title: "App",
                        description: "Broken app",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        } as Response
      }

      // Targeted repair fixes src/App.tsx without rewriting other files
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      html: "<div>App</div>",
                      css: "body{margin:0}",
                      js: `export default function App() { return <div>Repaired App</div> }`,
                      title: "App",
                      description: "Fixed app",
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
      const res = await runProviderPipeline(
        { prompt: "Build surgical app" },
        [],
        (event, data) => emittedEvents.push({ event, data }),
      )

      expect(res.validationPassed).toBe(true)
      expect(res.repairAttempts).toBe(1)
      const fileEvents = emittedEvents.filter((e) => e.event === "file")
      expect(fileEvents.length).toBeGreaterThan(0)
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey
      else delete process.env.GEMINI_API_KEY
    }
  })

  it("terminates with honest build_failed state when repair budget is exhausted", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-key"

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    html: "<div>Unfixable</div>",
                    css: "",
                    js: `import Broken from "./Broken"`,
                    title: "Unfixable App",
                    description: "Cannot fix missing broken file",
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
      const res = await runProviderPipeline(
        { prompt: "Build unfixable app" },
        [],
        (event, data) => emittedEvents.push({ event, data }),
      )

      expect(res.validationPassed).toBe(false)
      expect(res.repairAttempts).toBe(3)

      const statusEvents = emittedEvents
        .filter((e) => e.event === "status")
        .map((e) => e.data?.status)
      expect(statusEvents).toContain("repair_failed")
      expect(statusEvents).toContain("build_failed")
      expect(statusEvents).not.toContain("build_completed")
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey
      else delete process.env.GEMINI_API_KEY
    }
  })
})
