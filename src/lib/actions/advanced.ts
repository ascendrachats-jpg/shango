import { db } from "@/lib/db"
import {
  components,
  componentInstances,
  agents,
  agentTasks,
  designSystems,
  designTokens,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { generateId } from "@/lib/store"

/**
 * Get the current user ID from the session via API call
 */
async function getUserId(): Promise<string> {
  const response = await fetch("/api/auth/session")
  if (!response.ok) throw new Error("Unauthorized")
  const session = await response.json()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

// === COMPONENT LIBRARY ACTIONS ===

/**
 * Create a new reusable component
 */
export async function createComponent(input: {
  name: string
  description?: string
  category?: string
  code: string
  language?: string
  props?: Record<string, any>
  isPublic?: boolean
  tags?: string[]
}): Promise<string> {
  const userId = await getUserId()
  const componentId = generateId()

  await db.insert(components).values({
    id: componentId,
    userId,
    name: input.name,
    description: input.description,
    category: input.category || "utility",
    code: input.code,
    language: input.language || "typescript",
    props: input.props,
    isPublic: input.isPublic || false,
    tags: input.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return componentId
}

/**
 * Get all public components or user's components
 */
export async function getComponents(includePrivate: boolean = false) {
  const userId = await getUserId()

  if (includePrivate) {
    return db.select().from(components).where(eq(components.userId, userId))
  }

  return db.select().from(components).where(eq(components.isPublic, true))
}

/**
 * Add a component instance to a project
 */
export async function addComponentToProject(input: {
  projectId: string
  componentId: string
  path: string
  props?: Record<string, any>
}): Promise<string> {
  const userId = await getUserId()
  const instanceId = generateId()

  await db.insert(componentInstances).values({
    id: instanceId,
    projectId: input.projectId,
    userId,
    componentId: input.componentId,
    path: input.path,
    props: input.props,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return instanceId
}

// === AI AGENT ACTIONS ===

/**
 * Create a new AI agent
 */
export async function createAgent(input: {
  name: string
  description?: string
  systemPrompt: string
  capabilities?: string[]
}): Promise<string> {
  const userId = await getUserId()
  const agentId = generateId()

  await db.insert(agents).values({
    id: agentId,
    userId,
    name: input.name,
    description: input.description,
    systemPrompt: input.systemPrompt,
    capabilities: input.capabilities || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return agentId
}

/**
 * Get all agents for the current user
 */
export async function getUserAgents() {
  const userId = await getUserId()

  return db.select().from(agents).where(eq(agents.userId, userId))
}

/**
 * Execute an agent task
 */
export async function executeAgentTask(input: {
  agentId: string
  projectId?: string
  prompt: string
}): Promise<string> {
  const userId = await getUserId()
  const taskId = generateId()

  // Create the task
  await db.insert(agentTasks).values({
    id: taskId,
    agentId: input.agentId,
    userId,
    projectId: input.projectId,
    prompt: input.prompt,
    status: "pending",
    createdAt: new Date(),
  })

  // In a real implementation, this would trigger an async job
  // For now, we just queue it
  return taskId
}

/**
 * Get agent task status
 */
export async function getAgentTaskStatus(taskId: string) {
  const task = await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.id, taskId))

  if (task.length === 0) return null

  return task[0]
}

/**
 * Update agent task status (called by agent executor)
 */
export async function updateAgentTaskStatus(
  taskId: string,
  status: string,
  result?: Record<string, any>,
  error?: string,
): Promise<void> {
  await db
    .update(agentTasks)
    .set({
      status,
      result: result || undefined,
      error: error || undefined,
      completedAt:
        status === "completed" || status === "failed" ? new Date() : undefined,
    })
    .where(eq(agentTasks.id, taskId))
}

// === DESIGN SYSTEM ACTIONS ===

/**
 * Create a new design system
 */
export async function createDesignSystem(input: {
  name: string
  description?: string
  colors?: Record<string, string>
  typography?: Record<string, any>
  spacing?: Record<string, string>
  borderRadius?: Record<string, string>
  shadows?: Record<string, string>
  isDefault?: boolean
}): Promise<string> {
  const userId = await getUserId()
  const systemId = generateId()

  await db.insert(designSystems).values({
    id: systemId,
    userId,
    name: input.name,
    description: input.description,
    colors: input.colors,
    typography: input.typography,
    spacing: input.spacing,
    borderRadius: input.borderRadius,
    shadows: input.shadows,
    isDefault: input.isDefault || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return systemId
}

/**
 * Get all design systems for the current user
 */
export async function getUserDesignSystems() {
  const userId = await getUserId()

  return db.select().from(designSystems).where(eq(designSystems.userId, userId))
}

/**
 * Get the default design system for the current user
 */
export async function getDefaultDesignSystem() {
  const userId = await getUserId()

  const result = await db
    .select()
    .from(designSystems)
    .where(
      and(eq(designSystems.userId, userId), eq(designSystems.isDefault, true)),
    )

  return result.length > 0 ? result[0] : null
}

/**
 * Add a design token to a system
 */
export async function addDesignToken(input: {
  designSystemId: string
  name: string
  type: string
  value: string
  description?: string
}): Promise<string> {
  const userId = await getUserId()
  const tokenId = generateId()

  await db.insert(designTokens).values({
    id: tokenId,
    designSystemId: input.designSystemId,
    userId,
    name: input.name,
    type: input.type,
    value: input.value,
    description: input.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return tokenId
}

/**
 * Get all tokens for a design system
 */
export async function getDesignSystemTokens(designSystemId: string) {
  return db
    .select()
    .from(designTokens)
    .where(eq(designTokens.designSystemId, designSystemId))
}

/**
 * Apply design system to a project
 */
export async function applyDesignSystemToProject(
  _projectId: string,
  designSystemId: string,
): Promise<void> {
  const userId = await getUserId()

  // In a real implementation, this would update the project's artifact
  // to include the design system tokens
  // For now, we just validate the user owns both resources
  const [system] = await Promise.all([
    db.select().from(designSystems).where(eq(designSystems.id, designSystemId)),
  ])

  if (system.length === 0 || system[0].userId !== userId) {
    throw new Error("Design system not found or not owned by user")
  }
}
