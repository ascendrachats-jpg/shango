import { randomUUID } from "node:crypto"
import type {
  GenerationProvenance,
  Project,
  ProjectFile,
  ProjectTemplateOrigin,
} from "../src/lib/store.ts"
import {
  deriveProjectArtifact,
  mergeWorkspaceFilesWithArtifact,
} from "../src/lib/workspace.ts"

export interface ProjectRecord {
  id: string
  name: string
  description: string
  status: "LIVE" | "DRAFT" | "ARCHIVED"
  lastEdited: string
  updatedAt: string
  createdAt: string
  starred: boolean
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: string
    pending?: boolean
  }>
  versions: Array<{
    id: string
    number: number
    label: string
    timestamp: string
    prompt: string
    isCurrent: boolean
    createdAt: string
    trigger: { type: "initial-generation" | "iteration"; prompt: string }
    assistantMessage?: string
    files?: ProjectFile[]
    provenance?: GenerationProvenance
    artifact?: {
      html?: string
      css?: string
      js?: string
      title: string
      description: string
      createdAt: string
    }
  }>
  initialPrompt?: string
  artifact?: {
    html?: string
    css?: string
    js?: string
    title: string
    description: string
    createdAt: string
  }
  providerDiagnostics?: string
  files?: ProjectFile[]
  lastGeneration?: GenerationProvenance
  template?: ProjectTemplateOrigin
}

interface CreateProjectInput {
  prompt: string
  mode: "plan" | "build"
  model: string
}

function cloneProvenance(
  provenance: GenerationProvenance | undefined,
): GenerationProvenance | undefined {
  if (!provenance) return undefined
  return {
    ...provenance,
    operations: provenance.operations.map((operation) => ({ ...operation })),
    rejectedOperations: provenance.rejectedOperations?.map((operation) => ({
      ...operation,
    })),
    skills: provenance.skills?.map((skill) => ({ ...skill })),
  }
}

function cloneProjectRecord(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    messages: project.messages.map((message) => ({ ...message })),
    versions: project.versions.map((version) => ({
      ...version,
      trigger: { ...version.trigger },
      artifact: version.artifact ? { ...version.artifact } : undefined,
      files: version.files?.map((file) => ({ ...file })),
      provenance: cloneProvenance(version.provenance),
    })),
    artifact: project.artifact ? { ...project.artifact } : undefined,
    files: project.files?.map((file) => ({ ...file })),
    lastGeneration: cloneProvenance(project.lastGeneration),
    template: project.template ? { ...project.template } : undefined,
  }
}

function resolveVersionWorkspaceFiles(
  project: ProjectRecord,
  version: ProjectRecord["versions"][number],
  timestamp: string,
): ProjectFile[] | undefined {
  if (Array.isArray(version.files) && version.files.length > 0)
    return version.files.map((file) => ({ ...file }))
  if (Array.isArray(project.files) && project.files.length > 0)
    return project.files.map((file) => ({ ...file }))
  if (version.artifact) {
    const files = mergeWorkspaceFilesWithArtifact(
      [],
      version.artifact,
      timestamp,
    )
    return files.length > 0 ? files : undefined
  }
  return undefined
}

/**
 * A workspace is not public merely because a client asks for that label.
 * A future verified deployment adapter may introduce a separate, attested
 * transition to LIVE; until then the project API accepts only local states.
 */
function normalizeProjectStatus(
  input: unknown,
  fallback?: ProjectRecord["status"],
): ProjectRecord["status"] {
  if (input === "ARCHIVED") return "ARCHIVED"
  if (input === "DRAFT") return "DRAFT"
  return fallback === "ARCHIVED" ? "ARCHIVED" : "DRAFT"
}

class ProjectStore {
  // keyed by userId → owned project list
  private byUser = new Map<string, ProjectRecord[]>()

  private userProjects(userId: string): ProjectRecord[] {
    if (!this.byUser.has(userId)) this.byUser.set(userId, [])
    return this.byUser.get(userId)!
  }

  private buildProjectName(prompt: string): string {
    const words = prompt.trim().split(/\s+/).filter(Boolean)
    const stopWords = new Set([
      "build",
      "create",
      "make",
      "design",
      "craft",
      "develop",
      "ship",
      "a",
      "an",
      "the",
      "for",
      "with",
      "and",
      "using",
      "into",
      "of",
    ])
    const cleaned = words.filter((word) => !stopWords.has(word.toLowerCase()))
    const titleWords = cleaned.length > 0 ? cleaned : words
    const compact = titleWords
      .slice(0, 4)
      .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    const title = compact.filter(Boolean).join(" ")
    if (!title) return "Untitled Project"
    return title
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  private normalizeProjectRecord(
    input: Partial<ProjectRecord> & {
      id?: string
      clientId?: string
      prompt?: string
      mode?: "plan" | "build"
      model?: string
    },
    fallback?: ProjectRecord,
  ): ProjectRecord {
    const now = new Date().toISOString()
    const existing = fallback
    const resolvedId =
      input.id ?? input.clientId ?? existing?.id ?? randomUUID()
    const prompt =
      typeof input.prompt === "string" && input.prompt.trim()
        ? input.prompt.trim()
        : typeof input.initialPrompt === "string" && input.initialPrompt.trim()
          ? input.initialPrompt.trim()
          : existing?.initialPrompt
    const name =
      typeof input.name === "string" && input.name.trim()
        ? input.name.trim()
        : (existing?.name ?? this.buildProjectName(prompt ?? ""))
    const description =
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : (existing?.description ??
          `Generated from ${input.mode ?? "build"} request`)
    const createdAt =
      typeof input.createdAt === "string"
        ? input.createdAt
        : (existing?.createdAt ?? now)
    const updatedAt =
      typeof input.updatedAt === "string"
        ? input.updatedAt
        : typeof input.lastEdited === "string"
          ? input.lastEdited
          : (existing?.updatedAt ?? now)
    const lastEdited =
      typeof input.lastEdited === "string"
        ? input.lastEdited
        : (existing?.lastEdited ?? updatedAt)
    const status = normalizeProjectStatus(input.status, existing?.status)
    const messages: ProjectRecord["messages"] = Array.isArray(input.messages)
      ? input.messages.map((message): ProjectRecord["messages"][number] => ({
          id:
            typeof message?.id === "string" && message.id.trim()
              ? message.id
              : randomUUID(),
          role: message?.role === "assistant" ? "assistant" : "user",
          content: typeof message?.content === "string" ? message.content : "",
          timestamp:
            typeof message?.timestamp === "string" ? message.timestamp : now,
          pending: message?.pending === true ? true : undefined,
        }))
      : (existing?.messages ?? [])
    const versions = Array.isArray(input.versions)
      ? input.versions.map((version) => ({
          ...version,
          id:
            typeof version?.id === "string" && version.id.trim()
              ? version.id
              : randomUUID(),
          number: typeof version?.number === "number" ? version.number : 1,
          label:
            typeof version?.label === "string" && version.label.trim()
              ? version.label
              : "Version",
          timestamp:
            typeof version?.timestamp === "string" ? version.timestamp : now,
          prompt:
            typeof version?.prompt === "string"
              ? version.prompt
              : (prompt ?? ""),
          isCurrent:
            typeof version?.isCurrent === "boolean" ? version.isCurrent : true,
          createdAt:
            typeof version?.createdAt === "string" ? version.createdAt : now,
          trigger: version?.trigger ?? {
            type: "initial-generation",
            prompt: prompt ?? "",
          },
          provenance: version?.provenance
            ? {
                ...version.provenance,
                operations: Array.isArray(version.provenance.operations)
                  ? version.provenance.operations.map((operation) => ({
                      ...operation,
                    }))
                  : [],
                rejectedOperations: Array.isArray(
                  version.provenance.rejectedOperations,
                )
                  ? version.provenance.rejectedOperations.map((operation) => ({
                      ...operation,
                    }))
                  : undefined,
                skills: Array.isArray(version.provenance.skills)
                  ? version.provenance.skills.map((skill) => ({ ...skill }))
                  : undefined,
              }
            : undefined,
        }))
      : (existing?.versions ?? [])
    const artifact = input.artifact ? { ...input.artifact } : existing?.artifact
    const providerDiagnostics =
      typeof input.providerDiagnostics === "string"
        ? input.providerDiagnostics
        : existing?.providerDiagnostics
    const files = Array.isArray(input.files)
      ? input.files.map((file) => ({ ...file }))
      : existing?.files
    const lastGeneration =
      input.lastGeneration && typeof input.lastGeneration === "object"
        ? {
            ...input.lastGeneration,
            operations: Array.isArray(input.lastGeneration.operations)
              ? input.lastGeneration.operations.map((operation) => ({
                  ...operation,
                }))
              : [],
            rejectedOperations: Array.isArray(
              input.lastGeneration.rejectedOperations,
            )
              ? input.lastGeneration.rejectedOperations.map((operation) => ({
                  ...operation,
                }))
              : undefined,
            skills: Array.isArray(input.lastGeneration.skills)
              ? input.lastGeneration.skills.map((skill) => ({ ...skill }))
              : undefined,
          }
        : existing?.lastGeneration
    const initialPrompt =
      typeof input.initialPrompt === "string" && input.initialPrompt.trim()
        ? input.initialPrompt.trim()
        : (prompt ?? existing?.initialPrompt)
    const template =
      input.template &&
      typeof input.template === "object" &&
      typeof input.template.id === "string" &&
      typeof input.template.name === "string" &&
      typeof input.template.category === "string"
        ? { ...input.template }
        : existing?.template

    return {
      id: resolvedId,
      name,
      description,
      status,
      lastEdited,
      updatedAt,
      createdAt,
      starred:
        typeof input.starred === "boolean"
          ? input.starred
          : (existing?.starred ?? false),
      messages,
      versions,
      initialPrompt,
      artifact,
      providerDiagnostics,
      files,
      lastGeneration,
      template,
    }
  }

  createProject(userId: string, input: CreateProjectInput): ProjectRecord {
    const projects = this.userProjects(userId)
    const now = new Date().toISOString()
    const name = this.buildProjectName(input.prompt)
    const project: ProjectRecord = {
      id: randomUUID(),
      name,
      description: `Generated from ${input.mode} request`,
      status: "DRAFT",
      lastEdited: now,
      updatedAt: now,
      createdAt: now,
      starred: false,
      messages: [
        {
          id: randomUUID(),
          role: "user",
          content: input.prompt,
          timestamp: now,
        },
      ],
      versions: [
        {
          id: randomUUID(),
          number: 1,
          label: "Initial build",
          timestamp: now,
          prompt: input.prompt,
          isCurrent: true,
          createdAt: now,
          trigger: { type: "initial-generation", prompt: input.prompt },
          artifact: {
            html: "<main><h1>Welcome</h1><p>Your generated experience is ready.</p></main>",
            css: "body { font-family: Inter, sans-serif; margin: 0; padding: 2rem; }",
            js: "",
            title: name,
            description: "Generated project preview",
            createdAt: now,
          },
        },
      ],
      initialPrompt: input.prompt,
      artifact: {
        html: "<main><h1>Welcome</h1><p>Your generated experience is ready.</p></main>",
        css: "body { font-family: Inter, sans-serif; margin: 0; padding: 2rem; }",
        js: "",
        title: name,
        description: "Generated project preview",
        createdAt: now,
      },
      providerDiagnostics: input.model ? `Model: ${input.model}` : undefined,
    }
    projects.unshift(project)
    return cloneProjectRecord(project)
  }

  upsertProject(
    userId: string,
    input: Partial<ProjectRecord> & {
      id?: string
      clientId?: string
      prompt?: string
      mode?: "plan" | "build"
      model?: string
    },
  ): ProjectRecord | undefined {
    const projects = this.userProjects(userId)
    const resolvedId = input.id ?? input.clientId
    const existingIndex = resolvedId
      ? projects.findIndex((project) => project.id === resolvedId)
      : -1
    const fallback = existingIndex >= 0 ? projects[existingIndex] : undefined
    const normalized = this.normalizeProjectRecord(input, fallback)

    if (existingIndex >= 0) {
      projects[existingIndex] = cloneProjectRecord(normalized)
      return cloneProjectRecord(projects[existingIndex])
    }

    const stored = cloneProjectRecord(normalized)
    projects.unshift(stored)
    return cloneProjectRecord(stored)
  }

  syncProjects(
    userId: string,
    input: Array<Partial<ProjectRecord> & {
      id?: string
      clientId?: string
      prompt?: string
      mode?: "plan" | "build"
      model?: string
    }>,
  ): ProjectRecord[] {
    const projects = this.userProjects(userId)
    const synced = input.map((item) =>
      this.normalizeProjectRecord(
        item,
        projects.find((project) => project.id === (item.id ?? item.clientId)),
      ),
    )
    this.byUser.set(userId, synced.map(cloneProjectRecord))
    return this.byUser.get(userId)!.map(cloneProjectRecord)
  }

  listProjects(userId: string): ProjectRecord[] {
    return this.userProjects(userId).map(cloneProjectRecord)
  }

  getProject(userId: string, id: string): ProjectRecord | undefined {
    const project = this.userProjects(userId).find(
      (project) => project.id === id,
    )
    return project ? cloneProjectRecord(project) : undefined
  }

  updateProject(
    userId: string,
    id: string,
    updates: Partial<ProjectRecord>,
  ): ProjectRecord | undefined {
    const projects = this.userProjects(userId)
    const index = projects.findIndex((project) => project.id === id)
    if (index < 0) return undefined
    const now = new Date().toISOString()
    projects[index] = cloneProjectRecord({
      ...projects[index],
      ...updates,
      status: normalizeProjectStatus(updates.status, projects[index].status),
      updatedAt: updates.updatedAt ?? now,
      lastEdited: updates.lastEdited ?? now,
      versions: Array.isArray(updates.versions)
        ? updates.versions
        : projects[index].versions,
      messages: Array.isArray(updates.messages)
        ? updates.messages
        : projects[index].messages,
      artifact: updates.artifact ?? projects[index].artifact,
      files: Array.isArray(updates.files)
        ? updates.files.map((file) => ({ ...file }))
        : projects[index].files,
      lastGeneration: updates.lastGeneration ?? projects[index].lastGeneration,
    })
    return cloneProjectRecord(projects[index])
  }

  deleteProject(userId: string, id: string): boolean {
    const projects = this.userProjects(userId)
    const index = projects.findIndex((project) => project.id === id)
    if (index < 0) return false
    projects.splice(index, 1)
    return true
  }

  duplicateProject(userId: string, id: string): ProjectRecord | undefined {
    const source = this.getProject(userId, id)
    if (!source) return undefined
    const projects = this.userProjects(userId)
    const now = new Date().toISOString()
    const duplicate: ProjectRecord = {
      ...source,
      id: randomUUID(),
      name: `${source.name} copy`,
      description: `${source.description} (copy)`,
      status: "DRAFT",
      lastEdited: now,
      updatedAt: now,
      createdAt: now,
      starred: false,
      messages: source.messages.map((message) => ({
        ...message,
        id: randomUUID(),
      })),
      versions: source.versions.map((version) => ({
        ...version,
        id: randomUUID(),
        isCurrent: false,
        createdAt: now,
        timestamp: now,
      })),
      artifact: source.artifact
        ? { ...source.artifact, createdAt: now }
        : undefined,
    }
    projects.unshift(duplicate)
    return cloneProjectRecord(duplicate)
  }

  restoreVersion(
    userId: string,
    projectId: string,
    versionId: string,
  ): ProjectRecord | undefined {
    const projects = this.userProjects(userId)
    const project = this.getProject(userId, projectId)
    if (!project) return undefined
    const version = project.versions.find((item) => item.id === versionId)
    if (!version) return undefined
    const now = new Date().toISOString()
    const files = resolveVersionWorkspaceFiles(project, version, now)
    if (!files) return undefined
    const nextProject = {
      ...project,
      files,
      artifact: deriveProjectArtifact({ ...project, files } as Project, now),
      versions: project.versions.map((item) => ({
        ...item,
        isCurrent: item.id === versionId,
      })),
      updatedAt: now,
      lastEdited: now,
    }
    projects[projects.findIndex((item) => item.id === projectId)] = nextProject
    return cloneProjectRecord(nextProject)
  }

  forkVersion(
    userId: string,
    projectId: string,
    versionId: string,
    nameOverride?: string,
  ): ProjectRecord | undefined {
    const projects = this.userProjects(userId)
    const project = this.getProject(userId, projectId)
    if (!project) return undefined
    const version = project.versions.find((item) => item.id === versionId)
    if (!version) return undefined
    const now = new Date().toISOString()
    const files = resolveVersionWorkspaceFiles(project, version, now)
    if (!files) return undefined
    const forked: ProjectRecord = {
      ...project,
      id: randomUUID(),
      name: nameOverride?.trim() || `${project.name} fork`,
      description: `${project.description || "Forked project"} via ${version.label}`,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
      lastEdited: now,
      starred: false,
      messages: project.messages.map((message) => ({
        ...message,
        id: randomUUID(),
      })),
      versions: project.versions.map((item) => ({
        ...item,
        id: randomUUID(),
        isCurrent: item.id === version.id,
      })),
      files,
      artifact: deriveProjectArtifact({ ...project, files } as Project, now),
    }
    projects.unshift(forked)
    return cloneProjectRecord(forked)
  }
}

let store: ProjectStore | null = null

export function createProjectStore(): ProjectStore {
  if (!store) {
    store = new ProjectStore()
  }
  return store
}

export function resetProjectStore(): void {
  store = null
}
