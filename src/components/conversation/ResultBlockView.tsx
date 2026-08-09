import _React from "react"
import type { ResultBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders a result block — real build completion.
 * Shows what was built and the preview status. No fake claims.
 */
export function ResultBlockView({ block }: Props) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background:
              block.previewStatus === "ready"
                ? "rgba(255, 255, 255, 0.8)"
                : "rgba(255, 255, 255, 0.35)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {block.summary}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingLeft: 14,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.4)",
          fontFamily: "var(--font-mono-jetbrains)",
        }}
      >
        <span>{block.fileCount} file{block.fileCount === 1 ? "" : "s"}</span>
        <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>·</span>
        <span>
          {block.previewStatus === "ready"
            ? "Preview ready"
            : "Preview failed"}
        </span>
      </div>
    </div>
  )
}
