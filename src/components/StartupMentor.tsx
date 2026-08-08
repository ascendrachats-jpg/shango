import { useState, useMemo } from "react"
import {
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  X,
  Check,
} from "lucide-react"
import type { ChatMessage, ProjectVersion } from "../lib/store"

interface Props {
  projectName: string
  messages: ChatMessage[]
  versions: ProjectVersion[]
  fileCount: number
}

interface AdviceCard {
  id: string
  category: "strategy" | "mvp" | "architecture" | "growth"
  title: string
  insight: string
  actionLabel: string
  type: "tip" | "warning" | "question"
}

export default function StartupMentor({
  projectName,
  messages,
  versions,
  fileCount,
}: Props) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [accepted, setAccepted] = useState<string[]>([])

  // Dynamically analyze current project context & derive contextual startup advice
  const adviceList = useMemo<AdviceCard[]>(() => {
    const cards: AdviceCard[] = []
    const safeMessages = Array.isArray(messages) ? messages : []
    const safeVersions = Array.isArray(versions) ? versions : []
    const msgText = safeMessages
      .map((m) => {
        if (!m) return ""
        const text = m.content || (m as any).text || ""
        return typeof text === "string" ? text.toLowerCase() : ""
      })
      .join(" ")

    // Rule 1: Target User Definition
    if (
      !msgText.includes("user") &&
      !msgText.includes("customer") &&
      !msgText.includes("audience")
    ) {
      cards.push({
        id: "target-user",
        category: "strategy",
        title: "Define Your Market",
        insight: `You haven't explicitly defined who ${projectName || "this product"} is for. Clarifying your target African market (e.g. Nigerian SMEs, Kenyan farmers) now prevents bloated feature scope later.`,
        actionLabel: "Define Target User",
        type: "question",
      })
    }

    // Rule 2: MVP Scope Guardrail
    if (fileCount > 15 || safeVersions.length > 8) {
      cards.push({
        id: "mvp-scope",
        category: "mvp",
        title: "Validate Before Scaling",
        insight: `Your workspace has ${fileCount} files across ${safeVersions.length} versions. Consider shipping this core iteration to local test users to validate your solution before adding more features.`,
        actionLabel: "Focus on Core Loop",
        type: "warning",
      })
    }

    // Rule 3: Database / Cost Alert
    if (
      msgText.includes("database") ||
      msgText.includes("auth") ||
      msgText.includes("firebase")
    ) {
      cards.push({
        id: "auth-cost",
        category: "architecture",
        title: "Architecture & Scalability Check",
        insight: `Authentication & persistence services are active. Ensure user rules are strict, and optimize for low-bandwidth usage where possible to serve a broader audience.`,
        actionLabel: "Review Data Rules",
        type: "tip",
      })
    } else {
      cards.push({
        id: "add-persistence",
        category: "architecture",
        title: "Transient vs Persistent State",
        insight: `Currently using local state. To build resilient applications for areas with intermittent connectivity, consider adding robust offline-first persistence.`,
        actionLabel: "Add Offline Persistence",
        type: "tip",
      })
    }

    // Rule 4: Value Proposition
    cards.push({
      id: "value-prop",
      category: "growth",
      title: "Local Context Pitch",
      insight: `Ensure your product's headline clearly answers what local or regional problem it solves in 5 seconds, without using generic tech buzzwords.`,
      actionLabel: "Refine Positioning",
      type: "tip",
    })

    return cards.filter((c) => !dismissed.includes(c.id))
  }, [projectName, messages, versions, fileCount, dismissed])

  if (adviceList.length === 0) return null

  const currentAdvice = adviceList[0]

  return (
    <div
      style={{
        margin: "8px 12px",
        padding: "10px 12px",
        borderRadius: "8px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(12px)",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background:
                currentAdvice.type === "warning"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(96, 165, 250, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: currentAdvice.type === "warning" ? "#f59e0b" : "#60a5fa",
            }}
          >
            {currentAdvice.type === "warning" ? (
              <ShieldAlert size={11} />
            ) : (
              <Lightbulb size={11} />
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: currentAdvice.type === "warning" ? "#f59e0b" : "#60a5fa",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            Builder Intelligence
          </span>
        </div>

        <button
          onClick={() => setDismissed((prev) => [...prev, currentAdvice.id])}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.3)",
            cursor: "pointer",
            padding: 2,
            borderRadius: 4,
          }}
          title="Dismiss guidance"
        >
          <X size={12} />
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 2px 0",
          fontFamily: "var(--font-geist)",
        }}
      >
        {currentAdvice.title}
      </p>

      <p
        style={{
          fontSize: 10.5,
          color: "var(--text-secondary)",
          margin: 0,
          lineHeight: 1.45,
          fontFamily: "var(--font-geist)",
        }}
      >
        {currentAdvice.insight}
      </p>

      {accepted.includes(currentAdvice.id) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            fontSize: 10,
            color: "#4ade80",
          }}
        >
          <Check size={11} />
          <span>Acknowledged for roadmap</span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            onClick={() => setAccepted((prev) => [...prev, currentAdvice.id])}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "3px 8px",
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-geist)",
            }}
          >
            {currentAdvice.actionLabel}
            <ArrowRight size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
