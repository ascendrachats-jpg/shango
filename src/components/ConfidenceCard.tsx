import { useState, useEffect } from "react"
import type { ActivityStatus } from "../lib/activityStatus"
import { statusToLine } from "../lib/activityStatus"

export default function ConfidenceCard({
  activityStatus,
}: {
  activityStatus?: ActivityStatus
}) {
  const [render, setRender] = useState(false)

  useEffect(() => {
    if (activityStatus?.status === "ready") {
      setRender(true)
      const t = setTimeout(() => setRender(false), 1400)
      return () => clearTimeout(t)
    }
    return () => undefined
  }, [activityStatus?.status])

  if (!render) return null

  const meta = statusToLine(activityStatus ?? { status: "ready" })

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 24,
        zIndex: 100,
        background: "rgba(10, 10, 12, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "10px 12px",
        borderRadius: 10,
        boxShadow: "0 10px 24px rgba(0,0,0,0.34)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "shango-fade-up 0.24s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.7)",
        }}
      />
      <div>
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(255,255,255,0.86)",
            fontFamily: "var(--font-geist)",
            fontWeight: 500,
          }}
        >
          {meta.title}
        </div>
        {meta.description && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-geist)",
              marginTop: 1,
            }}
          >
            {meta.description}
          </div>
        )}
      </div>
    </div>
  )
}
