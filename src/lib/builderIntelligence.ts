export type IntentType =
  | "new_product"
  | "feature_request"
  | "modification"
  | "visual_change"
  | "bug_fix"
  | "runtime_error"
  | "architecture_change"
  | "dependency_request"
  | "integration_request"
  | "authentication_request"
  | "data_persistence_request"
  | "deployment_request"
  | "question"
  | "clarification_response"
  | "undo_or_restore"

export interface ProjectDecision {
  key: string
  value: string
  source: "user" | "shango_default"
  timestamp: string
}

export interface ProjectMemory {
  facts: Record<string, string>
  decisions: ProjectDecision[]
  assumptions: string[]
  constraints: string[]
  diagnostics: Array<{ code: string; message: string; file?: string }>
  history: string[]
}

export interface BuildIntent {
  objective: string
  intentType: IntentType
  targetFiles: string[]
  acceptedDecisions: Record<string, string>
  constraints: string[]
  assumptions: string[]
  modelPreference?: {
    modelId: string
    reason?: string
  }
}

export function createInitialMemory(): ProjectMemory {
  return {
    facts: {},
    decisions: [],
    assumptions: [],
    constraints: ["preserve_working_functionality"],
    diagnostics: [],
    history: [],
  }
}

export function classifyUserIntent(
  prompt: string,
  context?: { hasExistingFiles?: boolean; hasDiagnostics?: boolean; pendingQuestion?: boolean },
): IntentType {
  const p = prompt.toLowerCase().trim()

  if (context?.pendingQuestion) {
    return "clarification_response"
  }

  if (context?.hasDiagnostics || p.includes("fix runtime error") || p.includes("fix crash")) {
    return "runtime_error"
  }

  if (p.startsWith("undo") || p.startsWith("restore") || p.includes("revert")) {
    return "undo_or_restore"
  }

  if (p.includes("auth") || p.includes("login") || p.includes("sign in") || p.includes("signup")) {
    return "authentication_request"
  }

  if (p.includes("paystack") || p.includes("stripe") || p.includes("payment") || p.includes("checkout")) {
    return "integration_request"
  }

  if (p.includes("firebase") || p.includes("supabase") || p.includes("database") || p.includes("postgres")) {
    return "architecture_change"
  }

  if (p.includes("npm") || p.includes("package") || p.includes("dependency")) {
    return "dependency_request"
  }

  if (p.includes("color") || p.includes("theme") || p.includes("style") || p.includes("css") || p.includes("blue") || p.includes("amber")) {
    return "visual_change"
  }

  if (p.startsWith("fix ") || p.startsWith("repair ")) {
    return "bug_fix"
  }

  if (p.startsWith("why ") || p.endsWith("?")) {
    return "question"
  }

  if (!context?.hasExistingFiles || p.startsWith("build ") || p.startsWith("create ")) {
    return "new_product"
  }

  return "feature_request"
}

export function evaluateDecisionNeed(
  intentType: IntentType,
  prompt: string,
  memory: ProjectMemory,
): { requiresClarification: boolean; question?: string; proposedDefault?: string; category?: string } {
  const p = prompt.toLowerCase()
  const existingAuth = memory.decisions.find((d) => d.key === "authentication")
  const existingPayment = memory.decisions.find((d) => d.key === "paymentProvider")

  if (intentType === "authentication_request" && !existingAuth && !p.includes("google") && !p.includes("local") && !p.includes("none")) {
    return {
      requiresClarification: true,
      question: "Should users sign in individually (e.g. Google auth), or should this remain a local/public app?",
      proposedDefault: "local/account-free",
      category: "authentication",
    }
  }

  if (intentType === "integration_request" && p.includes("payment") && !existingPayment && !p.includes("paystack") && !p.includes("stripe")) {
    return {
      requiresClarification: true,
      question: "Which payment provider should this integration use (e.g. Paystack or Stripe)?",
      proposedDefault: "Paystack",
      category: "paymentProvider",
    }
  }

  return {
    requiresClarification: false,
  }
}

export function recordDecision(
  memory: ProjectMemory,
  key: string,
  value: string,
  source: "user" | "shango_default" = "user",
): ProjectMemory {
  const existingIdx = memory.decisions.findIndex((d) => d.key === key)
  const newDecision: ProjectDecision = {
    key,
    value,
    source,
    timestamp: new Date().toISOString(),
  }

  const updatedDecisions = existingIdx >= 0
    ? memory.decisions.map((d, idx) => (idx === existingIdx ? newDecision : d))
    : [...memory.decisions, newDecision]

  return {
    ...memory,
    decisions: updatedDecisions,
  }
}

export function constructBuildIntent(
  prompt: string,
  intentType: IntentType,
  targetFiles: string[],
  memory: ProjectMemory,
  activeDiagnostic?: { code: string; message: string; file?: string },
  modelId?: string,
): BuildIntent {
  const acceptedDecisions: Record<string, string> = {}
  for (const d of memory.decisions) {
    acceptedDecisions[d.key] = d.value
  }

  const constraints = [...memory.constraints]
  if (intentType === "feature_request" || intentType === "modification" || intentType === "visual_change") {
    constraints.push("do_not_rewrite_unrelated_components")
  }

  const assumptions = [...memory.assumptions]
  if (activeDiagnostic) {
    assumptions.push(`Fixing diagnostic [${activeDiagnostic.code}] in ${activeDiagnostic.file ?? "workspace"}`)
  }

  return {
    objective: prompt,
    intentType,
    targetFiles,
    acceptedDecisions,
    constraints,
    assumptions,
    modelPreference: modelId ? { modelId } : undefined,
  }
}
