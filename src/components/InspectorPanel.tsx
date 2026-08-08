import { XIcon } from "./icons"
import type { Project } from "../lib/store"

interface Props {
  open: boolean
  onClose: () => void
  project: Project
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function StatRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        className="text-xs"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}
      >
        {label}
      </span>
      <span
        className="text-xs"
        style={{
          color: "var(--text-secondary)",
          fontFamily: mono ? "var(--font-mono-jetbrains)" : "var(--font-geist)",
          fontSize: mono ? 10 : 12,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default function InspectorPanel({ open, onClose, project }: Props) {
  if (!open) return null

  const messageCount = project.messages.length
  const userMessages = project.messages.filter((m) => m.role === "user").length
  const versionCount = project.versions.length
  const currentVersion = project.versions.find((v) => v.isCurrent)
  const slug = project.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  const isLive = project.status === "LIVE"

  return (
    <div
      className="absolute top-0 right-0 h-full z-30 flex flex-col"
      style={{
        width: 276,
        background: "rgba(12,12,12,0.96)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        animation: "slideInFromRight 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 52, borderBottom: "1px solid var(--border-default)" }}
      >
        <span
          className="text-sm font-medium"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          Inspector
        </span>
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
      </div>

      <div className="flex-1 overflow-y-auto scroll-hidden">
        {/* Project identity */}
        <div
          className="px-4 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                background: "var(--surface-3)",
                border: "1px solid var(--border-default)",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 40 40" fill="none">
                <path
                  d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
                  fill="white"
                  opacity="0.5"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {project.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {isLive && (
                  <span
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: "#4ade80",
                      boxShadow: "0 0 4px rgba(74,222,128,0.6)",
                      display: "inline-block",
                      animation: "live-pulse 2.4s ease-in-out infinite",
                    }}
                  />
                )}
                <span
                  className="text-xs"
                  style={{
                    color: isLive ? "#4ade80" : "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                  }}
                >
                  {project.status}
                </span>
              </div>
            </div>
          </div>

          {project.description && (
            <p
              className="text-xs leading-relaxed"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {project.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-xs mb-2"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.12em",
            }}
          >
            OVERVIEW
          </p>
          <StatRow label="Messages" value={messageCount} />
          <StatRow label="Your prompts" value={userMessages} />
          <StatRow label="Versions" value={versionCount} />
          <StatRow
            label="Current version"
            value={currentVersion ? `v${currentVersion.number}` : "—"}
            mono
          />
          <StatRow label="Created" value={formatDate(project.createdAt)} />
          <div className="flex items-center justify-between py-2">
            <span
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Last edited
            </span>
            <span
              className="text-xs"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {project.lastEdited}
            </span>
          </div>
        </div>

        {/* URL */}
        <div
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-xs mb-2"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.12em",
            }}
          >
            DEPLOYMENT
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            <svg
              width="9"
              height="10"
              viewBox="0 0 9 10"
              fill="none"
              style={{ flexShrink: 0, color: "var(--text-disabled)" }}
            >
              <rect
                x="1"
                y="4"
                width="7"
                height="5.5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.1"
              />
              <path
                d="M2.5 4V3a2 2 0 014 0v1"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="text-xs flex-1 truncate"
              style={{
                color: isLive ? "var(--text-secondary)" : "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 10,
              }}
            >
              {slug}.shango.app
            </span>
            {isLive && (
              <span
                className="text-xs flex-shrink-0"
                style={{
                  color: "#4ade80",
                  fontFamily: "var(--font-geist)",
                  fontSize: 10,
                }}
              >
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Version timeline mini */}
        {versionCount > 0 && (
          <div className="px-4 py-3">
            <p
              className="text-xs mb-3"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              RECENT VERSIONS
            </p>
            <div className="relative">
              <div
                className="absolute top-2 bottom-2 w-px"
                style={{
                  left: 8,
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
                }}
              />
              {[...project.versions]
                .reverse()
                .slice(0, 4)
                .map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 pb-3 relative"
                  >
                    <div
                      className="flex-shrink-0 rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        background: v.isCurrent ? "white" : "var(--surface-3)",
                        border: v.isCurrent
                          ? "none"
                          : "1px solid var(--border-default)",
                        marginTop: 1,
                        boxShadow: v.isCurrent
                          ? "0 0 0 3px rgba(255,255,255,0.07)"
                          : "none",
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: v.isCurrent ? 5 : 4,
                          height: v.isCurrent ? 5 : 4,
                          borderRadius: "50%",
                          background: v.isCurrent
                            ? "#0a0a0a"
                            : "var(--text-muted)",
                          opacity: v.isCurrent ? 1 : 0.35,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            fontSize: 9,
                          }}
                        >
                          v{v.number}
                        </span>
                        {v.isCurrent && (
                          <span
                            className="text-xs"
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontFamily: "var(--font-mono-jetbrains)",
                              fontSize: 8,
                              letterSpacing: "0.08em",
                            }}
                          >
                            NOW
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs truncate"
                        style={{
                          color: v.isCurrent
                            ? "var(--text-secondary)"
                            : "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {v.label}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
