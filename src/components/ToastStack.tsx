import { useApp } from "../store/AppContext"

export default function ToastStack() {
  const { toasts } = useApp()
  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((toast, i) => {
        const depth = toasts.length - 1 - i
        const isSuccess = toast.type === "success"
        const isError = toast.type === "error"
        return (
          <div
            key={toast.id}
            className="shango-toast-enter flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(22,22,22,0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${
                isSuccess
                  ? "rgba(255,255,255,0.14)"
                  : isError
                    ? "rgba(255,80,80,0.22)"
                    : "var(--border-default)"
              }`,
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset",
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.4,
              minWidth: 240,
              maxWidth: 360,
              pointerEvents: "all",
              opacity: 1 - depth * 0.15,
              transform: `translateY(-${depth * 5}px) scale(${1 - depth * 0.025})`,
              transition:
                "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
            }}
          >
            {/* Status indicator */}
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                flexShrink: 0,
                background: isSuccess
                  ? "rgba(255,255,255,0.8)"
                  : isError
                    ? "rgba(255,80,80,0.8)"
                    : "rgba(255,255,255,0.25)",
                boxShadow: isSuccess
                  ? "0 0 6px rgba(255,255,255,0.4)"
                  : isError
                    ? "0 0 6px rgba(255,80,80,0.4)"
                    : "none",
              }}
            />
            <span style={{ flex: 1, color: "var(--text-secondary)" }}>
              {toast.message}
            </span>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="shango-btn-ghost text-xs font-medium"
                style={{
                  color: "var(--text-primary)",
                  padding: "2px 8px",
                  borderRadius: 5,
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
