import { describe, expect, it } from "vitest"
import {
  buildDeploymentRecordFromResponse,
  normalizeDeploymentRecords,
  type DeploymentRecord,
  type DeployTargetId,
  type DeployStatus,
} from "../lib/deployments"

describe("normalizeDeploymentRecords", () => {
  it("prefers remote deployment records and preserves their shape", () => {
    const fallback: DeploymentRecord[] = [
      {
        id: "local-1",
        projectId: "proj-1",
        projectName: "Fallback project",
        target: "vercel",
        status: "live",
        url: "https://fallback.vercel.app",
        shortUrl: "fallback.vercel.app",
        timestamp: "2026-07-28T00:00:00.000Z",
        duration: 10,
        triggeredBy: "manual",
        domains: [
          {
            domain: "fallback.vercel.app",
            status: "active",
            sslStatus: "active",
            isPrimary: true,
          },
        ],
        envVars: [],
        buildLogs: ["[info] fallback"],
      },
    ]

    const remote = [
      {
        id: "remote-1",
        projectId: "proj-2",
        projectName: "Remote project",
        target: "netlify" as DeployTargetId,
        status: "live" as DeployStatus,
        url: "https://remote.netlify.app",
        shortUrl: "remote.netlify.app",
        timestamp: "2026-07-28T01:00:00.000Z",
        duration: 18,
        triggeredBy: "api",
        domains: [
          {
            domain: "remote.netlify.app",
            status: "active" as const,
            sslStatus: "active" as const,
            isPrimary: true,
          },
        ],
        envVars: [{ key: "NODE_ENV", value: "production", secret: false }],
        buildLogs: ["[info] remote build"],
      },
    ]

    const result = normalizeDeploymentRecords(remote, fallback)

    expect(result).toHaveLength(1)
    expect(result[0].projectName).toBe("Remote project")
    expect(result[0].target).toBe("netlify")
    expect(result[0].buildLogs).toEqual(["[info] remote build"])
  })

  it("falls back to local deployment records when the backend returns none", () => {
    const fallback: DeploymentRecord[] = [
      {
        id: "local-2",
        projectId: "proj-3",
        projectName: "Fallback project",
        target: "cloudflare",
        status: "live",
        url: "https://fallback.pages.dev",
        shortUrl: "fallback.pages.dev",
        timestamp: "2026-07-28T00:00:00.000Z",
        duration: 10,
        triggeredBy: "manual",
        domains: [
          {
            domain: "fallback.pages.dev",
            status: "active",
            sslStatus: "active",
            isPrimary: true,
          },
        ],
        envVars: [],
        buildLogs: ["[info] fallback"],
      },
    ]

    const result = normalizeDeploymentRecords([], fallback)

    expect(result).toEqual(fallback)
  })

  it("normalizes backend deployment payloads wrapped in a deployment object", () => {
    const fallback: DeploymentRecord = {
      id: "local-3",
      projectId: "proj-4",
      projectName: "Fallback project",
      target: "vercel",
      status: "live",
      url: "https://fallback.vercel.app",
      shortUrl: "fallback.vercel.app",
      timestamp: "2026-07-28T00:00:00.000Z",
      duration: 10,
      triggeredBy: "manual",
      domains: [
        {
          domain: "fallback.vercel.app",
          status: "active",
          sslStatus: "active",
          isPrimary: true,
        },
      ],
      envVars: [],
      buildLogs: ["[info] fallback"],
    }

    const result = buildDeploymentRecordFromResponse(
      {
        deployment: {
          id: "remote-3",
          projectId: "proj-4",
          projectName: "Remote project",
          target: "netlify" as DeployTargetId,
          status: "live" as DeployStatus,
          url: "https://remote.netlify.app",
          shortUrl: "remote.netlify.app",
          timestamp: "2026-07-28T01:00:00.000Z",
          duration: 18,
          triggeredBy: "api",
          domains: [
            {
              domain: "remote.netlify.app",
              status: "active",
              sslStatus: "active",
              isPrimary: true,
            },
          ],
          envVars: [],
          buildLogs: ["[info] remote build"],
        },
      },
      fallback,
    )

    expect(result.projectName).toBe("Remote project")
    expect(result.target).toBe("netlify")
    expect(result.id).toBe("remote-3")
  })
})
