export type BuildMode = "plan" | "build"

export interface WorkspaceFileContextEntry {
  path?: string
  content?: string
  language?: string
}

export interface BuildSkillContext {
  id: string
  name: string
  purpose: string
}

export interface BuildRequest {
  prompt: string
  userPrompt?: string
  model?: string
  selectedModel?: string
  language?: string
  mode?: BuildMode
  projectId?: string
  activeFile?: string
  enabledSkills?: BuildSkillContext[]
  workspaceContext?: unknown
  fileContext?: { files?: WorkspaceFileContextEntry[] }
  currentFiles?: WorkspaceFileContextEntry[]
}

export type BuildOperation = "create" | "modify" | "delete"

export interface BuildFileOperation {
  path: string
  operation: BuildOperation
  content?: string
  language?: string
}

export interface ValidationDiagnostic {
  severity: "error" | "warning"
  file: string
  line?: number
  column?: number
  code: "SYNTAX_ERROR" | "MODULE_NOT_FOUND" | "UNSUPPORTED_DEPENDENCY" | "MISSING_ENTRY_POINT" | "RUNTIME_ERROR"
  message: string
  source: "workspace-validator" | "preview-runtime"
  context?: string
}

export interface BuildProvenance {
  id: string
  timestamp: string
  provider: string
  model?: string
  mode: BuildMode
  prompt: string
  operations: Array<Pick<BuildFileOperation, "path" | "operation">>
  skills?: BuildSkillContext[]
  diagnostics?: ValidationDiagnostic[]
  repairAttempts?: number
}

export interface BuildResponse {
  response: string
  provider: string
  message?: {
    role: "assistant"
    content: string
  }
  build?: {
    files: BuildFileOperation[]
    entryPoint?: string
    previewRoute?: string
  }
  diagnostics?: ValidationDiagnostic[] | unknown
  provenance?: BuildProvenance
  validationPassed?: boolean
  repairAttempts?: number
}
