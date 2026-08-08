import { useEffect, useRef } from "react"
import { useApp } from "../store/AppContext"
import { XIcon } from "./icons"

interface Props {
  onClose: () => void
}

export default function NotificationCenter({ onClose }: Props) {
  const { notifications, markAllRead } = useApp()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div
      ref={ref}
      className="absolute top-10 right-0 z-50 rounded-xl overflow-hidden"
      style={{
        width: 320,
        background: "rgba(16,16,16,0.94)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)",
        animation: "shango-panel-enter 0.2s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="text-sm font-medium"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          Notifications{" "}
          {unread > 0 && (
            <span
              className="ml-1 text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--surface-4)",
                color: "var(--text-secondary)",
              }}
            >
              {unread}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <XIcon size={12} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1a4 4 0 014 4v2l1 2H2L3 7V5a4 4 0 014-4zM5.5 11a1.5 1.5 0 003 0"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-geist)",
                  fontWeight: 500,
                }}
              >
                All clear
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-geist)",
                  marginTop: 3,
                }}
              >
                Nothing to review right now
              </p>
            </div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                background: n.read ? "transparent" : "rgba(255,255,255,0.02)",
              }}
            >
              {!n.read && (
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: "white" }}
                />
              )}
              {n.read && <div className="w-1.5 h-1.5 flex-shrink-0" />}
              <div style={{ flex: 1 }}>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  {n.message}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                >
                  {n.timestamp}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
