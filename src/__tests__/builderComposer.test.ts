import { describe, expect, it } from "vitest"
import { deriveComposerValue } from "../lib/builderComposer"
import type { Project } from "../lib/store"
import {
  createUserDialogueBlock,
  createShangoDialogueBlock,
} from "../lib/conversation"

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
  it("prefers the latest user dialogue block when the composer is empty", () => {
    const project = makeProject({
      blocks: [
        createUserDialogueBlock("Build a dashboard"),
        createShangoDialogueBlock("Done", false),
        createUserDialogueBlock("Refine the onboarding flow"),
      ],
    })

    expect(deriveComposerValue(project, "")).toBe("Refine the onboarding flow")
  })

  it("falls back to the project initial prompt when no blocks exist", () => {
    const project = makeProject()

    expect(deriveComposerValue(project, "")).toBe("Build a dashboard")
  })

  it("keeps the current composer text when the user has already typed something", () => {
    const project = makeProject({
      blocks: [
        createUserDialogueBlock("Prior prompt"),
      ],
    })

    expect(deriveComposerValue(project, "New draft")).toBe("New draft")
  })
})
