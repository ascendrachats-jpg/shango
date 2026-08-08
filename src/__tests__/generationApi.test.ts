import { describe, expect, it } from "vitest"
import { buildGenerationSseStream } from "../../server/generation"

describe("buildGenerationSseStream", () => {
  it("wraps streamed deltas and a completion payload in SSE format", () => {
    const stream = buildGenerationSseStream(
      "Build a landing page",
      "Here is your landing page",
      "gemini",
    )

    expect(stream).toContain("event: delta")
    expect(stream).toContain("event: console")
    expect(stream).toContain("event: done")
    expect(stream).toContain('"response":"Here is your landing page"')
    expect(stream).toContain('"provider":"gemini"')
  })

  it("emits file and version milestones when build metadata is provided", () => {
    const stream = buildGenerationSseStream(
      "Build a landing page",
      '{"html":"<div>page</div>","css":"body{}","js":"console.log(1)","title":"Launch","description":"Updated"}',
      "gemini",
      ["Generating build"],
      {
        files: [
          {
            path: "src/App.tsx",
            operation: "modify",
            language: "tsx",
            content: "export default function App() {}",
          },
        ],
        version: { label: "v2 — build", prompt: "Build a landing page" },
      },
    )

    expect(stream).toContain("event: file")
    expect(stream).toContain("src/App.tsx")
    expect(stream).toContain("event: version")
    expect(stream).toContain("v2 — build")
  })

  it("derives build milestones from structured response content when no metadata is provided", () => {
    const stream = buildGenerationSseStream(
      "Build a landing page",
      '{"html":"<div>page</div>","css":"body{}","js":"console.log(1)","title":"Launch","description":"Updated"}',
      "gemini",
    )

    expect(stream).toContain("event: file")
    expect(stream).toContain("src/App.tsx")
    expect(stream).toContain("event: version")
    expect(stream).toContain("Build a landing page")
  })
})
