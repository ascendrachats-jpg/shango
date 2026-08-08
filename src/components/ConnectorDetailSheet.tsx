import { useEffect, useState } from "react"
import { XIcon } from "./icons"
import { useApp } from "../store/AppContext"
import { getConnectorById, type Connector } from "../lib/connectors"
import { getSkillById } from "../lib/skills"

interface Props {
  connector: Connector | null
  onClose: () => void
  onConnect: (c: Connector) => void
  onNavigate: (c: Connector) => void
}

export default function ConnectorDetailSheet({
  connector,
  onClose,
  onConnect,
  onNavigate,
}: Props) {
  useEffect(() => {
    if (!connector) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [connector, onClose])

  if (!connector) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        className="relative pointer-events-auto flex flex-col"
        style={{
          width: 420,
          height: "100%",
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(28px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          animation: "slideInFromRight 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <ConnectorDetailContent
          connector={connector}
          onClose={onClose}
          onConnect={onConnect}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}

function ConnectorDetailContent({
  connector,
  onClose,
  onConnect,
  onNavigate,
}: {
  connector: Connector
  onClose: () => void
  onConnect: (c: Connector) => void
  onNavigate: (c: Connector) => void
}) {
  const { connectedConnectors, disconnectConnector, addToast } = useApp()
  const [disconnectHovered, setDisconnectHovered] = useState(false)

  const isConnected = connectedConnectors.includes(connector.id)
  // Activity becomes available only after a provider-backed connection exists.
  const hasVerifiedActivity = false

  const requiredSkillObjects = connector.requiredSkills
    .map((id) => getSkillById(id))
    .filter(Boolean)

  const recommendedConnectorObjects = connector.recommendedSkills
    .map((id) => getConnectorById(id))
    .filter(Boolean) as Connector[]

  const handleDisconnect = () => {
    disconnectConnector(connector.id)
    addToast(`${connector.name} disconnected`, "default")
    onClose()
  }

  const statusColor = isConnected ? "#a3a3a3" : "var(--text-disabled)"
  const statusLabel = isConnected ? "PREVIEW ENABLED" : "NOT CONNECTED"

  return (
    <>
      {/* Header */}
      <div
        className="flex items-start gap-3 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {/* Monogram */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: isConnected
              ? "rgba(255,255,255,0.08)"
              : "var(--surface-3)",
            border: `1px solid ${
              isConnected ? "rgba(255,255,255,0.12)" : "var(--border-default)"
            }`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isConnected
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {connector.monogram}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {connector.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.06em",
              }}
            >
              {connector.category.toUpperCase()}
            </span>
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: "var(--text-disabled)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {connector.authType === "oauth"
                ? "OAuth"
                : connector.authType === "api-key"
                  ? "API Key"
                  : "Token"}
            </span>
          </div>

          {/* Health / status */}
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: statusColor,
                boxShadow: "none",
                display: "inline-block",
                animation: "none",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: statusColor,
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.06em",
              }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)"
            e.currentTarget.style.background = "var(--surface-3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <XIcon size={12} />
        </button>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {isConnected ? (
          <>
            <div
              className="flex-1 px-3 py-2 rounded-lg"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
              }}
            >
              <span
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  fontSize: 10,
                }}
              >
                Local preview only — no external account connected
              </span>
            </div>
            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              onMouseEnter={() => setDisconnectHovered(true)}
              onMouseLeave={() => setDisconnectHovered(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0"
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${
                  disconnectHovered
                    ? "rgba(239,68,68,0.3)"
                    : "var(--border-default)"
                }`,
                color: disconnectHovered ? "#ef4444" : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                transition: "all 0.16s ease",
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(connector)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium flex-1 justify-center"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "#080808",
              fontFamily: "var(--font-geist)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "white"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.92)"
            }}
          >
            Connect {connector.name}
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scroll-hidden">
        {/* Description */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.7,
            }}
          >
            {connector.description}
          </p>
        </div>

        {/* Permissions */}
        <Section title="PERMISSIONS">
          <ul className="space-y-1.5">
            {connector.permissions.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <LockIcon />
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  {p}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Scopes */}
        {connector.scopes.length > 0 && (
          <Section title="SCOPES">
            <div className="flex flex-wrap gap-1.5">
              {connector.scopes.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </div>
          </Section>
        )}

        {/* Required skills */}
        {requiredSkillObjects.length > 0 && (
          <Section title="REQUIRES SKILLS">
            <div className="space-y-1.5">
              {requiredSkillObjects.map((s) => {
                if (!s) return null
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded flex-shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {s.monogram}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {s.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                          fontSize: 10,
                        }}
                      >
                        {s.purpose}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 8,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.06em",
                        flexShrink: 0,
                      }}
                    >
                      SKILL
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Pairs well with */}
        {recommendedConnectorObjects.length > 0 && (
          <Section title="PAIRS WELL WITH">
            <div className="space-y-1.5">
              {recommendedConnectorObjects.map((c) => {
                const isConn = connectedConnectors.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => onNavigate(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                      transition: "border-color 0.16s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-subtle)")
                    }
                  >
                    <div
                      className="flex items-center justify-center rounded flex-shrink-0"
                      style={{
                        width: 26,
                        height: 26,
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {c.monogram}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {c.name}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                          fontSize: 10,
                        }}
                      >
                        {c.category}
                      </p>
                    </div>
                    {isConn ? (
                      <span
                        style={{
                          fontSize: 8,
                          color: "#4ade80",
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        CONNECTED
                      </span>
                    ) : (
                      <svg
                        width={10}
                        height={10}
                        viewBox="0 0 10 10"
                        fill="none"
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      >
                        <path
                          d="M3 5h4M5 3l2 2-2 2"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* Activity log */}
        {hasVerifiedActivity &&
          isConnected &&
          connector.activityLog.length > 0 && (
            <Section title="ACTIVITY">
              <div className="relative">
                <div
                  className="absolute top-2 bottom-2 w-px"
                  style={{
                    left: 7,
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  }}
                />
                {connector.activityLog.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3 pb-4 relative">
                    <div
                      className="flex-shrink-0 rounded-full"
                      style={{
                        width: 15,
                        height: 15,
                        background: i === 0 ? "white" : "var(--surface-3)",
                        border:
                          i === 0 ? "none" : "1px solid var(--border-default)",
                        marginTop: 1,
                        boxShadow:
                          i === 0 ? "0 0 0 2px rgba(255,255,255,0.06)" : "none",
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: i === 0 ? 4 : 3,
                          height: i === 0 ? 4 : 3,
                          borderRadius: "50%",
                          background:
                            i === 0 ? "#0a0a0a" : "var(--text-disabled)",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-geist)",
                          lineHeight: 1.5,
                        }}
                      >
                        {entry.action}
                      </p>
                      <p
                        style={{
                          fontSize: 9,
                          color: "var(--text-disabled)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          marginTop: 2,
                        }}
                      >
                        {entry.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

        {/* Security */}
        <Section title="PREVIEW SECURITY" noBorder>
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <LockIcon />
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.7,
                }}
              >
                This preview does not collect, encrypt, store, or transmit
                provider credentials. A production connection must show its real
                authorization method, storage boundary, and revocation path
                before access is granted.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  noBorder = false,
}: {
  title: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      className="px-5 py-4"
      style={{
        borderBottom: noBorder ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      <p
        className="mb-3"
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md"
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary)",
        fontFamily: "var(--font-mono-jetbrains)",
        fontSize: 10,
      }}
    >
      {label}
    </span>
  )
}

function LockIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      style={{ color: "var(--text-disabled)", flexShrink: 0, marginTop: 1 }}
    >
      <rect
        x="1.5"
        y="4.5"
        width="7"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M3 4.5V3.5a2 2 0 014 0v1"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
