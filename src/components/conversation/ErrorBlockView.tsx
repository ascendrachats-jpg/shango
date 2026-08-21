import _React from "react"
import type { ErrorBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders an error block — real build failure.
 * Shows the failure message and diagnostics without technical jargon.
 */
export function ErrorBlockView({ block }: Props) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.3)",
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {block.message}
        </span>
      </div>

      {block.diagnostics && block.diagnostics.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingLeft: 14,
          }}
        >
          {block.diagnostics.slice(0, 5).map((diag, i) => (
            <div
              key={i}
              style={{
                fontSize: 10.5,
                color: "rgba(255, 255, 255, 0.35)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {diag.file}: {diag.message}
            </div>
          ))}
          {block.diagnostics.length > 5 && (
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255, 255, 255, 0.25)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              + {block.diagnostics.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}
