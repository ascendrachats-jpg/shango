import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  generateProjectResponse,
  resolveGenerationMode,
  resolveGenerationPreferences,
} from "../lib/generation"
import { generateWithProvider } from "../../server/generation"
import type { ProjectArtifact } from "../lib/store"

const originalFetch = globalThis.fetch

describe("generateProjectResponse", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("includes existing artifact context when iterating", async () => {
    const previousArtifact: ProjectArtifact = {
      html: "<section><h1>Bakery</h1></section>",
      css: "body { color: red; }",
      js: 'console.log("bakery")',
      title: "Bakery",
      description: "A bakery landing page",
      createdAt: "2026-07-27T00:00:00.000Z",
    }

    const fetchMock = vi.fn(async (_input, init) => {
      const body = JSON.parse((init as any).body as string)
      expect(body.prompt).toContain("Current artifact HTML:")
      expect(body.prompt).toContain(previousArtifact.html)
      expect(body.prompt).toContain("Current artifact CSS:")
      expect(body.prompt).toContain(previousArtifact.css)
      expect(body.prompt).toContain("Current artifact JavaScript:")
      expect(body.prompt).toContain(previousArtifact.js)
      expect(body.prompt).toContain(
        "Instruction: Change the hero section to dark blue",
      )

      return {
        ok: true,
        json: async () => ({
          response:
            JSON.stringify({
              html: "<section><h1>Bakery</h1></section>",
              css: "body { background: darkblue; }",
              js: 'console.log("updated")',
              title: "Bakery Updated",
              description: "Dark blue hero and pricing section",
            }) +
            "\nThe hero section is now dark blue and a pricing section has been added.",
          provider: "gemini",
        }),
      } as Response
    })

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse(
      "Change the hero section to dark blue and add a pricing section.",
      {
        previousArtifact,
        previousPrompt: "Create a bakery landing page.",
      },
    )

    expect(result.provider).toBe("gemini")
    expect(result.artifact).toBeDefined()
    expect(result.artifact?.css).toContain("background: darkblue")
    expect(result.artifact?.title).toBe("Bakery Updated")
    expect(result.assistant).toContain("The hero section is now dark blue")
    expect(result.usedFallback).toBe(false)
  })

  it("falls back to a generated artifact when the provider response is not JSON", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              "This is a bakery landing page with a dark blue hero and pricing section.",
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse(
      "Create a bakery landing page.",
    )

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.title).toContain("Create a bakery landing page")
    expect(result.usedFallback).toBe(true)
    expect(result.assistant).toContain("This is a bakery landing page")
  })

  it("maps plan and build selections to the expected generation mode", () => {
    expect(resolveGenerationMode(true)).toBe("plan")
    expect(resolveGenerationMode(false)).toBe("build")
  })

  it("uses the requested model selection when routing Gemini requests", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => {
        const url =
          typeof _input === "string"
            ? _input
            : _input instanceof URL
              ? _input.toString()
              : _input.url
        expect(url).toContain("gemini-3.5-flash-lite")
        return {
          ok: true,
          json: async () => ({
            candidates: [
              { content: { parts: [{ text: "Generated response" }] } },
            ],
          }),
        } as Response
      },
    )

    globalThis.fetch = (fetchMock as any)
    process.env.GEMINI_API_KEY = "test-key"

    await generateWithProvider("Create a welcome experience", {
      selectedModel: "fast",
    })

    expect(fetchMock).toHaveBeenCalled()
  })

  it("reads generation preferences from storage with sensible defaults", () => {
    const storage = {
      getItem: (key: string) => {
        if (key === "shango_generation_mode") return "plan"
        if (key === "shango_settings")
          return JSON.stringify({ model: "deep", language: "Swahili" })
        return null
      },
    } as Storage

    expect(resolveGenerationPreferences(storage)).toEqual({
      mode: "plan",
      model: "gemini-pro-latest",
      language: "Swahili",
    })
    expect(
      resolveGenerationPreferences({
        getItem: () => null,
      } as unknown as Storage),
    ).toEqual({ mode: "build", model: "default", language: "English" })
  })

  it("sends the selected mode and model context to the generation endpoint", async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      const body = JSON.parse((init as any).body as string)
      expect(body.mode).toBe("plan")
      expect(body.model).toBe("gemini-pro-latest")
      expect(body.projectId).toBe("project-123")
      expect(body.activeFile).toBe("src/App.tsx")
      expect(body.enabledSkills).toEqual(["auth", "database"])
      expect(body.workspaceContext).toBeDefined()
      expect(body.workspaceContext.activeFile).toBe("src/App.tsx")
      expect(body.workspaceContext.builderMode).toBe("plan")
      expect(body.workspaceContext.relatedFiles).toEqual([
        { path: "src/App.tsx" },
      ])
      expect(body.workspaceContext.projectMetadata.fileCount).toBe(1)
      expect(body.workspaceContext.dependencyGraph).toBeDefined()
      expect(body.workspaceContext.dependencyGraph.nodes[0].path).toBe(
        "src/App.tsx",
      )
      expect(body.fileContext.files).toEqual([
        {
          path: "src/App.tsx",
          content: "export default function App() {}",
          language: "tsx",
        },
      ])

      return {
        ok: true,
        json: async () => ({
          response:
            '{"html":"<div>page</div>","css":"body{margin:0}","js":"","title":"Test","description":"Updated"}',
          provider: "gemini",
        }),
      } as Response
    })

    globalThis.fetch = (fetchMock as any)

    await generateProjectResponse(
      "Plan the architecture for the new onboarding flow.",
      {
        mode: "plan",
        model: "powerful",
        projectId: "project-123",
        activeFile: "src/App.tsx",
        enabledSkills: [
          {
            id: "auth",
            name: "Authentication",
            purpose: "Build secure sign-in flows",
          },
          {
            id: "database",
            name: "Database",
            purpose: "Model durable application data",
          },
        ],
        workspaceFiles: [
          {
            path: "src/App.tsx",
            content: "export default function App() {}",
            language: "tsx",
          },
        ],
      },
    )

    expect(fetchMock).toHaveBeenCalled()
    const requestBody = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    )
    expect(requestBody.userPrompt).toBe(
      "Plan the architecture for the new onboarding flow.",
    )
  })

  it("parses a valid JSON artifact payload and strips raw HTML from assistant text", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              '{"html":"<div>page</div>","css":"body{margin:0}","js":"","title":"Test","description":"Updated"}\nUpdated the page successfully.',
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.html).toBe("<div>page</div>")
    expect(result.assistant).toBe("Updated the page successfully.")
    expect(result.usedFallback).toBe(false)
  })

  it("parses a fenced JSON artifact payload and sanitizes assistant explanation", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              'Here is the updated artifact:\n```json\n{"html":"<div>page</div>","css":"body{margin:0}","js":"","title":"Test","description":"Updated"}\n```\n<p>The page has been updated.</p>',
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.title).toBe("Test")
    expect(result.assistant).toBe(
      "Here is the updated artifact: The page has been updated.",
    )
    expect(result.usedFallback).toBe(false)
  })

  it("passes build file operations through as generation file changes for workspace merging", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              '{"html":"<div>page</div>","css":"body{margin:0}","js":"","title":"Test","description":"Updated"}',
            provider: "gemini",
            build: {
              files: [
                {
                  path: "src/App.tsx",
                  operation: "modify",
                  language: "tsx",
                  content:
                    "export default function App() { return <div>Updated</div> }",
                },
              ],
            },
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.fileChanges).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        language: "tsx",
        content: "export default function App() { return <div>Updated</div> }",
      },
    ])
    expect(result.artifact?.title).toBe("Test")
    expect(result.usedFallback).toBe(false)
  })

  it("unpacks quoted JSON string artifact payloads and preserves assistant text", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              '"{\"html\":\"<div>page</div>\",\"css\":\"body{margin:0}\",\"js\":\"\",\"title\":\"Test\",\"description\":\"Updated\"}"\nThe page update is complete.',
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.title).toBe("Test")
    expect(result.assistant).toBe("The page update is complete.")
    expect(result.usedFallback).toBe(false)
  })

  it("extracts quoted JSON artifact payloads when text appears before the quoted string", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              'Here is the updated artifact: "{\"html\":\"<div>page</div>\",\"css\":\"body{margin:0}\",\"js\":\"\",\"title\":\"Test\",\"description\":\"Updated\"}"\nThank you for reviewing the update.',
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.title).toBe("Test")
    expect(result.assistant).toBe(
      "Here is the updated artifact: Thank you for reviewing the update.",
    )
    expect(result.usedFallback).toBe(false)
  })

  it("returns a generic assistant message when the response is pure JSON only", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              '{"html":"<div>page</div>","css":"body{margin:0}","js":"","title":"Test","description":"Updated"}',
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Update the page styling.")

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.title).toBe("Test")
    expect(result.assistant).toBe(
      "I have constructed the application hierarchy. The visual tokens are integrated and the layout is fully responsive.",
    )
    expect(result.usedFallback).toBe(false)
  })

  it("extracts an HTML document from a provider response with surrounding prose", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response:
              "Here is a polished landing page for the launch:\n<!DOCTYPE html><html><body><h1>Launch</h1><p>Welcome</p></body></html>\nThanks for reviewing it.",
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse(
      "Create a launch landing page.",
    )

    expect(result.artifact).toBeDefined()
    expect(result.artifact?.html).toContain("<h1>Launch</h1>")
    expect(result.usedFallback).toBe(true)
    expect(result.assistant).toContain("Thanks for reviewing it")
  })

  it("sanitizes HTML when a fallback artifact is generated", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response: "<div><strong>Here is the page</strong></div>",
            provider: "gemini",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Create a simple page.")

    expect(result.artifact).toBeDefined()
    expect(result.usedFallback).toBe(true)
    expect(result.assistant).toBe("Here is the page")
  })

  it("handles streaming build events and surfaces streamed content to the caller", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          headers: new Headers({ "content-type": "text/event-stream" }),
          text: async () =>
            [
              "event: delta",
              'data: {"content":"Hello from the stream"}',
              "",
              "event: console",
              'data: {"level":"info","message":"Starting build"}',
              "",
              "event: done",
              'data: {"response":"{\"html\":\"<div>page</div>\",\"css\":\"body{margin:0}\",\"js\":\"\",\"title\":\"Streamed\",\"description\":\"Updated\"}"}',
              "",
            ].join("\n"),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const events: Array<{ type: string; content?: string; message?: string }> = []
    const result = await generateProjectResponse("Stream the build", {
      onEvent: (event: { type: string; content?: string; message?: string }) =>
        events.push(event),
    })

    expect(
      events.some(
        (event) =>
          event.type === "delta" && event.content === "Hello from the stream",
      ),
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.type === "console" && event.message === "Starting build",
      ),
    ).toBe(true)
    expect(result.artifact?.title).toBe("Streamed")
    expect(result.usedFallback).toBe(false)
  })

  it("surfaces streamed file and version events to callers", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          headers: new Headers({ "content-type": "text/event-stream" }),
          text: async () =>
            [
              "event: delta",
              'data: {"content":"Working on the build"}',
              "",
              "event: file",
              'data: {"file":{"path":"src/App.tsx","operation":"modify","language":"tsx","content":"export default function App() {}"}}',
              "",
              "event: version",
              'data: {"version":{"label":"v2 — build","prompt":"Build a landing page"}}',
              "",
              "event: done",
              'data: {"response":"{\"html\":\"<div>page</div>\",\"css\":\"body{margin:0}\",\"js\":\"\",\"title\":\"Streamed\",\"description\":\"Updated\"}"}',
              "",
            ].join("\n"),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const events: Array<{
      type: string
      content?: string
      message?: string
      file?: unknown
      version?: unknown
    }> = []
    await generateProjectResponse("Build a landing page", {
      onEvent: (event: {
        type: string
        content?: string
        message?: string
        file?: unknown
        version?: unknown
      }) => events.push(event),
    })

    expect(
      events.some(
        (event) =>
          event.type === "file" && (event.file as any)?.path === "src/App.tsx",
      ),
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.type === "version" &&
          (event.version as any)?.label === "v2 — build",
      ),
    ).toBe(true)
  })

  it("collects streamed file operations and provenance into the generation result", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          headers: new Headers({ "content-type": "text/event-stream" }),
          text: async () =>
            [
              "event: file",
              'data: {"file":{"path":"src/App.tsx","operation":"modify","language":"tsx","content":"export default function App() {}"}}',
              "",
              "event: done",
              'data: {"response":"{\\"html\\":\\"<div>page</div>\\",\\"css\\":\\"body{margin:0}\\",\\"js\\":\\"\\",\\"title\\":\\"Streamed\\",\\"description\\":\\"Updated\\"}","provenance":{"id":"stream-provenance","timestamp":"2026-08-01T00:00:00.000Z","provider":"gemini","mode":"build","prompt":"Build a landing page","operations":[{"path":"src/App.tsx","operation":"modify"}],"rejectedOperations":[{"path":"package.json","reason":"protected-file"}]}}',
              "",
            ].join("\n"),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Build a landing page")

    expect(result.fileChanges).toEqual([
      {
        path: "src/App.tsx",
        operation: "modify",
        language: "tsx",
        content: "export default function App() {}",
      },
    ])
    expect(result.provenance?.rejectedOperations).toEqual([
      { path: "package.json", reason: "protected-file" },
    ])
    expect(result.provenance?.operations).toEqual([
      { path: "src/App.tsx", operation: "modify" },
    ])
  })

  it("throws when the SSE stream reports an error event", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          headers: new Headers({ "content-type": "text/event-stream" }),
          text: async () =>
            [
              "event: error",
              'data: {"error":{"message":"Build failed during streaming"}}',
              "",
            ].join("\n"),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    await expect(
      generateProjectResponse("Build a landing page"),
    ).rejects.toThrow("Build failed during streaming")
  })

  it("supports structured build responses with message and build payloads", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            requestId: "req-123",
            projectId: "project-123",
            mode: "build",
            status: "success",
            message: {
              role: "assistant",
              content: "The onboarding experience is now in place.",
            },
            build: {
              entryPoint: "src/App.tsx",
              files: [
                {
                  path: "src/App.tsx",
                  operation: "modify",
                  language: "tsx",
                  content:
                    "export default function App() { return <main><h1>Welcome</h1></main> }",
                },
              ],
            },
            consoleEvents: [
              {
                level: "success",
                message: "Build complete",
                timestamp: "2026-07-28T00:00:00.000Z",
              },
            ],
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse(
      "Create a polished onboarding experience.",
    )

    expect(result.assistant).toContain(
      "The onboarding experience is now in place",
    )
    expect(result.artifact).toBeDefined()
    expect(result.usedFallback).toBe(false)
    expect(result.diagnostics).toBeDefined()
  })

  it("retains rejected provider operations in normalized provenance", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            response: JSON.stringify({
              html: "<main>Safe</main>",
              css: "",
              js: "",
              title: "Safe",
              description: "Safe response",
            }),
            provider: "test-provider",
            provenance: {
              id: "provenance-1",
              timestamp: "2026-08-01T00:00:00.000Z",
              provider: "test-provider",
              mode: "build",
              prompt: "Make it safe",
              operations: [{ path: "src/App.tsx", operation: "modify" }],
              rejectedOperations: [
                { path: "../secret.ts", reason: "invalid-path" },
                { path: "package.json", reason: "protected-file" },
              ],
            },
          }),
        }) as Response,
    )
    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse("Make it safe")

    expect(result.provenance?.rejectedOperations).toEqual([
      { path: "../secret.ts", reason: "invalid-path" },
      { path: "package.json", reason: "protected-file" },
    ])
  })

  it("falls back to a generated artifact when the provider request fails", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: false,
          status: 500,
          json: async () => ({
            error: "No provider API key is configured on the server.",
          }),
        }) as Response,
    )

    globalThis.fetch = (fetchMock as any)

    const result = await generateProjectResponse(
      "Create a polished onboarding experience.",
    )

    expect(result.artifact).toBeDefined()
    expect(result.usedFallback).toBe(true)
    expect(result.assistant).toContain("We could not reach the model")
    expect(result.artifact?.title).toContain(
      "Create a polished onboarding experience",
    )
  })
})
