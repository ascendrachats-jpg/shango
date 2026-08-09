import { describe, expect, it } from "vitest"
import {
  createExecutionBlock,
  createResultBlock,
  createErrorBlock,
  createUserDialogueBlock,
  createShangoDialogueBlock,
  createIdeaBlock,
} from "../lib/conversation"

describe("Conversation Blocks — Real Block Factories", () => {
  it("creates typed ExecutionBlock, ResultBlock, and ErrorBlock instances", () => {
    const exec = createExecutionBlock("Initializing workspace")
    expect(exec.type).toBe("execution")
    expect(exec.files).toHaveLength(0)
    expect(exec.statusText).toBe("Initializing workspace")

    const res = createResultBlock("Task manager is ready", 3, "ready")
    expect(res.type).toBe("result")
    expect(res.fileCount).toBe(3)

    const err = createErrorBlock("Build failed validation check")
    expect(err.type).toBe("error")
    expect(err.message).toBe("Build failed validation check")
  })

  it("creates dialogue and idea blocks with correct types and content", () => {
    const userBlock = createUserDialogueBlock("Build me a todo app")
    expect(userBlock.type).toBe("dialogue.user")
    expect(userBlock.content).toBe("Build me a todo app")

    const shangoBlock = createShangoDialogueBlock("Here is your todo app", false)
    expect(shangoBlock.type).toBe("dialogue.shango")
    expect(shangoBlock.content).toBe("Here is your todo app")
    expect(shangoBlock.pending).toBe(false)

    const pendingShango = createShangoDialogueBlock("", true)
    expect(pendingShango.pending).toBe(true)

    const idea = createIdeaBlock("A simple task tracker")
    expect(idea.type).toBe("idea")
  })
})
