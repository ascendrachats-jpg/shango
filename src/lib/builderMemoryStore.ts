import { createInitialMemory, type ProjectDecision, type ProjectMemory } from "./builderIntelligence.ts"

export interface PendingDecision {
  id: string
  question: string
  category: string
  options?: string[]
  resumePrompt: string
  createdAt: string
}

export interface ExtendedProjectMemory extends ProjectMemory {
  pendingDecision?: PendingDecision
}

const memoryStore = new Map<string, ExtendedProjectMemory>()

export function getProjectMemory(projectId: string): ExtendedProjectMemory {
  if (!memoryStore.has(projectId)) {
    memoryStore.set(projectId, createInitialMemory())
  }
  return memoryStore.get(projectId)!
}

export function saveProjectMemory(projectId: string, memory: ExtendedProjectMemory): void {
  memoryStore.set(projectId, memory)
}

export function recordProjectDecision(
  projectId: string,
  key: string,
  value: string,
  source: "user" | "shango_default" = "user",
): ExtendedProjectMemory {
  const mem = getProjectMemory(projectId)
  const existingIdx = mem.decisions.findIndex((d) => d.key === key)
  const newDecision: ProjectDecision = {
    key,
    value,
    source,
    timestamp: new Date().toISOString(),
  }

  const updatedDecisions = existingIdx >= 0
    ? mem.decisions.map((d, idx) => (idx === existingIdx ? newDecision : d))
    : [...mem.decisions, newDecision]

  const updatedMemory: ExtendedProjectMemory = {
    ...mem,
    decisions: updatedDecisions,
    pendingDecision: undefined, // clear pending decision upon resolution
  }

  saveProjectMemory(projectId, updatedMemory)
  return updatedMemory
}

export function setPendingDecision(
  projectId: string,
  question: string,
  category: string,
  resumePrompt: string,
  options?: string[],
): ExtendedProjectMemory {
  const mem = getProjectMemory(projectId)
  const pending: PendingDecision = {
    id: `dec-${Date.now()}`,
    question,
    category,
    options,
    resumePrompt,
    createdAt: new Date().toISOString(),
  }

  const updated: ExtendedProjectMemory = {
    ...mem,
    pendingDecision: pending,
  }

  saveProjectMemory(projectId, updated)
  return updated
}

export function clearPendingDecision(projectId: string): ExtendedProjectMemory {
  const mem = getProjectMemory(projectId)
  const updated: ExtendedProjectMemory = {
    ...mem,
    pendingDecision: undefined,
  }
  saveProjectMemory(projectId, updated)
  return updated
}

export function clearAllMemoryStore(): void {
  memoryStore.clear()
}
