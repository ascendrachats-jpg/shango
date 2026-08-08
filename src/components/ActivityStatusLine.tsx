import type { ActivityStatus } from "../lib/activityStatus"
import { statusToLine } from "../lib/activityStatus"

export default function ActivityStatusLine({
  activityStatus,
}: {
  activityStatus?: ActivityStatus
}) {
  if (!activityStatus) return null
  const { title, description } = statusToLine(activityStatus)
  return (
    <div
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.02)",
        background: "transparent",
        color: "rgba(255,255,255,0.66)",
        fontSize: 13,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: "rgba(255,255,255,0.84)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: "rgba(255,255,255,0.48)",
          }}
        >
          {description}
        </div>
      )}
    </div>
  )
}
