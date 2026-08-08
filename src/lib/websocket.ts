import { db } from "./db"
import {
  collaborationEvents,
  presenceState,
  projectCollaborators,
} from "./db/schema"
import { eq, and, lt } from "drizzle-orm"
import { generateId } from "./store"

// WebSocket message types
export type CollaborationMessage = {
  type: "join"
  projectId: string
  userId: string
  sessionId: string
} | { type: "leave"; projectId: string; userId: string; sessionId: string } | {
  type: "file-change"
  projectId: string
  userId: string
  filePath: string
  content: string
  versionVector: Record<string, number>
} | {
  type: "presence"
  projectId: string
  userId: string
  cursorPosition: { line: number; column: number }
  selectedFile: string
} | {
  type: "comment"
  projectId: string
  userId: string
  filePath: string
  text: string
} | { type: "heartbeat"; projectId: string; userId: string; sessionId: string } | {
  type: "sync-request"
  projectId: string
  userId: string
  lastEventId: string
}

export interface PresenceUser {
  userId: string
  sessionId: string
  cursorPosition?: { line: number; column: number }
  selectedFile?: string
  status: "active" | "idle" | "offline"
  lastHeartbeat: Date
}

// Room management
const rooms = new Map<string, Set<string>>() // projectId -> Set<userId>
const presence = new Map<string, Map<string, PresenceUser>>() // projectId -> userId -> PresenceUser
const versionVectors = new Map<string, Record<string, number>>() // projectId -> versionVector

/**
 * Add user to collaboration room
 */
export async function joinRoom(
  projectId: string,
  userId: string,
  sessionId: string,
) {
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

  // Add to room
  if (!rooms.has(projectId)) {
    rooms.set(projectId, new Set())
    versionVectors.set(projectId, {})
  }
  rooms.get(projectId)!.add(userId)

  // Initialize presence
  if (!presence.has(projectId)) {
    presence.set(projectId, new Map())
  }

  const userPresence: PresenceUser = {
    userId,
    sessionId,
    status: "active",
    lastHeartbeat: new Date(),
  }
  presence.get(projectId)!.set(userId, userPresence)

  // Record presence state
  await db.insert(presenceState).values({
    id: generateId(),
    projectId,
    userId,
    sessionId,
    status: "active",
    lastHeartbeat: new Date(),
  })

  return {
    success: true,
    presence: Array.from(presence.get(projectId)!.values()),
    versionVector: versionVectors.get(projectId),
  }
}

/**
 * Remove user from collaboration room
 */
export async function leaveRoom(
  projectId: string,
  userId: string,
  sessionId: string,
) {
  rooms.get(projectId)?.delete(userId)
  presence.get(projectId)?.delete(userId)

  // Update presence state
  await db
    .update(presenceState)
    .set({ status: "offline", updatedAt: new Date() })
    .where(
      and(
        eq(presenceState.projectId, projectId),
        eq(presenceState.userId, userId),
        eq(presenceState.sessionId, sessionId),
      ),
    )

  return {
    success: true,
    presence: Array.from(presence.get(projectId)?.values() || []),
  }
}

/**
 * Apply file change with Antigravity merge (deterministic resolution)
 * Version vectors ensure causal ordering
 */
export async function applyFileChange(
  projectId: string,
  userId: string,
  filePath: string,
  content: string,
  versionVector: Record<string, number>,
) {
  const eventId = generateId()

  // Record collaboration event
  await db.insert(collaborationEvents).values({
    id: eventId,
    projectId,
    userId,
    eventType: "fileChange",
    filePath,
    content: { content },
    versionVector,
    createdAt: new Date(),
  })

  // Update room's version vector
  const currentVector = versionVectors.get(projectId) || {}
  currentVector[userId] = (currentVector[userId] || 0) + 1
  versionVectors.set(projectId, currentVector)

  return {
    success: true,
    eventId,
    versionVector: currentVector,
  }
}

/**
 * Update user presence (cursor position, selected file)
 */
export async function updatePresence(
  projectId: string,
  userId: string,
  sessionId: string,
  cursorPosition?: { line: number; column: number },
  selectedFile?: string,
) {
  const userPresence = presence.get(projectId)?.get(userId)
  if (userPresence) {
    if (cursorPosition) userPresence.cursorPosition = cursorPosition
    if (selectedFile) userPresence.selectedFile = selectedFile
    userPresence.lastHeartbeat = new Date()
  }

  // Record in database
  await db
    .update(presenceState)
    .set({
      cursorPosition: cursorPosition
        ? JSON.stringify(cursorPosition)
        : undefined,
      selectedFile,
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(presenceState.projectId, projectId),
        eq(presenceState.userId, userId),
        eq(presenceState.sessionId, sessionId),
      ),
    )

  return {
    success: true,
    presence: Array.from(presence.get(projectId)?.values() || []),
  }
}

/**
 * Get all active users in room with their presence
 */
export async function getRoomPresence(projectId: string) {
  return Array.from(presence.get(projectId)?.values() || [])
}

/**
 * Get room collaboration events for sync
 */
export async function getRecentEvents(projectId: string, since?: string) {
  const whereClause = since
    ? and(eq(collaborationEvents.projectId, projectId))
    : eq(collaborationEvents.projectId, projectId)

  const events = await db
    .select()
    .from(collaborationEvents)
    .where(whereClause)
    .orderBy(collaborationEvents.createdAt)
    .limit(100)

  return events
}

/**
 * Clean up stale presence states (heartbeat timeout > 5 minutes)
 */
export async function cleanupStalePresence(projectId?: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const stalePresence = await db
    .select()
    .from(presenceState)
    .where(
      projectId
        ? and(
            eq(presenceState.projectId, projectId),
            lt(presenceState.lastHeartbeat, fiveMinutesAgo),
          )
        : lt(presenceState.lastHeartbeat, fiveMinutesAgo),
    )

  // Remove from memory
  for (const record of stalePresence) {
    presence.get(record.projectId)?.delete(record.userId)
    rooms.get(record.projectId)?.delete(record.userId)
  }

  // Mark as offline in database
  if (projectId) {
    await db
      .update(presenceState)
      .set({ status: "offline", updatedAt: new Date() })
      .where(
        and(
          eq(presenceState.projectId, projectId),
          lt(presenceState.lastHeartbeat, fiveMinutesAgo),
        ),
      )
  } else {
    await db
      .update(presenceState)
      .set({ status: "offline", updatedAt: new Date() })
      .where(lt(presenceState.lastHeartbeat, fiveMinutesAgo))
  }

  return stalePresence.length
}
