import { describe, expect, it, vi } from "vitest"
import {
  getDiagnosticFingerprint,
  normalizeRuntimeDiagnostic,
  type RuntimeEvent,
} from "../lib/runtimeContract"
import { runProviderPipeline } from "../../server/generationPipeline/pipeline"

describe("Phase 3 — Real Execution, Runtime Diagnostics & Closed-Loop Intelligence", () => {
  it("normalizes raw runtime error events into structured ValidationDiagnostic objects", () => {
    const rawEvent: Partial<RuntimeEvent> = {
      type: "runtime_error",
      message: "Uncaught ReferenceError: foo is not defined",
      stack: "ReferenceError: foo is not defined at App (src/App.tsx:12:5)",
      file: "src/App.tsx",
      line: 12,
      column: 5,
      severity: "error",
    }

    const diag = normalizeRuntimeDiagnostic(rawEvent)
    expect(diag.code).toBe("RUNTIME_ERROR")
    expect(diag.severity).toBe("error")
    expect(diag.file).toBe("src/App.tsx")
    expect(diag.line).toBe(12)
    expect(diag.column).toBe(5)
    expect(diag.message).toBe("Uncaught ReferenceError: foo is not defined")
    expect(diag.source).toBe("preview-runtime")
  })

  it("normalizes module resolution failures correctly", () => {
    const rawEvent: Partial<RuntimeEvent> = {
      type: "runtime_error",
      message: "Cannot resolve module './MissingComponent'",
      file: "src/App.tsx",
    }

    const diag = normalizeRuntimeDiagnostic(rawEvent)
    expect(diag.code).toBe("MODULE_NOT_FOUND")
  })

  it("computes diagnostic fingerprints for duplicate failure prevention", () => {
    const diag1 = normalizeRuntimeDiagnostic({
      message: "Cannot read property 'map' of undefined",
      file: "src/components/List.tsx",
      line: 24,
    })
    const diag2 = normalizeRuntimeDiagnostic({
      message: "Cannot read property 'map' of undefined",
      file: "src/components/List.tsx",
      line: 24,
    })
    const diag3 = normalizeRuntimeDiagnostic({
      message: "Different error message",
      file: "src/components/List.tsx",
      line: 24,
    })

    expect(getDiagnosticFingerprint(diag1)).toBe(getDiagnosticFingerprint(diag2))
    expect(getDiagnosticFingerprint(diag1)).not.toBe(getDiagnosticFingerprint(diag3))
  })

  it("executes closed-loop runtime repair when a runtime diagnostic enters the pipeline", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-key-runtime-test"

    // Model returns fixed workspace addressing the runtime error
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
                    js: `
                      export default function App() {
                        const tasks = [];
                        return <div>Tasks: {tasks.length}</div>
                      }
                    `,
                    title: "Fixed App",
                    description: "Repaired runtime error",
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response))

    try {
      const runtimeDiagnostic = normalizeRuntimeDiagnostic({
        message: "TypeError: Cannot read properties of undefined (reading 'length')",
        file: "src/App.tsx",
        line: 4,
      })

      const events: Array<{ event: string; data: any }> = []
      const response = await runProviderPipeline(
        {
          prompt: `Fix preview runtime issue [${runtimeDiagnostic.code}]: ${runtimeDiagnostic.message}`,
          workspaceContext: { runtimeDiagnostic },
        },
        [
          {
            path: "src/App.tsx",
            content: `export default function App() { const tasks = undefined; return <div>{tasks.length}</div> }`,
            language: "tsx",
          },
          {
            path: "index.html",
            content: `<html><body><div id='root'></div></body></html>`,
            language: "html",
          },
        ],
        (event, data) => events.push({ event, data }),
      )

      expect(response.validationPassed).toBe(true)
      const statusList = events.filter((e) => e.event === "status").map((e) => e.data?.status)
      expect(statusList).toContain("validating")
      expect(statusList).toContain("validation_passed")
      expect(statusList).toContain("build_completed")
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey
      else delete process.env.GEMINI_API_KEY
    }
  })
})
