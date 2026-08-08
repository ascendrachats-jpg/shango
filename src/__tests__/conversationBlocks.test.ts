import { describe, expect, it } from "vitest"
import {
  createExecutionBlock,
  createPlanBlock,
  createResultBlock,
  createErrorBlock,
} from "../lib/conversation"
import { updateExecutionBlockWithSSEEvent } from "../lib/conversationBridge"

describe("Experience Evolution Slice 1 — Conversation Blocks & Event Bridge", () => {
  it("creates typed PlanBlock, ExecutionBlock, ResultBlock, and ErrorBlock instances", () => {
    const plan = createPlanBlock(["Student workspace", "Course/task organization"], "Approach")
    expect(plan.type).toBe("plan")
    expect(plan.steps).toHaveLength(2)

    const exec = createExecutionBlock("Initializing workspace")
    expect(exec.type).toBe("execution")
    expect(exec.files).toHaveLength(0)

    const res = createResultBlock("Task manager is ready", 3, "ready")
    expect(res.type).toBe("result")
    expect(res.fileCount).toBe(3)

    const err = createErrorBlock("Build failed validation check")
    expect(err.type).toBe("error")
    expect(err.message).toBe("Build failed validation check")
  })

  it("progressively aggregates raw SSE events into a single coherent ExecutionBlock", () => {
    let block = createExecutionBlock()

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "planning" })
    expect(block.statusText).toBe("Working through the build...")

    block = updateExecutionBlockWithSSEEvent(block, "file", { file: { path: "src/App.tsx", operation: "create" } })
    expect(block.files).toHaveLength(1)
    expect(block.files[0].path).toBe("src/App.tsx")

    block = updateExecutionBlockWithSSEEvent(block, "file", { file: { path: "src/styles.css", operation: "create" } })
    expect(block.files).toHaveLength(2)

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "validating" })
    expect(block.validationStatus).toBe("validating")

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "validation_passed" })
    expect(block.validationStatus).toBe("passed")

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "build_completed" })
    expect(block.completed).toBe(true)
  })
})
