/**
 * Vercel REST API Client for SHANGO deployments
 * Handles project creation, deployment, and monitoring
 */

export interface VercelProject {
  id: string
  name: string
  accountId: string
  createdAt: number
  updatedAt: number
  latestDeploymentId?: string
}

export interface VercelDeployment {
  id: string
  projectId: string
  state: "INITIALIZING" | "QUEUED" | "BUILDING" | "ERROR" | "CANCELED" | "READY"
  url?: string
  createdAt: number
  updatedAt: number
}

export interface VercelFile {
  file: string
  sha: string
  size: number
}

export class VercelClient {
  private baseUrl = "https://api.vercel.com"
  private token: string

  constructor(token: string) {
    if (!token) {
      throw new Error("VERCEL_TOKEN is required")
    }
    this.token = token
  }

  /**
   * Create a new Vercel project for a SHANGO project
   */
  async createProject(
    projectName: string,
    projectDescription?: string,
  ): Promise<VercelProject> {
    const response = await fetch(`${this.baseUrl}/v10/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription,
        framework: "vite",
        publicSource: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create Vercel project: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get a Vercel project by ID
   */
  async getProject(projectId: string): Promise<VercelProject> {
    const response = await fetch(`${this.baseUrl}/v9/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get Vercel project: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Deploy a Vercel project with files
   * Returns the deployment ID
   */
  async deployProject(
    vercelProjectId: string,
    files: Array<{ path: string; content: string }>,
    description?: string,
  ): Promise<VercelDeployment> {
    // Convert files to Vercel deployment format
    const fileEntries: Record<string, string> = {}
    for (const file of files) {
      fileEntries[file.path] = file.content
    }

    const response = await fetch(`${this.baseUrl}/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: vercelProjectId,
        files: fileEntries,
        projectSettings: {
          framework: "vite",
          buildCommand: "vite build",
          outputDirectory: "dist",
          devCommand: "vite dev",
        },
        meta: {
          description: description || "Deployed from SHANGO",
          deploymentId: vercelProjectId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to deploy: ${response.statusText}`)
    }

    const deployment = await response.json()
    return {
      id: deployment.id,
      projectId: vercelProjectId,
      state: deployment.state || "INITIALIZING",
      url: deployment.url,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    }
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    const response = await fetch(
      `${this.baseUrl}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to get deployment: ${response.statusText}`)
    }

    const deployment = await response.json()
    return {
      id: deployment.id,
      projectId: deployment.projectId || "",
      state: deployment.state || "INITIALIZING",
      url: deployment.url,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    }
  }

  /**
   * List deployments for a project
   */
  async listDeployments(
    vercelProjectId: string,
    limit = 10,
  ): Promise<VercelDeployment[]> {
    const response = await fetch(
      `${this.baseUrl}/v6/deployments?projectId=${vercelProjectId}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to list deployments: ${response.statusText}`)
    }

    const data = await response.json()
    return (data.deployments || []).map((d: any) => ({
      id: d.id,
      projectId: d.projectId || vercelProjectId,
      state: d.state || "INITIALIZING",
      url: d.url,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/v13/deployments/${deploymentId}/cancel`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to cancel deployment: ${response.statusText}`)
    }
  }

  /**
   * Get deployment build logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/v13/deployments/${deploymentId}/builds`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to get deployment logs: ${response.statusText}`)
    }

    const data = await response.json()
    return (
      data.builds
        ?.map((b: any) => b.logs?.map((l: any) => l.message).join("\n"))
        .join("\n") || ""
    )
  }
}

/**
 * Get Vercel client instance
 * Uses VERCEL_TOKEN from environment
 */
export function getVercelClient(): VercelClient {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error("VERCEL_TOKEN environment variable is not set")
  }
  return new VercelClient(token)
}
