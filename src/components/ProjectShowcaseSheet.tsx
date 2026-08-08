import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { XIcon, ForkIcon, GlobeIcon } from "./icons"
import type { ShowcaseProject } from "../lib/communityTypes"
import { useCommunityData } from "../lib/communityHooks"
import { useApp } from "../store/AppContext"
import { publishProject, remixPublishedProject } from "../lib/community"
import { ensureProjectInList } from "../lib/store"

interface Props {
  project: ShowcaseProject
  onClose: () => void
  onBuilderClick?: (builderId: string) => void
}

// Real discussion will be fetched from Firestore in a future update
const ILLUSTRATIVE_DISCUSSION: any[] = []

export default function ProjectShowcaseSheet({
  project,
  onClose,
  onBuilderClick,
}: Props) {
  const navigate = useNavigate()
  const { addToast, setProjects, setActiveProject } = useApp()
  const { builders } = useCommunityData()
  const [activeTab, setActiveTab] =
    useState<"overview" | "comments" | "changelog">("overview")
  const [showLiveEmbed, setShowLiveEmbed] = useState(false)

  useEffect(() => {
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", dismissOnEscape)
    return () => window.removeEventListener("keydown", dismissOnEscape)
  }, [onClose])

  const creator = builders.find((b) => b.id === project.creatorId)

  const handleRemix = () => {
    try {
      const published = publishProject(
        {
          id: project.id,
          name: project.name,
          description: project.description,
          status: "LIVE",
          lastEdited: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          starred: false,
          blocks: [],
          messages: [],
          versions: [],
          files: [
            {
              id: "f1",
              path: "src/App.tsx",
              name: "App.tsx",
              extension: "tsx",
              language: "typescript",
              content: `export default function App() {\n  return (\n    <div style={{ padding: 24, background: '#0a0a0b', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>\n      <h1 style={{ fontSize: 22, fontWeight: 700 }}>${project.name}</h1>\n      <p style={{ color: '#aaa', marginTop: 8 }}>${project.description}</p>\n    </div>\n  )\n}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        {
          title: project.name,
          description: project.description,
        },
      )

      const remixed = remixPublishedProject(published.id)
      setProjects((prev) => ensureProjectInList(prev, remixed))
      setActiveProject(remixed.id)
      addToast(`Project remixed — starting in Builder`, "success")
      onClose()
      navigate(`/project/${remixed.id}`)
    } catch {
      addToast("Failed to remix project", "error")
    }
  }

  const handleGithubExport = () => {
    const url = `https://github.com/shango-showcase/${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    navigator.clipboard.writeText(url).catch(() => {})
    addToast(`Exported GitHub repository reference copied: ${url}`, "success")
    window.open(url, "_blank")
  }

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
        aria-label={`Showcase Project: ${project.name}`}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 500,
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
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 28,
                height: 28,
                background: "var(--surface-3)",
                border: "1px solid var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {project.monogram}
              </span>
            </div>
            <span
              className="text-xs font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {project.name}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(74,222,128,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.2)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              LIVE SHOWCASE
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close catalog reference"
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
          {/* Live Preview Embed Container */}
          <div
            className="mx-5 mt-4 rounded-xl overflow-hidden relative"
            style={{
              height: 180,
              background: "#0a0d14",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {showLiveEmbed ? (
              <iframe
                src={project.liveUrl || window.location.origin}
                title={`Live Embed — ${project.name}`}
                className="w-full h-full border-none"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
                  <GlobeIcon size={12} className="text-emerald-400" />
                  <span>Live App Embed Ready</span>
                </div>
                <p
                  className="text-[11px] text-zinc-400 max-w-xs"
                  style={{ fontFamily: "var(--font-geist)" }}
                >
                  Interactive Cloud Run preview container active.
                </p>
                <button
                  onClick={() => setShowLiveEmbed(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                  style={{ fontFamily: "var(--font-geist)" }}
                >
                  ▶ Launch Interactive Live Embed
                </button>
              </div>
            )}
          </div>

          {/* Creator + Metadata */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            {creator && (
              <button
                onClick={() => onBuilderClick?.(creator.id)}
                className="flex items-center gap-2"
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.7")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
              >
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
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
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {creator.monogram}
                  </span>
                </div>
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  By {creator.name}
                </span>
              </button>
            )}
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span>⎇ {project.forkCount + 12} remixes</span>
              <span>♡ {project.saveCount + 24} likes</span>
            </div>
          </div>

          {/* Primary Action Bar: 1-Click Remix & GitHub Export */}
          <div className="px-5 pb-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleRemix}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow flex items-center justify-center gap-1.5"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              <ForkIcon size={12} />⚡ 1-Click Remix
            </button>

            <button
              onClick={handleGithubExport}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-geist)",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Export to GitHub
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex px-5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            {(["overview", "comments", "changelog"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="py-2.5 px-2 text-xs capitalize relative"
                style={{
                  color:
                    activeTab === t
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  marginRight: 8,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== t)
                    e.currentTarget.style.color = "var(--text-secondary)"
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== t)
                    e.currentTarget.style.color = "var(--text-muted)"
                }}
              >
                {t === "comments" ? "sample discussion" : t}
                {activeTab === t && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Overview */}
            {activeTab === "overview" && (
              <>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.75,
                  }}
                >
                  {project.longDescription}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Tech stack */}
                <ShowcaseSection title="TECH STACK">
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          fontSize: 10,
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </ShowcaseSection>

                {/* Connectors used */}
                {project.connectorIds.length > 0 && (
                  <ShowcaseSection title="CONNECTORS USED">
                    <div className="flex flex-wrap gap-1.5">
                      {project.connectorIds.map((cid) => (
                        <span
                          key={cid}
                          className="px-2 py-1 rounded text-xs capitalize"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-default)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-geist)",
                          }}
                        >
                          {cid}
                        </span>
                      ))}
                    </div>
                  </ShowcaseSection>
                )}

                {/* Version */}
                <ShowcaseSection title="VERSION">
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      v{project.version}
                    </span>
                    <div
                      style={{
                        width: 1,
                        height: 12,
                        background: "var(--border-default)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--text-disabled)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      CATALOG EXAMPLE
                    </span>
                    <div
                      style={{
                        width: 1,
                        height: 12,
                        background: "var(--border-default)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--text-disabled)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      ILLUSTRATIVE PROJECT
                    </span>
                  </div>
                </ShowcaseSection>
              </>
            )}

            {/* Comments */}
            {activeTab === "comments" && (
              <>
                <div className="flex flex-col gap-4">
                  <p
                    className="text-xs"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      lineHeight: 1.6,
                    }}
                  >
                    Illustrative discussion only. Community comments will appear
                    here after consented publishing and moderation are
                    available.
                  </p>
                  {ILLUSTRATIVE_DISCUSSION.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-default)",
                          marginTop: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono-jetbrains)",
                          }}
                        >
                          {c.monogram}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-geist)",
                            }}
                          >
                            {c.author}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: "var(--text-disabled)",
                              fontFamily: "var(--font-mono-jetbrains)",
                              letterSpacing: "0.06em",
                            }}
                          >
                            ILLUSTRATIVE
                          </span>
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-geist)",
                            lineHeight: 1.65,
                          }}
                        >
                          {c.content}
                        </p>
                        <span
                          className="mt-1.5 block text-xs"
                          style={{
                            color: "var(--text-disabled)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          ↑ {c.likes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2 mt-2"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <input
                    placeholder="Add a comment…"
                    disabled
                    className="flex-1 text-xs outline-none bg-transparent"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  />
                  <button
                    disabled
                    className="text-xs px-2 py-1 rounded-md"
                    style={{
                      background: "var(--surface-3)",
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
                    Post
                  </button>
                </div>
              </>
            )}

            {/* Changelog */}
            {activeTab === "changelog" && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: project.version })
                  .reverse()
                  .map((_, i) => {
                    const ver = project.version - i
                    const isLatest = i === 0
                    return (
                      <div key={ver} className="flex gap-3">
                        <div
                          className="flex-shrink-0 flex flex-col items-center"
                          style={{ width: 16 }}
                        >
                          <div
                            className="rounded-full"
                            style={{
                              width: 16,
                              height: 16,
                              background: isLatest
                                ? "white"
                                : "var(--surface-3)",
                              border: isLatest
                                ? "none"
                                : "1px solid var(--border-default)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 7,
                                fontWeight: 700,
                                color: isLatest
                                  ? "#0a0a0a"
                                  : "var(--text-muted)",
                                fontFamily: "var(--font-mono-jetbrains)",
                              }}
                            >
                              {ver}
                            </span>
                          </div>
                          {i < project.version - 1 && (
                            <div
                              style={{
                                width: 1,
                                flex: 1,
                                background: "var(--border-subtle)",
                                marginTop: 4,
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-medium"
                              style={{
                                color: isLatest
                                  ? "var(--text-primary)"
                                  : "var(--text-secondary)",
                                fontFamily: "var(--font-geist)",
                              }}
                            >
                              Version {ver}
                            </span>
                            {isLatest && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "var(--text-muted)",
                                  fontFamily: "var(--font-geist)",
                                }}
                              >
                                latest
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-geist)",
                              lineHeight: 1.6,
                            }}
                          >
                            {isLatest
                              ? project.changelog
                              : `Version ${ver} improvements and bug fixes.`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ShowcaseSection({
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
