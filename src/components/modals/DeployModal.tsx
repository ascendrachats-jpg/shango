import { useState } from "react"
import { X, ChevronRight, CheckCircle, Circle, Loader2 } from "lucide-react"
import { useApp } from "../../store/AppContext"

type Step = "provider" | "config" | "deploy"
type Provider = "vercel" | "netlify" | "cloudflare" | "zip"
type DeployStatus = "idle" | "queued" | "building" | "deploying" | "live" | "error"

const PROVIDERS = [
  { id: "vercel" as Provider, name: "Vercel", desc: "Recommended" },
  { id: "netlify" as Provider, name: "Netlify", desc: "Edge functions" },
  {
    id: "cloudflare" as Provider,
    name: "Cloudflare Pages",
    desc: "Global edge",
  },
  { id: "zip" as Provider, name: "Export ZIP", desc: "Download code" },
]

const DEPLOY_STEPS: { status: DeployStatus; label: string; delay: number }[] = [
  { status: "queued", label: "Queued...", delay: 0 },
  { status: "building", label: "Building...", delay: 1200 },
  { status: "deploying", label: "Deploying...", delay: 2800 },
  { status: "live", label: "Live", delay: 4200 },
]

const LOG_LINES = [
  "> shango build --prod",
  "Analyzing project...",
  "Installing dependencies...",
  "Compiling 47 modules...",
  "Optimizing assets...",
  "Creating deployment bundle...",
  "Uploading to edge network...",
  "✓ Deployment complete.",
]

export default function DeployModal() {
  const { state, closeModal, toast } = useApp()
  const [step, setStep] = useState<Step>("provider")
  const [provider, setProvider] = useState<Provider | null>(null)
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle")
  const [logLines, setLogLines] = useState<string[]>([])
  const [liveUrl, setLiveUrl] = useState("")

  if (state.modal !== "deploy") return null

  const project = state.projects.find((p) => p.id === state.activeProjectId)

  const startDeploy = () => {
    setStep("deploy")
    setDeployStatus("queued")
    setLogLines([])

    LOG_LINES.forEach((line, i) => {
      setTimeout(() => setLogLines((prev) => [...prev, line]), i * 450)
    })

    DEPLOY_STEPS.forEach(({ status, delay }) => {
      setTimeout(() => {
        setDeployStatus(status)
        if (status === "live") {
          const slug =
            project?.name.toLowerCase().replace(/\s+/g, "-") ?? "my-app"
          setLiveUrl(`https://${slug}.vercel.app`)
          toast(
            `Deployed to ${provider === "vercel" ? "Vercel" : provider} ↗`,
            "success",
          )
        }
      }, delay)
    })
  }

  const handleClose = () => {
    closeModal()
    setTimeout(() => {
      setStep("provider")
      setProvider(null)
      setDeployStatus("idle")
      setLogLines([])
      setLiveUrl("")
    }, 300)
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
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        style={{
          width: 480,
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
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Deploy {project?.name ?? "Project"}
            </h2>
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {(["provider", "config", "deploy"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background:
                        step === s
                          ? "white"
                          : i < ["provider", "config", "deploy"].indexOf(step)
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: step === s ? "#000" : "rgba(255,255,255,0.4)",
                      transition: "background 0.2s",
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      color:
                        step === s
                          ? "rgba(255,255,255,0.65)"
                          : "rgba(255,255,255,0.25)",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </span>
                  {i < 2 && (
                    <span
                      style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}
                    >
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleClose}
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

        <div style={{ padding: "20px" }}>
          {step === "provider" && (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Choose Provider
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    style={{
                      padding: "14px 14px",
                      borderRadius: 10,
                      border: `1px solid ${
                        provider === p.id
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      background:
                        provider === p.id
                          ? "rgba(255,255,255,0.07)"
                          : "transparent",
                      color: "rgba(255,255,255,0.75)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (provider !== p.id) {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = "rgba(255,255,255,0.14)"
                        el.style.background = "rgba(255,255,255,0.04)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (provider !== p.id) {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = "rgba(255,255,255,0.08)"
                        el.style.background = "transparent"
                      }
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.85)",
                        marginBottom: 3,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}
                    >
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => provider && setStep("config")}
                  disabled={!provider}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 9,
                    border: "none",
                    background: provider ? "white" : "rgba(255,255,255,0.1)",
                    color: provider ? "#000" : "rgba(255,255,255,0.25)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: provider ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                    transition: "background 0.2s",
                  }}
                >
                  Configure <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </>
          )}

          {step === "config" && (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Configuration
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <ConfigField label="Build command" value="pnpm build" />
                <ConfigField label="Output directory" value="dist" />
                <ConfigField label="Branch" value="main" />
                <ConfigField
                  label="Custom domain"
                  value=""
                  placeholder="my-app.com (optional)"
                />
              </div>
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setStep("provider")}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={startDeploy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 9,
                    border: "none",
                    background: "white",
                    color: "#000",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Deploy →
                </button>
              </div>
            </>
          )}

          {step === "deploy" && (
            <>
              {/* Status */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {DEPLOY_STEPS.map((s) => {
                  const done =
                    DEPLOY_STEPS.findIndex((x) => x.status === deployStatus) >=
                    DEPLOY_STEPS.findIndex((x) => x.status === s.status)
                  const current = s.status === deployStatus
                  return (
                    <div
                      key={s.status}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        flex: 1,
                      }}
                    >
                      {current && deployStatus !== "live" ? (
                        <Loader2
                          size={12}
                          strokeWidth={2}
                          style={{
                            animation: "spin 1s linear infinite",
                            color: "rgba(255,255,255,0.7)",
                            flexShrink: 0,
                          }}
                        />
                      ) : done ? (
                        <CheckCircle
                          size={12}
                          strokeWidth={2}
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Circle
                          size={12}
                          strokeWidth={2}
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: 11.5,
                          color: done
                            ? "rgba(255,255,255,0.65)"
                            : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Log */}
              <div
                style={{
                  background: "#0d0d0d",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "12px 14px",
                  height: 140,
                  overflowY: "auto",
                }}
              >
                {logLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11.5,
                      color:
                        i === logLines.length - 1
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(255,255,255,0.35)",
                      fontFamily: "'JetBrains Mono', monospace",
                      lineHeight: 1.8,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>

              {/* Live URL */}
              {liveUrl && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.7)",
                      flexShrink: 0,
                      animation: "pulse-ring 2s ease-out infinite",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.65)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {liveUrl}
                  </span>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      textDecoration: "none",
                      padding: "4px 10px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                    }}
                  >
                    Open ↗
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigField({
  label,
  value,
  placeholder,
}: {
  label: string
  value: string
  placeholder?: string
}) {
  const [val, setVal] = useState(value)
  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          color: "rgba(255,255,255,0.35)",
          marginBottom: 5,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.75)",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          outline: "none",
          boxSizing: "border-box",
          caretColor: "white",
        }}
      />
    </div>
  )
}
