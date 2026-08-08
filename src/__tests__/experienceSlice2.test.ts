import { describe, expect, it } from "vitest"
import { createExecutionBlock } from "../lib/conversation"
import { updateExecutionBlockWithSSEEvent } from "../lib/conversationBridge"
import { selectWorkspaceContext } from "../lib/contextSelection"

describe("Experience Evolution Slice 2 — Human-Centered Intelligence & Context Selection", () => {
  it("translates raw status events into calm, human-readable conversational phrasing", () => {
    let block = createExecutionBlock()

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "request_received" })
    expect(block.statusText).toBe("Understanding your request...")

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "executing" })
    expect(block.statusText).toBe("Building the workspace...")

    block = updateExecutionBlockWithSSEEvent(block, "file", { file: { path: "src/App.tsx", operation: "create" } })
    expect(block.files).toHaveLength(1)

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "validating" })
    expect(block.statusText).toBe("Checking workspace code...")

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "validation_passed" })
    expect(block.statusText).toBe("Code validation passed")

    block = updateExecutionBlockWithSSEEvent(block, "status", { status: "build_completed" })
    expect(block.statusText).toContain("ready in Preview")
  })

  it("selects surgical workspace file context for iteration prompts based on keywords and active file", () => {
    const files = [
      { path: "src/App.tsx", content: "export default function App() {}" },
      { path: "src/components/TaskList.tsx", content: "export default function TaskList() {}" },
      { path: "src/styles.css", content: "body { margin: 0; }" },
      { path: "src/utils/filter.ts", content: "export function filterTasks() {}" },
    ]

    const result = selectWorkspaceContext(files, "Change the filter logic in TaskList", "src/components/TaskList.tsx")
    expect(result.intentCategory).toBe("iteration")
    expect(result.selectedFiles.some((f) => f.path === "src/components/TaskList.tsx")).toBe(true)
    expect(result.selectedFiles.some((f) => f.path === "src/App.tsx")).toBe(true)
  })

  it("identifies repair intent and prioritizes files referenced in runtime diagnostics", () => {
    const files = [
      { path: "src/App.tsx", content: "export default function App() {}" },
      { path: "src/components/Header.tsx", content: "export default function Header() {}" },
    ]

    const result = selectWorkspaceContext(
      files,
      "Fix runtime error in Header component",
      undefined,
      { file: "src/components/Header.tsx", message: "TypeError: Header crash" },
    )

    expect(result.intentCategory).toBe("repair")
    expect(result.selectedFiles.some((f) => f.path === "src/components/Header.tsx")).toBe(true)
  })
})
