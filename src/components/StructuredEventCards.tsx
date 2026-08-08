import _React, { useState } from "react"

export interface ExecutionStepItem {
  name: string
  file?: string
  status: "pending" | "running" | "completed"
}

export interface Props {
  content: string
  onSelectFile?: (filePath: string) => void
  events?: Array<{
    type?: string
    title?: string
    details?: string
    status?: string
    files?: string[]
  }>
}

/**
 * Minimalist, elegant file & mutation summary (Lovable / Bolt style)
 */
export function ActionHistoryCard({
  content,
  onSelectFile,
}: {
  content: string
  onSelectFile?: (filePath: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  // Extract files modified from content if any
  const fileRegex = /`?((?:src|public|server)\/[a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+)`?/g
  const matches = Array.from(content.matchAll(fileRegex)).map((m) => m[1])
  const uniqueFiles = Array.from(new Set(matches)).slice(0, 8)

  if (uniqueFiles.length === 0) {
    return null
  }

  return (
    <div
      style={{
        margin: "6px 0 10px",
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.07)",
        background: "rgba(255, 255, 255, 0.02)",
        overflow: "hidden",
        fontFamily: "var(--font-geist)",
      }}
    >
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 11.5,
          fontFamily: "var(--font-geist)",
          textAlign: "left",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#60a5fa", fontSize: 11 }}>✦</span>
          <span style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.85)" }}>
            {uniqueFiles.length} file{uniqueFiles.length > 1 ? "s" : ""} modified
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.4)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            {expanded ? "Hide files" : "Show files"}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <path
              d="M2.5 3.75L5 6.25L7.5 3.75"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Collapsible file list */}
      {expanded && (
        <div
          style={{
            padding: "6px 10px 8px",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {uniqueFiles.map((filePath) => (
            <div
              key={filePath}
              onClick={() => onSelectFile?.(filePath)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "3px 6px",
                borderRadius: 5,
                fontSize: 11,
                fontFamily: "var(--font-mono-jetbrains)",
                color: "rgba(255, 255, 255, 0.65)",
                cursor: onSelectFile ? "pointer" : "default",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.65)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#4ade80", fontSize: 9 }}>✓</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filePath}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  opacity: 0.8,
                  marginLeft: 8,
                }}
              >
                updated
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Format markdown/code prose cleanly
 */
function cleanContentProse(raw: string): string {
  if (!raw) return ""
  let text = raw
  // Replace escaped \n if present
  if (text.includes("\\n") && !text.includes("\n")) {
    text = text.replace(/\\n/g, "\n")
  }
  // Strip raw ```json file payload wrappers if dumped into chat
  text = text.replace(/```(?:json)?\s*\{[\s\S]*?"fileChanges"[\s\S]*?\}\s*```/g, "")
  return text.trim()
}

export default function StructuredEventCards({ content, onSelectFile }: Props) {
  const cleanedText = cleanContentProse(content)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "var(--font-geist)",
      }}
    >
      {/* Subtle file change list if files are present in the response */}
      <ActionHistoryCard content={content} onSelectFile={onSelectFile} />

      {/* Main explanation prose */}
      {cleanedText && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(255, 255, 255, 0.88)",
            fontFamily: "var(--font-geist)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {cleanedText}
        </div>
      )}
    </div>
  )
}
