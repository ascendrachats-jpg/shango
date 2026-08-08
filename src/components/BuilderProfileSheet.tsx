import { useEffect, useState } from "react"
import { XIcon, AwardIcon } from "./icons"
import { formatRelativeTime } from "../lib/communityTypes"
import type {
  Builder,
  ShowcaseProject,
  BuilderReputation,
} from "../lib/communityTypes"

const REPUTATION_DESCRIPTIONS: Record<BuilderReputation, string> = {
  "Trusted Builder":
    "Has deployed 5+ successful apps and maintained high uptime.",
  "Open Source Contributor":
    "Frequently remixes and publishes templates for the community.",
  "Community Mentor":
    "Answers questions and guides other builders in the ecosystem.",
  "Early Creator": "One of the first 1,000 builders on Shango.",
  "Verified Organization":
    "A verified company or institution building on Shango.",
  "Active Builder": "Actively deploys new iterations every week.",
}

interface Props {
  builder: Builder
  projects?: ShowcaseProject[]
  onClose: () => void
  onProjectClick?: (project: ShowcaseProject) => void
}

type Tab = "overview" | "projects" | "activity"

export default function BuilderProfileSheet({
  builder,
  projects,
  onClose,
  onProjectClick,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview")

  useEffect(() => {
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", dismissOnEscape)
    return () => window.removeEventListener("keydown", dismissOnEscape)
  }, [onClose])

  const builderProjects = builder.publicDeployments

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Illustrative builder profile: ${builder.name}`}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 420,
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          animation: "slideInFromRight 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Showcase Builder Profile
          </span>
          <button
            onClick={onClose}
            aria-label="Close builder profile"
            className="p-1.5 rounded-md"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <XIcon size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile hero */}
          <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar monogram */}
              <div
                className="flex items-center justify-center rounded-2xl flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {builder.monogram}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className="text-base font-semibold"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-geist)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {builder.name}
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-terracotta)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    marginTop: 2,
                  }}
                >
                  @{builder.handle} · {builder.location}
                </p>
              </div>
            </div>

            <p
              className="text-xs leading-relaxed"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.7,
              }}
            >
              {builder.bio}
            </p>

            {/* Reputation tags */}
            {builder.reputation.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {builder.reputation.map((rep) => (
                  <div
                    key={rep}
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                    }}
                    title={REPUTATION_DESCRIPTIONS[rep]}
                  >
                    <AwardIcon
                      size={9}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-geist)",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {rep}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div
              className="grid grid-cols-4 gap-0"
              style={{
                borderTop: "1px solid var(--border-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              {[
                { label: "Projects", value: builder.projectCount },
                {
                  label: "Followers",
                  value: formatCount(builder.followerCount),
                },
                { label: "Following", value: builder.followingCount },
                {
                  label: "Contributions",
                  value: formatCount(builder.contributionCount),
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center py-3"
                  style={{
                    borderRight:
                      i < 3 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-geist)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      marginTop: 2,
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Collaboration availability */}
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-xl text-xs font-semibold shadow"
                style={{
                  background: "var(--color-savannah-gold)",
                  color: "#1a1a1a",
                  fontFamily: "var(--font-geist)",
                  transition: "background 0.2s ease",
                }}
              >
                Hire or Collaborate
              </button>
              <button
                disabled
                className="flex-[0.6] py-2 rounded-xl text-xs font-medium"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  fontWeight: 500,
                  cursor: "not-allowed",
                  opacity: 0.7,
                }}
              >
                Follow unavailable
              </button>
              <button
                disabled
                className="flex-1 py-2 rounded-xl text-xs"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  cursor: "not-allowed",
                  opacity: 0.7,
                }}
              >
                Messaging unavailable
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div
            className="flex px-5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            {(["overview", "projects", "activity"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="py-2.5 px-2 text-xs capitalize relative"
                style={{
                  color:
                    tab === t ? "var(--text-primary)" : "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  marginRight: 8,
                }}
                onMouseEnter={(e) => {
                  if (tab !== t)
                    e.currentTarget.style.color = "var(--text-secondary)"
                }}
                onMouseLeave={(e) => {
                  if (tab !== t)
                    e.currentTarget.style.color = "var(--text-muted)"
                }}
              >
                {t}
                {tab === t && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Overview tab */}
            {tab === "overview" && (
              <>
                {/* Tech stack */}
                <SheetSection title="TECH STACK">
                  <div className="flex flex-wrap gap-1.5">
                    {builder.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </SheetSection>

                {/* Public deployments */}
                {builderProjects.length > 0 && (
                  <SheetSection title="SHOWCASE PORTFOLIO">
                    {builderProjects.map((dep) => (
                      <div
                        key={dep.name}
                        className="flex items-center gap-3 py-2"
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            padding: "1px 4px",
                            borderRadius: "4px",
                            background: "var(--color-terracotta-bg)",
                            color: "var(--color-terracotta)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          LIVE
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-medium truncate"
                            style={{
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-geist)",
                            }}
                          >
                            {dep.name}
                          </p>
                          <p
                            style={
                              {
                                fontSize: 10,
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono-jetbrains)",
                                truncate: true,
                              } as React.CSSProperties
                            }
                          >
                            Featured Showcase App
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            color: "var(--text-disabled)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            flexShrink: 0,
                          }}
                        >
                          {dep.target}
                        </span>
                      </div>
                    ))}
                  </SheetSection>
                )}

                {/* Achievements */}
                {builder.achievements.length > 0 && (
                  <SheetSection title="ACHIEVEMENTS">
                    <div className="flex flex-col gap-2">
                      {builder.achievements.map((ach) => (
                        <div
                          key={ach.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <AwardIcon
                            size={11}
                            style={{
                              color: "var(--text-muted)",
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <p
                              className="text-xs font-medium"
                              style={{
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-geist)",
                              }}
                            >
                              {ach.label}
                            </p>
                            <p
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-geist)",
                                marginTop: 1,
                              }}
                            >
                              {ach.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SheetSection>
                )}

                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-disabled)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  Catalog example
                </p>
              </>
            )}

            {/* Projects tab */}
            {tab === "projects" && (
              <div className="flex flex-col gap-2">
                {builderProjects.map((dep) => (
                  <div
                    key={dep.name}
                    className="p-3.5 rounded-xl cursor-pointer"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.background =
                        "var(--surface-3)"
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.background =
                        "var(--surface-2)"
                    }}
                    onClick={() => {
                      const p = projects?.find(
                        (proj) =>
                          proj.id ===
                          (builderProjects.indexOf(dep) === 0
                            ? "proj-01"
                            : "proj-02"),
                      )
                      if (p && onProjectClick) onProjectClick(p)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {dep.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--text-disabled)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        CATALOG
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      Illustrative catalog project · {dep.target}
                    </p>
                  </div>
                ))}
                {builderProjects.length === 0 && (
                  <p
                    className="text-xs text-center py-8"
                    style={{
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    No public projects yet
                  </p>
                )}
              </div>
            )}

            {/* Activity tab */}
            {tab === "activity" && (
              <div className="flex flex-col gap-0 relative">
                <div
                  className="absolute left-[7px] top-2 bottom-2 w-px"
                  style={{ background: "var(--border-subtle)" }}
                />
                {builder.activityTimeline.map((entry) => (
                  <div key={entry.id} className="flex gap-3 pb-4 relative">
                    <div
                      className="flex-shrink-0 rounded-full"
                      style={{
                        width: 15,
                        height: 15,
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        marginTop: 1,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        className="rounded-full"
                        style={{
                          width: 5,
                          height: 5,
                          background: "var(--text-muted)",
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                        }}
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-geist)",
                          lineHeight: 1.5,
                        }}
                      >
                        {entry.description}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--text-disabled)",
                          fontFamily: "var(--font-geist)",
                          marginTop: 2,
                        }}
                      >
                        {formatRelativeTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SheetSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
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
        {title}
      </p>
      {children}
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
