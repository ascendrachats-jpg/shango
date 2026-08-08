import {
  classifyUserIntent,
  constructBuildIntent,
  evaluateDecisionNeed,
  type BuildIntent,
  type IntentType,
} from "./builderIntelligence.ts"
import {
  getProjectMemory,
  recordProjectDecision,
  setPendingDecision,
  type ExtendedProjectMemory,
} from "./builderMemoryStore.ts"
import { selectWorkspaceContext, type WorkspaceFileEntry } from "./contextSelection.ts"

export interface OrchestratorResult {
  action: "execute_build" | "ask_clarification" | "restore_version" | "repair_build" | "noop"
  intentType: IntentType
  buildIntent?: BuildIntent
  question?: string
  selectedFiles?: WorkspaceFileEntry[]
  memory: ExtendedProjectMemory
  resumedFromClarification?: boolean
}

export function processUserIntentAndOrchestrate(
  projectId: string,
  userPrompt: string,
  projectFiles: WorkspaceFileEntry[] = [],
  activeFile?: string,
  runtimeDiagnostic?: { code: string; message: string; file?: string },
  modelId?: string,
): OrchestratorResult {
  let memory = getProjectMemory(projectId)
  let effectivePrompt = userPrompt
  let resumedFromClarification = false

  // 1. Check if resolving a pending clarification decision
  if (memory.pendingDecision) {
    const pending = memory.pendingDecision
    memory = recordProjectDecision(projectId, pending.category, userPrompt, "user")
    effectivePrompt = pending.resumePrompt
    resumedFromClarification = true
  }

  // 2. Classify intent
  const intentType = classifyUserIntent(effectivePrompt, {
    hasExistingFiles: projectFiles.length > 0,
    hasDiagnostics: !!runtimeDiagnostic,
  })

  // 3. Special non-LLM route: Undo / Restore
  if (intentType === "undo_or_restore") {
    return {
      action: "restore_version",
      intentType,
      memory,
    }
  }

  // 4. Select workspace context
  const contextResult = selectWorkspaceContext(
    projectFiles,
    effectivePrompt,
    activeFile,
    runtimeDiagnostic,
  )

  // 5. Evaluate decision needs (ask vs act)
  if (!resumedFromClarification) {
    const decisionNeed = evaluateDecisionNeed(intentType, effectivePrompt, memory)
    if (decisionNeed.requiresClarification && decisionNeed.question) {
      memory = setPendingDecision(
        projectId,
        decisionNeed.question,
        decisionNeed.category ?? intentType,
        effectivePrompt,
      )

      return {
        action: "ask_clarification",
        intentType,
        question: decisionNeed.question,
        memory,
      }
    }
  }

  // 6. Construct BuildIntent
  const buildIntent = constructBuildIntent(
    effectivePrompt,
    intentType,
    contextResult.selectedFiles.map((f) => f.path),
    memory,
    runtimeDiagnostic,
    modelId,
  )

  const action = runtimeDiagnostic ? "repair_build" : "execute_build"

  return {
    action,
    intentType,
    buildIntent,
    selectedFiles: contextResult.selectedFiles,
    memory,
    resumedFromClarification,
  }
}
