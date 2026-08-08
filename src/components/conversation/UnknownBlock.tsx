import _React from "react"

/**
 * A fallback component for rendering block types that haven't been implemented yet.
 * This is crucial for development to ensure the app doesn't crash when a new
 * block type is introduced but its view component isn't ready.
 */
export function UnknownBlock({ type }: { type: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: "8px",
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        color: "#fca5a5",
        fontSize: 12,
        fontFamily: "var(--font-mono-jetbrains)",
      }}
    >
      <strong>Error:</strong> Unknown block type: <code>{type}</code>
    </div>
  )
}
