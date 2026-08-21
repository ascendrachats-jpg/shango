import _React from "react"
import type { ExecutionBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders an execution block — real build progress from SSE pipeline events.
 * Shows the actual status text, file operations, and validation state.
 * No fake progress, no simulated activity.
 */
export function ExecutionBlockView({ block }: Props) {
  const isInProgress = !block.completed && !block.failed

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Status line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isInProgress && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.6)",
              animation: "pulse 1.4s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
        )}
        {block.completed && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.8)",
              flexShrink: 0,
            }}
          />
        )}
        {block.failed && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.35)",
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.75)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {block.statusText}
        </span>
      </div>

      {/* File operations list — real files changed */}
      {block.files.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingLeft: 14,
          }}
        >
          {block.files.map((op, i) => (
            <div
              key={`${op.path}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color:
                    op.operation === "delete"
                      ? "rgba(255, 255, 255, 0.4)"
                      : "rgba(255, 255, 255, 0.55)",
                  width: 48,
                  flexShrink: 0,
                }}
              >
                {op.operation === "create"
                  ? "create"
                  : op.operation === "delete"
                    ? "delete"
                    : "modify"}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {op.path}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Validation status — only when relevant */}
      {block.validationStatus === "validating" && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.4)",
            fontFamily: "var(--font-geist)",
            paddingLeft: 14,
          }}
        >
          Checking your app
        </div>
      )}
      {block.validationStatus === "failed" && block.repairAttempts && block.repairAttempts > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.4)",
            fontFamily: "var(--font-geist)",
            paddingLeft: 14,
          }}
        >
          Fixing an issue (attempt {block.repairAttempts})
        </div>
      )}
    </div>
  )
}
