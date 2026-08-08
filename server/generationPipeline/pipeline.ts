import type { BuildProvenance, BuildRequest, BuildResponse, ValidationDiagnostic } from "./types.ts"
import { invokeProviderAdapter } from "./providerAdapter.ts"
import { parseProviderResponse } from "./structuredParser.ts"
import {
  normalizeParserResult,
  buildPipelineResponse,
} from "./operationNormalizer.ts"
import { validateWorkspace, type WorkspaceFile } from "./validator.ts"

export type PipelineEventSink = (event: string, data: unknown) => void
const MAX_REPAIR_ATTEMPTS = 3

function applyOperationsToWorkspace(
  baseFiles: WorkspaceFile[],
  operations: Array<{ path: string; operation: "create" | "modify" | "delete"; content?: string; language?: string }>,
): WorkspaceFile[] {
  const fileMap = new Map<string, WorkspaceFile>(
    baseFiles.map((f) => [f.path.replace(/\\/g, "/"), f]),
  )

  for (const op of operations) {
    const normalizedPath = op.path.replace(/\\/g, "/")
    if (op.operation === "delete") {
      fileMap.delete(normalizedPath)
    } else {
      fileMap.set(normalizedPath, {
        path: normalizedPath,
        content: op.content ?? "",
        language: op.language ?? "text",
      })
    }
  }

  return Array.from(fileMap.values())
}

export async function runProviderPipeline(
  request: BuildRequest,
  currentFiles: Array<{ path: string; content: string; language: string }> = [],
  emitEvent?: PipelineEventSink,
): Promise<BuildResponse> {
  const promptSummary = (request.userPrompt ?? request.prompt ?? "").slice(0, 60)

  emitEvent?.("status", {
    status: "request_received",
    message: "Build request received",
  })
  emitEvent?.("console", {
    level: "info",
    message: `▶ Request received: ${promptSummary}`,
  })

  emitEvent?.("status", {
    status: "planning",
    message: "Analyzing workspace context and prompt requirements",
  })

  emitEvent?.("status", {
    status: "architecting",
    message: "Constructing component hierarchy and provider prompt",
  })

  let activeRequest = request
  let providerAdapterResult = await invokeProviderAdapter(activeRequest)

  emitEvent?.("status", {
    status: "executing",
    message: "Parsing response and normalizing file operations",
  })

  let parserResult = parseProviderResponse(providerAdapterResult.rawResponse)
  let fileOperations =
    request.mode === "plan"
      ? []
      : normalizeParserResult(parserResult, currentFiles)

  for (const op of fileOperations) {
    const fileStatus =
      op.operation === "create"
        ? "file_created"
        : op.operation === "delete"
          ? "file_deleted"
          : "file_updated"
    emitEvent?.("file", { file: op })
    emitEvent?.("status", {
      status: fileStatus,
      details: { path: op.path },
      message: `${op.operation.toUpperCase()}: ${op.path}`,
    })
    emitEvent?.("console", {
      level: "success",
      message: `✓ File ${op.operation}: ${op.path}`,
    })
  }

  let accumulatedOps = [...fileOperations]
  let activeWorkspace = applyOperationsToWorkspace(currentFiles, accumulatedOps)

  // Pre-flight Workspace Validation
  emitEvent?.("status", {
    status: "validating",
    message: "Validating workspace syntax, entry points, and module imports",
  })

  let validation = validateWorkspace(activeWorkspace)
  let repairAttempts = 0

  if (request.mode !== "plan" && !validation.valid && validation.diagnostics.length > 0) {
    emitEvent?.("status", {
      status: "validation_failed",
      diagnostics: validation.diagnostics,
      message: `Validation failed: ${validation.diagnostics.length} diagnostic issue(s) detected`,
    })

    // Bounded Self-Repair Loop
    while (!validation.valid && repairAttempts < MAX_REPAIR_ATTEMPTS) {
      repairAttempts += 1
      emitEvent?.("status", {
        status: "repair_started",
        attempt: repairAttempts,
        maxAttempts: MAX_REPAIR_ATTEMPTS,
        diagnostics: validation.diagnostics,
        message: `Attempting targeted repair ${repairAttempts}/${MAX_REPAIR_ATTEMPTS}`,
      })
      emitEvent?.("console", {
        level: "info",
        message: `🔧 Repair attempt ${repairAttempts}/${MAX_REPAIR_ATTEMPTS} for ${validation.diagnostics.length} issue(s)`,
      })

      const diagnosticSummary = validation.diagnostics
        .map((d) => `- [${d.code}] in ${d.file}: ${d.message}`)
        .join("\n")

      const repairPrompt = [
        `Instruction: ${request.userPrompt ?? request.prompt}`,
        `REPAIR REQUEST (Attempt ${repairAttempts}/${MAX_REPAIR_ATTEMPTS}):`,
        `The workspace failed validation with the following diagnostic errors:`,
        diagnosticSummary,
        `Provide a targeted fix addressing these diagnostic errors. Prefer minimal, surgical updates over rewriting unrelated modules.`,
      ].join("\n\n")

      activeRequest = {
        ...request,
        prompt: repairPrompt,
      }

      try {
        const repairProviderResult = await invokeProviderAdapter(activeRequest)
        const repairParserResult = parseProviderResponse(repairProviderResult.rawResponse)
        const repairOps = normalizeParserResult(
          repairParserResult,
          activeWorkspace.map((f) => ({
            path: f.path,
            content: f.content,
            language: f.language ?? "text",
          })),
        )

        for (const op of repairOps) {
          const fileStatus =
            op.operation === "create"
              ? "file_created"
              : op.operation === "delete"
                ? "file_deleted"
                : "file_updated"
          emitEvent?.("file", { file: op })
          emitEvent?.("status", {
            status: fileStatus,
            details: { path: op.path },
            message: `REPAIR ${op.operation.toUpperCase()}: ${op.path}`,
          })
        }

        accumulatedOps = [...accumulatedOps, ...repairOps]
        activeWorkspace = applyOperationsToWorkspace(activeWorkspace, repairOps)
        providerAdapterResult = repairProviderResult
        parserResult = repairParserResult

        validation = validateWorkspace(activeWorkspace)

        if (validation.valid) {
          emitEvent?.("status", {
            status: "repair_completed",
            attempt: repairAttempts,
            message: "Targeted repair resolved all validation issues",
          })
          emitEvent?.("console", {
            level: "success",
            message: `✓ Repair attempt ${repairAttempts} succeeded`,
          })
          break
        }
      } catch (err) {
        console.warn("[pipeline repair error]", err)
        break
      }
    }
  }

  if (validation.valid || request.mode === "plan") {
    emitEvent?.("status", {
      status: "validation_passed",
      message: "Workspace validation passed cleanly",
    })

    const response = buildPipelineResponse(
      providerAdapterResult,
      parserResult,
      accumulatedOps,
    )

    const provenance: BuildProvenance = {
      id: `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      provider: providerAdapterResult.provider,
      model:
        typeof providerAdapterResult.metadata?.model === "string"
          ? providerAdapterResult.metadata.model
          : undefined,
      mode: request.mode ?? "build",
      prompt: request.userPrompt ?? request.prompt,
      operations: accumulatedOps.map(({ path, operation }) => ({
        path,
        operation,
      })),
      skills: request.enabledSkills,
      diagnostics: validation.diagnostics,
      repairAttempts,
    }

    emitEvent?.("status", {
      status: "build_completed",
      message: "Workspace build completed",
    })
    emitEvent?.("console", {
      level: "success",
      message: "✓ Workspace build complete",
    })

    return {
      ...response,
      diagnostics: validation.diagnostics,
      provenance,
      validationPassed: true,
      repairAttempts,
    }
  }

  // Repair budget exhausted or unfixable validation failure
  emitEvent?.("status", {
    status: "repair_failed",
    diagnostics: validation.diagnostics,
    message: `Repair budget exhausted (${repairAttempts}/${MAX_REPAIR_ATTEMPTS} attempts)`,
  })
  emitEvent?.("status", {
    status: "build_failed",
    diagnostics: validation.diagnostics,
    message: "Build failed validation boundary check",
  })
  emitEvent?.("console", {
    level: "error",
    message: `⚠ Build failed validation check (${validation.diagnostics.length} error(s))`,
  })

  const response = buildPipelineResponse(
    providerAdapterResult,
    parserResult,
    accumulatedOps,
  )

  const provenance: BuildProvenance = {
    id: `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    provider: providerAdapterResult.provider,
    model:
      typeof providerAdapterResult.metadata?.model === "string"
        ? providerAdapterResult.metadata.model
        : undefined,
    mode: request.mode ?? "build",
    prompt: request.userPrompt ?? request.prompt,
    operations: accumulatedOps.map(({ path, operation }) => ({
      path,
      operation,
    })),
    skills: request.enabledSkills,
    diagnostics: validation.diagnostics,
    repairAttempts,
  }

  return {
    ...response,
    diagnostics: validation.diagnostics,
    provenance,
    validationPassed: false,
    repairAttempts,
  }
}


