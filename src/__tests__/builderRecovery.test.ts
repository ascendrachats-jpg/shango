import { describe, expect, it } from "vitest"
import {
  buildConsoleLogs,
  getRetryPromptFromMessages,
} from "../pages/BuilderScreen"

describe("builder generation recovery", () => {
  it("recovers the most recent failed instruction after a refresh", () => {
    expect(
      getRetryPromptFromMessages([
        {
          id: "u1",
          role: "user",
          content: "Add an offline check-in flow",
          timestamp: "2026-07-31T00:00:00.000Z",
        },
        {
          id: "a1",
          role: "assistant",
          content:
            "The generation request could not be completed. You can retry the same instruction.",
          timestamp: "2026-07-31T00:00:01.000Z",
        },
      ]),
    ).toBe("Add an offline check-in flow")
  })

  it("does not offer a stale retry after a later successful response", () => {
    expect(
      getRetryPromptFromMessages([
        {
          id: "u1",
          role: "user",
          content: "Build a clinic dashboard",
          timestamp: "2026-07-31T00:00:00.000Z",
        },
        {
          id: "a1",
          role: "assistant",
          content:
            "The generation request could not be completed. You can retry the same instruction.",
          timestamp: "2026-07-31T00:00:01.000Z",
        },
        {
          id: "u2",
          role: "user",
          content: "Try a simpler dashboard",
          timestamp: "2026-07-31T00:02:00.000Z",
        },
        {
          id: "a2",
          role: "assistant",
          content: "The first workspace draft is ready.",
          timestamp: "2026-07-31T00:02:01.000Z",
        },
      ]),
    ).toBeNull()
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
