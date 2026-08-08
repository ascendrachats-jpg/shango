import { describe, expect, it } from "vitest"
import { applyGenerationResultToProjects } from "./AppContext"
import type { Project } from "../lib/store"

describe("AppContext runtime", () => {
  it("creates a project and exposes it through context", () => {
    const now = "2026-07-27T00:00:00.000Z"
    const project: Project = {
      id: "proj-1",
      name: "Build a dashboard",
      description: "",
      status: "DRAFT",
      lastEdited: now,
      updatedAt: now,
      createdAt: now,
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
    }

    const next = applyGenerationResultToProjects(
      [project],
      "proj-1",
      {
        assistant: "The first draft is ready.",
        artifact: {
          html: "<div>dashboard</div>",
          css: "",
          js: "",
          title: "Dashboard",
          description: "A polished dashboard",
          createdAt: now,
        },
        raw: "<div>dashboard</div>",
        provider: "gemini",
        usedFallback: false,
      },
      now,
    )

    expect(next[0].artifact?.title).toBe("Dashboard")
    expect(next[0].messages[0].content).toBe("The first draft is ready.")
  })

  it("keeps plan-mode generation out of workspace versions", () => {
    const now = "2026-07-27T00:00:00.000Z"
    const project: Project = {
      id: "plan-project",
      name: "Plan project",
      description: "",
      status: "DRAFT",
      lastEdited: now,
      updatedAt: now,
      createdAt: now,
      starred: false,
      blocks: [],
      messages: [],
      versions: [],
    }

    const next = applyGenerationResultToProjects(
      [project],
      project.id,
      {
        assistant: "Start by defining the navigation.",
        raw: "plan",
        provider: "test",
        usedFallback: false,
        artifact: {
          html: "<main>Would change</main>",
          css: "",
          js: "",
          title: "Plan",
          description: "Plan",
          createdAt: now,
        },
      },
      now,
      "plan",
    )

    expect(next[0].versions).toEqual([])
    expect(next[0].artifact).toBeUndefined()
    expect(next[0].messages[0].content).toContain("navigation")
  })
})
