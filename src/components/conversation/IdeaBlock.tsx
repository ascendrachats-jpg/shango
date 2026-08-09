import _React from "react"
import type { IdeaBlock as IdeaBlockType } from "../../lib/conversation"

interface Props {
  block: IdeaBlockType
}

/**
 * Renders the initial "Idea" block from the builder.
 * This is designed to feel like the starting point of a document, not a chat bubble.
 */
export function IdeaBlock({ block }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 4,
        alignSelf: "stretch",
        maxWidth: "100%",
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.025)",
      }}
    >
      <div
        style={{
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "var(--font-geist)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {block.content}
      </div>
    </div>
  )
}
