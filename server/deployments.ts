import { randomUUID } from "node:crypto"

export interface DeploymentDomain {
  domain: string
  status: "active" | "pending"
  sslStatus: "active" | "pending"
  isPrimary: boolean
}

export interface DeploymentEnvVar {
  key: string
  value: string
  secret: boolean
}

export interface DeploymentRecord {
  id: string
  projectId: string
  projectName: string
  target: string
  status: "queued" | "preparing" | "live" | "building" | "failed"
  url: string
  shortUrl: string
  timestamp: string
  duration: number
  triggeredBy: "manual" | "api"
  version?: number
  domains: DeploymentDomain[]
  envVars: DeploymentEnvVar[]
  buildLogs: string[]
  isPreview?: boolean
}

class DeploymentStore {
  private deployments: DeploymentRecord[] = []

  createDeployment(input: Omit<DeploymentRecord, "id">): DeploymentRecord {
    const record: DeploymentRecord = { id: randomUUID(), ...input }
    this.deployments.unshift(record)
    return record
  }

  listDeployments(): DeploymentRecord[] {
    return this.deployments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
  }
}

let store: DeploymentStore | null = null

export function createDeploymentStore(): DeploymentStore {
  if (!store) {
    store = new DeploymentStore()
  }
  return store
}

export function resetDeploymentStore(): void {
  store = null
}
