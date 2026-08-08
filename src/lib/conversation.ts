import { generateId } from "./store.ts"

export type BlockType =
  | "idea"
  | "dialogue.user"
  | "dialogue.shango"
  | "understanding"
  | "plan"
  | "architecture"
  | "tasks"
  | "execution"
  | "result"
  | "decision"
  | "error"

export interface BaseBlock {
  id: string
  type: BlockType
  createdAt: string
}

export interface IdeaBlock extends BaseBlock {
  type: "idea"
  content: string
}

export interface UserDialogueBlock extends BaseBlock {
  type: "dialogue.user"
  content: string
}

export interface ShangoDialogueBlock extends BaseBlock {
  type: "dialogue.shango"
  content: string
  pending?: boolean
}

export interface UnderstandingBlock extends BaseBlock {
  type: "understanding"
  summary: string
  isConfirmed: boolean
}

export interface PlanBlock extends BaseBlock {
  type: "plan"
  heading?: string
  steps: string[]
  decisionQuestions?: string[]
}

export interface ExecutionFileOp {
  path: string
  operation: "create" | "modify" | "delete"
}

export interface ExecutionBlock extends BaseBlock {
  type: "execution"
  statusText: string
  files: ExecutionFileOp[]
  validationStatus?: "validating" | "passed" | "failed"
  repairAttempts?: number
  completed?: boolean
}

export interface ResultBlock extends BaseBlock {
  type: "result"
  summary: string
  fileCount: number
  previewStatus: "ready" | "failed"
}

export interface ErrorBlock extends BaseBlock {
  type: "error"
  message: string
  diagnostics?: Array<{ code: string; file: string; message: string }>
}

export type ConversationBlock =
  | IdeaBlock
  | UserDialogueBlock
  | ShangoDialogueBlock
  | UnderstandingBlock
  | PlanBlock
  | ExecutionBlock
  | ResultBlock
  | ErrorBlock

// ─── Factory Functions ────────────────────────────────────────────────────────

export function createIdeaBlock(content: string): IdeaBlock {
  return {
    id: generateId(),
    type: "idea",
    content,
    createdAt: new Date().toISOString(),
  }
}

export function createUserDialogueBlock(content: string): UserDialogueBlock {
  return {
    id: generateId(),
    type: "dialogue.user",
    content,
    createdAt: new Date().toISOString(),
  }
}

export function createShangoDialogueBlock(content: string, pending = false): ShangoDialogueBlock {
  return {
    id: generateId(),
    type: "dialogue.shango",
    content,
    pending,
    createdAt: new Date().toISOString(),
  }
}

export function createUnderstandingBlock(summary: string, isConfirmed = false): UnderstandingBlock {
  return {
    id: generateId(),
    type: "understanding",
    summary,
    isConfirmed,
    createdAt: new Date().toISOString(),
  }
}

export function createPlanBlock(steps: string[], heading?: string, decisionQuestions?: string[]): PlanBlock {
  return {
    id: generateId(),
    type: "plan",
    heading,
    steps,
    decisionQuestions,
    createdAt: new Date().toISOString(),
  }
}

export function createExecutionBlock(statusText = "Building workspace"): ExecutionBlock {
  return {
    id: generateId(),
    type: "execution",
    statusText,
    files: [],
    validationStatus: undefined,
    repairAttempts: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  }
}

export function createResultBlock(summary: string, fileCount: number, previewStatus: "ready" | "failed" = "ready"): ResultBlock {
  return {
    id: generateId(),
    type: "result",
    summary,
    fileCount,
    previewStatus,
    createdAt: new Date().toISOString(),
  }
}

export function createErrorBlock(message: string, diagnostics?: Array<{ code: string; file: string; message: string }>): ErrorBlock {
  return {
    id: generateId(),
    type: "error",
    message,
    diagnostics,
    createdAt: new Date().toISOString(),
  }
}
