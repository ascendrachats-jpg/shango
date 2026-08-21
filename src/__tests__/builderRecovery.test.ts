import { describe, expect, it } from "vitest"
import { buildConsoleLogs } from "../pages/BuilderScreen"
import {
  getRetryPromptFromBlocks,
} from "../lib/conversationHelpers"
import { createErrorBlock, createUserDialogueBlock, createResultBlock } from "../lib/conversation"

describe("builder generation recovery", () => {
  it("recovers the most recent failed instruction after a refresh", () => {
    const blocks = [
      createUserDialogueBlock("Add an offline check-in flow"),
      createErrorBlock("The generation request could not be completed."),
    ]
    expect(getRetryPromptFromBlocks(blocks)).toBe("Add an offline check-in flow")
  })

  it("does not offer a stale retry after a later successful build", () => {
    const blocks = [
      createUserDialogueBlock("Build a clinic dashboard"),
      createErrorBlock("The generation request could not be completed."),
      createUserDialogueBlock("Try a simpler dashboard"),
      createResultBlock("The first workspace draft is ready.", 3, "ready"),
    ]
    expect(getRetryPromptFromBlocks(blocks)).toBeNull()
  })

  it("returns null when the last block is not an error", () => {
    const blocks = [
      createUserDialogueBlock("Build a todo app"),
      createResultBlock("Todo app is ready.", 2, "ready"),
    ]
    expect(getRetryPromptFromBlocks(blocks)).toBeNull()
  })

  it("labels local preview refreshes without claiming a deployment", () => {
    const output = buildConsoleLogs("Clinic Portal")
      .map((entry) => entry.msg)
      .join("\n")

    expect(output).toContain(
      "No production build or provider deployment is running",
    )
    expect(output).not.toContain("Preview deployed")
  })
})
