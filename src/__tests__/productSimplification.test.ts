import { describe, expect, it } from "vitest"
import {
  deployValidatedWorkspace,
  DefaultDeploymentProvider,
  type DeploymentRequest,
  type DeploymentProvider,
} from "../lib/deployments"
import { requestProjectExport } from "../lib/exportShare"
import { statusToLine } from "../lib/activityStatus"
import type { ActivityStatus, ActivityStateKey } from "../lib/activityStatus"

// ── All known state keys — the full surface contract ──────────────────────────

const ALL_STATE_KEYS: ActivityStateKey[] = [
  "awaiting_direction",
  "request_sent",
  "request_received",
  "understanding",
  "planning",
  "architecting",
  "preparing",
  "executing",
  "file_created",
  "file_updated",
  "file_deleted",
  "validation_started",
  "validation_failed",
  "runtime_error",
  "repair_started",
  "repair_completed",
  "preview_updated",
  "build_completed",
  "build_failed",
  "cancelled",
  "assistant_composing",
  "applying_workspace_changes",
  "workspace_updated",
  "ready_for_refinement",
  "generation_stopped",
  "generation_failed",
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

// ── Simple Builder Contract — Natural Language Events ─────────────────────────

describe("Simple Builder Contract — Natural Language Events", () => {
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
      "request_sent",
      "understanding",
      "planning",
      "executing",
      "validation_started",
      "validation_failed",
      "repair_started",
      "repair_completed",
      "build_completed",
    ]

    const titles = journey.map((key) => statusToLine({ status: key }).title)

    // First step should orient user that Shango received their request
    expect(titles[0].toLowerCase()).toMatch(/understanding|request|working|ready/)

    // Build step should communicate writing/working
    const buildTitle = statusToLine({ status: "executing" }).title.toLowerCase()
    expect(buildTitle).toMatch(/writing|building|working/)

    // Validation communicates user-facing intent (not "validating workspace")
    const validationTitle = statusToLine({ status: "validation_started" }).title.toLowerCase()
    expect(validationTitle).toMatch(/ready|app|run|making|checking/)

    // Repair communicates finding and fixing — not diagnostic codes
    const repairTitle = statusToLine({ status: "repair_started" }).title.toLowerCase()
    expect(repairTitle).toMatch(/found|fixing|issue|fix/)

    // Completion always points user toward Preview
    const completionTitle = statusToLine({ status: "build_completed" }).title.toLowerCase()
    expect(completionTitle).toMatch(/preview|ready/)
  })

  it("failure messages are understandable without technical knowledge", () => {
    const { title: buildFailed } = statusToLine({ status: "build_failed" })
    const { title: generationFailed } = statusToLine({ status: "generation_failed" })

    // Must not contain raw internal terms
    expect(buildFailed.toLowerCase()).not.toContain("failed")  // "build failed" as raw code
    expect(generationFailed.toLowerCase()).not.toContain("generation_failed")

    // Must communicate that the user can retry
    expect(buildFailed.toLowerCase()).toMatch(/try|again|couldn|finish/)
    expect(generationFailed.toLowerCase()).toMatch(/try|again|couldn|finish/)
  })

  it("repair messages communicate 'found an issue and fixing it' without exposing diagnostic codes", () => {
    const repairKeys: ActivityStateKey[] = ["validation_failed", "runtime_error", "repair_started"]

    for (const key of repairKeys) {
      const { title } = statusToLine({ status: key })
      const lower = title.toLowerCase()

      // Must sound like Shango found something and is handling it
      expect(lower).toMatch(/found|fixing|issue|fix/)

      // Must not contain raw internal codes
      expect(lower).not.toContain("validation_failed")
      expect(lower).not.toContain("runtime_error")
      expect(lower).not.toContain("repair_started")
      expect(lower).not.toContain("diagnostic")
    }
  })

  it("repair completion signals readiness, not technical completion", () => {
    const { title } = statusToLine({ status: "repair_completed" })
    const lower = title.toLowerCase()

    // Should communicate heading toward ready, not "repair_completed"
    expect(lower).not.toContain("repair_completed")
    expect(lower).toMatch(/fixed|checking|ready|app/)
  })

  it("completion states always guide the user toward Preview", () => {
    const completionKeys: ActivityStateKey[] = [
      "build_completed",
      "workspace_updated",
      "ready_for_refinement",
      "preview_updated",
    ]

    for (const key of completionKeys) {
      const { title } = statusToLine({ status: key })
      expect(
        title.toLowerCase(),
        `State "${key}" should orient the user toward Preview`,
      ).toMatch(/preview|ready/)
    }
  })

  it("custom message override is surfaced directly without appending internal state key", () => {
    const status: ActivityStatus = {
      status: "executing",
      message: "Writing the data model...",
    }

    const { title, description } = statusToLine(status)

    expect(title).toBe("Writing the data model...")
    // Must not expose the raw state key in description
    expect(description ?? "").not.toContain("executing")
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

  it("stopped/cancelled states are brief and honest", () => {
    const { title: stopped } = statusToLine({ status: "generation_stopped" })
    const { title: cancelled } = statusToLine({ status: "cancelled" })

    // Brief — not a verbose explanation
    expect(stopped.length).toBeLessThan(30)
    expect(cancelled.length).toBeLessThan(30)

    // No raw codes
    expect(stopped.toLowerCase()).not.toContain("generation_stopped")
    expect(cancelled.toLowerCase()).not.toContain("cancelled")
  })
})

