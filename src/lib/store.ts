export type ProjectStatus = "LIVE" | "DRAFT" | "ARCHIVED"

/**
 * A single message in the builder<->Shango conversation.
 * `pending` marks an optimistic assistant placeholder shown while a
 * generation request is in flight; it is replaced once the real response
 * arrives (see appendChatMessageToProject).
 */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  pending?: boolean
}

import type { ConversationBlock } from "./conversation"

// Re-export so consumers can import the canonical block type from the
// single `./store` entry point.
export type { ConversationBlock }

export interface Version {
  id: string
  number: number
  label: string
  timestamp: string
  prompt: string
  isCurrent: boolean
}

// Extended Version snapshot for real versioning
export interface ProjectVersion {
  id: string
  number: number
  label: string
  timestamp: string
  prompt: string
  isCurrent: boolean
  createdAt: string
  trigger: { type: "initial-generation" | "iteration"; prompt: string }
  assistantMessage?: string
  artifact?: ProjectArtifact
  files?: ProjectFile[]
  provenance?: GenerationProvenance
}

export interface GenerationProvenance {
  id: string
  timestamp: string
  provider: string
  model?: string
  mode: "plan" | "build"
  prompt: string
  operations: Array<{ path: string; operation: "create" | "modify" | "delete" }>
  // Convenience view of operations using the "type" vocabulary expected by
  // the WhatChangedPanel UI. Populated by the generation pipeline alongside
  // `operations` so the workspace diff surface can render without mapping.
  fileChanges?: Array<{ path: string; type: "create" | "modify" | "delete" }>
  rejectedOperations?: Array<{
    path: string
    reason: "invalid-path" | "protected-file"
  }>
  skills?: Array<{ id: string; name: string; purpose: string }>
}

export interface ProjectArtifactFile {
  path: string
  content: string
  language: "html" | "css" | "tsx" | "ts" | "js" | "jsx" | "json" | "md" | "text"
}

export interface ProjectArtifact {
  html?: string
  css?: string
  js?: string
  title: string
  description: string
  createdAt: string
  files?: ProjectArtifactFile[]
}

export interface ProjectFile {
  id: string
  path: string
  name: string
  extension: string
  language: string
  content: string
  createdAt: string
  updatedAt: string
  lastModified?: string
  size?: number
  kind?: "file" | "directory"
  userModified?: boolean
}

export interface ProjectTemplateOrigin {
  id: string
  name: string
  category: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  lastEdited: string
  updatedAt?: string
  createdAt: string
  starred: boolean
  blocks: ConversationBlock[]
  messages: ChatMessage[]
  versions: ProjectVersion[]
  thumbnail?: string
  initialPrompt?: string
  artifact?: ProjectArtifact
  files?: ProjectFile[]
  // Optional non-secret diagnostics returned by the generation backend
  providerDiagnostics?: string
  // ISO timestamp set when a generation begins; cleared on completion/error.
  // Used by mergePersistedProjects() to protect in-flight local state from
  // being overwritten by a stale remote snapshot.
  generatingAt?: string
  // The last accepted AI change record. Full historical records live on versions.
  lastGeneration?: GenerationProvenance
  template?: ProjectTemplateOrigin
}

let counter = 0
export function generateId(): string {
  return `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 7)}`
}

export function timeAgo(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

export function duplicateProject(project: Project): Project {
  const now = new Date().toISOString()
  return {
    ...project,
    id: generateId(),
    name: `${project.name} (copy)`,
    status: "DRAFT",
    lastEdited: now,
    updatedAt: now,
    createdAt: now,
    starred: false,
    blocks: project.blocks.map((block) => ({
      ...block,
      id: generateId(),
    })),
    messages: (project.messages ?? []).map((message) => ({
      ...message,
      id: generateId(),
    })),
    versions: project.versions.map((version) => ({
      ...version,
      id: generateId(),
      isCurrent: false,
      timestamp: now,
      createdAt: now,
    })),
    artifact: project.artifact
      ? { ...project.artifact, createdAt: now }
      : undefined,
    providerDiagnostics: project.providerDiagnostics,
  }
}

export function updateProject(
  project: Project,
  updates: Partial<Project>,
): Project {
  const now = new Date().toISOString()
  return {
    ...project,
    ...updates,
    lastEdited: now,
    updatedAt: now,
  }
}

export function removeProject(
  projects: Project[],
  projectId: string,
  activeProjectId: string | null,
): { projects: Project[]; activeProjectId: string | null } {
  const nextProjects = projects.filter((project) => project.id !== projectId)
  const nextActiveProjectId =
    activeProjectId === projectId ? null : activeProjectId
  return { projects: nextProjects, activeProjectId: nextActiveProjectId }
}

export function ensureProjectInList(
  projects: Project[],
  project: Project,
): Project[] {
  const existingIndex = projects.findIndex((item) => item.id === project.id)
  if (existingIndex >= 0) {
    return projects.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            ...project,
            updatedAt: project.updatedAt ?? item.updatedAt,
            lastEdited: project.lastEdited ?? item.lastEdited,
          }
        : item,
    )
  }
  return [project, ...projects]
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Lagos Health Portal",
    description: "Patient management system for urban clinics across Lagos",
    status: "LIVE",
    lastEdited: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    starred: true,
    blocks: [
      {
        id: "m1",
        type: "dialogue.user",
        content: "Build a patient management portal for Lagos clinics",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: "m2",
        type: "dialogue.shango",
        content:
          "Creating a comprehensive health portal with patient records, appointment scheduling, and clinic management...",
        createdAt: new Date(
          Date.now() - 1000 * 60 * 60 * 2 + 5000,
        ).toISOString(),
      },
    ],
    messages: [],
    versions: [
      {
        id: "v1",
        number: 1,
        label: "Initial build",
        timestamp: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 14,
        ).toISOString(),
        prompt: "Build a patient management portal",
        isCurrent: false,
        createdAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 14,
        ).toISOString(),
        trigger: {
          type: "initial-generation",
          prompt: "Build a patient management portal",
        },
      },
      {
        id: "v2",
        number: 2,
        label: "Added appointment flow",
        timestamp: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
        prompt: "Add appointment scheduling",
        isCurrent: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
        trigger: { type: "iteration", prompt: "Add appointment scheduling" },
      },
    ],
  },
  {
    id: "proj-2",
    name: "Nairobi Fintech Dashboard",
    description:
      "Real-time transaction monitoring and analytics for mobile money",
    status: "LIVE",
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions: [
      {
        id: "v1",
        number: 1,
        label: "MVP dashboard",
        timestamp: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        prompt: "Fintech dashboard for M-PESA analytics",
        isCurrent: true,
        createdAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        trigger: {
          type: "initial-generation",
          prompt: "Fintech dashboard for M-PESA analytics",
        },
      },
    ],
  },
  {
    id: "proj-3",
    name: "Accra Marketplace",
    description:
      "Artisan marketplace connecting craftspeople with global buyers",
    status: "DRAFT",
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    starred: true,
    blocks: [],
    messages: [],
    versions: [],
  },
  {
    id: "proj-4",
    name: "Kigali AgriTrack",
    description: "Crop monitoring and supply chain for East African farmers",
    status: "DRAFT",
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  },
  {
    id: "proj-5",
    name: "Cape Town Event Platform",
    description: "Cultural events discovery and booking for Southern Africa",
    status: "ARCHIVED",
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  },
]
