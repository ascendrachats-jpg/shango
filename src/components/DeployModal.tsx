import { useState, useEffect, useRef } from "react"
import { XIcon } from "./icons"
import { useApp } from "../store/AppContext"
import {
  DEPLOY_TARGETS,
  DEPLOY_STAGES,
  buildDeploymentPayload,
  buildDeploymentRecordFromResponse,
  generateBuildLogs,
  generateLiveUrl,
  redactDeploymentEnvVars,
  type DeployTargetId,
  type EnvVar,
  type DeploymentRecord,
} from "../lib/deployments"
import { generateId } from "../lib/store"

interface Props {
  open: boolean
  onClose: () => void
  projectName: string
  projectId: string
  currentVersion?: number
}

type Step = "target" | "review" | "progress" | "success" | "failure"

export default function DeployModal({
  open,
  onClose,
  projectName,
  projectId,
  currentVersion = 1,
}: Props) {
  const { addToast, addNotification, addDeployment, connectedConnectors } =
    useApp()

  const [step, setStep] = useState<Step>("target")
  const [target, setTarget] = useState<DeployTargetId>("vercel")
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: "NODE_ENV", value: "production", secret: false },
    { key: "", value: "", secret: false },
  ])
  const [buildCmd, setBuildCmd] = useState("npm run build")
  const [outputDir, setOutputDir] = useState("dist")
  const [customDomain, setCustomDomain] = useState("")

  // Progress state
  const [stageIndex, setStageIndex] = useState(-1)
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [liveUrl, setLiveUrl] = useState("")
  const [deployDuration, setDeployDuration] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep("target")
      setStageIndex(-1)
      setBuildLogs([])
      setLiveUrl("")
    }
  }, [open])

  useEffect(() => {
    if (!open || step === "progress") return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, step, onClose])

  useEffect(() => {
    if (step === "progress") {
      runProgress()
    }
  }, [step])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [buildLogs])

  // Sync outputDir when target changes
  useEffect(() => {
    const t = DEPLOY_TARGETS.find((t) => t.id === target)
    if (t) {
      setBuildCmd(t.buildCommand)
      setOutputDir(t.outputDir)
    }
  }, [target])

  const runProgress = async () => {
    const logs = generateBuildLogs(projectName, target)
    setStageIndex(0)
    setBuildLogs(logs)

    const url = generateLiveUrl(projectName, target)
    const dur = 0
    setLiveUrl(url)
    setDeployDuration(dur)

    const pendingRecord: DeploymentRecord = {
      id: generateId(),
      projectId,
      projectName,
      target,
      status: "preparing",
      url,
      shortUrl: url.replace("https://", ""),
      timestamp: new Date().toISOString(),
      duration: dur,
      triggeredBy: "manual",
      version: currentVersion,
      domains: [
        {
          domain: url.replace("https://", ""),
          status: "pending",
          sslStatus: "pending",
          isPrimary: true,
        },
      ],
      envVars: redactDeploymentEnvVars(envVars),
      buildLogs: logs,
      isPreview: true,
    }

    const payload = buildDeploymentPayload({
      projectId,
      projectName,
      target,
      buildCommand: buildCmd,
      outputDir,
      envVars,
      customDomain,
      version: currentVersion,
    })

    const backendRecord = await fetch("/api/deployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        status: pendingRecord.status,
        url: pendingRecord.url,
        shortUrl: pendingRecord.shortUrl,
        timestamp: pendingRecord.timestamp,
        duration: pendingRecord.duration,
        triggeredBy: pendingRecord.triggeredBy,
        domains: pendingRecord.domains,
        buildLogs: pendingRecord.buildLogs,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json().catch(() => null) as Partial<DeploymentRecord> | null
      })
      .catch(() => null)

    const record = buildDeploymentRecordFromResponse(
      backendRecord,
      pendingRecord,
    )

    addDeployment(record)
    addToast(`${projectName} deployment preview is ready`, "success")
    addNotification(
      `${projectName} preview recorded for ${selectedTarget.name}`,
    )
    setStep("success")
  }

  if (!open) return null

  const selectedTarget = DEPLOY_TARGETS.find((t) => t.id === target)!
  const connectedDeployTargets = DEPLOY_TARGETS.filter(
    (t) => t.connectorId && connectedConnectors.includes(t.connectorId),
  )

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
        onClick={step !== "progress" ? onClose : undefined}
      />
      <div
        className="relative rounded-2xl overflow-hidden w-full flex flex-col"
        style={{
          maxWidth: step === "target" ? 640 : 520,
          maxHeight: "88vh",
          background: "rgba(14,14,14,0.97)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
          animation: "slideInPanel 0.22s cubic-bezier(0.16,1,0.3,1)",
          transition: "max-width 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <svg width={14} height={14} viewBox="0 0 40 40" fill="none">
              <path
                d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
                fill="white"
                opacity="0.7"
              />
            </svg>
            <span
              className="text-sm font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {step === "target" && "Deployment preview"}
              {step === "review" && `Preview — ${selectedTarget.name}`}
              {step === "progress" && "Preparing preview"}
              {step === "success" && "Preview ready"}
              {step === "failure" && "Build Failed"}
            </span>
            {step !== "target" && step !== "success" && step !== "failure" && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  background: "var(--surface-3)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                }}
              >
                {selectedTarget.monogram}
              </span>
            )}
          </div>
          {step !== "progress" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md"
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

        {/* ── Steps indicator ── */}
        {(step === "target" || step === "review") && (
          <div className="flex items-center gap-0 px-5 pt-3 pb-2 flex-shrink-0">
            {(["target", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() =>
                    s === "target" && step === "review"
                      ? setStep("target")
                      : undefined
                  }
                  className="flex items-center gap-1.5"
                  style={{
                    cursor:
                      s === "target" && step === "review"
                        ? "pointer"
                        : "default",
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      background: step === s ? "white" : "var(--surface-3)",
                      color: step === s ? "#0a0a0a" : "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color:
                        step === s
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {s === "target" ? "Target" : "Review"}
                  </span>
                </button>
                {i < 1 && (
                  <div
                    style={{
                      width: 24,
                      height: 1,
                      background: "var(--border-default)",
                      margin: "0 8px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto scroll-hidden">
          {/* ═══ Step: Target ═══ */}
          {step === "target" && (
            <div className="px-5 pb-5 pt-2 flex flex-col gap-4">
              <p
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Choose the target to prepare for {projectName}. This flow
                records a local preview and does not publish externally.
              </p>

              {/* Connected targets first */}
              {connectedDeployTargets.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    CONNECTED
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {connectedDeployTargets.map((t) => (
                      <TargetCard
                        key={t.id}
                        t={t}
                        selected={target === t.id}
                        onSelect={() => setTarget(t.id)}
                        connected
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                {connectedDeployTargets.length > 0 && (
                  <p
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    ALL TARGETS
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {DEPLOY_TARGETS.filter(
                    (t) => !connectedDeployTargets.find((c) => c.id === t.id),
                  ).map((t) => (
                    <TargetCard
                      key={t.id}
                      t={t}
                      selected={target === t.id}
                      onSelect={() => setTarget(t.id)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep("review")}
                className="w-full py-2.5 rounded-xl text-sm font-medium mt-1"
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
                Continue to Review →
              </button>
            </div>
          )}

          {/* ═══ Step: Review ═══ */}
          {step === "review" && (
            <div className="px-5 pb-5 pt-3 flex flex-col gap-4">
              {/* Build summary */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {projectName}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                        marginTop: 2,
                      }}
                    >
                      Version {currentVersion} → {selectedTarget.name}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-lg"
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
                      }}
                    >
                      {selectedTarget.monogram}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      BUILD COMMAND
                    </p>
                    <input
                      value={buildCmd}
                      onChange={(e) => setBuildCmd(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    />
                  </div>
                  <div className="w-32">
                    <p
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      OUTPUT DIR
                    </p>
                    <input
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                      style={{
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Env vars */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    ENVIRONMENT VARIABLES
                  </p>
                  <button
                    onClick={() =>
                      setEnvVars((prev) => [
                        ...prev,
                        { key: "", value: "", secret: false },
                      ])
                    }
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-muted)")
                    }
                  >
                    + Add variable
                  </button>
                </div>
                <p
                  className="text-xs mb-2"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.5,
                  }}
                >
                  Preview secrets are redacted before this deployment record is
                  saved. Do not use this preview flow for production
                  credentials.
                </p>
                <div className="flex flex-col gap-1.5">
                  {envVars.map((ev, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        placeholder="KEY"
                        value={ev.key}
                        onChange={(e) =>
                          setEnvVars((prev) =>
                            prev.map((v, j) =>
                              j === i ? { ...v, key: e.target.value } : v,
                            ),
                          )
                        }
                        className="px-2.5 py-1.5 rounded-md text-xs outline-none"
                        style={{
                          width: "45%",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      />
                      <input
                        placeholder="value"
                        type={ev.secret ? "password" : "text"}
                        value={ev.value}
                        onChange={(e) =>
                          setEnvVars((prev) =>
                            prev.map((v, j) =>
                              j === i ? { ...v, value: e.target.value } : v,
                            ),
                          )
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      />
                      <button
                        onClick={() =>
                          setEnvVars((prev) =>
                            prev.map((v, j) =>
                              j === i ? { ...v, secret: !v.secret } : v,
                            ),
                          )
                        }
                        title={ev.secret ? "Make visible" : "Mark as secret"}
                        style={{
                          color: ev.secret
                            ? "var(--text-secondary)"
                            : "var(--text-muted)",
                          flexShrink: 0,
                          fontSize: 10,
                        }}
                      >
                        <LockSvg secret={ev.secret} />
                      </button>
                      {envVars.length > 1 && (
                        <button
                          onClick={() =>
                            setEnvVars((prev) => prev.filter((_, j) => j !== i))
                          }
                          style={{
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            fontSize: 12,
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#ef4444")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--text-muted)")
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom domain */}
              <div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  CUSTOM DOMAIN (optional)
                </p>
                <input
                  placeholder="yourdomain.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                  }}
                />
              </div>

              {/* Action */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("target")}
                  className="px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep("progress")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
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
                  Record preview →
                </button>
              </div>
            </div>
          )}

          {/* ═══ Step: Progress ═══ */}
          {step === "progress" && (
            <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
              {/* Stage rail */}
              <div className="relative">
                <div
                  className="absolute top-2.5 bottom-2.5 w-px"
                  style={{
                    left: 9,
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
                  }}
                />
                {DEPLOY_STAGES.map((stage, i) => {
                  const isDone = i < stageIndex
                  const isActive = i === stageIndex
                  return (
                    <div
                      key={stage.id}
                      className="flex items-start gap-3 pb-3 relative"
                    >
                      {/* Stage dot */}
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full"
                        style={{
                          width: 19,
                          height: 19,
                          background: isDone
                            ? "white"
                            : isActive
                              ? "transparent"
                              : "var(--surface-3)",
                          border: isActive
                            ? "1.5px solid rgba(255,255,255,0.5)"
                            : isDone
                              ? "none"
                              : "1px solid var(--border-default)",
                          marginTop: 1,
                          position: "relative",
                          zIndex: 1,
                          transition: "all 0.24s ease",
                        }}
                      >
                        {isDone && (
                          <svg
                            width={9}
                            height={9}
                            viewBox="0 0 9 9"
                            fill="none"
                          >
                            <path
                              d="M1.5 4.5l2.5 2.5L7.5 2"
                              stroke="#0a0a0a"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {isActive && (
                          <div
                            className="rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              background: "white",
                              animation: "live-pulse 1.2s ease-in-out infinite",
                            }}
                          />
                        )}
                        {!isDone && !isActive && (
                          <div
                            className="rounded-full"
                            style={{
                              width: 5,
                              height: 5,
                              background: "var(--text-disabled)",
                            }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-xs font-medium"
                            style={{
                              color: isDone
                                ? "var(--text-secondary)"
                                : isActive
                                  ? "var(--text-primary)"
                                  : "var(--text-disabled)",
                              fontFamily: "var(--font-geist)",
                              transition: "color 0.18s ease",
                            }}
                          >
                            {stage.label}
                          </p>
                          {isActive && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-geist)",
                              }}
                            >
                              {stage.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Build log */}
              <div
                className="rounded-xl p-3 overflow-y-auto"
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--border-subtle)",
                  maxHeight: 180,
                  minHeight: 120,
                }}
              >
                {buildLogs.map((line, i) => (
                  <p
                    key={i}
                    className="text-xs leading-relaxed"
                    style={{
                      color:
                        line.includes("✓") || line.includes("done")
                          ? "rgba(74,222,128,0.8)"
                          : line.includes("[warn]")
                            ? "#f59e0b"
                            : "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 10,
                      lineHeight: 1.7,
                    }}
                  >
                    {line}
                  </p>
                ))}
                <div ref={logsEndRef} />
                {stageIndex < DEPLOY_STAGES.length && (
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    ▌
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══ Step: Success ═══ */}
          {step === "success" && (
            <div className="px-5 pb-6 pt-4 flex flex-col gap-5">
              {/* Live indicator */}
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      background: "#4ade80",
                      boxShadow: "0 0 6px rgba(74,222,128,0.7)",
                      display: "inline-block",
                      animation: "live-pulse 2.4s ease-in-out infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "#4ade80",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    PREVIEW
                  </span>
                </div>
                <p
                  className="text-2xl font-semibold text-center"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Deployment preview recorded.
                </p>
                <p
                  className="text-xs text-center"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.6,
                  }}
                >
                  Prepared for {selectedTarget.name} in {deployDuration}s. No
                  provider deployment was triggered.
                </p>
              </div>

              {/* URL */}
              <div
                className="flex items-center gap-2 rounded-xl p-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid rgba(74,222,128,0.15)",
                }}
              >
                <div
                  className="rounded"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#4ade80",
                    flexShrink: 0,
                    animation: "live-pulse 2.4s ease-in-out infinite",
                    borderRadius: "50%",
                  }}
                />
                <span
                  className="flex-1 text-xs truncate"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 11,
                  }}
                >
                  Suggested domain: {liveUrl.replace("https://", "")}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(liveUrl)
                    addToast("Suggested domain copied", "success")
                  }}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                  style={{
                    background: "var(--surface-3)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    border: "1px solid var(--border-default)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  Copy
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(liveUrl)
                    addToast("Suggested domain copied", "success")
                  }}
                  className="py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
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
                  Copy suggested domain
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl text-xs"
                  style={{
                    background: "transparent",
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
                  Done
                </button>
                <button
                  onClick={() => {
                    onClose()
                    window.location.href = "/deployments"
                  }}
                  className="flex-1 py-2 rounded-xl text-xs"
                  style={{
                    background: "transparent",
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
                  Manage →
                </button>
              </div>
            </div>
          )}

          {/* ═══ Step: Failure ═══ */}
          {step === "failure" && (
            <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 2v4M6 8v.5"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      Build failed
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                        lineHeight: 1.6,
                      }}
                    >
                      The build process exited with code 1. This is not a
                      reflection of your project — something in the environment
                      needs attention.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
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
                  SUGGESTED FIX
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.65,
                  }}
                >
                  Check your environment variables and ensure all required
                  secrets are set. Missing NEXT_PUBLIC_* variables can cause
                  build failures in production.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setStep("progress")}
                  className="py-2.5 rounded-xl text-xs"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  Retry
                </button>
                <button
                  className="py-2.5 rounded-xl text-xs"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  View Logs
                </button>
                <button
                  onClick={() =>
                    addToast("SHANGO is analysing the build error…", "default")
                  }
                  className="py-2.5 rounded-xl text-xs"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  Ask SHANGO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Provider logos ─────────────────────────────────────────────────────────

const PROVIDER_LOGOS: Record<string, React.ReactNode> = {
  vercel: (
    <svg width={12} height={12} viewBox="0 0 512 512" fill="currentColor">
      <path d="M256 48L496 464H16L256 48Z" />
    </svg>
  ),
  cloudflare: (
    <svg width={14} height={10} viewBox="0 0 50 32" fill="none">
      <path
        d="M33.8 10.5c-0.3-0.1-0.6-0.1-0.9-0.1-2.1 0-3.9 1.4-4.5 3.4-0.7-0.5-1.5-0.8-2.5-0.8-2.3 0-4.2 1.9-4.2 4.2 0 0.1 0 0.3 0 0.4H14c-2.2 0-4 1.8-4 4s1.8 4 4 4h20.2c2.5 0 4.5-2 4.5-4.5 0-2.1-1.4-3.8-3.3-4.3 0.1-0.3 0.1-0.6 0.1-0.9 0-2.6-1.6-4.8-3.7-5.4z"
        fill="#f38020"
      />
      <path
        d="M36.5 14.4c-0.2 0-0.4 0-0.6 0.1 0.1 0.4 0.1 0.8 0.1 1.2 0 2.4-1.8 4.4-4.2 4.7v0.1c0 1.7 1.4 3.1 3.1 3.1h4.5c1.7 0 3.1-1.4 3.1-3.1 0-1.7-1.4-3.1-3.1-3.1h-0.4c0.1-0.3 0.1-0.6 0.1-0.9 0-1.2-0.7-2.1-1.7-2.1h-0.9z"
        fill="#faad3f"
      />
    </svg>
  ),
  netlify: (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="#00c7b7">
      <path d="M13.74 0l-.115.092-6.22 8.89H4.5l3.36-8.982H13.74zM15.96 0h4.44l-7.32 19.548-1.2-3.25L15.96 0zM24 7.518v1.98h-3.12L24 7.518zM0 9.498h3.12L0 7.518v1.98zM9.24 24l-1.44-3.858 4.44-6.344 3.36 9.002L9.24 24z" />
    </svg>
  ),
  docker: (
    <svg width={14} height={10} viewBox="0 0 24 18" fill="#2496ed">
      <path d="M13.5 3h-3V0h3v3zm0 4h-3V4h3v3zm-4 0h-3V4h3v3zm-4 0h-3V4h3v3zm8 0h-3V4h3v3zm4 1.5c-.3-2.1-1.8-3.1-2.7-3.5-.9 1.5-.6 4.3 1.1 5.6-1 .5-2.6.8-4.4.8H0c0 1.2.4 2.3 1.1 3 .8.8 2.1 1.3 4.3 1.3 7.1 0 12.3-3.3 14.7-9.3 1.2.1 2.5-.3 3.4-.9l-1-1z" />
    </svg>
  ),
  aws: (
    <svg width={14} height={8} viewBox="0 0 100 60" fill="#ff9900">
      <path d="M29 46.7c-4.9 2.8-10.4 4.3-16.3 4.3C5.7 51 0 45.3 0 38.3 0 31.7 5.1 26 12.3 26c6.5 0 11.4 4.2 12.4 10.6h-6.3c-.8-3-3-4.6-6.1-4.6-3.9 0-6.5 2.9-6.5 6.3 0 3.5 2.7 6.4 6.6 6.4 2.9 0 5.2-1.2 7-2.9L29 46.7z" />
      <path d="M36.5 26.5h6v18h12.1v5.6H36.5V26.5z" />
      <path d="M78 26.5l-6.7 18.9-6.7-18.9h-6.5l9.7 23.6h7l9.7-23.6H78z" />
    </svg>
  ),
  azure: (
    <svg width={12} height={12} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="az-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#114a8b" />
          <stop offset="1" stopColor="#0669bc" />
        </linearGradient>
      </defs>
      <path d="M33.3 8h27.3L32.8 88H8L33.3 8z" fill="url(#az-g)" />
      <path d="M60.6 8H88L55.1 53l12.2 26.5H33.8L60.6 8z" fill="#0078d4" />
    </svg>
  ),
}

// ── Target Card ────────────────────────────────────────────────────────────

function TargetCard({
  t,
  selected,
  onSelect,
  connected = false,
}: {
  t: typeof DEPLOY_TARGETS[0]
  selected: boolean
  onSelect: () => void
  connected?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const logo = PROVIDER_LOGOS[t.id]
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-3.5 rounded-xl text-left relative"
      style={{
        background: selected
          ? "var(--surface-3)"
          : hovered
            ? "rgba(255,255,255,0.025)"
            : "var(--surface-2)",
        border: `1px solid ${
          selected
            ? "rgba(255,255,255,0.18)"
            : hovered
              ? "var(--border-default)"
              : "var(--border-subtle)"
        }`,
        transition: "all 0.16s ease",
      }}
    >
      {connected && (
        <span
          className="absolute rounded-full"
          style={{
            top: 8,
            right: 8,
            width: 5,
            height: 5,
            background: "#4ade80",
            boxShadow: "0 0 4px rgba(74,222,128,0.5)",
            animation: "live-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 26,
            height: 22,
            background: selected
              ? "rgba(255,255,255,0.08)"
              : "var(--surface-3)",
            border: "1px solid var(--border-default)",
            flexShrink: 0,
          }}
        >
          {logo ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: selected ? 1 : 0.7,
              }}
            >
              {logo}
            </span>
          ) : (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: selected
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "-0.02em",
              }}
            >
              {t.monogram}
            </span>
          )}
        </div>
        <span
          className="text-xs font-medium"
          style={{
            color: selected ? "var(--text-primary)" : "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {t.name}
        </span>
      </div>
      <p
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.5,
        }}
      >
        {t.description}
      </p>
    </button>
  )
}

// ── Lock SVG ───────────────────────────────────────────────────────────────

function LockSvg({ secret }: { secret: boolean }) {
  return secret ? (
    <svg width={11} height={11} viewBox="0 0 11 11" fill="none">
      <rect
        x="1.5"
        y="4.5"
        width="8"
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M3.5 4.5V3.2a2 2 0 014 0v1.3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width={11} height={11} viewBox="0 0 11 11" fill="none">
      <rect
        x="1.5"
        y="4.5"
        width="8"
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M3.5 4.5V3.2a2 2 0 014 0"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
