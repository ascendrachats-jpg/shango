import { describe, expect, it } from "vitest"
import {
  deployValidatedWorkspace,
  type DeploymentRequest,
  type DeploymentProvider,
} from "../lib/deployments"
import { requestProjectExport } from "../lib/exportShare"
import { statusToLine, pipelineStatusToState } from "../lib/activityStatus"
import type { ActivityStatus, ActivityStateKey } from "../lib/activityStatus"

// ── All known state keys — the 8-state surface contract ─────────────────────

const ALL_STATE_KEYS: ActivityStateKey[] = [
  "idle",
  "understanding",
  "building",
  "validating",
  "repairing",
  "ready",
  "failed",
  "stopped",
]

// Raw internal codes that must never appear in user-facing output
const FORBIDDEN_CODES = [
  "TS2304",
  "TS18003",
  "AST_CHECK_FAILED",
  "provider_fallback",
  "MODULE_NOT_FOUND",
  "RUNTIME_ERROR",
  "VALIDATION_FAILED",
  "request_received",
  "validation_failed",
  "repair_started",
  "build_failed",
  "generation_failed",
  "planning",
  "architecting",
  "executing",
  "provider",
  "fallback",
  "pipeline",
  "type checking",
  "syntax validation",
  "component blueprint",
  "model provider",
  "workspace tools",
  "diagnostic",
]

describe("Product Simplification — Save & Deploy", () => {
  it("refuses deployment if the workspace has invalid compiler/syntax validation status", async () => {
    const request: DeploymentRequest = {
      projectId: "proj-101",
      projectName: "Invalid App",
      files: [{ path: "src/App.tsx", content: "export default function App() { return <div>" }],
    }

    const result = await deployValidatedWorkspace(request, ["vercel"], false)

    expect(result.status).toBe("FAILED")
    expect(result.message).toContain("Deployment rejected: your workspace has invalid compilation")
  })

  it("returns honest status CREDENTIALS_REQUIRED when no deployment provider is connected", async () => {
    const request: DeploymentRequest = {
      projectId: "proj-102",
      projectName: "Valid App",
      files: [{ path: "src/App.tsx", content: "export default function App() { return <div>Valid</div> }" }],
    }

    const result = await deployValidatedWorkspace(request, [], true)

    expect(result.status).toBe("CREDENTIALS_REQUIRED")
    expect(result.message).toContain("Connect a hosting provider")
  })

  it("deploys successfully and returns a real URL when a provider is available and workspace is valid", async () => {
    const request: DeploymentRequest = {
      projectId: "proj-103",
      projectName: "Task Manager",
      files: [{ path: "src/App.tsx", content: "export default function App() { return <div>Task Manager</div> }" }],
    }

    const mockProvider: DeploymentProvider = {
      id: "mock-vercel",
      name: "Vercel",
      isAvailable: () => true,
      deploy: async (req) => ({
        status: "DEPLOYED",
        url: `https://${req.projectName.toLowerCase().replace(/\s+/g, "-")}.vercel.app`,
        message: "Live at URL",
      }),
    }

    const result = await deployValidatedWorkspace(request, ["vercel"], true, mockProvider)

    expect(result.status).toBe("DEPLOYED")
    expect(result.url).toBe("https://task-manager.vercel.app")
  })

  it("exports project to GitHub format without altering workspace state", async () => {
    const exportResult = await requestProjectExport("proj-104", "github", "My Saved Project")

    expect(exportResult.format).toBe("github")
    expect(exportResult.files).toBeDefined()
    expect(exportResult.files!.some((f) => f.path.includes("App.tsx"))).toBe(true)
  })
})

// ── Simple Builder Contract — 8-state Activity Model ─────────────────────────

describe("Simple Builder Contract — 8-State Activity Model", () => {
  it("every ActivityStateKey produces a non-empty human-readable title", () => {
    for (const key of ALL_STATE_KEYS) {
      const status: ActivityStatus = { status: key }
      const { title } = statusToLine(status)

      expect(title, `Key "${key}" must have a non-empty title`).toBeTruthy()
      expect(title.length, `Key "${key}" title must be at least 3 characters`).toBeGreaterThan(2)
    }
  })

  it("no raw internal technical codes appear in any statusToLine() output", () => {
    for (const key of ALL_STATE_KEYS) {
      const status: ActivityStatus = { status: key }
      const { title, description } = statusToLine(status)
      const combined = `${title} ${description ?? ""}`.toLowerCase()

      for (const forbidden of FORBIDDEN_CODES) {
        expect(
          combined.includes(forbidden.toLowerCase()),
          `State "${key}" must not expose technical term "${forbidden}" — got: "${combined.trim()}"`,
        ).toBe(false)
      }
    }
  })

  it("the build lifecycle journey uses only user-facing language from start to finish", () => {
    const journey: ActivityStateKey[] = [
      "understanding",
      "building",
      "validating",
      "repairing",
      "ready",
    ]

    const titles = journey.map((key) => statusToLine({ status: key }).title)

    // First step should orient user that Shango received their request
    expect(titles[0].toLowerCase()).toMatch(/understanding|request|working|ready/)

    // Build step should communicate writing/working
    const buildTitle = statusToLine({ status: "building" }).title.toLowerCase()
    expect(buildTitle).toMatch(/writing|building|working/)

    // Validation communicates user-facing intent
    const validationTitle = statusToLine({ status: "validating" }).title.toLowerCase()
    expect(validationTitle).toMatch(/ready|app|run|making|checking/)

    // Repair communicates finding and fixing — not diagnostic codes
    const repairTitle = statusToLine({ status: "repairing" }).title.toLowerCase()
    expect(repairTitle).toMatch(/found|fixing|issue|fix/)

    // Completion always points user toward Preview
    const completionTitle = statusToLine({ status: "ready" }).title.toLowerCase()
    expect(completionTitle).toMatch(/preview|ready/)
  })

  it("failure messages are understandable without technical knowledge", () => {
    const { title: buildFailed } = statusToLine({ status: "failed" })

    // Must not contain raw internal terms as raw codes
    expect(buildFailed.toLowerCase()).not.toContain("build_failed")
    expect(buildFailed.toLowerCase()).not.toContain("generation_failed")

    // Must communicate that the user can retry
    expect(buildFailed.toLowerCase()).toMatch(/try|again|couldn|finish/)
  })

  it("repair messages communicate 'found an issue and fixing it' without exposing diagnostic codes", () => {
    const { title } = statusToLine({ status: "repairing" })
    const lower = title.toLowerCase()

    // Must sound like Shango found something and is handling it
    expect(lower).toMatch(/found|fixing|issue|fix/)

    // Must not contain raw internal codes
    expect(lower).not.toContain("validation_failed")
    expect(lower).not.toContain("runtime_error")
    expect(lower).not.toContain("repair_started")
    expect(lower).not.toContain("diagnostic")
  })

  it("completion states always guide the user toward Preview", () => {
    const { title } = statusToLine({ status: "ready" })
    expect(
      title.toLowerCase(),
      `State "ready" should orient the user toward Preview`,
    ).toMatch(/preview|ready/)
  })

  it("custom message override is surfaced directly without appending internal state key", () => {
    const status: ActivityStatus = {
      status: "building",
      message: "Writing the data model...",
    }

    const { title, description } = statusToLine(status)

    expect(title).toBe("Writing the data model...")
    // Must not expose the raw state key in description
    expect(description ?? "").not.toContain("building")
    expect(description ?? "").not.toContain("State:")
  })

  it("model IDs and provider names never appear in ordinary activity status output", () => {
    const providerTerms = [
      "gemini",
      "gemini-2",
      "gemini-3",
      "flash",
      "pro-latest",
      "vertex",
      "openai",
      "anthropic",
      "claude",
      "gpt",
      "provider",
      "fallback",
    ]

    for (const key of ALL_STATE_KEYS) {
      const { title, description } = statusToLine({ status: key })
      const combined = `${title} ${description ?? ""}`.toLowerCase()

      for (const term of providerTerms) {
        expect(
          combined.includes(term),
          `State "${key}" must not expose provider/model term "${term}" — got: "${combined.trim()}"`,
        ).toBe(false)
      }
    }
  })

  it("stopped state is brief and honest", () => {
    const { title: stopped } = statusToLine({ status: "stopped" })

    // Brief — not a verbose explanation
    expect(stopped.length).toBeLessThan(30)

    // No raw codes
    expect(stopped.toLowerCase()).not.toContain("generation_stopped")
    expect(stopped.toLowerCase()).not.toContain("cancelled")
  })
})

// ── Pipeline Status Mapping ─────────────────────────────────────────────────

describe("pipelineStatusToState — maps raw pipeline events to 8 states", () => {
  it("maps request_received, planning, architecting to understanding", () => {
    expect(pipelineStatusToState("request_received")).toBe("understanding")
    expect(pipelineStatusToState("planning")).toBe("understanding")
    expect(pipelineStatusToState("architecting")).toBe("understanding")
  })

  it("maps executing and file operations to building", () => {
    expect(pipelineStatusToState("executing")).toBe("building")
    expect(pipelineStatusToState("file_created")).toBe("building")
    expect(pipelineStatusToState("file_updated")).toBe("building")
    expect(pipelineStatusToState("file_deleted")).toBe("building")
  })

  it("maps validating and validation_passed to validating", () => {
    expect(pipelineStatusToState("validating")).toBe("validating")
    expect(pipelineStatusToState("validation_passed")).toBe("validating")
  })

  it("maps validation_failed, repair_started, repair_completed to repairing", () => {
    expect(pipelineStatusToState("validation_failed")).toBe("repairing")
    expect(pipelineStatusToState("repair_started")).toBe("repairing")
    expect(pipelineStatusToState("repair_completed")).toBe("repairing")
  })

  it("maps build_completed to ready", () => {
    expect(pipelineStatusToState("build_completed")).toBe("ready")
  })

  it("maps build_failed and repair_failed to failed", () => {
    expect(pipelineStatusToState("build_failed")).toBe("failed")
    expect(pipelineStatusToState("repair_failed")).toBe("failed")
  })

  it("maps unknown status strings to understanding (safest active state)", () => {
    expect(pipelineStatusToState("unknown_event")).toBe("understanding")
    expect(pipelineStatusToState("")).toBe("understanding")
  })
})
