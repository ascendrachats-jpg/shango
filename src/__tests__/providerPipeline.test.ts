import { describe, expect, it, vi } from "vitest"
import { classifyProviderResponse } from "../../server/generationPipeline/responseClassifier"
import { parseProviderResponse } from "../../server/generationPipeline/structuredParser"
import { normalizeParserResult } from "../../server/generationPipeline/operationNormalizer"
import { mapBuildRequestToCurrentFiles } from "../../server/generationPipeline/adapter"
import { buildProviderPrompt } from "../../server/generationPipeline/promptBuilder"

describe("Phase 10 provider pipeline", () => {
  it("classifies JSON responses correctly", () => {
    expect(classifyProviderResponse('{"html":"<div>page</div>"}')).toBe("JSON")
  })

  it("classifies HTML responses correctly", () => {
    expect(
      classifyProviderResponse(
        "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>",
      ),
    ).toBe("HTML")
  })

  it("classifies Markdown responses correctly", () => {
    expect(classifyProviderResponse("# Title\nSome text")).toBe("Markdown")
  })

  it("classifies plain text responses correctly", () => {
    expect(classifyProviderResponse("Just some plain text")).toBe("PlainText")
  })

  it("parses JSON provider responses into structured files", () => {
    const result = parseProviderResponse(
      '{"html":"<div>page</div>","css":"body{margin:0}","js":"console.log(1)","title":"Test","description":"Desc"}',
    )
    expect(result.files).toHaveLength(3)
    expect(result.files.map((file) => file.path)).toEqual([
      "src/App.tsx",
      "src/styles.css",
      "src/main.tsx",
    ])
    expect(result.title).toBe("Test")
    expect(result.description).toBe("Desc")
  })

  it("parses HTML provider responses into a single App file", () => {
    const result = parseProviderResponse(
      "<html><body><h1>Launch</h1></body></html>",
    )
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe("src/App.tsx")
    expect(result.files[0].content).toContain("<h1>Launch</h1>")
  })

  it("parses Markdown provider responses into a single App file", () => {
    const result = parseProviderResponse("# Launch\nWelcome to the page")
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain("<h1>Launch</h1>")
    expect(result.files[0].content).toContain("<p>Welcome to the page</p>")
  })

  it("parses plain text provider responses into a fallback App file", () => {
    const result = parseProviderResponse("A simple landing page.")
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe("src/App.tsx")
    expect(result.files[0].content).toContain("A simple landing page.")
  })

  it("normalizes operations to create when file is new", () => {
    const parserResult = {
      files: [{ path: "src/App.tsx", language: "tsx", content: "new content" }],
    }
    const ops = normalizeParserResult(parserResult as any, [])
    expect(ops).toEqual([
      {
        path: "src/App.tsx",
        operation: "create",
        language: "tsx",
        content: "new content",
      },
    ])
  })

  it("normalizes operations to modify when file content changes", () => {
    const parserResult = {
      files: [
        { path: "src/App.tsx", language: "tsx", content: "updated content" },
      ],
    }
    const ops = normalizeParserResult(parserResult as any, [
      { path: "src/App.tsx", language: "tsx", content: "original content" },
    ])
    expect(ops).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        language: "tsx",
        content: "updated content",
      },
    ])
  })

  it("does not delete workspace files omitted by an iterative provider response", () => {
    const parserResult = {
      files: [],
    }
    const ops = normalizeParserResult(parserResult as any, [
      { path: "src/App.tsx", language: "tsx", content: "original content" },
    ])
    expect(ops).toEqual([])
  })

  it("produces no operations when generated files match workspace files", () => {
    const parserResult = {
      files: [
        { path: "src/App.tsx", language: "tsx", content: "same content" },
      ],
    }
    const ops = normalizeParserResult(parserResult as any, [
      { path: "src/App.tsx", language: "tsx", content: "same content" },
    ])
    expect(ops).toEqual([])
  })

  it("maps file context from build requests into current workspace files for diff normalization", () => {
    const buildRequest = {
      prompt: "Update app content",
      fileContext: {
        files: [
          {
            path: "src\\App.tsx",
            content: "export default function App() { return <div>Old</div> }",
            language: "tsx",
          },
          { path: "", content: "ignored", language: "text" },
        ],
      },
    } as any

    const currentFiles = mapBuildRequestToCurrentFiles(buildRequest)

    expect(currentFiles).toEqual([
      {
        path: "src/App.tsx",
        content: "export default function App() { return <div>Old</div> }",
        language: "tsx",
      },
    ])
  })

  it("carries the builder language into the provider prompt", () => {
    expect(
      buildProviderPrompt({
        prompt: "Build a clinic portal",
        language: "Swahili",
      }),
    ).toContain("Builder language: Swahili")
  })

  it("turns enabled skills into provider implementation guidance", () => {
    const prompt = buildProviderPrompt({
      prompt: "Build a dashboard",
      enabledSkills: [
        {
          id: "accessibility",
          name: "Accessibility",
          purpose: "Create inclusive keyboard and screen-reader experiences",
        },
      ],
    })
    expect(prompt).toContain(
      "Accessibility: Create inclusive keyboard and screen-reader experiences",
    )
  })

  it("makes plan mode an explicit no-code planning request", () => {
    const prompt = buildProviderPrompt({
      prompt: "Plan a redesign",
      mode: "plan",
    })
    expect(prompt).toContain(
      "PLAN MODE: Do not generate code or file contents.",
    )
    expect(prompt).toContain("This response will not change the workspace.")
  })

  it("keeps provider pipeline file operations provider-agnostic when merging with existing workspace files", () => {
    const parserResult = {
      files: [
        { path: "src/App.tsx", language: "tsx", content: "updated content" },
      ],
    }
    const currentFiles = [
      { path: "src/App.tsx", language: "tsx", content: "old content" },
    ]
    const ops = normalizeParserResult(parserResult as any, currentFiles)
    expect(ops).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        language: "tsx",
        content: "updated content",
      },
    ])
  })

  it("emits real execution lifecycle events through the pipeline event sink", async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "mock-gemini-key-for-test"

    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      html: "<div id='app'>Todo App</div>",
                      css: "body { margin: 0; }",
                      js: "console.log('todo')",
                      title: "Todo App",
                      description: "A todo app demo",
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
      const { runProviderPipeline } = await import(
        "../../server/generationPipeline/pipeline.ts"
      )
      const emittedEvents: Array<{ event: string; data: any }> = []

      const response = await runProviderPipeline(
        { prompt: "Build a todo application" },
        [],
        (event, data) => {
          emittedEvents.push({ event, data })
        },
      )

      expect(response).toBeDefined()
      expect(emittedEvents.length).toBeGreaterThan(0)
      const eventTypes = emittedEvents.map((e) => e.event)
      expect(eventTypes).toContain("status")
      expect(eventTypes).toContain("console")

      const statusEvents = emittedEvents
        .filter((e) => e.event === "status")
        .map((e) => e.data?.status)
      expect(statusEvents).toContain("request_received")
      expect(statusEvents).toContain("planning")
      expect(statusEvents).toContain("architecting")
      expect(statusEvents).toContain("executing")
      expect(statusEvents).toContain("file_created")
      expect(statusEvents).toContain("build_completed")
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey !== undefined) {
        process.env.GEMINI_API_KEY = originalApiKey
      } else {
        delete process.env.GEMINI_API_KEY
      }
    }
  })
})


