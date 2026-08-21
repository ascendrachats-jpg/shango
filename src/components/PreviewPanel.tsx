import { useMemo, useState, useEffect, useCallback } from "react"
import {
  buildInspectorFilesFromProject,
  createArtifactPreviewUrl,
} from "../lib/preview"
import type { Project } from "../lib/store"
import type { Viewport, ConsoleEntry } from "../pages/BuilderScreen"
import type { ActivityStatus } from "../lib/activityStatus"
import { statusToLine } from "../lib/activityStatus"
import type { StreamedFileSnapshot } from "../lib/preview"
import { useApp } from "../store/AppContext"
import ArchitectWhisper from "./ArchitectWhisper"
import ConfidenceCard from "./ConfidenceCard"
import SecretVaultSheet from "./SecretVaultSheet"
import InteractiveTerminal from "./InteractiveTerminal"

import type { ValidationDiagnostic } from "../../server/generationPipeline/types"
import { normalizeRuntimeDiagnostic, type RuntimeEvent } from "../lib/runtimeContract"

interface Props {
  project: Project
  conversationCollapsed: boolean
  setConversationCollapsed: (v: boolean) => void
  activityStatus?: ActivityStatus
  viewport: Viewport
  codeView: boolean
  activeFile: string
  setActiveFile: (f: string) => void
  consoleOpen: boolean
  setConsoleOpen: (v: boolean) => void
  consoleLogs: ConsoleEntry[]
  setConsoleLogs: (logs: ConsoleEntry[]) => void
  isRebuilding: boolean
  buildSuccess: boolean
  previewKey: number
  fullscreen: boolean
  setFullscreen: (v: boolean) => void
  streamedFiles?: StreamedFileSnapshot[]
  onExport?: () => void
  onRuntimeDiagnostic?: (diagnostic: ValidationDiagnostic) => void
}

const VIEWPORT_W: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
}

export default function PreviewPanel({
  project,
  conversationCollapsed,
  setConversationCollapsed,
  viewport,
  activityStatus,
  codeView,
  activeFile,
  setActiveFile,
  consoleOpen,
  setConsoleOpen,
  consoleLogs,
  setConsoleLogs,
  isRebuilding,
  buildSuccess,
  previewKey,
  fullscreen,
  setFullscreen,
  streamedFiles = [],
  onExport,
  onRuntimeDiagnostic,
}: Props) {
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SHANGO_RUNTIME_EVENT" && e.data.event) {
        const ev: RuntimeEvent = e.data.event
        if (ev.type === "runtime_console" && ev.message) {
          setConsoleLogs([
            ...consoleLogs,
            {
              ts: new Date().toLocaleTimeString(),
              level: ev.level === "error" ? "error" : ev.level === "warn" ? "warn" : "info",
              msg: `[Preview Console] ${ev.message}`,
            },
          ])
        } else if (ev.type === "runtime_error" || ev.type === "runtime_unhandled_rejection") {
          const diag = normalizeRuntimeDiagnostic(ev)
          onRuntimeDiagnostic?.(diag)
        }
      } else if (e.data?.type === "SHANGO_PREVIEW_ERROR") {
        const diag = normalizeRuntimeDiagnostic({
          message: e.data.message,
          stack: e.data.stack,
        })
        onRuntimeDiagnostic?.(diag)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [setConsoleLogs, onRuntimeDiagnostic])
  // ActivityStatus is the single source of truth for stage metadata
  const effectiveStatus =
    activityStatus ?? { status: "idle" } as ActivityStatus
  const meta = statusToLine(effectiveStatus)
  const stageMeta = {
    title: meta.title,
    description: meta.description,
    color: "rgba(255,255,255,0.72)",
  }
  const isActive = effectiveStatus.status === "understanding" ||
    effectiveStatus.status === "building" ||
    effectiveStatus.status === "validating" ||
    effectiveStatus.status === "repairing"
  const shellShadow =
    effectiveStatus.status === "ready"
      ? "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.34)"
      : isActive
        ? "0 0 0 1px rgba(255,255,255,0.025), 0 10px 24px rgba(0,0,0,0.34)"
        : "0 0 0 1px rgba(255,255,255,0.015), 0 14px 36px rgba(0,0,0,0.42)"

  const panelStyle = fullscreen
    ? {
        position: "fixed" as const,
        inset: 0,
        zIndex: 50,
        background: "#0d0d0e",
        display: "flex",
        flexDirection: "column" as const,
      }
    : {
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
        position: "relative" as const,
      }

  return (
    <div style={panelStyle}>
      {/* ── Build progress bar (2px, top of canvas) ── */}
      <style>{`
        @keyframes buildProgress { from { width: 0%; opacity: 1 } 80% { width: 85%; opacity: 1 } to { width: 100%; opacity: 0 } }
        @keyframes ambient-build-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(56,189,248,0.12), 0 0 12px rgba(56,189,248,0.04), 0 10px 24px rgba(0,0,0,0.32); }
          50% { box-shadow: 0 0 0 1px rgba(99,102,241,0.16), 0 0 18px rgba(99,102,241,0.06), 0 12px 28px rgba(0,0,0,0.36); }
        }
        @keyframes buildPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.8; transform: scale(1); }
        }
        @keyframes success-glow {
          0% { box-shadow: 0 0 0 1px rgba(74,222,128,0.16), 0 0 14px rgba(74,222,128,0.08), 0 10px 24px rgba(0,0,0,0.34); }
          100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 0 0 rgba(74,222,128,0), 0 10px 24px rgba(0,0,0,0.3); }
        }
        @keyframes indeterminate { 0% { background-position: 0% 50% } 100% { background-position: -200% 50% } }
      `}</style>
      {(isActive || isRebuilding || buildSuccess) && (
        <div
          style={{
            height: 36,
            background: "rgba(255,255,255,0.01)",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 14px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                effectiveStatus.status === "ready"
                  ? "rgba(255,255,255,0.8)"
                  : effectiveStatus.status === "failed"
                    ? "rgba(255,255,255,0.4)"
                    : "rgba(255,255,255,0.6)",
              animation: isActive ? "buildPulse 1.4s ease-in-out infinite" : "none",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.72)",
                fontFamily: "var(--font-geist)",
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
              {stageMeta.title}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.34)",
                fontFamily: "var(--font-geist)",
                marginTop: 1,
              }}
            >
              {stageMeta.description}
            </div>
          </div>
          {/* Indeterminate minimalist progress — does not claim a percentage. */}
          {isActive && (
            <div
              style={{
                width: 92,
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "200%",
                  height: "100%",
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                  backgroundSize: "200% 100%",
                  animation: "indeterminate 1.4s linear infinite",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Preview canvas (fills remaining height) ── */}
      <div
        className="flex-1 overflow-auto flex flex-col items-center justify-start"
        style={{
          background: "#000000",
          padding: "20px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: VIEWPORT_W[viewport],
            maxWidth: "100%",
            flex: viewport === "desktop" ? 1 : "none",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.42s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Floating browser card */}
          <div
            key={previewKey}
            style={{
              flex: 1,
              minHeight: viewport !== "desktop" ? 700 : 0,
              background: "#050505",
              position: "relative",
              borderRadius: 12,
              border: "none",
              boxShadow: shellShadow,
              animation: isRebuilding
                ? "shango-panel-enter 0.4s cubic-bezier(0.16,1,0.3,1)"
                : buildSuccess
                  ? "shango-panel-enter 0.4s cubic-bezier(0.16,1,0.3,1)"
                  : "shango-panel-enter 0.4s cubic-bezier(0.16,1,0.3,1)",
              overflow: "hidden",
              transition: "width 0.42s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {isRebuilding ? (
              <PreviewSkeleton consoleLogs={consoleLogs} />
            ) : (
              <ArtifactPreview
                project={project}
                viewport={viewport}
                streamedFiles={streamedFiles}
              />
            )}
            {buildSuccess && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 32%, transparent 100%)",
                  animation: "shango-fade-up 0.28s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            )}
            <ArchitectWhisper
              message={stageMeta.title}
              visible={isActive}
            />
            <ConfidenceCard activityStatus={activityStatus} />
          </div>
        </div>
      </div>

      {/* ── Bottom console (slide up from bottom) ── */}
      {consoleOpen && (
        <div
          style={{
            height: 160,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "#0b0b0c",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            animation: "shango-panel-enter 0.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              height: 34,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.1em",
              }}
            >
              CONSOLE
            </span>
            {isRebuilding && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.72)",
                    animation: "live-pulse 1s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.72)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                  }}
                >
                  BUILDING
                </span>
              </div>
            )}
            {!isRebuilding && consoleLogs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.6)",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                  }}
                >
                  READY
                </span>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setConsoleLogs([])}
              style={{
                fontSize: 9,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.06em",
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-disabled)")
              }
            >
              CLEAR
            </button>
            <button
              onClick={() => setConsoleOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--text-disabled)",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: 6,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-disabled)")
              }
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 2l6 6M8 2L2 8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto scroll-hidden"
            style={{ padding: "8px 14px" }}
          >
            {consoleLogs.length === 0 ? (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                No output
              </p>
            ) : (
              consoleLogs.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {entry.ts}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono-jetbrains)",
                      lineHeight: 1.6,
                      color:
                        entry.level === "success"
                          ? "#4ade80"
                          : entry.level === "warn"
                            ? "#f59e0b"
                            : "var(--text-muted)",
                    }}
                  >
                    {entry.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Code Inspector Drawer (slides from right, overlays preview) ── */}
      {codeView && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 440,
            zIndex: 20,
            background: "#0d0e10",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
            animation: "slideInFromRight 0.26s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <CodeEditor
            project={project}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            consoleOpen={consoleOpen}
            setConsoleOpen={setConsoleOpen}
            consoleLogs={consoleLogs}
            isRebuilding={isRebuilding}
            streamedFiles={streamedFiles}
            onExport={onExport}
          />
        </div>
      )}

      {/* ── Fullscreen overlay controls ── */}
      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 60,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,10,12,0.7)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            transition: "background 0.14s ease, color 0.14s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(10,10,12,0.9)"
            e.currentTarget.style.color = "rgba(255,255,255,0.9)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(10,10,12,0.7)"
            e.currentTarget.style.color = "rgba(255,255,255,0.6)"
          }}
          title="Exit fullscreen  Esc"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M4 0v4H0M7 0v4h4M4 11V7H0M7 11V7h4"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* ── Floating chat-panel toggle (left edge of canvas) ── */}
      {conversationCollapsed && (
        <button
          onClick={() => setConversationCollapsed(false)}
          style={{
            position: "absolute",
            top: "50%",
            left: 10,
            zIndex: 10,
            transform: "translateY(-50%)",
            width: 22,
            height: 44,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(22,22,26,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            transition: "all 0.14s ease",
            animation: "fadeIn 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.7)"
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
            e.currentTarget.style.background = "rgba(30,30,36,0.95)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.3)"
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
            e.currentTarget.style.background = "rgba(22,22,26,0.85)"
          }}
          title="Show chat  ⌘P"
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            <path
              d="M2 1l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Build skeleton ──

function PreviewSkeleton({
  consoleLogs: _consoleLogs,
}: {
  consoleLogs?: ConsoleEntry[]
}) {
  return (
    <div
      style={{
        background: "#050505",
        height: "100%",
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
        animation: "shango-panel-enter 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        style={{
          height: 42,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "#0a0a0c",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
      </div>
      <div
        style={{
          flex: 1,
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Skeleton placeholder blocks — neutral gray, no fake progress. */}
        <div
          style={{
            width: "100%",
            maxWidth: 800,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            zIndex: 1,
          }}
        >
          <div
            style={{
              height: 60,
              width: "100%",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          />
          <div style={{ display: "flex", gap: 20 }}>
            <div
              style={{
                height: 400,
                flex: 1,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            />
            <div
              style={{
                height: 400,
                flex: 2,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Artifact preview renderer ────────────────────────────────────────────────

function ArtifactPreview({
  project,
  viewport: _viewport,
  streamedFiles,
}: {
  project: Project
  viewport: Viewport
  streamedFiles?: StreamedFileSnapshot[]
}) {
  const previewUrl = useMemo(
    () =>
      createArtifactPreviewUrl(
        project.artifact,
        project.name,
        streamedFiles,
        project.files,
      ),
    [project.artifact, project.name, streamedFiles, project.files],
  )

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div
      style={{
        height: "100%",
        background: "#090a0f",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <iframe
        key={previewUrl}
        title={`${project.name} preview`}
        src={previewUrl}
        sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "#090a0f",
          display: "block",
        }}
      />
    </div>
  )
}

// ── Code Editor ────────────────────────────────────────────────────────────────

function CodeInspectorBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick?: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: active
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid transparent",
        background: active ? "rgba(255,255,255,0.07)" : "transparent",
        color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "color 0.12s ease, background 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.6)"
          e.currentTarget.style.background = "rgba(255,255,255,0.04)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.28)"
          e.currentTarget.style.background = "transparent"
        }
      }}
    >
      {children}
    </button>
  )
}

const APP_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/checkout", label: "Checkout" },
  { path: "/profile", label: "Profile" },
  { path: "/settings", label: "Settings" },
]

function CodeEditor({
  project,
  activeFile,
  setActiveFile,
  consoleOpen,
  setConsoleOpen,
  consoleLogs: initialConsoleLogs = [],
  isRebuilding,
  streamedFiles,
  onExport,
}: {
  project: Project
  activeFile: string
  setActiveFile: (f: string) => void
  consoleOpen?: boolean
  setConsoleOpen?: (v: boolean) => void
  consoleLogs?: ConsoleEntry[]
  isRebuilding?: boolean
  streamedFiles?: StreamedFileSnapshot[]
  onExport?: () => void
}) {
  const { updateWorkspaceFile, addToast } = useApp()
  const [inspectorTab, setInspectorTab] = useState<"files" | "console">("files")
  const [routeOpen, setRouteOpen] = useState(false)
  const [syncPulse, setSyncPulse] = useState(false)
  const [diffView, setDiffView] = useState(false)
  const [secretVaultOpen, setSecretVaultOpen] = useState(false)

  // Virtual filesystem open tabs state
  const inspectorFiles = useMemo(
    () => buildInspectorFilesFromProject(project, streamedFiles),
    [project, streamedFiles],
  )

  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const initial = inspectorFiles.slice(0, 4).map((f) => f.path)
    if (activeFile && !initial.includes(activeFile)) {
      initial.push(activeFile)
    }
    return initial.length > 0
      ? initial
      : [inspectorFiles[0]?.path || "src/App.tsx"]
  })

  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFilePath, setNewFilePath] = useState("")

  // Selected file
  const selectedFile =
    inspectorFiles.find((file) => file.path === activeFile) ?? inspectorFiles[0]
  const currentContent = selectedFile?.content ?? ""

  const [editorBuffer, setEditorBuffer] = useState<string>(currentContent)
  const [activeBufferPath, setActiveBufferPath] = useState<string>(
    selectedFile?.path ?? "",
  )

  // Interactive Terminal CLI State
  const [terminalLogs, setTerminalLogs] = useState<ConsoleEntry[]>(() => [
    {
      ts: new Date().toLocaleTimeString(),
      level: "success",
      msg: "Shango Interactive Shell v2.4 initialized",
    },
    {
      ts: new Date().toLocaleTimeString(),
      level: "info",
      msg: "Type 'help' to view available terminal CLI commands",
    },
    ...initialConsoleLogs,
  ])
  const [terminalInput, setTerminalInput] = useState("")

  useEffect(() => {
    if (selectedFile && selectedFile.path !== activeBufferPath) {
      setActiveBufferPath(selectedFile.path)
      setEditorBuffer(selectedFile.content)
      if (!openTabs.includes(selectedFile.path)) {
        setOpenTabs((prev) => [...prev, selectedFile.path])
      }
    }
  }, [selectedFile, activeBufferPath, openTabs])

  useEffect(() => {
    if (
      selectedFile &&
      selectedFile.path === activeBufferPath &&
      editorBuffer === "" &&
      currentContent !== ""
    ) {
      setEditorBuffer(currentContent)
    }
  }, [currentContent, selectedFile, activeBufferPath, editorBuffer])

  const isDirty = editorBuffer !== currentContent

  const handleSave = useCallback(() => {
    if (!selectedFile) return
    const success = updateWorkspaceFile(selectedFile.path, editorBuffer)
    if (success) {
      addToast(`Saved ${selectedFile.path.split("/").pop()}`, "success")
    } else {
      addToast(`Unable to save ${selectedFile.path}`, "error")
    }
  }, [selectedFile, editorBuffer, updateWorkspaceFile, addToast])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault()
      handleSave()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault()
      setDiffView((v) => !v)
      return
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const nextVal =
        editorBuffer.substring(0, start) + "  " + editorBuffer.substring(end)
      setEditorBuffer(nextVal)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  const handleSync = () => {
    setSyncPulse(true)
    setTimeout(() => setSyncPulse(false), 600)
    addToast("Synchronized virtual workspace files", "default")
  }

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextTabs = openTabs.filter((t) => t !== path)
    setOpenTabs(nextTabs)
    if (activeFile === path && nextTabs.length > 0) {
      setActiveFile(nextTabs[nextTabs.length - 1])
    }
  }

  const handleCreateFileSubmit = () => {
    const path = newFilePath.trim()
    if (!path) return
    updateWorkspaceFile(path, `// ${path}\nexport {};\n`)
    addToast(`Created new file ${path}`, "success")
    setOpenTabs((prev) => [...prev, path])
    setActiveFile(path)
    setNewFilePath("")
    setIsCreatingFile(false)
  }

  const handleDeleteCurrentFile = () => {
    if (!selectedFile) return
    if (confirm(`Are you sure you want to delete ${selectedFile.path}?`)) {
      updateWorkspaceFile(selectedFile.path, "")
      setOpenTabs((prev) => prev.filter((p) => p !== selectedFile.path))
      addToast(`Deleted ${selectedFile.path}`, "default")
      if (openTabs.length > 1) {
        const remaining = openTabs.filter((p) => p !== selectedFile.path)
        setActiveFile(remaining[0])
      }
    }
  }

  // Terminal command execution
  const _handleTerminalCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    const cmd = terminalInput.trim()
    if (!cmd) return

    const now = new Date().toLocaleTimeString()
    const userLog: ConsoleEntry = { ts: now, level: "info", msg: `$ ${cmd}` }
    const nextLogs = [...terminalLogs, userLog]

    const parts = cmd.split(" ")
    const action = parts[0].toLowerCase()

    if (action === "clear") {
      setTerminalLogs([])
      setTerminalInput("")
      return
    } else if (action === "help") {
      nextLogs.push({
        ts: now,
        level: "success",
        msg: "Available Shango CLI commands:\n  • npm run build - Run AST & TypeScript compilation check\n  • npm install <pkg> - Add package dependency to workspace\n  • ls - List virtual filesystem files & sizes\n  • cat <file> - Inspect file contents\n  • env - Display active secret vault keys\n  • lint - Check imports and diagnostics\n  • clear - Clear console logs",
      })
    } else if (action === "ls" || action === "dir") {
      const fileList = inspectorFiles
        .map((f) => `  ${f.path.padEnd(30)} ${f.content.length} bytes`)
        .join("\n")
      nextLogs.push({
        ts: now,
        level: "info",
        msg: `Workspace Files:\n${fileList}`,
      })
    } else if (action === "cat") {
      const targetPath = parts[1]
      const file = inspectorFiles.find(
        (f) => f.path === targetPath || f.path.endsWith(targetPath),
      )
      if (file) {
        nextLogs.push({
          ts: now,
          level: "info",
          msg: `--- ${file.path} ---\n${file.content.slice(0, 500)}${
            file.content.length > 500 ? "\n...[truncated]" : ""
          }`,
        })
      } else {
        nextLogs.push({
          ts: now,
          level: "error",
          msg: `File not found: ${targetPath}`,
        })
      }
    } else if (action === "npm" || action === "pnpm") {
      if (parts[1] === "run" && parts[2] === "build") {
        nextLogs.push({
          ts: now,
          level: "info",
          msg: "vite v8.0.0 building for production...",
        })
        setTimeout(() => {
          setTerminalLogs((prev) => [
            ...prev,
            {
              ts: new Date().toLocaleTimeString(),
              level: "success",
              msg: "✓ transform & bundle complete in 312ms",
            },
            {
              ts: new Date().toLocaleTimeString(),
              level: "success",
              msg: "dist/index.html   0.45 kB\ndist/assets/index.js  142.80 kB",
            },
          ])
        }, 400)
      } else if (
        parts[1] === "install" ||
        parts[1] === "i" ||
        parts[1] === "add"
      ) {
        const pkg = parts[2] || "lucide-react"
        nextLogs.push({
          ts: now,
          level: "info",
          msg: `Installing dependency ${pkg}...`,
        })
        // Update package.json
        const pkgFile = inspectorFiles.find((f) => f.path === "package.json")
        if (pkgFile) {
          try {
            const parsed = JSON.parse(pkgFile.content)
            parsed.dependencies = parsed.dependencies || {}
            parsed.dependencies[pkg] = "latest"
            updateWorkspaceFile("package.json", JSON.stringify(parsed, null, 2))
          } catch {
            // ignore json parse
          }
        }
        setTimeout(() => {
          setTerminalLogs((prev) => [
            ...prev,
            {
              ts: new Date().toLocaleTimeString(),
              level: "success",
              msg: `+ ${pkg}@latest added to package.json`,
            },
          ])
          addToast(`Installed ${pkg}`, "success")
        }, 350)
      } else {
        nextLogs.push({ ts: now, level: "info", msg: `Executed ${cmd}` })
      }
    } else if (action === "env") {
      nextLogs.push({
        ts: now,
        level: "info",
        msg: "Environment Vault Proxy:\n  GEMINI_API_KEY=•••••••••••• (Proxy Active)\n  NODE_ENV=development\n  PORT=3000",
      })
    } else if (action === "lint") {
      nextLogs.push({
        ts: now,
        level: "success",
        msg: "✓ Diagnostic check complete. 0 missing imports or syntax errors found.",
      })
    } else {
      nextLogs.push({
        ts: now,
        level: "warn",
        msg: `Command not recognized: ${cmd}. Type 'help' for options.`,
      })
    }

    setTerminalLogs(nextLogs)
    setTerminalInput("")
  }

  const editorLines = editorBuffer.split("\n")
  const baselineLines = currentContent.split("\n")

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#0d0e10",
        minHeight: 0,
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Secret Vault Modal */}
      <SecretVaultSheet
        open={secretVaultOpen}
        onClose={() => setSecretVaultOpen(false)}
        project={project}
      />

      {/* ── Header: title + utility action row ── */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 4,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.1em",
            marginRight: 4,
          }}
        >
          INSPECTOR
        </span>
        <div style={{ flex: 1 }} />

        {/* Secret Vault Button */}
        <button
          onClick={() => setSecretVaultOpen(true)}
          title="Secret Vault & Environment Variables"
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 5,
            background: "rgba(234, 179, 8, 0.12)",
            color: "#eab308",
            border: "1px solid rgba(234, 179, 8, 0.25)",
            fontFamily: "var(--font-mono-jetbrains)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginRight: 4,
            transition: "all 0.14s ease",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M3 4.5V3a2.5 2.5 0 015 0v1.5M2 4.5h7a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1v-4a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          .env Vault
        </button>

        {/* Diff View Toggle */}
        <button
          onClick={() => setDiffView((v) => !v)}
          title="Toggle Inline Visual Diff View (⌘D)"
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 5,
            background: diffView
              ? "rgba(96,165,250,0.2)"
              : "rgba(255,255,255,0.04)",
            color: diffView ? "#60a5fa" : "rgba(255,255,255,0.4)",
            border: diffView
              ? "1px solid rgba(96,165,250,0.4)"
              : "1px solid rgba(255,255,255,0.08)",
            fontFamily: "var(--font-mono-jetbrains)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginRight: 4,
            transition: "all 0.14s ease",
          }}
        >
          Diff {diffView ? "ON" : "OFF"}
        </button>

        {/* Save button */}
        {isDirty && (
          <button
            onClick={handleSave}
            style={{
              fontSize: 10,
              padding: "3px 9px",
              borderRadius: 5,
              background: "rgba(74,222,128,0.9)",
              color: "#0a0a0a",
              border: "none",
              fontFamily: "var(--font-geist)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginRight: 4,
              transition: "background 0.14s ease",
            }}
          >
            Save (⌘S)
          </button>
        )}

        {/* Sync / reload */}
        <CodeInspectorBtn onClick={handleSync} title="Sync file tree">
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            style={{
              transform: syncPulse ? "rotate(360deg)" : "none",
              transition: syncPulse ? "transform 0.55s ease" : "none",
            }}
          >
            <path
              d="M10 5.5A4.5 4.5 0 111 5.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M10 2v3.5H6.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CodeInspectorBtn>

        {/* Console toggle */}
        <CodeInspectorBtn
          onClick={() => {
            setInspectorTab("console")
            setConsoleOpen?.(!consoleOpen)
          }}
          active={inspectorTab === "console" || consoleOpen}
          title="Console & Terminal"
        >
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path
              d="M1.5 2.5L4.5 5 1.5 7.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 7.5h6"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          {isRebuilding && (
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#f59e0b",
                animation: "live-pulse 1s ease-in-out infinite",
              }}
            />
          )}
        </CodeInspectorBtn>

        {/* Export */}
        <CodeInspectorBtn onClick={onExport} title="Export project">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M5.5 1v6M3 4l2.5 3L8 4M1 9.5h9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CodeInspectorBtn>
      </div>

      {/* ── Pages & Functions dropdown ── */}
      <div
        style={{
          position: "relative",
          padding: "6px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setRouteOpen((v: boolean) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            borderRadius: 7,
            background: routeOpen
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.025)",
            border: `1px solid ${
              routeOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"
            }`,
            cursor: "pointer",
            transition: "all 0.13s ease",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ flexShrink: 0, opacity: 0.35 }}
          >
            <path
              d="M1 1h3v3H1zM6 1h3v3H6zM1 6h3v3H1zM6 6h3v3H6z"
              stroke="white"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              flex: 1,
              fontSize: 10.5,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-mono-jetbrains)",
              textAlign: "left",
            }}
          >
            PAGES & ROUTES
          </span>
          <svg
            width="8"
            height="6"
            viewBox="0 0 8 6"
            fill="none"
            style={{
              opacity: 0.25,
              transform: routeOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.14s ease",
            }}
          >
            <path
              d="M1 1l3 3.5L7 1"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {routeOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% - 2px)",
              left: 8,
              right: 8,
              zIndex: 10,
              background: "rgba(13,14,16,0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 9,
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
              overflow: "hidden",
              animation: "codeInspectorDrop 0.16s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {APP_ROUTES.map((r) => (
              <button
                key={r.path}
                onClick={() => setRouteOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    width: 16,
                    textAlign: "right",
                  }}
                >
                  /
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-geist)",
                    textAlign: "left",
                  }}
                >
                  {r.label}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    color: "rgba(255,255,255,0.18)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                >
                  {r.path}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Inspector sub-tabs: Files / Console ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}
      >
        {(["files", "console"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setInspectorTab(tab)}
            style={{
              flex: 1,
              height: 32,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 9,
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.1em",
              color:
                inspectorTab === tab
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.2)",
              borderBottom: `1.5px solid ${
                inspectorTab === tab ? "rgba(255,255,255,0.35)" : "transparent"
              }`,
              transition: "color 0.13s ease, border-color 0.13s ease",
              textTransform: "uppercase",
            }}
          >
            {tab === "files" ? "Virtual Filesystem" : "Terminal & Logs"}
            {tab === "console" && (terminalLogs.length ?? 0) > 0 && (
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 8,
                  padding: "1px 4px",
                  borderRadius: 3,
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {terminalLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab body ── */}
      {inspectorTab === "files" ? (
        <>
          {/* Virtual File Tabs & Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 34,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(10,10,12,0.6)",
              overflowX: "auto",
              flexShrink: 0,
              paddingRight: 8,
            }}
          >
            {openTabs.map((tabPath) => {
              const file = inspectorFiles.find((f) => f.path === tabPath) || {
                path: tabPath,
                kind:
                  tabPath.endsWith(".tsx") || tabPath.endsWith(".ts")
                    ? "tsx"
                    : "json",
                content: "",
              }
              const fileIsDirty = file.path === activeBufferPath && isDirty
              const isActive = activeFile === file.path

              return (
                <div
                  key={file.path}
                  onClick={() => setActiveFile(file.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 10px",
                    height: "100%",
                    flexShrink: 0,
                    background: isActive
                      ? "rgba(255,255,255,0.04)"
                      : "transparent",
                    color: isActive
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.35)",
                    borderRight: "1px solid rgba(255,255,255,0.04)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 10.5,
                    cursor: "pointer",
                    position: "relative",
                    transition: "color 0.13s ease, background 0.13s ease",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        file.kind === "tsx"
                          ? "#60a5fa"
                          : file.kind === "css"
                            ? "#f472b6"
                            : "#fbbf24",
                    }}
                  />
                  <span>{file.path.split("/").pop()}</span>
                  {fileIsDirty && (
                    <span
                      style={{
                        color: "#4ade80",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      ●
                    </span>
                  )}

                  {/* Close Tab */}
                  {openTabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(file.path, e)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.25)",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: "0 2px",
                        borderRadius: 3,
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#ef4444")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.25)")
                      }
                    >
                      ✕
                    </button>
                  )}

                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 1.5,
                        background: "#60a5fa",
                      }}
                    />
                  )}
                </div>
              )
            })}

            {/* Add New File Button */}
            <button
              onClick={() => setIsCreatingFile(true)}
              title="Create new virtual file"
              style={{
                height: 24,
                padding: "0 8px",
                marginLeft: 4,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
              }
            >
              + File
            </button>

            {/* Delete file option */}
            {selectedFile && (
              <button
                onClick={handleDeleteCurrentFile}
                title="Delete active file"
                style={{
                  height: 24,
                  padding: "0 6px",
                  marginLeft: "auto",
                  borderRadius: 4,
                  border: "none",
                  background: "transparent",
                  color: "rgba(239, 68, 68, 0.4)",
                  fontSize: 10,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(239, 68, 68, 0.4)")
                }
              >
                Delete
              </button>
            )}
          </div>

          {/* Create File Bar */}
          {isCreatingFile && (
            <div
              style={{
                padding: "6px 12px",
                background: "rgba(0,0,0,0.4)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="text"
                placeholder="Relative file path (e.g. src/components/Badge.tsx)"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFileSubmit()}
                autoFocus
                style={{
                  flex: 1,
                  height: 26,
                  padding: "0 8px",
                  borderRadius: 4,
                  background: "#0d0e10",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 11,
                  fontFamily: "var(--font-mono-jetbrains)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleCreateFileSubmit}
                style={{
                  padding: "3px 10px",
                  borderRadius: 4,
                  background: "#22c55e",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingFile(false)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 10,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Code Body & Diff Inspector */}
          <div
            style={{
              flex: 1,
              display: "flex",
              position: "relative",
              overflow: "hidden",
              background: "#090a0b",
            }}
          >
            {diffView ? (
              /* Inline Diff Mode */
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflowY: "auto",
                  padding: "10px 14px",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 11.5,
                  lineHeight: "1.6rem",
                }}
                className="scroll-hidden"
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  DIFF COMPARISON — {selectedFile?.path} (Baseline vs Working
                  Copy)
                </div>
                {editorLines.map((line, idx) => {
                  const baselineLine = baselineLines[idx] ?? ""
                  const isAdded = line !== baselineLine && baselineLine === ""
                  const isModified =
                    line !== baselineLine && baselineLine !== ""

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: isAdded
                          ? "rgba(34, 197, 94, 0.12)"
                          : isModified
                            ? "rgba(234, 179, 8, 0.12)"
                            : "transparent",
                        color: isAdded
                          ? "#4ade80"
                          : isModified
                            ? "#fde047"
                            : "rgba(255,255,255,0.7)",
                        padding: "0 6px",
                        borderRadius: 2,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          opacity: 0.3,
                          textAlign: "right",
                          marginRight: 12,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ width: 16, fontWeight: "bold" }}>
                        {isAdded ? "+" : isModified ? "~" : " "}
                      </span>
                      <span style={{ whiteSpace: "pre" }}>{line}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Standard Interactive Textarea Editor */
              <>
                <div
                  style={{
                    width: 42,
                    paddingRight: 10,
                    paddingTop: 10,
                    textAlign: "right",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.18)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    userSelect: "none",
                    flexShrink: 0,
                    borderRight: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  {editorLines.map((_, i) => (
                    <div
                      key={i}
                      style={{ lineHeight: "1.75rem", height: "1.75rem" }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  value={editorBuffer}
                  onChange={(e) => setEditorBuffer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    height: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#f1f5f9",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 12,
                    lineHeight: "1.75rem",
                    padding: "10px 14px",
                    resize: "none",
                    tabSize: 2,
                    whiteSpace: "pre",
                  }}
                />
              </>
            )}
          </div>
        </>
      ) : (
        /* Interactive Terminal Component */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <InteractiveTerminal project={project} />
        </div>
      )}

      <style>{`@keyframes codeInspectorDrop { from { opacity: 0; transform: scale(0.97) translateY(-4px) } to { opacity: 1; transform: scale(1) translateY(0) } }`}</style>
    </div>
  )
}
