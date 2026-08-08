import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"

interface Props {
  open: boolean
  onClose: () => void
}

const INTEGRATIONS = [
  {
    id: "paystack",
    name: "Paystack",
    category: "African Payments",
    desc: "Africa-first payments: cards, M-Pesa, bank transfer",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="1"
          y="4.5"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="1"
          y="9.5"
          width="9"
          height="2.5"
          rx="1.25"
          fill="currentColor"
          opacity="0.45"
        />
      </svg>
    ),
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    category: "African Payments",
    desc: "Pan-African infrastructure for global merchants",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2.5 8L6.5 12L13.5 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 12L13.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        />
      </svg>
    ),
  },
  {
    id: "mpesa",
    name: "M-Pesa",
    category: "African Payments",
    desc: "Mobile money API for Kenya and East Africa",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8c0-3.5 2.5-5 5-5s5 1.5 5 5-2.5 5-5 5-5-1.5-5-5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d="M8 5.5v5M5.5 8h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    category: "Global Infra",
    desc: "Sync repositories, trigger builds, manage branches",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1a7 7 0 00-2.213 13.641c.35.065.478-.152.478-.337v-1.18C4.03 13.51 3.63 12.12 3.63 12.12c-.32-.81-.78-1.026-.78-1.026-.638-.436.048-.427.048-.427.705.05 1.076.724 1.076.724.626 1.073 1.643.763 2.043.584.063-.454.245-.763.446-.938C5.1 10.817 3.657 10.28 3.657 7.892c0-.66.236-1.2.623-1.622-.063-.153-.27-.767.058-1.599 0 0 .508-.163 1.665.62A5.8 5.8 0 018 5.06c.513.003 1.03.07 1.512.202 1.155-.783 1.663-.62 1.663-.62.33.832.122 1.446.06 1.599.387.423.622.962.622 1.622 0 2.394-1.447 2.923-2.824 3.077.222.191.42.568.42 1.145v1.697c0 .187.127.406.482.337A7.001 7.001 0 008 1z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Global Infra",
    desc: "Postgres database, auth, edge functions, storage",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M9.02 1.5a1.02 1.02 0 00-1.752.716v5.568H2.816a1.02 1.02 0 00-.77 1.69l5.164 5.876c.395.45 1.103.232 1.103-.37V9.412h4.452a1.02 1.02 0 00.77-1.69L9.02 1.5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Global Infra",
    desc: "Deploy, preview, and ship to production instantly",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L15 14H1L8 1z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "Global Infra",
    desc: "GPT-4, embeddings, DALL·E, Whisper APIs",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13.5 6.5a3.5 3.5 0 00-4.5-3.35A3.5 3.5 0 002.5 6.5a3.5 3.5 0 000 3A3.5 3.5 0 006 12.85 3.5 3.5 0 0013.5 9.5a3.5 3.5 0 000-3z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Global Infra",
    desc: "CDN, workers, R2 storage, DNS management",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M10.5 10.5H4a3 3 0 110-6h.2A4 4 0 0112 5.5h.5a2.5 2.5 0 010 5z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
    ),
  },
]

export default function ConnectorsDrawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const {
    connectedConnectors,
    disconnectConnector,
    isConnectorConnected,
    addToast,
  } = useApp()
  const [search, setSearch] = useState("")
  const [managing, setManaging] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setManaging(null)
    }
  }, [open])

  const openRegistry = () => {
    onClose()
    navigate("/integrations")
  }

  const handleConnectorAction = (id: string, name: string) => {
    if (!isConnectorConnected(id)) {
      openRegistry()
      return
    }

    disconnectConnector(id)
    addToast(`${name} disconnected`, "default")
    setManaging(null)
  }

  const filtered = INTEGRATIONS.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase()),
  )

  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 400,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          zIndex: 401,
          background: "rgba(19,19,20,0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderLeft: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
          animation: "connDrawerSlide 0.28s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "var(--font-geist)",
                  letterSpacing: "-0.01em",
                }}
              >
                Connectors
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 11,
                  fontFamily: "var(--font-geist)",
                  color: "rgba(255,255,255,0.28)",
                }}
              >
                {connectedConnectors.length} connected · {INTEGRATIONS.length}{" "}
                quick access
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                e.currentTarget.style.color = "rgba(255,255,255,0.7)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                e.currentTarget.style.color = "rgba(255,255,255,0.35)"
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 1.5l7 7M8.5 1.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 9,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ flexShrink: 0, opacity: 0.35 }}
            >
              <circle cx="5" cy="5" r="3.5" stroke="white" strokeWidth="1.2" />
              <path
                d="M8 8l2 2"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search connectors..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 12.5,
                color: "rgba(255,255,255,0.75)",
                fontFamily: "var(--font-geist)",
              }}
            />
          </div>
        </div>

        {/* Connector tiles */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 20px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "rgba(255,255,255,0.2)",
                fontSize: 12,
                fontFamily: "var(--font-geist)",
              }}
            >
              No connectors match "{search}"
            </div>
          ) : (
            <>
              {["African Payments", "Global Infra"].map((category) => {
                const categoryIntegrations = filtered.filter(
                  (i) => i.category === category,
                )
                if (categoryIntegrations.length === 0) return null

                return (
                  <div key={category} style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.08em",
                        color:
                          category === "African Payments"
                            ? "var(--color-terracotta)"
                            : "rgba(255,255,255,0.3)",
                        marginBottom: 10,
                        paddingLeft: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {category}
                    </div>
                    {categoryIntegrations.map((integration) => {
                      const isConnected = isConnectorConnected(integration.id)
                      const isManaging = managing === integration.id

                      return (
                        <div
                          key={integration.id}
                          style={{
                            borderRadius: 12,
                            background: isConnected
                              ? "rgba(255,255,255,0.025)"
                              : "rgba(255,255,255,0.015)",
                            border: `1px solid ${
                              isConnected
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(255,255,255,0.04)"
                            }`,
                            marginBottom: 8,
                            overflow: "hidden",
                            transition:
                              "border-color 0.2s ease, background 0.2s ease",
                          }}
                        >
                          {/* Tile row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 13,
                              padding: "13px 14px",
                            }}
                          >
                            {/* Glyph */}
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 9,
                                flexShrink: 0,
                                background: isConnected
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isConnected
                                  ? category === "African Payments"
                                    ? "var(--color-terracotta)"
                                    : "rgba(255,255,255,0.75)"
                                  : "rgba(255,255,255,0.3)",
                                transition:
                                  "background 0.2s ease, color 0.2s ease",
                              }}
                            >
                              {integration.glyph}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  marginBottom: 2,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    fontFamily: "var(--font-geist)",
                                    color: "rgba(255,255,255,0.8)",
                                  }}
                                >
                                  {integration.name}
                                </span>
                                {isConnected && (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      letterSpacing: "0.1em",
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      background: "rgba(74,222,128,0.1)",
                                      border: "1px solid rgba(74,222,128,0.2)",
                                      color: "#4ade80",
                                      fontFamily: "var(--font-mono-jetbrains)",
                                    }}
                                  >
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  fontFamily: "var(--font-geist)",
                                  color: "rgba(255,255,255,0.28)",
                                  lineHeight: 1.4,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {integration.desc}
                              </p>
                            </div>

                            {/* Actions */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexShrink: 0,
                              }}
                            >
                              <button
                                onClick={() =>
                                  isConnected
                                    ? setManaging(
                                        isManaging ? null : integration.id,
                                      )
                                    : openRegistry()
                                }
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 7,
                                  fontSize: 11,
                                  fontFamily: "var(--font-geist)",
                                  cursor: "pointer",
                                  background: "transparent",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.4)",
                                  transition: "all 0.14s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color =
                                    "rgba(255,255,255,0.7)"
                                  e.currentTarget.style.borderColor =
                                    "rgba(255,255,255,0.14)"
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color =
                                    "rgba(255,255,255,0.4)"
                                  e.currentTarget.style.borderColor =
                                    "rgba(255,255,255,0.08)"
                                }}
                              >
                                {isConnected ? "Manage" : "Open"}
                              </button>

                              {/* Toggle switch */}
                              <button
                                onClick={() =>
                                  handleConnectorAction(
                                    integration.id,
                                    integration.name,
                                  )
                                }
                                aria-label={
                                  isConnected
                                    ? `Disconnect ${integration.name}`
                                    : `Open ${integration.name} in connector registry`
                                }
                                title={
                                  isConnected
                                    ? `Disconnect ${integration.name}`
                                    : `Open ${integration.name} in connector registry`
                                }
                                style={{
                                  width: 36,
                                  height: 20,
                                  borderRadius: 10,
                                  border: "none",
                                  background: isConnected
                                    ? "rgba(255,255,255,0.85)"
                                    : "rgba(255,255,255,0.1)",
                                  cursor: "pointer",
                                  position: "relative",
                                  transition:
                                    "background 0.22s cubic-bezier(0.16,1,0.3,1)",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 3,
                                    borderRadius: "50%",
                                    width: 14,
                                    height: 14,
                                    background: isConnected
                                      ? "#0a0a0a"
                                      : "rgba(255,255,255,0.3)",
                                    left: isConnected ? 19 : 3,
                                    transition:
                                      "left 0.22s cubic-bezier(0.16,1,0.3,1), background 0.22s ease",
                                  }}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Manage panel (expandable) */}
                          {isManaging && (
                            <div
                              style={{
                                borderTop: "1px solid rgba(255,255,255,0.04)",
                                padding: "12px 14px",
                                background: "rgba(0,0,0,0.12)",
                                animation: "fadeIn 0.12s ease",
                              }}
                            >
                              <div style={{ display: "flex", gap: 10 }}>
                                {[
                                  {
                                    label: "Connection",
                                    value: "Enabled in this workspace",
                                  },
                                  {
                                    label: "Credentials",
                                    value: "Managed in registry",
                                  },
                                ].map((field) => (
                                  <div key={field.label} style={{ flex: 1 }}>
                                    <p
                                      style={{
                                        margin: "0 0 4px",
                                        fontSize: 9,
                                        letterSpacing: "0.1em",
                                        color: "rgba(255,255,255,0.25)",
                                        fontFamily:
                                          "var(--font-mono-jetbrains)",
                                      }}
                                    >
                                      {field.label.toUpperCase()}
                                    </p>
                                    <div
                                      style={{
                                        padding: "6px 9px",
                                        borderRadius: 7,
                                        background: "rgba(255,255,255,0.04)",
                                        border:
                                          "1px solid rgba(255,255,255,0.06)",
                                        fontSize: 11.5,
                                        color: "rgba(255,255,255,0.45)",
                                        fontFamily:
                                          "var(--font-mono-jetbrains)",
                                      }}
                                    >
                                      {field.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                style={{
                                  marginTop: 10,
                                  padding: "6px 12px",
                                  borderRadius: 7,
                                  fontSize: 11,
                                  fontFamily: "var(--font-geist)",
                                  cursor: "pointer",
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.55)",
                                  transition: "all 0.14s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(255,255,255,0.1)"
                                  e.currentTarget.style.color =
                                    "rgba(255,255,255,0.8)"
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(255,255,255,0.06)"
                                  e.currentTarget.style.color =
                                    "rgba(255,255,255,0.55)"
                                }}
                                onClick={openRegistry}
                              >
                                Open connector registry →
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.08em",
            }}
          >
            CONNECTOR REGISTRY v1
          </span>
          <button
            style={{
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              fontFamily: "var(--font-geist)",
              transition: "all 0.14s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.35)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
            }}
            onClick={openRegistry}
          >
            View all connectors →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes connDrawerSlide {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
