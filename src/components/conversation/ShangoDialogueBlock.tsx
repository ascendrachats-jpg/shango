import _React from "react"
import type { ShangoDialogueBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders Shango's response in a dialogue.
 * This is styled to look like a standard assistant chat bubble for now.
 */
export function ShangoDialogueBlock({ block }: Props) {
  return (
    <div
      className="group"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#f2b96b", fontSize: 12 }}>✦</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.9)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Shango
          </span>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.35)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            {block.pending ? "generating..." : "completed"}
          </span>
        </div>
      </div>

      <div>{block.content}</div>

      {block.pending && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            color: "#f2b96b",
            fontFamily: "var(--font-geist)",
            marginTop: 4,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#f2b96b",
              animation: "pulse 1s infinite",
            }}
          />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  )
}
