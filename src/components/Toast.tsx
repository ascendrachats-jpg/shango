import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useApp, type Toast as ToastType } from "../store/AppContext"

function ToastItem({ toast }: { toast: ToastType }) {
  const { dispatch } = useApp()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => dispatch({ type: "REMOVE_TOAST", payload: toast.id }), 220)
  }

  const borderColor =
    toast.type === "success"
      ? "rgba(255,255,255,0.3)"
      : toast.type === "error"
        ? "rgba(255,255,255,0.4)"
        : "rgba(255,255,255,0.12)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#161616",
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        minWidth: 260,
        maxWidth: 380,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : "translateY(8px) scale(0.97)",
        transition: "opacity 0.22s ease, transform 0.22s ease",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Lightning mark */}
      <svg
        width="10"
        height="14"
        viewBox="0 0 10 14"
        fill="none"
        style={{ flexShrink: 0, opacity: 0.6 }}
      >
        <path d="M6 1L1 8h4l-1 5 5-8H5l1-4z" fill="rgba(255,255,255,0.9)" />
      </svg>

      <span
        style={{
          flex: 1,
          fontSize: 12.5,
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>

      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick()
            dismiss()
          }}
          style={{
            fontSize: 11.5,
            color: "white",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 5,
            padding: "3px 8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={dismiss}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 5,
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.3)",
          cursor: "pointer",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color =
            "rgba(255,255,255,0.7)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color =
            "rgba(255,255,255,0.3)")
        }
      >
        <X size={11} strokeWidth={2} />
      </button>
    </div>
  )
}

export default function ToastStack() {
  const { state } = useApp()

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: state.toasts.length ? "all" : "none",
      }}
    >
      {state.toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
