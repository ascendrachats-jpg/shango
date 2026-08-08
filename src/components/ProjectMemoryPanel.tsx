import { useState } from "react"
import type { Project, Version } from "../lib/store"
import { deriveWorkspaceMilestones } from "../lib/workspaceEvolution"

interface Props {
  project: Project
  versions: Version[]
  isGenerating: boolean
  activeTab: "timeline" | "chat" | "history" | "context"
  setActiveTab: (t: "timeline" | "chat" | "history" | "context") => void
  onOpenSettings?: () => void
  onToggleTheme?: () => void
  focusMode?: boolean
  setFocusMode?: (v: boolean) => void
}

export default function ProjectMemoryPanel({
  project,
  versions,
  isGenerating,
  activeTab,
  setActiveTab,
  onOpenSettings: _onOpenSettings,
  onToggleTheme,
  focusMode,
  setFocusMode,
}: Props) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(
    null,
  )
  const _milestones = deriveWorkspaceMilestones(
    project.messages || [],
    project.versions || [],
    isGenerating,
  )

  // Calculate understanding metric from messages & project maturity
  const messageCount = project.messages?.length || 0
  const versionCount = project.versions?.length || 0
  const understandingPct = Math.min(
    98,
    Math.max(78, 80 + versionCount * 3 + Math.floor(messageCount * 1.5)),
  )

  const JOURNEY_ITEMS = [
    { id: "vision", label: "Vision", sub: "Established" },
    { id: "understanding", label: "Product Understanding", sub: "Complete" },
    { id: "plan", label: "Product Plan", sub: "Complete" },
    { id: "architecture", label: "Architecture", sub: "Complete" },
    {
      id: "auth",
      label: "Authentication System",
      sub: isGenerating ? "In Progress" : "In Progress",
      active: true,
    },
    { id: "dashboard", label: "Dashboard", sub: "Pending" },
    { id: "billing", label: "Billing", sub: "Pending" },
    { id: "settings", label: "Settings", sub: "Pending" },
    { id: "deployment", label: "Deployment", sub: "Pending" },
  ]

  return (
    <div
      style={{
        width: 270,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(12,12,14,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* ── Top Tabs Bar ── */}
      <div
        style={{
          height: 44,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          onClick={() => setActiveTab("timeline")}
          style={{
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: activeTab === "timeline" ? 600 : 450,
            color: activeTab === "timeline" ? "#fff" : "rgba(255,255,255,0.45)",
            background:
              activeTab === "timeline"
                ? "rgba(255,255,255,0.07)"
                : "transparent",
            border:
              activeTab === "timeline"
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.12s ease",
            fontFamily: "var(--font-geist)",
          }}
        >
          Build Thread
        </button>

        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: activeTab === "history" ? 600 : 450,
            color: activeTab === "history" ? "#fff" : "rgba(255,255,255,0.45)",
            background:
              activeTab === "history"
                ? "rgba(255,255,255,0.07)"
                : "transparent",
            border:
              activeTab === "history"
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.12s ease",
            fontFamily: "var(--font-geist)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          History
          {versions.length > 0 && (
            <span
              style={{
                fontSize: 9.5,
                padding: "0 4px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.85)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {versions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("context")}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: activeTab === "context" ? 600 : 450,
            color: activeTab === "context" ? "#fff" : "rgba(255,255,255,0.45)",
            background:
              activeTab === "context"
                ? "rgba(255,255,255,0.07)"
                : "transparent",
            border:
              activeTab === "context"
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.12s ease",
            fontFamily: "var(--font-geist)",
            marginLeft: "auto",
          }}
        >
          Context ›
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div
        className="flex-1 overflow-y-auto scroll-hidden"
        style={{
          padding: "16px 14px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* PROJECT JOURNEY */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            PROJECT JOURNEY
          </div>

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Connecting guide line */}
            <div
              style={{
                position: "absolute",
                top: 8,
                bottom: 12,
                left: 7.5,
                width: 1,
                background:
                  "linear-gradient(to bottom, rgba(74,222,128,0.3) 0%, rgba(245,158,11,0.3) 50%, rgba(255,255,255,0.06) 100%)",
              }}
            />

            {JOURNEY_ITEMS.map((item, idx) => {
              const isDone = idx < 4
              const isActive = item.active === true
              const isSelected = selectedMilestone === item.id

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMilestone(item.id)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 8px 5px 22px",
                    borderRadius: 6,
                    background: isSelected
                      ? "rgba(255,255,255,0.05)"
                      : isActive
                        ? "rgba(245,158,11,0.04)"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isActive)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)"
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isActive)
                      e.currentTarget.style.background = "transparent"
                  }}
                >
                  {/* Status Bullet */}
                  <div
                    style={{
                      position: "absolute",
                      left: 3,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                    }}
                  >
                    {isDone ? (
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "rgba(74,222,128,0.12)",
                          border: "1px solid rgba(74,222,128,0.5)",
                          color: "#4ade80",
                          fontSize: 8,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✓
                      </span>
                    ) : isActive ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#f59e0b",
                          boxShadow: "0 0 10px rgba(245,158,11,0.6)",
                          display: "inline-block",
                          animation: "live-pulse 2s ease-in-out infinite",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "transparent",
                          display: "inline-block",
                        }}
                      />
                    )}
                  </div>

                  {/* Label & Subtitle */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 600 : isDone ? 500 : 400,
                        color: isActive
                          ? "#fbbf24"
                          : isDone
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.32)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        color: isActive
                          ? "#f59e0b"
                          : isDone
                            ? "rgba(255,255,255,0.38)"
                            : "rgba(255,255,255,0.2)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {item.sub}
                    </span>
                  </div>

                  {/* Amber Sparkle indicator for Active item */}
                  {isActive && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#f59e0b",
                        marginLeft: "auto",
                      }}
                    >
                      ✦
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* PROJECT HEALTH */}
        <div
          style={{
            padding: "14px 12px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            PROJECT HEALTH
          </div>

          {/* Understanding Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Understanding
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fbbf24",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {understandingPct}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${understandingPct}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Build Stability */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Build Stability
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2.5"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#4ade80",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Healthy
              </span>
            </div>
          </div>

          {/* Last Successful Build */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Last Successful Build
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 6px rgba(74,222,128,0.6)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                2m ago
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div
        style={{
          height: 48,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
          }
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>

        {setFocusMode && (
          <button
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: focusMode ? "#fbbf24" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = focusMode
                ? "#fbbf24"
                : "rgba(255,255,255,0.4)")
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
