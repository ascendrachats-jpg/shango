import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import type { Project, Version } from "../lib/store"
import { ALL_SKILLS } from "../lib/skills"
import { getTargetById, formatTimestamp } from "../lib/deployments"
import { XIcon, ForkIcon, RestoreIcon, ZapIcon } from "./icons"

interface Props {
  activeSection: string
  onClose: () => void
  project: Project
  versions: Version[]
}

const SECTION_META: Record<string, { title: string; subtitle?: string }> = {
  history: { title: "Version History", subtitle: "Every build is a milestone" },
  apps: { title: "Projects", subtitle: "Everything you have built" },
  templates: { title: "Templates", subtitle: "Start from a solid foundation" },
  deployments: { title: "Deployments", subtitle: "Prepared release handoffs" },
  skills: { title: "Skills", subtitle: "Tune SHANGO to your stack" },
  files: { title: "Workspace", subtitle: "Current project files" },
}

export default function SidebarPanel({
  activeSection,
  onClose,
  project,
  versions,
}: Props) {
  const { projects, addToast } = useApp()
  const navigate = useNavigate()

  if (!activeSection) return null

  const meta = SECTION_META[activeSection] ?? { title: activeSection }

  return (
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: 256,
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border-default)",
        animation: "slideInPanel 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex-shrink-0 px-4 flex flex-col justify-center"
        style={{ height: 56, borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span
              className="text-sm font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.2,
              }}
            >
              {meta.title}
            </span>
            {meta.subtitle && (
              <span
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  fontSize: 10,
                }}
              >
                {meta.subtitle}
              </span>
            )}
            {project.template && (
              <span
                className="text-xs truncate"
                style={{
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 8,
                  letterSpacing: "0.04em",
                }}
              >
                TEMPLATE · {project.template.name.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md flex-shrink-0"
            style={{ color: "var(--text-muted)", marginRight: -4 }}
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
      </div>

      {/* Content */}
      <div
        key={activeSection}
        className="flex-1 overflow-y-auto scroll-hidden"
        style={{ animation: "shango-fade-up 0.2s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {activeSection === "history" && (
          <HistoryPanel versions={versions} addToast={addToast} />
        )}
        {activeSection === "apps" && (
          <AppsPanel
            projects={projects}
            currentId={project.id}
            navigate={navigate}
          />
        )}
        {activeSection === "templates" && (
          <TemplatesPanel navigate={navigate} />
        )}
        {activeSection === "deployments" && (
          <DeploymentsPanel project={project} addToast={addToast} />
        )}
        {activeSection === "skills" && <SkillPacksPanel />}
        {activeSection === "files" && (
          <WorkspacePanel project={project} addToast={addToast} />
        )}
      </div>
    </div>
  )
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({
  versions,
  addToast,
}: {
  versions: Version[]
  addToast: (m: string, t?: "default" | "success" | "error") => void
}) {
  if (versions.length === 0) {
    return (
      <PanelEmptyState
        icon={
          <svg width={16} height={16} viewBox="0 0 40 40" fill="none">
            <path
              d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
              fill="white"
              opacity="0.3"
            />
          </svg>
        }
        title="No milestones yet"
        body="Each build you send creates a saved version you can restore."
      />
    )
  }

  const sorted = [...versions].reverse()

  return (
    <div className="relative p-4">
      {/* Rail */}
      <div
        className="absolute top-7 bottom-4 w-px"
        style={{
          left: 26,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
        }}
      />
      {sorted.map((v) => (
        <div key={v.id} className="relative flex gap-3 pb-5 group">
          {/* Node */}
          <div
            className="relative z-10 flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: v.isCurrent ? "white" : "var(--surface-3)",
              border: v.isCurrent ? "none" : "1px solid var(--border-default)",
              boxShadow: v.isCurrent
                ? "0 0 0 3px rgba(255,255,255,0.08), 0 0 8px rgba(255,255,255,0.06)"
                : "none",
            }}
          >
            <div
              style={{
                width: v.isCurrent ? 6 : 5,
                height: v.isCurrent ? 6 : 5,
                borderRadius: "50%",
                background: v.isCurrent ? "#0a0a0a" : "var(--text-muted)",
                opacity: v.isCurrent ? 1 : 0.4,
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingTop: 1 }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-xs font-medium"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 9,
                  letterSpacing: "0.06em",
                }}
              >
                v{v.number}
              </span>
              {v.isCurrent && (
                <span
                  className="text-xs px-1 py-px rounded"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 7,
                    letterSpacing: "0.1em",
                  }}
                >
                  CURRENT
                </span>
              )}
            </div>
            <p
              className="text-xs leading-snug"
              style={{
                color: v.isCurrent
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {v.label}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
              }}
            >
              {v.timestamp}
            </p>
            <div
              className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100"
              style={{ transition: "opacity 0.16s ease" }}
            >
              {!v.isCurrent && (
                <PanelAction
                  onClick={() =>
                    addToast(`Restored to v${v.number}`, "success")
                  }
                >
                  <RestoreIcon size={9} />
                  Restore
                </PanelAction>
              )}
              <PanelAction
                onClick={() => addToast(`Forked from v${v.number}`, "default")}
              >
                <ForkIcon size={9} />
                Fork
              </PanelAction>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Apps Panel ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  LIVE: "#4ade80",
  DRAFT: "rgba(255,255,255,0.3)",
  ARCHIVED: "rgba(255,255,255,0.12)",
}

function AppsPanel({
  projects,
  currentId,
  navigate,
}: {
  projects: Project[]
  currentId: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const { setActiveProject } = useApp()
  const active = projects.filter((p) => p.status !== "ARCHIVED")

  if (active.length === 0) {
    return (
      <PanelEmptyState
        icon={
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="8" height="8" rx="1.5" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" />
          </svg>
        }
        title="No projects yet"
        body="Create your first project from the home screen."
      />
    )
  }

  return (
    <div className="flex flex-col py-1.5">
      {active.map((p) => {
        const isCurrent = p.id === currentId
        const initial = p.name[0]?.toUpperCase() ?? "?"
        return (
          <button
            key={p.id}
            onClick={() => {
              setActiveProject(p.id)
              navigate(`/project/${p.id}`)
            }}
            className="w-full flex items-center gap-2.5 px-3.5 text-left"
            style={{
              height: 40,
              background: isCurrent ? "rgba(255,255,255,0.06)" : "transparent",
              borderLeft: `2px solid ${
                isCurrent ? "rgba(255,255,255,0.5)" : "transparent"
              }`,
              transition: "background 0.14s ease",
            }}
            onMouseEnter={(e) => {
              if (!isCurrent)
                e.currentTarget.style.background = "rgba(255,255,255,0.03)"
            }}
            onMouseLeave={(e) => {
              if (!isCurrent) e.currentTarget.style.background = "transparent"
            }}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-md"
              style={{
                width: 22,
                height: 22,
                background: isCurrent
                  ? "rgba(255,255,255,0.12)"
                  : "var(--surface-3)",
                border: `1px solid ${
                  isCurrent ? "rgba(255,255,255,0.15)" : "var(--border-default)"
                }`,
                fontSize: 9,
                fontWeight: 700,
                color: isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {initial}
            </div>

            {/* Name */}
            <span
              className="text-xs truncate flex-1"
              style={{
                color: isCurrent
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
                fontWeight: isCurrent ? 500 : 400,
              }}
            >
              {p.name}
            </span>

            {/* Status dot */}
            <div
              className="flex-shrink-0 rounded-full"
              style={{
                width: 5,
                height: 5,
                background: STATUS_COLOR[p.status] ?? "var(--border-default)",
                boxShadow:
                  p.status === "LIVE" ? "0 0 4px rgba(74,222,128,0.5)" : "none",
              }}
            />
          </button>
        )
      })}

      <div
        className="px-4 pt-3 mt-1"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => navigate("/projects")}
          className="text-xs transition-colors"
          style={{
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
          View all projects →
        </button>
      </div>
    </div>
  )
}

// ─── Templates Panel ──────────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  {
    id: "t1",
    category: "saas",
    name: "Community Savings",
    desc: "Chama and rotating savings groups",
    mono: "CS",
  },
  {
    id: "t2",
    category: "dashboard",
    name: "SaaS Dashboard",
    desc: "Analytics and user management",
    mono: "SD",
  },
  {
    id: "t3",
    category: "ecommerce",
    name: "E-commerce Store",
    desc: "Product catalog and checkout",
    mono: "EC",
  },
  {
    id: "t4",
    category: "portfolio",
    name: "Portfolio",
    desc: "Minimal personal showcase",
    mono: "PF",
  },
  {
    id: "t5",
    category: "mobile",
    name: "Logistics Tracker",
    desc: "Fleet and shipment monitoring",
    mono: "LT",
  },
  {
    id: "t9",
    category: "api",
    name: "API Explorer",
    desc: "Interactive docs and testing",
    mono: "AX",
  },
]

function TemplatesPanel({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>
}) {
  const { createProject, addToast } = useApp()

  const useTemplate = (t: typeof QUICK_TEMPLATES[number]) => {
    const p = createProject(`Create a ${t.name}: ${t.desc}`, {
      name: t.name,
      description: t.desc,
      template: { id: t.id, name: t.name, category: t.category },
    })
    if (!p) return
    addToast(`Workspace started: ${t.name}`, "default")
    navigate(`/project/${p.id}`)
  }

  return (
    <div className="flex flex-col py-1.5">
      {QUICK_TEMPLATES.map((t) => (
        <button
          key={t.name}
          onClick={() => useTemplate(t)}
          className="w-full flex items-center gap-3 px-3.5 text-left group"
          style={{ height: 46, transition: "background 0.14s ease" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              flexShrink: 0,
              background: "var(--surface-3)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {t.mono}
          </div>
          <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
            <span
              className="text-xs font-medium truncate"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {t.name}
            </span>
            <span
              className="text-xs truncate"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                fontSize: 10,
              }}
            >
              {t.desc}
            </span>
          </div>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100"
            style={{
              transition: "opacity 0.14s ease",
              color: "var(--text-muted)",
            }}
          >
            <path
              d="M3 2l4 3-4 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}

      <div
        className="px-4 pt-3 mt-1"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => navigate("/templates")}
          className="text-xs transition-colors"
          style={{
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
          Browse all templates →
        </button>
      </div>
    </div>
  )
}

// ─── Deployments Panel ────────────────────────────────────────────────────────

function DeploymentsPanel({
  project,
  addToast,
}: {
  project: Project
  addToast: (m: string, t?: "default" | "success" | "error") => void
}) {
  const navigate = useNavigate()
  const { deploymentRecords } = useApp()

  const projectRecords = deploymentRecords
    .filter((r) => r.projectName === project.name || r.projectId === project.id)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

  const records = projectRecords

  if (records.length === 0) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <PanelEmptyState
          icon={
            <ZapIcon
              size={16}
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            />
          }
          title="No deployment previews yet"
          body="Record a local preview from the toolbar when you are ready to prepare a release."
        />
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-2.5">
      {records.map((r) => {
        const target = getTargetById(r.target)
        const isLive = r.status === "live" && !r.isPreview
        const statusLabel = r.isPreview ? "PREVIEW" : r.status.toUpperCase()
        return (
          <div
            key={r.id}
            className="rounded-xl p-3.5 flex flex-col gap-2"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {r.projectName}
              </span>
              <div className="flex items-center gap-1.5">
                {isLive && (
                  <div
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: "#4ade80",
                      boxShadow: "0 0 5px rgba(74,222,128,0.6)",
                      animation: "live-pulse 2.4s ease-in-out infinite",
                    }}
                  />
                )}
                <span
                  className="text-xs px-1.5 py-px rounded"
                  style={{
                    background: isLive
                      ? "rgba(74,222,128,0.1)"
                      : "var(--surface-4)",
                    color: isLive ? "#4ade80" : "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 8,
                    letterSpacing: "0.08em",
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs flex-1 truncate"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 10,
                }}
              >
                {r.shortUrl}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(r.url)
                  addToast(
                    r.isPreview ? "Suggested domain copied" : "URL copied",
                    "success",
                  )
                }}
                className="p-1 rounded flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)"
                  e.currentTarget.style.background = "var(--surface-3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)"
                  e.currentTarget.style.background = "transparent"
                }}
                title={r.isPreview ? "Copy suggested domain" : "Copy URL"}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <rect
                    x="1"
                    y="3.5"
                    width="6"
                    height="6.5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M4 3V2a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8.5"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                fontSize: 10,
              }}
            >
              via {target?.name ?? r.target} · {formatTimestamp(r.timestamp)}
            </p>
          </div>
        )
      })}
      <button
        onClick={() => navigate("/deployments")}
        className="w-full py-2 rounded-lg text-xs text-center"
        style={{
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-secondary)"
          e.currentTarget.style.borderColor = "var(--border-default)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)"
          e.currentTarget.style.borderColor = "var(--border-subtle)"
        }}
      >
        Manage all deployments →
      </button>
    </div>
  )
}

// ─── Skill Packs Panel ────────────────────────────────────────────────────────

function SkillPacksPanel() {
  const navigate = useNavigate()
  const {
    installedSkills,
    enabledSkills,
    enableSkill,
    disableSkill,
    addToast,
  } = useApp()

  const installedSkillObjects = ALL_SKILLS.filter((s) =>
    installedSkills.includes(s.id),
  )

  const groupedByCategory =
    installedSkillObjects.reduce<Record<string, typeof installedSkillObjects>>(
      (acc, s) => {
        if (!acc[s.category]) acc[s.category] = []
        acc[s.category].push(s)
        return acc
      },
      {},
    )

  const enabledCount = enabledSkills.length
  const installedCount = installedSkills.length

  const toggle = (skillId: string, skillName: string) => {
    const isEnabled = enabledSkills.includes(skillId)
    if (isEnabled) {
      disableSkill(skillId)
      addToast(`${skillName} disabled`, "default")
    } else {
      enableSkill(skillId)
      addToast(`${skillName} enabled`, "default")
    }
  }

  if (installedCount === 0) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <PanelEmptyState
          icon={<ZapIcon size={16} />}
          title="No skills installed"
          body="Install skills to expand what SHANGO knows about your stack."
        />
        <button
          onClick={() => navigate("/skills")}
          className="w-full py-2 rounded-lg text-xs font-medium text-center"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            transition: "border-color 0.16s ease, color 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)"
            e.currentTarget.style.borderColor = "var(--border-strong)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)"
            e.currentTarget.style.borderColor = "var(--border-default)"
          }}
        >
          Browse Skills →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll-hidden p-4">
        {/* Summary */}
        <p
          className="text-xs mb-4 leading-relaxed"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.65,
          }}
        >
          {enabledCount === 0
            ? "All skills disabled. Enable to activate SHANGO's expertise."
            : `${enabledCount}/${installedCount} skill${
                enabledCount !== 1 ? "s" : ""
              } active — SHANGO adapts to your stack.`}
        </p>

        {/* Grouped by category */}
        {Object.entries(groupedByCategory).map(([category, skills]) => (
          <div key={category} className="mb-5">
            <p
              className="mb-2.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                fontSize: 9,
                letterSpacing: "0.1em",
              }}
            >
              {category.toUpperCase()}
            </p>
            <div className="flex flex-col gap-1.5">
              {skills.map((skill) => {
                const isEnabled = enabledSkills.includes(skill.id)
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggle(skill.id, skill.name)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left"
                    style={{
                      background: isEnabled
                        ? "rgba(255,255,255,0.05)"
                        : "var(--surface-2)",
                      border: `1px solid ${
                        isEnabled
                          ? "rgba(255,255,255,0.1)"
                          : "var(--border-subtle)"
                      }`,
                      transition:
                        "background 0.16s ease, border-color 0.16s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isEnabled)
                        e.currentTarget.style.borderColor =
                          "var(--border-default)"
                    }}
                    onMouseLeave={(e) => {
                      if (!isEnabled)
                        e.currentTarget.style.borderColor =
                          "var(--border-subtle)"
                    }}
                  >
                    {/* Monogram */}
                    <div
                      className="flex items-center justify-center rounded flex-shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        background: isEnabled
                          ? "rgba(255,255,255,0.08)"
                          : "var(--surface-3)",
                        border: `1px solid ${
                          isEnabled
                            ? "rgba(255,255,255,0.1)"
                            : "var(--border-default)"
                        }`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 7,
                          fontWeight: 700,
                          color: isEnabled
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {skill.monogram}
                      </span>
                    </div>

                    <span
                      className="text-xs flex-1"
                      style={{
                        color: isEnabled
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                        fontSize: 11,
                      }}
                    >
                      {skill.name}
                    </span>

                    {/* Health dot */}
                    {isEnabled && (
                      <span
                        className="rounded-full flex-shrink-0"
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
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div
        className="p-4 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => navigate("/skills")}
          className="w-full py-2 rounded-lg text-xs font-medium text-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            transition: "border-color 0.16s ease, color 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)"
            e.currentTarget.style.borderColor = "var(--border-strong)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)"
            e.currentTarget.style.borderColor = "var(--border-default)"
          }}
        >
          Browse Skills Library →
        </button>
      </div>
    </div>
  )
}

// ─── Workspace Panel ──────────────────────────────────────────────────────────

type FileEntry = {
  name: string
  type: "file" | "dir"
  ext?: string
  children?: FileEntry[]
}

const getProjectTree = (projectName: string): FileEntry[] => [
  {
    name: "src",
    type: "dir",
    children: [
      { name: "App.tsx", type: "file", ext: "tsx" },
      { name: "main.tsx", type: "file", ext: "tsx" },
      { name: "index.css", type: "file", ext: "css" },
      {
        name: "components",
        type: "dir",
        children: [
          {
            name: `${projectName.split(" ")[0]}Card.tsx`,
            type: "file",
            ext: "tsx",
          },
          { name: "Layout.tsx", type: "file", ext: "tsx" },
        ],
      },
      {
        name: "lib",
        type: "dir",
        children: [
          { name: "utils.ts", type: "file", ext: "ts" },
          { name: "api.ts", type: "file", ext: "ts" },
        ],
      },
    ],
  },
  {
    name: "public",
    type: "dir",
    children: [{ name: "favicon.svg", type: "file", ext: "svg" }],
  },
  { name: "package.json", type: "file", ext: "json" },
  { name: "vite.config.ts", type: "file", ext: "ts" },
  { name: "tsconfig.json", type: "file", ext: "json" },
]

const EXT_COLOR: Record<string, string> = {
  tsx: "#60a5fa",
  ts: "#818cf8",
  css: "#f472b6",
  json: "#f59e0b",
  svg: "#4ade80",
  js: "#facc15",
}

function FileIcon({ ext }: { ext?: string }) {
  const color = ext
    ? (EXT_COLOR[ext] ?? "var(--text-muted)")
    : "var(--text-muted)"
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 11 11"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 1h5l2.5 2.5V10a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5V1.5A.5.5 0 012 1z"
        stroke={color}
        strokeWidth="0.9"
      />
      <path
        d="M7 1v2.5H9.5"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 11 11"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d={
          open
            ? "M1 3.5a.5.5 0 01.5-.5H4l1 1h4.5a.5.5 0 01.5.5v5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5V3.5z"
            : "M1 2.5a.5.5 0 01.5-.5H4l1 1h4.5a.5.5 0 01.5.5v5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5V2.5z"
        }
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.9"
        fill={open ? "rgba(255,255,255,0.04)" : "none"}
      />
    </svg>
  )
}

function WorkspaceTree({
  entries,
  depth = 0,
  addToast,
}: {
  entries: FileEntry[]
  depth?: number
  addToast: (m: string, t?: "default" | "success" | "error") => void
}) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(() => new Set(["src"]))

  const toggle = (name: string) =>
    setOpenDirs((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  return (
    <>
      {entries.map((entry) => (
        <div key={entry.name}>
          <button
            onClick={() =>
              entry.type === "dir"
                ? toggle(entry.name)
                : addToast(`Opening ${entry.name}`, "default")
            }
            className="w-full flex items-center gap-1.5 text-left group"
            style={{
              paddingLeft: 12 + depth * 14,
              paddingRight: 8,
              height: 26,
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            {entry.type === "dir" ? (
              <FolderIcon open={openDirs.has(entry.name)} />
            ) : (
              <FileIcon ext={entry.ext} />
            )}
            <span
              style={{
                fontFamily: "var(--font-geist)",
                fontSize: 11.5,
                color:
                  entry.type === "dir"
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entry.name}
            </span>
            {entry.ext && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 8,
                  fontFamily: "var(--font-mono-jetbrains)",
                  color: EXT_COLOR[entry.ext] ?? "var(--text-disabled)",
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              >
                {entry.ext}
              </span>
            )}
          </button>
          {entry.type === "dir" &&
            openDirs.has(entry.name) &&
            entry.children && (
              <WorkspaceTree
                entries={entry.children}
                depth={depth + 1}
                addToast={addToast}
              />
            )}
        </div>
      ))}
    </>
  )
}

function WorkspacePanel({
  project,
  addToast,
}: {
  project: Project
  addToast: (m: string, t?: "default" | "success" | "error") => void
}) {
  const tree = getProjectTree(project.name)

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div
        className="px-3 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-2 px-2.5 rounded-md"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-default)",
            height: 26,
          }}
        >
          <svg
            width={10}
            height={10}
            viewBox="0 0 10 10"
            fill="none"
            style={{ flexShrink: 0, opacity: 0.3 }}
          >
            <circle
              cx="4.2"
              cy="4.2"
              r="3"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M6.5 6.5L8.5 8.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            placeholder="Find file..."
            className="flex-1 bg-transparent outline-none text-xs"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
            }}
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto scroll-hidden py-1">
        <WorkspaceTree entries={tree} addToast={addToast} />
      </div>

      {/* Footer stats */}
      <div
        className="flex-shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.06em",
          }}
        >
          8 FILES · 3 DIRS
        </span>
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          ~{Math.floor(80 + project.name.length * 3)} KB
        </span>
      </div>
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function PanelEmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 text-center"
      style={{ paddingTop: 48, paddingBottom: 48, gap: 12 }}
    >
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 40,
          height: 40,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p
          className="text-sm"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            fontWeight: 500,
          }}
        >
          {title}
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.65,
          }}
        >
          {body}
        </p>
      </div>
    </div>
  )
}

function PanelAction({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
      style={{
        background: "var(--surface-3)",
        color: "var(--text-secondary)",
        fontFamily: "var(--font-geist)",
        border: "1px solid var(--border-default)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-strong)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-default)")
      }
    >
      {children}
    </button>
  )
}
