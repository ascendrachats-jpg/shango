import type { Project, ProjectFile } from "./store"
import { generateId } from "./store"

// ── Published Project Data Model ──────────────────────────────────────────────

export interface PublishedProjectAttribution {
  originalProjectId: string
  originalTitle: string
  originalOwnerId?: string
}

export interface PublishedProjectSnapshotFile {
  path: string
  content: string
  language?: string
}

export interface PublishedProject {
  id: string
  sourceProjectId: string
  ownerId: string
  ownerName?: string
  title: string
  description: string
  previewImage?: string
  publishedAt: string
  updatedAt: string
  sourceVersionId?: string
  visibility: "public" | "unlisted"
  remixCount: number
  attribution?: PublishedProjectAttribution
  snapshotFiles: PublishedProjectSnapshotFile[]
  tags?: string[]
}

// ── Builder Profile Data Model ────────────────────────────────────────────────

export interface BuilderProfile {
  id: string
  ownerId: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
  school?: string
  location?: string
  publishedProjectIds: string[]
  visibility: "public" | "private"
  createdAt: string
  updatedAt: string
}

// ── Privacy & Secret Sanitization Boundary ────────────────────────────────────

const SECRET_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /secrets?\.json$/i,
  /credentials?\.json$/i,
  /id_rsa/i,
  /\.pem$/i,
  /private_key/i,
]

const SECRET_CONTENT_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /(?:api_?key|secret_?key|auth_?token|password)\s*[:=]\s*["'][^"']+["']/gi,
]

export function isSecretFilePath(path: string): boolean {
  const normalized = path.replace(/^.*[/\\]/, "")
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function sanitizeFileContent(content: string): string {
  let cleaned = content
  for (const pattern of SECRET_CONTENT_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED_SECRET]")
  }
  return cleaned
}

export function sanitizeSnapshotFiles(
  files: Array<{ path: string; content: string; language?: string }>,
): PublishedProjectSnapshotFile[] {
  return files
    .filter((file) => !isSecretFilePath(file.path))
    .map((file) => ({
      path: file.path,
      content: sanitizeFileContent(file.content),
      language: file.language,
    }))
}

// ── In-Memory Store & Initial Seeds ──────────────────────────────────────────

const INITIAL_PUBLISHED_PROJECTS: PublishedProject[] = [
  {
    id: "pub-student-marketplace",
    sourceProjectId: "proj-seed-1",
    ownerId: "builder-lagos",
    ownerName: "Tobi A.",
    title: "Nigerian Student Marketplace",
    description:
      "Peer-to-peer campus marketplace for buying and selling textbooks, electronics, and dorm supplies.",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    visibility: "public",
    remixCount: 14,
    tags: ["Marketplace", "React", "Campus"],
    snapshotFiles: [
      {
        path: "src/App.tsx",
        content: `export default function App() {
  return (
    <div style={{ padding: 24, background: '#0a0a0b', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Unilag Student Market</h1>
        <button style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600 }}>+ Post Item</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Calculus Textbook 8th Ed</h3>
          <p style={{ margin: 0, color: '#f59e0b', fontWeight: 600 }}>₦12,000</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Desk Lamp (Rechargeable)</h3>
          <p style={{ margin: 0, color: '#f59e0b', fontWeight: 600 }}>₦4,500</p>
        </div>
      </div>
    </div>
  )
}`,
        language: "tsx",
      },
    ],
  },
  {
    id: "pub-nairobi-fintech",
    sourceProjectId: "proj-seed-2",
    ownerId: "builder-nairobi",
    ownerName: "Sarah M.",
    title: "Mobile Money Analytics",
    description:
      "Real-time M-PESA transaction monitoring dashboard with merchant settlement tracking.",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    visibility: "public",
    remixCount: 29,
    tags: ["Fintech", "Dashboard", "Analytics"],
    snapshotFiles: [
      {
        path: "src/App.tsx",
        content: `export default function App() {
  return (
    <div style={{ padding: 24, background: '#0a0a0b', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>M-PESA Merchant Monitor</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: '#888' }}>TODAY'S VOLUME</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: 22 }}>KSh 482,900</h2>
        </div>
      </div>
    </div>
  )
}`,
        language: "tsx",
      },
    ],
  },
]

const INITIAL_BUILDER_PROFILES: BuilderProfile[] = [
  {
    id: "prof-tobi",
    ownerId: "builder-lagos",
    username: "tobi",
    displayName: "Tobi A.",
    bio: "Student builder creating campus tools and productivity applications.",
    school: "University of Lagos",
    location: "Lagos, Nigeria",
    publishedProjectIds: ["pub-student-marketplace"],
    visibility: "public",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "prof-sarah",
    ownerId: "builder-nairobi",
    username: "sarah",
    displayName: "Sarah M.",
    bio: "Fintech developer building mobile money and settlement dashboards.",
    school: "University of Nairobi",
    location: "Nairobi, Kenya",
    publishedProjectIds: ["pub-nairobi-fintech"],
    visibility: "public",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: "prof-amara",
    ownerId: "builder-amara",
    username: "amara",
    displayName: "Amara",
    bio: "Student builder creating useful tools.",
    school: "University of Lagos",
    location: "Lagos, Nigeria",
    publishedProjectIds: [],
    visibility: "public",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
]

let publishedRegistry: PublishedProject[] = [...INITIAL_PUBLISHED_PROJECTS]
let builderProfilesRegistry: BuilderProfile[] = [...INITIAL_BUILDER_PROFILES]

// ── Profile & Portfolio Operations ───────────────────────────────────────────

export function createBuilderProfile(
  data: Partial<BuilderProfile> & { username: string; displayName: string; ownerId?: string },
): BuilderProfile {
  const now = new Date().toISOString()
  const username = data.username.toLowerCase().replace(/[^a-z0-9_-]/g, "")
  const ownerId = data.ownerId || `owner-${username}`

  const newProfile: BuilderProfile = {
    id: `prof-${generateId()}`,
    ownerId,
    username,
    displayName: data.displayName.trim(),
    avatar: data.avatar,
    bio: data.bio?.trim() || "",
    school: data.school?.trim(),
    location: data.location?.trim(),
    publishedProjectIds: data.publishedProjectIds || [],
    visibility: data.visibility ?? "public",
    createdAt: now,
    updatedAt: now,
  }

  builderProfilesRegistry = [
    newProfile,
    ...builderProfilesRegistry.filter((p) => p.username !== username && p.ownerId !== ownerId),
  ]

  return newProfile
}

export function updateBuilderProfile(
  idOrUsername: string,
  updates: Partial<BuilderProfile>,
): BuilderProfile | null {
  const existing = builderProfilesRegistry.find(
    (p) => p.id === idOrUsername || p.username.toLowerCase() === idOrUsername.toLowerCase(),
  )
  if (!existing) return null

  const now = new Date().toISOString()
  const updated: BuilderProfile = {
    ...existing,
    ...updates,
    updatedAt: now,
  }

  builderProfilesRegistry = builderProfilesRegistry.map((p) => (p.id === existing.id ? updated : p))
  return updated
}

export function getBuilderProfile(username: string): BuilderProfile | null {
  const found = builderProfilesRegistry.find((p) => p.username.toLowerCase() === username.toLowerCase())
  if (!found) return null
  return found
}

export function getBuilderProfileByOwnerId(ownerId: string): BuilderProfile | null {
  const found = builderProfilesRegistry.find((p) => p.ownerId === ownerId)
  if (!found) return null
  return found
}

export function getDiscoverableBuilderProfiles(): BuilderProfile[] {
  return builderProfilesRegistry.filter((p) => p.visibility === "public")
}

export function getBuilderPortfolio(username: string): PublishedProject[] {
  const profile = getBuilderProfile(username)
  if (!profile || profile.visibility !== "public") return []

  const publicProjects = getPublishedProjects()
  return publicProjects.filter(
    (proj) => proj.ownerId === profile.ownerId || profile.publishedProjectIds.includes(proj.id),
  )
}

// ── Primary Operations ────────────────────────────────────────────────────────

export function publishProject(
  project: Project,
  metadata: {
    title?: string
    description?: string
    visibility?: "public" | "unlisted"
    tags?: string[]
    ownerId?: string
    ownerName?: string
  } = {},
): PublishedProject {
  const now = new Date().toISOString()
  const rawFiles = project.files ?? project.artifact?.files ?? []
  const ownerId = metadata.ownerId || "current-user"

  const snapshotFiles = sanitizeSnapshotFiles(
    rawFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: (f as any).language,
    })),
  )

  const published: PublishedProject = {
    id: `pub-${generateId()}`,
    sourceProjectId: project.id,
    ownerId,
    ownerName: metadata.ownerName || "You",
    title: metadata.title?.trim() || project.name || "Untitled Application",
    description:
      metadata.description?.trim() || project.description || "Built with Shango",
    publishedAt: now,
    updatedAt: now,
    sourceVersionId: project.versions.find((v) => v.isCurrent)?.id,
    visibility: metadata.visibility ?? "public",
    remixCount: 0,
    tags: metadata.tags ?? ["Shango"],
    snapshotFiles,
  }

  publishedRegistry = [
    published,
    ...publishedRegistry.filter((p) => p.id !== published.id),
  ]

  // Automatically link to owner profile if present
  const profile = getBuilderProfileByOwnerId(ownerId)
  if (profile && !profile.publishedProjectIds.includes(published.id)) {
    updateBuilderProfile(profile.id, {
      publishedProjectIds: [...profile.publishedProjectIds, published.id],
    })
  }

  return published
}

export function republishProject(
  publishedId: string,
  project: Project,
  metadata: { title?: string; description?: string } = {},
): PublishedProject | null {
  const existing = publishedRegistry.find((p) => p.id === publishedId)
  if (!existing) return null

  const now = new Date().toISOString()
  const rawFiles = project.files ?? project.artifact?.files ?? []

  const snapshotFiles = sanitizeSnapshotFiles(
    rawFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: (f as any).language,
    })),
  )

  const updated: PublishedProject = {
    ...existing,
    title: metadata.title?.trim() || existing.title,
    description: metadata.description?.trim() || existing.description,
    updatedAt: now,
    sourceVersionId: project.versions.find((v) => v.isCurrent)?.id,
    snapshotFiles,
  }

  publishedRegistry = publishedRegistry.map((p) =>
    p.id === publishedId ? updated : p,
  )

  return updated
}

export function getPublishedProjects(): PublishedProject[] {
  return publishedRegistry.filter((p) => p.visibility === "public")
}

export function getPublishedProjectById(id: string): PublishedProject | null {
  const found = publishedRegistry.find((p) => p.id === id)
  if (!found) return null
  // Return clean object stripped of internal metadata
  return {
    ...found,
    snapshotFiles: found.snapshotFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    })),
  }
}

/**
 * Deterministic Remix Operation — MUST NOT INVOKE ANY LLM!
 * Clones snapshotFiles from PublishedProject into a new independent Project workspace.
 */
export function remixPublishedProject(publishedId: string): Project {
  const published = getPublishedProjects().find((p) => p.id === publishedId) ?? publishedRegistry.find((p) => p.id === publishedId)
  if (!published) {
    throw new Error(`Published project ${publishedId} not found`)
  }

  const now = new Date().toISOString()
  const newProjectId = `remix-${generateId()}`

  // Convert snapshotFiles to ProjectFile[] format
  const projectFiles: ProjectFile[] = published.snapshotFiles.map((f) => {
    const ext = f.path.split(".").pop() || "tsx"
    return {
      id: generateId(),
      path: f.path,
      name: f.path.split("/").pop() || f.path,
      extension: ext,
      language: f.language || (ext === "tsx" || ext === "ts" ? "typescript" : "javascript"),
      content: f.content,
      createdAt: now,
      updatedAt: now,
    }
  })

  // Increment remix count on published project
  published.remixCount += 1

  const newProject: Project = {
    id: newProjectId,
    name: `Remix of ${published.title}`,
    description: `Remixed from ${published.title} (by ${published.ownerName || "Community Builder"})`,
    status: "DRAFT",
    lastEdited: now,
    updatedAt: now,
    createdAt: now,
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
    files: projectFiles,
    template: {
      id: published.id,
      name: published.title,
      category: "Community Remix",
    },
  }

  return newProject
}

export function resetPublishedRegistryForTests(): void {
  publishedRegistry = [...INITIAL_PUBLISHED_PROJECTS]
  builderProfilesRegistry = [...INITIAL_BUILDER_PROFILES]
}
