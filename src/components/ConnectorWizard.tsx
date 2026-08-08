import { useState, useEffect } from "react"
import { XIcon } from "./icons"
import { useApp } from "../store/AppContext"
import type { Connector } from "../lib/connectors"

interface Props {
  connector: Connector | null
  onClose: () => void
}

type WizardStep = "auth" | "connecting" | "permissions" | "success"

export default function ConnectorWizard({ connector, onClose }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative pointer-events-auto"
        style={{
          width: 420,
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
          animation: "slideInPanel 0.22s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        <WizardContent connector={connector} onClose={onClose} />
      </div>
    </div>
  )
}

function WizardContent({
  connector,
  onClose,
}: {
  connector: Connector
  onClose: () => void
}) {
  const { connectConnector, addToast } = useApp()
  const [step, setStep] = useState<WizardStep>("auth")

  // Auto-advance from 'connecting' to 'permissions'
  useEffect(() => {
    if (step === "connecting") {
      const t = setTimeout(() => setStep("permissions"), 1800)
      return () => clearTimeout(t)
    }
  }, [step])

  // Auto-advance from 'success' close
  useEffect(() => {
    if (step === "success") {
      const t = setTimeout(() => onClose(), 2200)
      return () => clearTimeout(t)
    }
  }, [step, onClose])

  const beginPreviewSetup = () => {
    setStep("connecting")
  }

  const handleGrantPermissions = () => {
    connectConnector(connector.id)
    setStep("success")
    addToast(`${connector.name} enabled for this workspace`, "success")
  }

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{
          borderBottom:
            step === "success" ? "none" : "1px solid var(--border-default)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: "var(--surface-3)",
            border: "1px solid var(--border-default)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {connector.monogram}
          </span>
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {step === "success"
              ? `${connector.name} Connected`
              : `Connect ${connector.name}`}
          </p>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {step === "auth" && "Review the connection setup"}
            {step === "connecting" && "Preparing workspace connection…"}
            {step === "permissions" && "Review what SHANGO will access"}
            {step === "success" && "SHANGO's reach has expanded"}
          </p>
        </div>
        {step !== "connecting" && step !== "success" && (
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
        )}
      </div>

      {/* Step: auth */}
      {step === "auth" && (
        <div className="px-5 py-5 flex flex-col gap-5">
          {connector.authType === "oauth" ? (
            <OAuthStep connector={connector} onConnect={beginPreviewSetup} />
          ) : (
            <ApiKeyStep connector={connector} onConnect={beginPreviewSetup} />
          )}
        </div>
      )}

      {/* Step: connecting */}
      {step === "connecting" && (
        <div className="px-5 py-12 flex flex-col items-center gap-4">
          <ConnectingSpinner />
          <div className="text-center">
            <p
              className="text-sm font-medium mb-1"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Connecting to {connector.name}
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Preparing the permissions you are about to enable…
            </p>
          </div>
        </div>
      )}

      {/* Step: permissions */}
      {step === "permissions" && (
        <div className="px-5 py-5 flex flex-col gap-4">
          <p
            className="text-xs leading-relaxed"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.65,
            }}
          >
            This preview enables {connector.name} in this workspace. The
            permissions below describe the future production connection; no
            external account is accessed in this build.
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border-default)" }}
          >
            {connector.permissions.map((perm, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-4 py-2.5"
                style={{
                  borderBottom:
                    i < connector.permissions.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  background: "var(--surface-2)",
                }}
              >
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 10 10"
                  fill="none"
                  style={{ color: "var(--text-disabled)", flexShrink: 0 }}
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
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  {perm}
                </span>
              </div>
            ))}
          </div>
          <div
            className="rounded-xl p-3.5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.65,
              }}
            >
              This preview does not collect, encrypt, store, or transmit
              provider credentials. Production authorization will show its real
              provider-specific security and revocation details before access is
              granted.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              Cancel
            </button>
            <button
              onClick={handleGrantPermissions}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#080808",
                fontFamily: "var(--font-geist)",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  "white"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.92)"
              }}
            >
              Grant Access
            </button>
          </div>
        </div>
      )}

      {/* Step: success */}
      {step === "success" && (
        <div className="px-5 py-12 flex flex-col items-center gap-4">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 52,
              height: 52,
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.2)",
            }}
          >
            <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
              <path
                d="M4.5 11.5l4.5 4.5 8.5-9"
                stroke="#4ade80"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <p
              className="text-sm font-semibold mb-1"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {connector.name} is connected
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.65,
              }}
            >
              {connector.name} is enabled for this workspace. Connect live
              credentials only when the production provider flow is available.
            </p>
          </div>
          {/* Progress bar auto-closing */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 2, background: "var(--surface-3)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: "#4ade80",
                width: "100%",
                animation: "shrink-to-left 2.2s linear forwards",
                transformOrigin: "left",
              }}
            />
          </div>
        </div>
      )}

      {/* Step progress indicator */}
      {step !== "success" && (
        <div className="flex items-center justify-center gap-1.5 px-5 pb-4">
          {(["auth", "connecting", "permissions"] as const).map((s, i) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: step === s ? 16 : 5,
                height: 5,
                background:
                  step === s
                    ? "white"
                    : i <
                        ([
                          "auth",
                          "connecting",
                          "permissions",
                        ] as const).indexOf(step)
                      ? "rgba(255,255,255,0.3)"
                      : "var(--surface-4)",
                transition:
                  "width 0.24s cubic-bezier(0.16,1,0.3,1), background 0.18s ease",
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── OAuth step ─────────────────────────────────────────────────────────────

function OAuthStep({
  connector,
  onConnect,
}: {
  connector: Connector
  onConnect: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p
        className="text-xs leading-relaxed"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.65,
        }}
      >
        This is a local preview of the {connector.name} setup. No external OAuth
        window opens and no account is authorised in this build.
      </p>
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <p
          style={{
            fontSize: 9,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.08em",
          }}
        >
          REQUESTED SCOPES
        </p>
        <div className="flex flex-wrap gap-1.5">
          {connector.scopes.map((s) => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onConnect}
        className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        style={{
          background: "rgba(255,255,255,0.92)",
          color: "#080808",
          fontFamily: "var(--font-geist)",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "white"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.92)"
        }}
      >
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L13 7L7 13M1 7h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Review permissions
      </button>
    </div>
  )
}

// ── API Key step ───────────────────────────────────────────────────────────

function ApiKeyStep({
  connector,
  onConnect,
}: {
  connector: Connector
  onConnect: () => void
}) {
  const credentialLabel =
    connector.authType === "token" ? "access token" : "API key"

  return (
    <div className="flex flex-col gap-4">
      <p
        className="text-xs leading-relaxed"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.65,
        }}
      >
        Live {credentialLabel}s are not collected or stored in this preview.
        Enable the connector now to shape your workspace; production credentials
        will require a dedicated, verified connection flow.
      </p>
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <p
          style={{
            fontSize: 9,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.08em",
          }}
        >
          PREVIEW-ONLY SETUP
        </p>
        <p
          className="text-xs mt-2"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.6,
          }}
        >
          Do not paste a production secret here. SHANGO will show the intended
          permissions before enabling this workspace connection.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="w-full py-2.5 rounded-lg text-sm font-medium"
        style={{
          background: "rgba(255,255,255,0.92)",
          color: "#080808",
          fontFamily: "var(--font-geist)",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "white"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.92)"
        }}
      >
        Continue to permissions
      </button>
    </div>
  )
}

// ── Connecting spinner ─────────────────────────────────────────────────────

function ConnectingSpinner() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 52, height: 52 }}
    >
      <svg
        width={52}
        height={52}
        viewBox="0 0 52 52"
        fill="none"
        style={{ position: "absolute", animation: "spin 1.4s linear infinite" }}
      >
        <circle
          cx="26"
          cy="26"
          r="22"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
        />
        <path
          d="M26 4a22 22 0 0122 22"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: 32,
          height: 32,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L13 7L7 13M1 7h12"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
