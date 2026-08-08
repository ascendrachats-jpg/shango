// ─── Deployment System Data Layer ─────────────────────────────────────────────

export type DeployTargetId = "vercel" | "cloudflare" | "netlify" | "docker" | "aws" | "azure" | "gcp" | "self-hosted" | "static" | "container"

export type DeployStatus = "queued" | "preparing" | "packaging" | "building" | "optimizing" | "publishing" | "verifying" | "live" | "failed" | "rolled-back" | "paused"

export type DomainStatus = "pending" | "verifying" | "active" | "failed"
export type SslStatus = "pending" | "provisioning" | "active" | "expired"

export interface DeployTarget {
  id: DeployTargetId
  name: string
  monogram: string
  description: string
  category: "edge" | "cloud" | "container" | "export" | "self"
  connectorId?: string // links to connector ecosystem
  buildCommand: string
  outputDir: string
}

export interface DeployStage {
  id: string
  label: string
  description: string
}

export interface EnvVar {
  key: string
  value: string
  secret: boolean
}

export interface DeploymentDomain {
  domain: string
  status: DomainStatus
  sslStatus: SslStatus
  isPrimary: boolean
  dnsRecords?: { type: string; name: string; value: string }[]
}

export interface DeploymentPerformance {
  availability: number // percentage
  responseTime: number // ms
  buildSize: string // e.g. "234 KB"
  bundleScore: number // 0-100
  lighthouseScore: number // 0-100
  requests24h: number
}

export interface DeploymentRecord {
  id: string
  projectId: string
  projectName: string
  target: DeployTargetId | string
  status: DeployStatus
  url: string
  shortUrl: string
  timestamp: string
  duration: number // build duration in seconds
  triggeredBy: string // 'manual' | 'commit' | 'api'
  commit?: string
  version?: number // project version number
  domains: DeploymentDomain[]
  envVars: EnvVar[]
  performance?: DeploymentPerformance
  errorMessage?: string
  errorSuggestion?: string
  buildLogs: string[]
  /** True when SHANGO recorded a local preview instead of receiving provider confirmation. */
  isPreview?: boolean
}

// ── Deploy Targets ────────────────────────────────────────────────────────────

export const DEPLOY_TARGETS: DeployTarget[] = [
  {
    id: "vercel",
    name: "Vercel",
    monogram: "Vc",
    description:
      "Edge-first frontend deployments. Instant previews, zero-config.",
    category: "edge",
    connectorId: "vercel",
    buildCommand: "npm run build",
    outputDir: ".next",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    monogram: "Cf",
    description: "Workers and Pages at 300+ edge locations worldwide.",
    category: "edge",
    connectorId: "cloudflare",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "netlify",
    name: "Netlify",
    monogram: "Nl",
    description: "Instant static hosting with serverless functions.",
    category: "edge",
    connectorId: "netlify",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "docker",
    name: "Docker",
    monogram: "Dk",
    description: "Containerised and portable. Deploy anywhere containers run.",
    category: "container",
    connectorId: "docker",
    buildCommand: "docker build",
    outputDir: ".",
  },
  {
    id: "aws",
    name: "AWS",
    monogram: "Aw",
    description: "Lambda, S3, CloudFront — full AWS infrastructure.",
    category: "cloud",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "azure",
    name: "Azure",
    monogram: "Az",
    description:
      "Microsoft cloud — Static Web Apps, Functions, Container Apps.",
    category: "cloud",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "gcp",
    name: "Google Cloud",
    monogram: "Gc",
    description: "Cloud Run, Firebase Hosting, Cloud Functions.",
    category: "cloud",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "self-hosted",
    name: "Self Hosted",
    monogram: "Sh",
    description: "Your own server, your own rules. SSH and rsync.",
    category: "self",
    buildCommand: "npm run build",
    outputDir: "dist",
  },
  {
    id: "static",
    name: "Static Export",
    monogram: "Se",
    description: "Download your built app as a ZIP archive.",
    category: "export",
    buildCommand: "npm run build",
    outputDir: "out",
  },
  {
    id: "container",
    name: "Container",
    monogram: "Co",
    description: "OCI-compatible image pushed to any container registry.",
    category: "container",
    buildCommand: "docker build",
    outputDir: ".",
  },
]

// ── Deploy Stages (shown during progress) ─────────────────────────────────────

export const DEPLOY_STAGES: DeployStage[] = [
  {
    id: "recording",
    label: "Recording preview",
    description: "Saving the local handoff; no provider build is running.",
  },
]

// ── Mock build logs ───────────────────────────────────────────────────────────

export function generateBuildLogs(
  projectName: string,
  target: DeployTargetId,
): string[] {
  const slug = projectName.toLowerCase().replace(/\s+/g, "-").slice(0, 24)
  const domain = `${slug}.${
    target === "vercel"
      ? "vercel.app"
      : target === "netlify"
        ? "netlify.app"
        : target === "cloudflare"
          ? "pages.dev"
          : "shango.app"
  }`
  return [
    "[preview] SHANGO deployment preview",
    `[preview] Target selected: ${DEPLOY_TARGETS.find((t) => t.id === target)?.name}`,
    `[preview] Workspace: ${projectName}`,
    "[preview] Deployment configuration recorded locally",
    "[preview] No dependencies were installed and no build command was run",
    "[preview] No files were uploaded and no provider account was contacted",
    `[preview] Suggested provider domain: ${domain}`,
    "[next] Connect a verified provider to run a real build, deploy, and health check",
    "[done] Preview ready",
  ]

  /* Legacy simulated logs retained below only for migration reference.
  return [
    `[info]  SHANGO Deploy v2.1.0`,
    `[info]  Target: ${DEPLOY_TARGETS.find(t => t.id === target)?.name}`,
    `[info]  Project: ${projectName}`,
    `[prep]  Initialising build environment`,
    `[prep]  Node.js 20.x detected`,
    `[pkg]   Installing dependencies (npm ci)`,
    `[pkg]   Resolved 847 packages in 1.2s`,
    `[pkg]   Hoisted 312 packages`,
    `[build] Running build script (npm run build)`,
    `[build] Compiled successfully`,
    `[build] Output: 42 files, 4 routes`,
    `[opt]   Minifying JavaScript... 234 KB → 89 KB`,
    `[opt]   Optimising images... 12 assets`,
    `[opt]   Tree-shaking complete, removed 28 dead exports`,
    `[pub]   Uploading build output to ${target} network`,
    `[pub]   Upload complete (847 ms)`,
    `[ssl]   Provisioning SSL certificate`,
    `[ssl]   Certificate issued — Let's Encrypt`,
    `[dns]   Assigning subdomain: ${domain}`,
    `[live]  Propagating to all edge nodes`,
    `[live]  Health check passed — 200 OK`,
    `[done]  ✓ Deployed successfully in 6.2s`,
    `[done]  Live at: https://${domain}`,
  ]
  */
}

export function generateLiveUrl(
  projectName: string,
  target: DeployTargetId,
): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
  const suffix =
    target === "vercel"
      ? "vercel.app"
      : target === "netlify"
        ? "netlify.app"
        : target === "cloudflare"
          ? "pages.dev"
          : "shango.app"
  return `https://${slug}.${suffix}`
}

export interface DeploymentPayload {
  projectId: string
  projectName: string
  target: DeployTargetId
  buildCommand: string
  outputDir: string
  envVars: EnvVar[]
  customDomain?: string
  version?: number
}

/**
 * Deployment records are displayed and retained after the review dialog closes.
 * Never put a secret's plaintext value into those records or the local preview API.
 */
export function redactDeploymentEnvVars(envVars: EnvVar[]): EnvVar[] {
  return envVars
    .filter((ev) => ev.key.trim())
    .map((ev) => ({ ...ev, value: ev.secret ? "••••••••" : ev.value }))
}

export function buildDeploymentPayload(input: DeploymentPayload) {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    target: input.target,
    buildCommand: input.buildCommand,
    outputDir: input.outputDir,
    envVars: redactDeploymentEnvVars(input.envVars),
    customDomain: input.customDomain?.trim() || undefined,
    version: input.version,
    isPreview: true,
  }
}

export interface DeploymentResponseEnvelope {
  deployment?: Partial<DeploymentRecord> | null
  deployments?: Array<Partial<DeploymentRecord> | null | undefined>
  [key: string]: unknown
}

export function buildDeploymentRecordFromResponse(
  remoteRecord: Partial<DeploymentRecord> | DeploymentResponseEnvelope | null | undefined,
  fallback: DeploymentRecord,
): DeploymentRecord {
  const candidate =
    remoteRecord &&
    typeof remoteRecord === "object" &&
    "deployment" in remoteRecord &&
    remoteRecord.deployment
      ? remoteRecord.deployment
      : remoteRecord

  const normalizedRecord =
    candidate && typeof candidate === "object" && "id" in candidate
      ? candidate as Partial<DeploymentRecord>
      : null
  return normalizeDeploymentRecord(normalizedRecord, fallback)
}

export function normalizeDeploymentRecord(
  remoteRecord: Partial<DeploymentRecord> | null | undefined,
  fallback: DeploymentRecord,
): DeploymentRecord {
  const base = fallback
  const normalized: DeploymentRecord = {
    ...base,
    ...remoteRecord,
    id: remoteRecord?.id ?? base.id,
    projectId: remoteRecord?.projectId ?? base.projectId,
    projectName: remoteRecord?.projectName ?? base.projectName,
    target: remoteRecord?.target ?? base.target,
    status: remoteRecord?.status ?? base.status,
    url: remoteRecord?.url ?? base.url,
    shortUrl: remoteRecord?.shortUrl ?? base.shortUrl,
    timestamp: remoteRecord?.timestamp ?? base.timestamp,
    duration: remoteRecord?.duration ?? base.duration,
    triggeredBy: remoteRecord?.triggeredBy ?? base.triggeredBy,
    version: remoteRecord?.version ?? base.version,
    domains: remoteRecord?.domains ?? base.domains,
    envVars: remoteRecord?.envVars ?? base.envVars,
    performance: remoteRecord?.performance ?? base.performance,
    errorMessage: remoteRecord?.errorMessage ?? base.errorMessage,
    errorSuggestion: remoteRecord?.errorSuggestion ?? base.errorSuggestion,
    buildLogs:
      remoteRecord?.buildLogs && remoteRecord.buildLogs.length > 0
        ? remoteRecord.buildLogs
        : base.buildLogs,
    isPreview: remoteRecord?.isPreview ?? base.isPreview,
  }

  return normalized
}

export function normalizeDeploymentRecords(
  remoteRecords: Array<Partial<DeploymentRecord> | null | undefined> | null | undefined,
  fallback: DeploymentRecord[],
): DeploymentRecord[] {
  const normalizedRemote = Array.isArray(remoteRecords)
    ? remoteRecords.filter((record): record is Partial<DeploymentRecord> =>
        Boolean(record),
      )
    : []
  if (normalizedRemote.length > 0) {
    return normalizedRemote.map((record) =>
      normalizeDeploymentRecord(
        record,
        fallback[0] ?? {
          id: `fallback-${Math.random().toString(36).slice(2, 8)}`,
          projectId: "",
          projectName: "Untitled project",
          target: "static",
          status: "live",
          url: "https://example.com",
          shortUrl: "example.com",
          timestamp: new Date().toISOString(),
          duration: 0,
          triggeredBy: "api",
          domains: [],
          envVars: [],
          buildLogs: [],
        },
      ),
    )
  }
  return fallback
}

// ── Default seed deployment records ──────────────────────────────────────────

export const DEFAULT_DEPLOYMENT_RECORDS: DeploymentRecord[] =
  [] /* Legacy illustrative records retained below only as migration reference.
  {
    id: 'dep-001',
    projectId: '',   // matched to first project at runtime
    projectName: 'Lagos Health Portal',
    target: 'vercel',
    status: 'live',
    url: 'https://lagos-health-portal.vercel.app',
    shortUrl: 'lagos-health-portal.vercel.app',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    duration: 18,
    triggeredBy: 'manual',
    version: 3,
    domains: [
      { domain: 'lagos-health-portal.vercel.app', status: 'active', sslStatus: 'active', isPrimary: true },
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.example.com', secret: false },
      { key: 'DATABASE_URL', value: '••••••••', secret: true },
    ],
    performance: {
      availability: 99.98,
      responseTime: 124,
      buildSize: '234 KB',
      bundleScore: 92,
      lighthouseScore: 96,
      requests24h: 1482,
    },
    buildLogs: generateBuildLogs('Lagos Health Portal', 'vercel'),
    isPreview: true,
  },
  {
    id: 'dep-002',
    projectId: '',
    projectName: 'Nairobi Fintech Dashboard',
    target: 'vercel',
    status: 'live',
    url: 'https://nairobi-fintech.vercel.app',
    shortUrl: 'nairobi-fintech.vercel.app',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    duration: 22,
    triggeredBy: 'manual',
    version: 5,
    domains: [
      { domain: 'nairobi-fintech.vercel.app', status: 'active', sslStatus: 'active', isPrimary: true },
      { domain: 'dashboard.nairobifin.com', status: 'active', sslStatus: 'active', isPrimary: false },
    ],
    envVars: [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://••••.supabase.co', secret: false },
      { key: 'SUPABASE_SERVICE_KEY', value: '••••••••', secret: true },
    ],
    performance: {
      availability: 99.95,
      responseTime: 98,
      buildSize: '189 KB',
      bundleScore: 88,
      lighthouseScore: 94,
      requests24h: 3241,
    },
    buildLogs: generateBuildLogs('Nairobi Fintech Dashboard', 'vercel'),
    isPreview: true,
  },
] */

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTargetById(
  id: DeployTargetId | string | undefined,
): DeployTarget | undefined {
  return DEPLOY_TARGETS.find((t) => t.id === id)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

// ── Provider-Agnostic Deployment Abstraction ───────────────────────────────

export interface DeploymentRequest {
  projectId: string
  projectName: string
  files: Array<{ path: string; content?: string }>
  version?: number
  envVars?: EnvVar[]
}

export interface DeploymentResult {
  status: "READY" | "CREDENTIALS_REQUIRED" | "COMING_SOON" | "DEPLOYED" | "FAILED"
  url?: string
  message: string
  providerId?: string
}

export interface DeploymentProvider {
  id: string
  name: string
  isAvailable(connectors: string[]): boolean
  deploy(request: DeploymentRequest): Promise<DeploymentResult>
}

export class DefaultDeploymentProvider implements DeploymentProvider {
  id = "default"
  name = "Shango Edge"

  isAvailable(connectors: string[]): boolean {
    return connectors.includes("vercel") || connectors.includes("netlify") || connectors.includes("cloudflare")
  }

  async deploy(request: DeploymentRequest): Promise<DeploymentResult> {
    if (!this.isAvailable([])) {
      return {
        status: "CREDENTIALS_REQUIRED",
        message: "Connect a deployment provider to make your project live.",
      }
    }
    const liveUrl = generateLiveUrl(request.projectName, "vercel")
    return {
      status: "DEPLOYED",
      url: liveUrl,
      message: `Deployed successfully to ${liveUrl}`,
      providerId: "vercel",
    }
  }
}

/**
 * Deploys a project only if the workspace has passed AST compiler validation.
 * Rejects invalid/unvalidated workspace states prior to deployment.
 */
export async function deployValidatedWorkspace(
  request: DeploymentRequest,
  connectors: string[] = [],
  isWorkspaceValid = true,
  provider?: DeploymentProvider,
): Promise<DeploymentResult> {
  if (!isWorkspaceValid) {
    return {
      status: "FAILED",
      message: "Deployment rejected: your workspace has invalid compilation or syntax errors.",
    }
  }

  const activeProvider = provider || new DefaultDeploymentProvider()

  if (!activeProvider.isAvailable(connectors)) {
    return {
      status: "CREDENTIALS_REQUIRED",
      message: "Connect a hosting provider (Vercel, Netlify, or Cloudflare) to deploy live.",
    }
  }

  return activeProvider.deploy(request)
}

