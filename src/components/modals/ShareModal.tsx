import { useState } from "react"
import { X, Copy, ExternalLink, Check, Lock, Globe, Code } from "lucide-react"
import { useApp } from "../../store/AppContext"

export default function ShareModal() {
  const { state, closeModal, toast } = useApp()
  const [privacy, setPrivacy] = useState<"private" | "public" | "embed">(
    "public",
  )
  const [copied, setCopied] = useState(false)

  if (state.modal !== "share") return null

  const project = state.projects.find((p) => p.id === state.activeProjectId)
  const slug = state.activeProjectId ?? "abc123"
  const shareUrl = `https://shango.app/p/${slug}`

  const copy = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {})
    setCopied(true)
    toast("Link copied to clipboard.", "success")
    setTimeout(() => setCopied(false), 2000)
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
          width: 460,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
          overflow: "hidden",
          animation: "palette-in 0.18s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 20px 16px",
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
            Share {project?.name ?? "Project"}
          </h2>
          <button onClick={closeModal} style={iconBtnStyle}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* URL row */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.45)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {shareUrl}
            </div>
            <button
              onClick={copy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 14px",
                borderRadius: 9,
                border: "none",
                background: copied ? "rgba(255,255,255,0.12)" : "white",
                color: copied ? "rgba(255,255,255,0.8)" : "#000",
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s, color 0.2s",
                flexShrink: 0,
                fontWeight: 500,
              }}
            >
              {copied ? (
                <Check size={13} strokeWidth={2.5} />
              ) : (
                <Copy size={13} strokeWidth={2} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.45)",
                cursor: "pointer",
                textDecoration: "none",
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
                el.style.color = "rgba(255,255,255,0.45)"
              }}
            >
              <ExternalLink size={13} strokeWidth={1.75} />
            </a>
          </div>

          {/* Privacy */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11.5,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              Visibility
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                {
                  value: "private" as const,
                  icon: Lock,
                  label: "Private",
                  desc: "Only you can access this",
                },
                {
                  value: "public" as const,
                  icon: Globe,
                  label: "Public",
                  desc: "Anyone with the link can preview",
                },
                {
                  value: "embed" as const,
                  icon: Code,
                  label: "Embed",
                  desc: "Share as an embeddable iframe",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrivacy(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: `1px solid ${
                      privacy === opt.value
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    background:
                      privacy === opt.value
                        ? "rgba(255,255,255,0.06)"
                        : "transparent",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `1.5px solid ${
                        privacy === opt.value
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.2)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {privacy === opt.value && (
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "white",
                        }}
                      />
                    )}
                  </div>
                  <opt.icon
                    size={13}
                    strokeWidth={1.75}
                    style={{ opacity: 0.6, flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "rgba(255,255,255,0.35)",
                        marginTop: 1,
                      }}
                    >
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Collaborators — coming soon */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.02)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 2,
                }}
              >
                Collaborators
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)" }}>
                Invite teammates — coming soon
              </div>
            </div>
            <div
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.05)",
                fontSize: 10.5,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.05em",
              }}
            >
              SOON
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
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
}
