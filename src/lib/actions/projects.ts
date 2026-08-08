import { db } from "@/lib/db"
import {
  projects,
  projectFiles,
  projectVersions,
  deployments,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { generateId } from "@/lib/store"
import type {
  Project,
  ProjectFile,
  ProjectVersion,
  ProjectArtifact,
} from "@/lib/store"

/**
 * Get the current user ID from the session via API call
 * Used for server-side operations
 */
async function getUserId(): Promise<string> {
  // In a Vite app, we'll handle auth differently
  // For now, return a placeholder - in production this would call an auth endpoint
  const response = await fetch("/api/auth/session")
  if (!response.ok) throw new Error("Unauthorized")
  const session = await response.json()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

/**
 * Create a new SHANGO project
 */
export async function createProject(input: {
  name: string
  description?: string
  templateId?: string
}): Promise<Project> {
  const userId = await getUserId()
  const projectId = generateId()

  const now = new Date().toISOString()

  await db.insert(projects).values({
    id: projectId,
    userId,
    name: input.name,
    description: input.description,
    templateId: input.templateId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return {
    id: projectId,
    name: input.name,
    description: input.description || "",
    status: "DRAFT" as const,
    lastEdited: now,
    createdAt: now,
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  }
}

/**
 * Get all projects for the current user
 */
export async function getUserProjects(): Promise<Project[]> {
  const userId = await getUserId()

  const results = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))

  return results.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: "DRAFT" as const,
    lastEdited: p.updatedAt?.toISOString() || new Date().toISOString(),
    createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  }))
}

/**
 * Get a single project with all files
 */
export async function getProjectWithFiles(
  projectId: string,
): Promise<Project | null> {
  const userId = await getUserId()

  const projectRow = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  if (projectRow.length === 0) return null

  const project = projectRow[0]

  const filesRows = await db
    .select()
    .from(projectFiles)
    .where(
      and(
        eq(projectFiles.projectId, projectId),
        eq(projectFiles.userId, userId),
      ),
    )

  const versionsRows = await db
    .select()
    .from(projectVersions)
    .where(
      and(
        eq(projectVersions.projectId, projectId),
        eq(projectVersions.userId, userId),
      ),
    )

  const files: ProjectFile[] = filesRows.map((f) => ({
    id: f.id,
    path: f.path || "",
    name: f.path?.split("/").pop() || "file",
    extension: f.path?.split(".").pop() || "txt",
    content: f.content,
    language: f.language || "typescript",
    createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: f.updatedAt?.toISOString() || new Date().toISOString(),
  }))

  const versions: ProjectVersion[] = versionsRows.map((v) => ({
    id: v.id,
    number: v.number || 0,
    prompt: v.prompt,
    artifact: v.artifact as ProjectArtifact | undefined,
    assistantMessage: v.assistantMessage || undefined,
    isCurrent: v.isCurrent || false,
    label: v.label || `v${v.number || 0}`,
    timestamp: v.createdAt?.toISOString() || new Date().toISOString(),
    createdAt: v.createdAt?.toISOString() || new Date().toISOString(),
    trigger: { type: "iteration" as const, prompt: v.prompt },
    provenance: v.provenance as any,
  }))

  return {
    id: project.id,
    name: project.name,
    description: project.description || "",
    status: "DRAFT" as const,
    lastEdited: project.updatedAt?.toISOString() || new Date().toISOString(),
    createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions,
    files,
    artifact: project.artifact as ProjectArtifact | undefined,
    lastGeneration: project.lastGeneration as any,
  }
}

/**
 * Save project files (used after generation)
 */
export async function saveProjectFiles(
  projectId: string,
  files: ProjectFile[],
): Promise<void> {
  const userId = await getUserId()

  // Verify ownership
  const projectRow = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (projectRow.length === 0) throw new Error("Project not found")

  // Delete existing files
  await db
    .delete(projectFiles)
    .where(
      and(
        eq(projectFiles.projectId, projectId),
        eq(projectFiles.userId, userId),
      ),
    )

  // Insert new files
  for (const file of files) {
    await db.insert(projectFiles).values({
      id: generateId(),
      projectId,
      userId,
      path: file.path,
      content: file.content,
      language: file.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Update project's updatedAt
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
}

/**
 * Create a new version (checkpoint) of the project
 */
export async function createProjectVersion(
  projectId: string,
  input: {
    prompt: string
    artifact?: any
    assistantMessage?: string
    provenance?: any
  },
): Promise<ProjectVersion> {
  const userId = await getUserId()

  // Verify ownership
  const projectRow = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (projectRow.length === 0) throw new Error("Project not found")

  // Mark previous current as not current
  await db
    .update(projectVersions)
    .set({ isCurrent: false })
    .where(
      and(
        eq(projectVersions.projectId, projectId),
        eq(projectVersions.userId, userId),
        eq(projectVersions.isCurrent, true),
      ),
    )

  // Get next version number
  const lastVersion = await db
    .select()
    .from(projectVersions)
    .where(
      and(
        eq(projectVersions.projectId, projectId),
        eq(projectVersions.userId, userId),
      ),
    )
    .limit(1)

  const nextNumber = (lastVersion[0]?.number || 0) + 1
  const versionId = generateId()
  const now = new Date()

  await db.insert(projectVersions).values({
    id: versionId,
    projectId,
    userId,
    number: nextNumber,
    prompt: input.prompt,
    artifact: input.artifact,
    assistantMessage: input.assistantMessage,
    isCurrent: true,
    provenance: input.provenance,
    createdAt: now,
  })

  return {
    id: versionId,
    number: nextNumber,
    prompt: input.prompt,
    artifact: input.artifact as ProjectArtifact | undefined,
    assistantMessage: input.assistantMessage,
    isCurrent: true,
    timestamp: now.toISOString(),
    createdAt: now.toISOString(),
    label: `v${nextNumber}`,
    trigger: { type: "iteration" as const, prompt: input.prompt },
    provenance: input.provenance,
  }
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  deploymentId: string,
): Promise<{
  id: string
  status: string
  url?: string
  buildLog?: string
} | null> {
  const deployment = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, deploymentId))

  if (deployment.length === 0) return null

  const deploy = deployment[0]
  return {
    id: deploy.id,
    status: deploy.status || "pending",
    url: deploy.url || undefined,
    buildLog: deploy.buildLog || undefined,
  }
}

/**
 * Create a deployment for a project
 */
export async function createDeployment(projectId: string): Promise<string> {
  const userId = await getUserId()

  // Verify ownership and get project
  const projectRow = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (projectRow.length === 0) throw new Error("Project not found")

  const deploymentId = generateId()

  await db.insert(deployments).values({
    id: deploymentId,
    projectId,
    userId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return deploymentId
}

/**
 * Update deployment status (called after build/deploy)
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: string,
  url?: string,
  buildLog?: string,
): Promise<void> {
  await db
    .update(deployments)
    .set({
      status,
      url: url || undefined,
      buildLog: buildLog || undefined,
      updatedAt: new Date(),
    })
    .where(eq(deployments.id, deploymentId))
}
