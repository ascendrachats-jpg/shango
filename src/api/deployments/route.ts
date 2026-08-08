/**
 * Deployment API Route
 * Handles project deployment requests
 */

import { prepareBuild } from "@/lib/build"
import { getVercelClient } from "@/lib/vercel"
import {
  getProjectWithFiles,
  createDeployment,
  updateDeploymentStatus,
} from "@/lib/actions/projects"
import type { ProjectFile } from "@/lib/store"

/**
 * POST /api/deployments
 * Start a new deployment for a project
 */
export async function POST(req: Request) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get project and files
    let project
    try {
      project = await getProjectWithFiles(projectId)
    } catch (error) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!project || !project.files || project.files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Project has no files to deploy" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Create deployment record
    const deploymentId = await createDeployment(projectId)

    // Prepare build
    const buildResult = prepareBuild(project.files as ProjectFile[], projectId)

    if (!buildResult.success || !buildResult.artifact) {
      await updateDeploymentStatus(
        deploymentId,
        "error",
        undefined,
        buildResult.buildLog,
      )

      return new Response(
        JSON.stringify({
          deploymentId,
          status: "error",
          error: buildResult.error,
          buildLog: buildResult.buildLog,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Update build log
    await updateDeploymentStatus(
      deploymentId,
      "building",
      undefined,
      buildResult.buildLog,
    )

    // Deploy to Vercel
    let vercelDeployment
    try {
      const vercelClient = getVercelClient()

      // Convert files for Vercel
      const deployFiles = buildResult.artifact.files.map((f) => ({
        path: f.path,
        content: f.content,
      }))

      vercelDeployment = await vercelClient.deployProject(
        projectId,
        deployFiles,
        `SHANGO deployment: ${project.name}`,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown deployment error"
      await updateDeploymentStatus(
        deploymentId,
        "error",
        undefined,
        `${buildResult.buildLog}\n[Error] Vercel deployment failed: ${errorMessage}`,
      )

      return new Response(
        JSON.stringify({
          deploymentId,
          status: "error",
          error: errorMessage,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Update with deployment URL
    const deployLog = `${buildResult.buildLog}\n[Deploy] Vercel deployment: ${vercelDeployment.state}\nURL: ${vercelDeployment.url || "pending"}`
    await updateDeploymentStatus(
      deploymentId,
      vercelDeployment.state,
      vercelDeployment.url,
      deployLog,
    )

    return new Response(
      JSON.stringify({
        deploymentId,
        vercelDeploymentId: vercelDeployment.id,
        status: vercelDeployment.state,
        url: vercelDeployment.url,
        buildLog: deployLog,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * GET /api/deployments/[deploymentId]
 * Get deployment status
 */
export async function GET(
  _req: Request,
  { params }: { params: { deploymentId: string } },
) {
  try {
    const deploymentId = params?.deploymentId

    if (!deploymentId) {
      return new Response(
        JSON.stringify({ error: "deploymentId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // This would fetch from database and Vercel
    return new Response(
      JSON.stringify({ deploymentId, status: "not-implemented" }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
