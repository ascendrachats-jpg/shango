import { useState } from "react"
import { X, GitBranch, Mail, ArrowRight } from "lucide-react"
import { useApp } from "../../store/AppContext"

export default function AuthSheet() {
  const { state, closeModal, dispatch, toast } = useApp()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  if (state.modal !== "auth") return null

  const handleMagicLink = () => {
    if (!email.trim()) return
    setSent(true)
    setTimeout(() => {
      dispatch({
        type: "SET_USER",
        payload: {
          name: email.split("@")[0],
          email,
          plan: "free",
          creditsUsed: 12,
          creditsTotal: 100,
        },
      })
      closeModal()
      toast("Welcome to Shango. Your projects have been saved.", "success")
    }, 1500)
  }

  const handleOAuth = (provider: string) => {
    setTimeout(() => {
      dispatch({
        type: "SET_USER",
        payload: {
          name: provider === "github" ? "dev" : "user",
          email: `user@${provider}.com`,
          plan: "free",
          creditsUsed: 12,
          creditsTotal: 100,
        },
      })
      closeModal()
      toast("Signed in. Your work has been saved.", "success")
    }, 800)
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
          width: 400,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
          animation: "palette-in 0.18s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "24px 24px 0",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 6,
              }}
            >
              <svg width="11" height="15" viewBox="0 0 11 15" fill="none">
                <path
                  d="M6.5 1L1 8h4.5l-1 6 5.5-9H6l0.5-4z"
                  fill="rgba(255,255,255,0.85)"
                />
              </svg>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                }}
              >
                SHANGO
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              Save your work
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.5,
              }}
            >
              Your{" "}
              {state.projects.filter((p) => p.status !== "ARCHIVED").length}{" "}
              project{state.projects.length !== 1 ? "s" : ""} will be synced to
              your account.
            </p>
          </div>
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
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              flexShrink: 0,
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
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {!sent ? (
            <>
              {/* OAuth buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <OAuthButton
                  icon={<GitBranch size={15} strokeWidth={1.75} />}
                  label="Continue with GitHub"
                  onClick={() => handleOAuth("github")}
                />
                <OAuthButton
                  icon={
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        opacity=".8"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        opacity=".6"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        opacity=".4"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        opacity=".9"
                      />
                    </svg>
                  }
                  label="Continue with Google"
                  onClick={() => handleOAuth("google")}
                />
              </div>

              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.07)",
                  }}
                />
                <span
                  style={{ fontSize: 11.5, color: "rgba(255,255,255,0.25)" }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.07)",
                  }}
                />
              </div>

              {/* Magic link */}
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 9,
                    transition: "border-color 0.15s",
                  }}
                >
                  <Mail
                    size={13}
                    strokeWidth={1.75}
                    style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleMagicLink()
                    }}
                    placeholder="Email address"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 13,
                      padding: "11px 0",
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      caretColor: "white",
                    }}
                  />
                </div>
                <button
                  onClick={handleMagicLink}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    borderRadius: 9,
                    border: "none",
                    background: email.trim()
                      ? "white"
                      : "rgba(255,255,255,0.1)",
                    color: email.trim() ? "#000" : "rgba(255,255,255,0.25)",
                    cursor: email.trim() ? "pointer" : "not-allowed",
                    transition: "background 0.2s, color 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={15} strokeWidth={2} />
                </button>
              </div>

              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.22)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                No password needed. We'll send a magic link.
              </p>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "16px 0",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail
                  size={18}
                  strokeWidth={1.5}
                  style={{ color: "rgba(255,255,255,0.6)" }}
                />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.8)",
                  textAlign: "center",
                }}
              >
                Check your inbox
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.35)",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                We sent a magic link to
                <br />
                <strong style={{ color: "rgba(255,255,255,0.6)" }}>
                  {email}
                </strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OAuthButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 9,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.72)",
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, sans-serif",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = "rgba(255,255,255,0.08)"
        el.style.borderColor = "rgba(255,255,255,0.18)"
        el.style.color = "rgba(255,255,255,0.92)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = "rgba(255,255,255,0.04)"
        el.style.borderColor = "rgba(255,255,255,0.1)"
        el.style.color = "rgba(255,255,255,0.72)"
      }}
    >
      {icon}
      {label}
    </button>
  )
}
