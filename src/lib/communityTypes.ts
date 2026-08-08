// ─── Community Data Layer ──────────────────────────────────────────────────────

export type BuilderReputation = "Trusted Builder" | "Open Source Contributor" | "Community Mentor" | "Early Creator" | "Verified Organization" | "Active Builder"

export interface Builder {
  id: string
  handle: string
  name: string
  monogram: string // 2-char for avatar
  bio: string
  location: string
  joinedDate: string
  reputation: BuilderReputation[]
  skills: string[] // skill IDs
  techStack: string[]
  projectCount: number
  followerCount: number
  followingCount: number
  contributionCount: number
  featured: boolean
  isFollowing?: boolean
  publicDeployments: { name: string; url: string; target: string }[]
  activityTimeline: BuilderActivity[]
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  label: string
  description: string
  earnedDate: string
}

export interface BuilderActivity {
  id: string
  type: "deploy" | "version" | "skill" | "fork" | "template" | "team"
  description: string
  timestamp: string
  projectName?: string
}

export type ProjectTag = string
export type ProjectStatus = "live" | "draft" | "archived"

export interface ShowcaseProject {
  id: string
  name: string
  description: string
  longDescription: string
  monogram: string
  creatorId: string
  teamId?: string
  status: ProjectStatus
  liveUrl?: string
  tags: ProjectTag[]
  techStack: string[]
  skillIds: string[]
  connectorIds: string[]
  targetId?: string
  version: number
  changelog: string
  forkCount: number
  saveCount: number
  viewCount: number
  commentCount: number
  featured: boolean
  trending: boolean
  publishedAt: string
  lastUpdated: string
}

export interface Comment {
  id: string
  authorId: string
  content: string
  timestamp: string
  likes: number
  replies?: Comment[]
}

export interface Team {
  id: string
  name: string
  monogram: string
  description: string
  type: "team" | "organization"
  memberCount: number
  projectCount: number
  location: string
  isVerified: boolean
  members: { builderId: string; role: "owner" | "admin" | "member" }[]
  sharedProjects: string[] // project IDs
  activity: BuilderActivity[]
}

export type KnowledgeType = "guide" | "tutorial" | "learning-path" | "example" | "best-practice" | "tip"
export type KnowledgeDifficulty = "beginner" | "intermediate" | "advanced"

export interface KnowledgeEntry {
  id: string
  type: KnowledgeType
  title: string
  summary: string
  authorId: string
  tags: string[]
  difficulty: KnowledgeDifficulty
  readTimeMinutes: number
  publishedAt: string
  viewCount: number
  featured: boolean
}

export type ChallengeStatus = "open" | "upcoming" | "closed"

export interface Challenge {
  id: string
  title: string
  description: string
  type: "hackathon" | "challenge" | "event" | "mentorship" | "announcement"
  status: ChallengeStatus
  prize?: string
  deadline?: string
  date?: string
  participantCount: number
  tags: string[]
  organizer: string
}

export interface FeedEntry {
  id: string
  type: "deploy" | "version" | "template" | "skill" | "fork" | "team" | "challenge"
  builderId?: string
  teamId?: string
  subject: string // "Alex deployed"
  action: string // "Hospital Management v3"
  detail?: string // "on Vercel"
  timestamp: string
  projectId?: string
}

export interface Collection {
  id: string
  name: string
  description: string
  ownerId: string
  projectIds: string[]
  isPublic: boolean
  createdAt: string
}

// ── Builders ──────────────────────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export const REPUTATION_DESCRIPTIONS: Record<BuilderReputation, string> = {
  "Trusted Builder": "Consistently ships quality work",
  "Open Source Contributor": "Actively contributes to community projects",
  "Community Mentor": "Guides other builders",
  "Early Creator": "Joined SHANGO in the early days",
  "Verified Organization": "Identity verified by SHANGO",
  "Active Builder": "Regularly ships and contributes",
}

// ── Backward-compatible aliases ────────────────────────────────────────────
// Older modules import `Knowledge` / `CommunityFeedItem`; these alias the
// canonical `KnowledgeEntry` / `FeedEntry` interfaces so both names work.
export type Knowledge = KnowledgeEntry
export type CommunityFeedItem = FeedEntry
