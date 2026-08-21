import _React from "react"
import type { ShangoDialogueBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders Shango's response in a dialogue.
 * Monochrome, quiet, factual. No fake "Thinking..." indicator.
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
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>◆</span>
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
        </div>
      </div>

      {block.content && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255, 255, 255, 0.75)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {block.content}
        </div>
      )}

      {block.pending && !block.content && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            color: "rgba(255, 255, 255, 0.4)",
            fontFamily: "var(--font-geist)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.5)",
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />
          <span>Working</span>
        </div>
      )}
    </div>
  )
}
