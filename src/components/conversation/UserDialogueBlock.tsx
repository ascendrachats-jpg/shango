import _React from "react"
import type { UserDialogueBlock as BlockType } from "../../lib/conversation"

interface Props {
  block: BlockType
}

/**
 * Renders the user's response in a dialogue.
 * This is styled to look like a standard user chat bubble for now.
 */
export function UserDialogueBlock({ block }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        alignSelf: "flex-end",
        maxWidth: "92%",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "14px 14px 3px 14px",
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: 13,
          lineHeight: 1.55,
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
