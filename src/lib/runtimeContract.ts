import type { ValidationDiagnostic } from "../../server/generationPipeline/types.ts"

export type RuntimeEventType =
  | "runtime_started"
  | "runtime_ready"
  | "runtime_error"
  | "runtime_warning"
  | "runtime_console"
  | "runtime_unhandled_rejection"
  | "runtime_stopped"

export interface RuntimeEvent {
  type: RuntimeEventType
  timestamp: string
  projectId?: string
  versionId?: string
  file?: string
  line?: number
  column?: number
  message?: string
  stack?: string
  level?: "info" | "warn" | "error" | "log" | "debug"
  args?: string[]
  severity?: "error" | "warning" | "info"
  source?: "preview-runtime" | "workspace-validator"
}

export function getDiagnosticFingerprint(diag: ValidationDiagnostic): string {
  return `${diag.code}:${diag.file}:${diag.line ?? 0}:${diag.column ?? 0}:${diag.message}`
}

export function normalizeRuntimeDiagnostic(event: Partial<RuntimeEvent>): ValidationDiagnostic {
  let code: ValidationDiagnostic["code"] = "RUNTIME_ERROR"
  const msg = event.message ?? "Unknown runtime exception"

  if (msg.includes("Cannot resolve") || msg.includes("Failed to fetch dynamically imported module")) {
    code = "MODULE_NOT_FOUND"
  } else if (msg.includes("Unexpected token") || msg.includes("SyntaxError")) {
    code = "SYNTAX_ERROR"
  } else if (msg.includes("is not defined") || msg.includes("is undefined") || msg.includes("Cannot read properties")) {
    code = "RUNTIME_ERROR"
  }

  return {
    severity: event.severity === "warning" ? "warning" : "error",
    file: event.file ?? "preview-runtime",
    line: event.line,
    column: event.column,
    code,
    message: msg,
    source: "preview-runtime",
    context: event.stack,
  }
}
