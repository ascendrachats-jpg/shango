import { describe, expect, it } from "vitest"
import { applyGenerationResultToProjects } from "./AppContext"
import type { Project } from "../lib/store"

describe("applyGenerationResultToProjects", () => {
  it("replaces a pending assistant placeholder with the generated response", () => {
    const now = "2026-07-27T00:00:00.000Z"
    const project: Project = {
      id: "proj-1",
      name: "Demo app",
      description: "",
      status: "DRAFT",
      lastEdited: now,
      updatedAt: now,
      createdAt: now,
      starred: false,
      blocks: [],
      messages: [
        { id: "u1", role: "user", content: "Build a demo app", timestamp: now },
        {
          id: "a1",
          role: "assistant",
          content: "Preparing your workspace and drafting the first version…",
          timestamp: now,
          pending: true,
        },
      ],
      versions: [
        {
          id: "v1",
          number: 1,
          label: "Demo app",
          timestamp: now,
          prompt: "Build a demo app",
          isCurrent: true,
          createdAt: now,
          trigger: { type: "initial-generation", prompt: "Build a demo app" },
        },
      ],
    }

    const next = applyGenerationResultToProjects(
      [project],
      project.id,
      {
        assistant: "The first draft is ready.",
        artifact: {
          html: "<div>hello</div>",
          css: "body { margin: 0; }",
          js: "",
          title: "Demo app",
          description: "A polished demo",
          createdAt: now,
        },
        raw: "<div>hello</div>",
        provider: "gemini",
        usedFallback: false,
      },
      now,
    )

    expect(next[0].messages).toHaveLength(2)
    expect(next[0].messages[1]).toMatchObject({
      role: "assistant",
      content: "The first draft is ready.",
      pending: false,
    })
    expect(next[0].artifact?.title).toBe("Demo app")
  })
})
