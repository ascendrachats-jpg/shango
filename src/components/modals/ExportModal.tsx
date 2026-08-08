import { X, Download, Copy, GitBranch, CheckCircle } from "lucide-react"
import { useApp } from "../../store/AppContext"
import { useState } from "react"

export default function ExportModal() {
  const { state, closeModal, toast } = useApp()
  const [done, setDone] = useState<string | null>(null)

  if (state.modal !== "export") return null

  const handle = (action: string) => {
    setDone(action)
    toast(
      action === "zip"
        ? "Download started."
        : action === "copy"
          ? "Code copied to clipboard."
          : "Connect GitHub to push.",
      "success",
    )
    setTimeout(() => setDone(null), 2000)
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
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        fontFamily: "'Inter', -apple-system, sans-serif",
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
          borderRadius: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
          overflow: "hidden",
          animation: "palette-in 0.18s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.88)",
              flex: 1,
            }}
          >
            Export Code
          </h2>
          <button
            onClick={closeModal}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: "16px 16px 20px" }}>
          {[
            {
              id: "zip",
              icon: Download,
              label: "Download ZIP",
              desc: "All generated files in a zip archive",
            },
            {
              id: "copy",
              icon: Copy,
              label: "Copy to clipboard",
              desc: "Copy the main component code",
            },
            {
              id: "github",
              icon: GitBranch,
              label: "Push to GitHub",
              desc: "Connect your GitHub account",
            },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => handle(opt.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.07)",
                background:
                  done === opt.id ? "rgba(255,255,255,0.06)" : "transparent",
                color: "rgba(255,255,255,0.72)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 6,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "rgba(255,255,255,0.05)"
                el.style.borderColor = "rgba(255,255,255,0.12)"
              }}
              onMouseLeave={(e) => {
                if (done !== opt.id) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "transparent"
                  el.style.borderColor = "rgba(255,255,255,0.07)"
                }
              }}
            >
              {done === opt.id ? (
                <CheckCircle
                  size={16}
                  strokeWidth={1.75}
                  style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0 }}
                />
              ) : (
                <opt.icon
                  size={16}
                  strokeWidth={1.75}
                  style={{ flexShrink: 0, opacity: 0.6 }}
                />
              )}
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.82)",
                    marginBottom: 2,
                  }}
                >
                  {opt.label}
                </div>
                <div
                  style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)" }}
                >
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11.5,
              color: "rgba(255,255,255,0.22)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Shango generates clean, portable React code.
            <br />
            No vendor lock-in.
          </p>
        </div>
      </div>
    </div>
  )
}
