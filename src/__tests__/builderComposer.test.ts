import { describe, expect, it } from "vitest"
import { deriveComposerValue } from "../lib/builderComposer"
import type { Project } from "../lib/store"

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "project-1",
  name: "Demo Project",
  description: "",
  status: "DRAFT",
  lastEdited: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  starred: false,
  initialPrompt: "Build a dashboard",
  blocks: [],
  messages: [],
  versions: [],
  artifact: undefined,
  providerDiagnostics: undefined,
  ...overrides,
})

describe("deriveComposerValue", () => {
  it("prefers the latest user message when the composer is empty", () => {
    const project = makeProject({
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Working on it",
          timestamp: "now",
        },
        {
          id: "2",
          role: "user",
          content: "Refine the onboarding flow",
          timestamp: "now",
        },
      ],
    })

    expect(deriveComposerValue(project, "")).toBe("Refine the onboarding flow")
  })

  it("falls back to the project initial prompt when no message exists", () => {
    const project = makeProject()

    expect(deriveComposerValue(project, "")).toBe("Build a dashboard")
  })

  it("keeps the current composer text when the user has already typed something", () => {
    const project = makeProject({
      messages: [
        { id: "1", role: "user", content: "Prior prompt", timestamp: "now" },
      ],
    })

    expect(deriveComposerValue(project, "New draft")).toBe("New draft")
  })
})
