import type { ChatMessage, ProjectVersion } from "./store"

export type WorkspaceMaturityId = "vision" | "understanding" | "blueprint" | "architecture" | "construction" | "validation" | "ship"

export interface WorkspaceMilestone {
  id: WorkspaceMaturityId
  label: string
  description: string
  status: "completed" | "active" | "pending"
  versionNumber?: number
}

export interface EngineerResponseCard {
  insight?: string
  decision?: string
  recommendation?: string
  action?: string
  result?: string
}

export const WORKSPACE_MILESTONE_LIST: Array<{
  id: WorkspaceMaturityId
  label: string
  description: string
}> = [
  {
    id: "vision",
    label: "Vision Established",
    description: "Core product intent and target experience identified.",
  },
  {
    id: "understanding",
    label: "Problem Understood",
    description:
      "User requirements, scope boundaries, and primary workflows clear.",
  },
  {
    id: "blueprint",
    label: "Building Product Blueprint",
    description: "System capabilities and UX interaction patterns mapped.",
  },
  {
    id: "architecture",
    label: "Architecture Established",
    description: "File tree, data models, and component boundaries finalized.",
  },
  {
    id: "construction",
    label: "Construction & Integration",
    description: "Active UI, backend wiring, and interactive state evolution.",
  },
  {
    id: "validation",
    label: "Validation & Polish",
    description:
      "Linting, runtime checks, responsive viewport testing, and refinement.",
  },
  {
    id: "ship",
    label: "Ready to Ship",
    description: "Production-ready build, deploy-capable workspace.",
  },
]

/**
 * Calculates the living workspace maturity milestones from existing versions & message count.
 * Does NOT alter persistence or canonical project structure.
 */
export function deriveWorkspaceMilestones(
  messages: ChatMessage[],
  versions: ProjectVersion[],
  isGenerating: boolean,
): WorkspaceMilestone[] {
  const versionCount = versions.length
  const messageCount = messages.length

  // Determine active milestone index (0 to 6) based on workspace history
  let activeIndex = 0
  if (versionCount >= 5) {
    activeIndex = 6 // ship
  } else if (versionCount === 4) {
    activeIndex = 5 // validation
  } else if (versionCount === 3) {
    activeIndex = 4 // construction
  } else if (versionCount === 2) {
    activeIndex = 3 // architecture
  } else if (versionCount === 1) {
    activeIndex = 2 // blueprint
  } else if (messageCount >= 2) {
    activeIndex = 1 // understanding
  } else {
    activeIndex = 0 // vision
  }

  // If currently generating, bump active emphasis to next phase if not at end
  if (isGenerating && activeIndex < 6) {
    activeIndex = Math.min(6, activeIndex + 1)
  }

  return WORKSPACE_MILESTONE_LIST.map((m, idx) => {
    let status: "completed" | "active" | "pending" = "pending"
    if (idx < activeIndex) {
      status = "completed"
    } else if (idx === activeIndex) {
      status = "active"
    }
    const matchingVersion = versions[idx] ? versions[idx].number : undefined
    return {
      ...m,
      status,
      versionNumber: matchingVersion,
    }
  })
}

/**
 * Derives the active maturity title to display in the Living Header.
 */
export function getActiveMaturityLabel(
  messages: ChatMessage[],
  versions: ProjectVersion[],
  isGenerating: boolean,
): { label: string; status: "completed" | "active" | "pending" } {
  const milestones = deriveWorkspaceMilestones(messages, versions, isGenerating)
  const active =
    milestones.find((m) => m.status === "active") ||
    milestones[milestones.length - 1]
  return {
    label: active ? active.label : "Vision Established",
    status: active ? active.status : "active",
  }
}

/**
 * Converts natural conversational assistant content into a structured
 * Senior Product Engineer Collaboration Response (Insight -> Decision -> Recommendation -> Action -> Result).
 */
export function parseEngineerResponse(content: string): EngineerResponseCard {
  const clean = content.trim()
  if (!clean) return {}

  // Strip conversational fluff ("Hi!", "Sure!", "Absolutely!", "Here is what I'll do...")
  const stripped = clean
    .replace(
      /^(Hi[!.]?\s*|Hello[!.]?\s*|Sure[!.]?\s*|Absolutely[!.]?\s*|Certainly[!.]?\s*)/i,
      "",
    )
    .trim()

  const card: EngineerResponseCard = {}

  // Try parsing Markdown headings or bullet structures if present
  const lines = stripped.split("\n")
  let currentSection: keyof EngineerResponseCard | "default" = "default"
  const sections: Record<string, string[]> = {
    insight: [],
    decision: [],
    recommendation: [],
    action: [],
    result: [],
    default: [],
  }

  for (const line of lines) {
    const l = line.trim()
    const lower = l.toLowerCase()
    if (lower.startsWith("### insight") || lower.startsWith("**insight")) {
      currentSection = "insight"
      continue
    } else if (
      lower.startsWith("### decision") ||
      lower.startsWith("**decision")
    ) {
      currentSection = "decision"
      continue
    } else if (
      lower.startsWith("### recommendation") ||
      lower.startsWith("**recommendation")
    ) {
      currentSection = "recommendation"
      continue
    } else if (lower.startsWith("### action") || lower.startsWith("**action")) {
      currentSection = "action"
      continue
    } else if (lower.startsWith("### result") || lower.startsWith("**result")) {
      currentSection = "result"
      continue
    }

    if (l) {
      sections[currentSection].push(l)
    }
  }

  if (sections.insight.length > 0) card.insight = sections.insight.join(" ")
  if (sections.decision.length > 0) card.decision = sections.decision.join(" ")
  if (sections.recommendation.length > 0)
    card.recommendation = sections.recommendation.join(" ")
  if (sections.action.length > 0) card.action = sections.action.join(" ")
  if (sections.result.length > 0) card.result = sections.result.join(" ")

  // Fallback if no explicit headings were used: structure the content cleanly
  if (
    !card.insight &&
    !card.decision &&
    !card.recommendation &&
    !card.action &&
    !card.result
  ) {
    const paragraphs = stripped.split(/\n{2,}/).map((p) => p.trim())
    if (paragraphs.length === 1) {
      card.action = paragraphs[0]
    } else if (paragraphs.length === 2) {
      card.insight = paragraphs[0]
      card.action = paragraphs[1]
    } else if (paragraphs.length === 3) {
      card.insight = paragraphs[0]
      card.action = paragraphs[1]
      card.result = paragraphs[2]
    } else if (paragraphs.length >= 4) {
      card.insight = paragraphs[0]
      card.decision = paragraphs[1]
      card.action = paragraphs[2]
      card.result = paragraphs.slice(3).join("\n\n")
    }
  }

  return card
}
