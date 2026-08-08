import { db } from "@/lib/db"
import { projectCollaborators, collaborationEvents } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { generateId } from "@/lib/store"

/**
 * Get current user ID from session (Vite app pattern)
 */
async function getUserId(): Promise<string> {
  const response = await fetch("/api/auth/session")
  if (!response.ok) throw new Error("Unauthorized")
  const session = await response.json()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

/**
 * Add collaborator to project with role
 */
export async function addCollaborator(
  projectId: string,
  email: string,
  role: "editor" | "viewer" = "editor",
) {
  const userId = await getUserId()

  // Verify user is project owner
  const ownership = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
        eq(projectCollaborators.role, "owner"),
      ),
    )

  if (ownership.length === 0) {
    throw new Error("Only project owner can add collaborators")
  }

  // Look up user by email (simplified - in production would search users table)
  // For now, return invite token that can be accepted
  const inviteToken = generateId()
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const collaboratorId = generateId()
  await db.insert(projectCollaborators).values({
    id: collaboratorId,
    projectId,
    userId: email, // Store email temporarily - will be replaced with real userId on accept
    role,
    invitedBy: userId,
    inviteToken,
    inviteExpiresAt,
    createdAt: new Date(),
  })

  return {
    inviteToken,
    email,
    role,
    expiresAt: inviteExpiresAt,
  }
}

/**
 * Accept collaboration invite
 */
export async function acceptCollaboratorInvite(inviteToken: string) {
  const userId = await getUserId()

  const invite = await db
    .select()
    .from(projectCollaborators)
    .where(eq(projectCollaborators.inviteToken, inviteToken))

  if (invite.length === 0) {
    throw new Error("Invalid or expired invite")
  }

  const inviteRecord = invite[0]

  if (
    inviteRecord.inviteExpiresAt &&
    inviteRecord.inviteExpiresAt < new Date()
  ) {
    throw new Error("Invite has expired")
  }

  // Update invite with actual userId
  await db
    .update(projectCollaborators)
    .set({
      userId,
      inviteToken: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(projectCollaborators.id, inviteRecord.id))

  return {
    projectId: inviteRecord.projectId,
    role: inviteRecord.role,
  }
}

/**
 * Remove collaborator from project
 */
export async function removeCollaborator(
  projectId: string,
  collaboratorId: string,
) {
  const userId = await getUserId()

  // Verify user is project owner
  const ownership = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
        eq(projectCollaborators.role, "owner"),
      ),
    )

  if (ownership.length === 0) {
    throw new Error("Only project owner can remove collaborators")
  }

  await db
    .delete(projectCollaborators)
    .where(eq(projectCollaborators.id, collaboratorId))

  return { success: true }
}

/**
 * Update collaborator role
 */
export async function updateCollaboratorRole(
  projectId: string,
  collaboratorId: string,
  role: "editor" | "viewer",
) {
  const userId = await getUserId()

  // Verify user is project owner
  const ownership = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
        eq(projectCollaborators.role, "owner"),
      ),
    )

  if (ownership.length === 0) {
    throw new Error("Only project owner can modify roles")
  }

  await db
    .update(projectCollaborators)
    .set({ role, updatedAt: new Date() })
    .where(eq(projectCollaborators.id, collaboratorId))

  return { success: true, role }
}

/**
 * Get all collaborators for a project
 */
export async function getProjectCollaborators(projectId: string) {
  const userId = await getUserId()

  // Verify user has access to project
  const access = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
      ),
    )

  if (access.length === 0) {
    throw new Error("No access to project")
  }

  // Get all collaborators
  const collaborators = await db
    .select()
    .from(projectCollaborators)
    .where(eq(projectCollaborators.projectId, projectId))

  return collaborators.map((c) => ({
    id: c.id,
    userId: c.userId,
    role: c.role,
    email: c.userId, // Simplified - would look up real email in production
    addedAt: c.createdAt,
    addedBy: c.invitedBy,
  }))
}

/**
 * Get collaboration audit trail for a project
 */
export async function getCollaborationAuditTrail(
  projectId: string,
  limit = 50,
) {
  const userId = await getUserId()

  // Verify user has access to project
  const access = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
      ),
    )

  if (access.length === 0) {
    throw new Error("No access to project")
  }

  const events = await db
    .select()
    .from(collaborationEvents)
    .where(eq(collaborationEvents.projectId, projectId))
    .orderBy(collaborationEvents.createdAt)
    .limit(limit)

  return events.map((e) => ({
    id: e.id,
    userId: e.userId,
    eventType: e.eventType,
    filePath: e.filePath,
    timestamp: e.createdAt,
    content: e.content,
  }))
}

/**
 * Transfer project ownership
 */
export async function transferOwnership(projectId: string, newOwnerId: string) {
  const userId = await getUserId()

  // Verify current user is owner
  const currentOwnership = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
        eq(projectCollaborators.role, "owner"),
      ),
    )

  if (currentOwnership.length === 0) {
    throw new Error("Only project owner can transfer ownership")
  }

  // Demote current owner to editor
  await db
    .update(projectCollaborators)
    .set({ role: "editor", updatedAt: new Date() })
    .where(eq(projectCollaborators.id, currentOwnership[0].id))

  // Promote new owner
  const newOwnerRecord = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, newOwnerId),
      ),
    )

  if (newOwnerRecord.length === 0) {
    throw new Error("New owner is not a collaborator")
  }

  await db
    .update(projectCollaborators)
    .set({ role: "owner", updatedAt: new Date() })
    .where(eq(projectCollaborators.id, newOwnerRecord[0].id))

  return { success: true }
}
