import { useApp } from "../store/AppContext"

export default function ConfirmModal() {
  const { state, closeModal } = useApp()
  const { modal, confirmPayload } = state

  if (modal !== "confirm" || !confirmPayload) return null

  const handleConfirm = () => {
    confirmPayload.onConfirm()
    closeModal()
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal()
      }}
    >
      <div
        style={{
          width: 380,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 8,
          }}
        >
          {confirmPayload.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {confirmPayload.description}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={closeModal}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "rgba(255,255,255,0.2)"
              el.style.color = "rgba(255,255,255,0.8)"
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "rgba(255,255,255,0.1)"
              el.style.color = "rgba(255,255,255,0.55)"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = "rgba(255,255,255,0.14)"
              el.style.borderColor = "rgba(255,255,255,0.4)"
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = "rgba(255,255,255,0.08)"
              el.style.borderColor = "rgba(255,255,255,0.25)"
            }}
          >
            {confirmPayload.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}
