import type { ActivityStatus } from "../lib/activityStatus"
import { statusToLine } from "../lib/activityStatus"

export default function ActivityBox({
  activityStatus,
}: {
  activityStatus?: ActivityStatus
}) {
  // Only show the activity box for active, factual generation states.
  if (!activityStatus) return null
  const activeStates = [
    "request_sent",
    "assistant_composing",
    "applying_workspace_changes",
  ]
  if (!activeStates.includes(activityStatus.status)) return null

  const meta = statusToLine(activityStatus)

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 12,
        animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.012), inset 0 0 12px rgba(255,255,255,0.01)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.86)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {meta.title}
          </div>
          {meta.description && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.46)",
                fontFamily: "var(--font-geist)",
                marginTop: 4,
              }}
            >
              {meta.description}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.44)",
            fontFamily: "var(--font-mono-jetbrains)",
            textTransform: "uppercase",
          }}
        >
          {meta.title}
        </div>
      </div>
    </div>
  )
}
