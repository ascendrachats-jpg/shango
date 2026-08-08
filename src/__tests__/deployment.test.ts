import { describe, expect, it } from "vitest"
import {
  buildDeploymentPayload,
  generateBuildLogs,
  normalizeDeploymentRecord,
  redactDeploymentEnvVars,
  type DeploymentRecord,
} from "../lib/deployments"

describe("deployment helpers", () => {
  it("builds a deploy payload from the current review settings", () => {
    const payload = buildDeploymentPayload({
      projectId: "proj-1",
      projectName: "Launchpad",
      target: "vercel",
      buildCommand: "npm run build",
      outputDir: "dist",
      envVars: [{ key: "NODE_ENV", value: "production", secret: false }],
      customDomain: "launchpad.example.com",
      version: 4,
    })

    expect(payload.projectId).toBe("proj-1")
    expect(payload.target).toBe("vercel")
    expect(payload.buildCommand).toBe("npm run build")
    expect(payload.envVars).toHaveLength(1)
    expect(payload.customDomain).toBe("launchpad.example.com")
    expect(payload.version).toBe(4)
    expect(payload.isPreview).toBe(true)
  })

  it("normalizes backend deployment responses with a local fallback shape", () => {
    const fallback: DeploymentRecord = {
      id: "dep-fallback",
      projectId: "proj-1",
      projectName: "Launchpad",
      target: "vercel",
      status: "live",
      url: "https://launchpad.vercel.app",
      shortUrl: "launchpad.vercel.app",
      timestamp: "2026-07-28T00:00:00.000Z",
      duration: 12,
      triggeredBy: "manual",
      version: 4,
      domains: [],
      envVars: [],
      buildLogs: ["[info] fallback"],
    }

    const normalized = normalizeDeploymentRecord(
      {
        id: "dep-remote",
        url: "https://remote.example.com",
        buildLogs: ["[info] remote build"],
        status: "live",
      },
      fallback,
    )

    expect(normalized.id).toBe("dep-remote")
    expect(normalized.url).toBe("https://remote.example.com")
    expect(normalized.buildLogs).toEqual(["[info] remote build"])
    expect(normalized.projectName).toBe("Launchpad")
  })

  it("redacts secrets before saving or sending a deployment record", () => {
    const envVars = redactDeploymentEnvVars([
      { key: "PUBLIC_ORIGIN", value: "https://example.com", secret: false },
      {
        key: "PAYSTACK_SECRET_KEY",
        value: "sk_live_do-not-store",
        secret: true,
      },
    ])

    expect(envVars).toEqual([
      { key: "PUBLIC_ORIGIN", value: "https://example.com", secret: false },
      { key: "PAYSTACK_SECRET_KEY", value: "••••••••", secret: true },
    ])
  })

  it("describes preview preparation without claiming a provider deployment ran", () => {
    const logs = generateBuildLogs("Launchpad", "vercel")

    expect(logs.join("\n")).toContain("No files were uploaded")
    expect(logs.join("\n")).toContain("Preview ready")
    expect(logs.join("\n")).not.toContain("Deployed successfully")
  })
})
