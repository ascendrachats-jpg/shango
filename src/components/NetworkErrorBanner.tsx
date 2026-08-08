import { useState, useEffect } from "react"

interface Props {
  message?: string
  onDismiss?: () => void
}

export default function NetworkErrorBanner({ message, onDismiss }: Props) {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    setVisible(true)
    setExiting(false)
  }, [message])

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 220)
  }

  if (!visible || !message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        height: 36,
        background: "rgba(239,68,68,0.12)",
        borderBottom: "1px solid rgba(239,68,68,0.25)",
        backdropFilter: "blur(12px)",
        animation: exiting
          ? "fadeOut 0.22s ease forwards"
          : "fadeIn 0.18s ease",
      }}
    >
      {/* Error dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ef4444",
          flexShrink: 0,
        }}
      />

      <span
        style={{
          flex: 1,
          fontSize: 12,
          color: "rgba(255,255,255,0.75)",
          fontFamily: "var(--font-geist)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {message}
      </span>

      <button
        onClick={dismiss}
        aria-label="Dismiss error"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
          color: "rgba(255,255,255,0.4)",
          transition: "color 0.14s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "rgba(255,255,255,0.7)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
        }
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <line x1="2" y1="2" x2="12" y2="12" />
          <line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  )
}
