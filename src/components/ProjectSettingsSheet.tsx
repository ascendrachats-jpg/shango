import { useEffect, useState } from "react"
import { XIcon, ArchiveIcon } from "./icons"
import { useApp } from "../store/AppContext"
import type { Project } from "../lib/store"
import { timeAgo, updateProject } from "../lib/store"
import { useNavigate } from "react-router-dom"

interface Props {
  open: boolean
  onClose: () => void
  project: Project
}

type SheetTab = "general" | "deployment" | "danger"

function detectFramework(name: string): { label: string; color: string } {
  const n = name.toLowerCase()
  if (
    n.includes("health") ||
    n.includes("clinic") ||
    n.includes("hospital") ||
    n.includes("patient")
  )
    return { label: "React + Vite", color: "#60a5fa" }
  if (
    n.includes("fintech") ||
    n.includes("finance") ||
    n.includes("bank") ||
    n.includes("mpesa")
  )
    return { label: "React + Vite", color: "#818cf8" }
  if (
    n.includes("logistic") ||
    n.includes("delivery") ||
    n.includes("transport")
  )
    return { label: "React + Vite", color: "#34d399" }
  if (n.includes("market") || n.includes("shop") || n.includes("store"))
    return { label: "React + Vite", color: "#fbbf24" }
  if (n.includes("school") || n.includes("educ") || n.includes("learn"))
    return { label: "React + Vite", color: "#f472b6" }
  return { label: "React + Vite", color: "rgba(255,255,255,0.4)" }
}

const REGIONS = [
  { id: "af-south", label: "Africa South", loc: "Johannesburg" },
  { id: "eu-west", label: "Europe West", loc: "Frankfurt" },
  { id: "us-east", label: "US East", loc: "Virginia" },
]

export default function ProjectSettingsSheet({
  open,
  onClose,
  project,
}: Props) {
  const { setProjects, addToast } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<SheetTab>("general")
  const [name, setName] = useState(project.name)
  const [desc, setDesc] = useState(project.description)
  const [domain, setDomain] = useState("")
  const [region, setRegion] = useState("af-south")
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const framework = detectFramework(project.name)

  useEffect(() => {
    if (!open || deleteConfirm) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, deleteConfirm, onClose])

  if (!open) return null

  const save = () => {
    const nextName = name.trim() || project.name
    const saved = setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? updateProject(p, { name: nextName, description: desc })
          : p,
      ),
    )
    if (!saved) return
    addToast("Settings saved", "success")
    onClose()
  }

  const handleArchive = async () => {
    const previousProject = project
    const nextProject = updateProject(project, { status: "ARCHIVED" })
    setArchiveLoading(true)
    const saved = setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? nextProject : p)),
    )
    if (!saved) {
      setArchiveLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ARCHIVED",
            updatedAt: nextProject.updatedAt,
            lastEdited: nextProject.lastEdited,
          }),
        },
      )
      if (!response.ok) throw new Error("Unable to archive project")
      addToast("Project archived", "default")
      onClose()
    } catch (error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? previousProject : p)),
      )
      addToast(
        error instanceof Error ? error.message : "Unable to archive project",
        "error",
      )
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteInput !== project.name) return
    const previousProjects = project
    setDeleteLoading(true)
    const saved = setProjects((prev) => prev.filter((p) => p.id !== project.id))
    if (!saved) {
      setDeleteLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        { method: "DELETE" },
      )
      if (!response.ok) throw new Error("Unable to delete project")
      addToast("Project deleted", "default")
      navigate("/projects")
    } catch (error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? previousProjects : p)),
      )
      addToast(
        error instanceof Error ? error.message : "Unable to delete project",
        "error",
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const TABS: { id: SheetTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "deployment", label: "Deployment" },
    { id: "danger", label: "Danger" },
  ]

  const liveUrl =
    project.status === "LIVE"
      ? `https://${project.name.toLowerCase().replace(/\s+/g, "-")}.shango.app`
      : null

  return (
    <div
      className="absolute top-0 right-0 h-full z-40 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-settings-title"
      style={{
        width: 320,
        background: "rgba(11,11,11,0.97)",
        backdropFilter: "blur(28px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        animation: "slideInFromRight 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: 48,
          padding: "0 14px 0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            id="project-settings-title"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Project Settings
          </span>
          {false && project.status === "LIVE" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 8,
                padding: "1px 5px",
                borderRadius: 4,
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.14)",
                color: "#4ade80",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.08em",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#4ade80",
                  display: "inline-block",
                  animation: "live-pulse 2.4s ease-in-out infinite",
                }}
              />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close project settings"
          style={{
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "color 0.14s, background 0.14s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)"
            e.currentTarget.style.background = "rgba(255,255,255,0.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <XIcon size={11} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 16px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          height: 36,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              height: "100%",
              padding: "0 10px",
              fontSize: 11.5,
              fontFamily: "var(--font-geist)",
              color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "color 0.14s ease",
            }}
            onMouseEnter={(e) => {
              if (tab !== t.id)
                e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              if (tab !== t.id)
                e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            {t.label}
            {tab === t.id && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "calc(100% - 12px)",
                  height: 1.5,
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: "2px 2px 0 0",
                  display: "block",
                }}
              />
            )}
            {t.id === "danger" && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 4,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(239,68,68,0.45)",
                  display: "block",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto scroll-hidden"
        style={{ padding: "18px 16px" }}
      >
        {/* ── General ── */}
        {tab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Project meta card */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <MetaRow label="Framework">
                  <span
                    style={{
                      fontSize: 10.5,
                      color: framework.color,
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {framework.label}
                  </span>
                </MetaRow>
                <MetaRow label="Versions">
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {project.versions.length}
                  </span>
                </MetaRow>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <MetaRow label="Created">
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {new Date(project.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </MetaRow>
                <MetaRow label="Modified">
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {timeAgo(project.lastEdited)}
                  </span>
                </MetaRow>
              </div>
            </div>

            {/* Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.12em",
                }}
              >
                NAME
              </label>
              <InputField
                value={name}
                onChange={setName}
                placeholder="Project name"
              />
            </div>

            {/* Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.12em",
                }}
              >
                DESCRIPTION
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className="w-full outline-none resize-none scroll-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")
                }
              />
            </div>

            <button
              onClick={save}
              style={{
                height: 34,
                borderRadius: 8,
                background: "rgba(255,255,255,0.92)",
                border: "none",
                color: "#0a0a0a",
                fontSize: 12.5,
                fontFamily: "var(--font-geist)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.14s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
              }
            >
              Save changes
            </button>
          </div>
        )}

        {/* ── Deployment ── */}
        {tab === "deployment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: "12px 13px",
                borderRadius: 9,
                background: "rgba(250,204,21,0.06)",
                border: "1px solid rgba(250,204,21,0.14)",
              }}
            >
              <p
                style={{
                  fontSize: 11.5,
                  color: "rgba(253,230,138,0.78)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                No verified provider release is attached to this project.
                Deployment previews record local handoff details only; they do
                not create a live URL, DNS record, region, or custom domain.
              </p>
            </div>
            <button
              onClick={() => navigate("/deployments")}
              style={{
                height: 34,
                borderRadius: 8,
                background: "rgba(255,255,255,0.92)",
                border: "none",
                color: "#0a0a0a",
                fontSize: 12.5,
                fontFamily: "var(--font-geist)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open deployment previews
            </button>
          </div>
        )}

        {/* Legacy deployment controls retained below while provider settings are rebuilt. */}
        {false && tab === "deployment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Live URL */}
            {liveUrl && (
              <div
                style={{
                  padding: "11px 13px",
                  borderRadius: 9,
                  background: "rgba(74,222,128,0.04)",
                  border: "1px solid rgba(74,222,128,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#4ade80",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.1em",
                    marginBottom: 4,
                  }}
                >
                  LIVE URL
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.65)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {liveUrl}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(liveUrl ?? "")
                      addToast("URL copied", "default")
                    }}
                    style={{
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 4,
                      flexShrink: 0,
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.18)",
                      color: "#4ade80",
                      fontFamily: "var(--font-mono-jetbrains)",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(74,222,128,0.18)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(74,222,128,0.1)")
                    }
                  >
                    COPY
                  </button>
                </div>
              </div>
            )}

            {!liveUrl && (
              <div
                style={{
                  padding: "11px 13px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Deploy your project to get a live URL.
                </p>
              </div>
            )}

            {/* Custom domain */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.12em",
                }}
              >
                CUSTOM DOMAIN
              </label>
              <InputField
                value={domain}
                onChange={setDomain}
                placeholder="app.yourdomain.com"
                mono
              />
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-geist)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Point a CNAME record to{" "}
                <span
                  style={{
                    fontFamily: "var(--font-mono-jetbrains)",
                    color: "var(--text-muted)",
                  }}
                >
                  cname.shango.app
                </span>{" "}
                after adding your domain.
              </p>
            </div>

            {/* Region */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.12em",
                }}
              >
                CDN REGION
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {REGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRegion(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 7,
                      border: `1px solid ${
                        region === r.id
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                      background:
                        region === r.id
                          ? "rgba(255,255,255,0.05)"
                          : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.12s, background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (region !== r.id)
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)"
                    }}
                    onMouseLeave={(e) => {
                      if (region !== r.id)
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.05)"
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          region === r.id ? "white" : "rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {region === r.id && (
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#0a0a0a",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-geist)",
                          fontWeight: 500,
                        }}
                      >
                        {r.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {r.loc}
                      </div>
                    </div>
                    {r.id === "af-south" && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 8,
                          padding: "1px 5px",
                          borderRadius: 3,
                          flexShrink: 0,
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        RECOMMENDED
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => addToast("Deployment settings saved", "success")}
              style={{
                height: 34,
                borderRadius: 8,
                background: "rgba(255,255,255,0.92)",
                border: "none",
                color: "#0a0a0a",
                fontSize: 12.5,
                fontFamily: "var(--font-geist)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.14s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
              }
            >
              Save deployment settings
            </button>
          </div>
        )}

        {/* ── Danger ── */}
        {tab === "danger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              These actions are irreversible. Proceed with care.
            </p>

            {/* Archive */}
            <div
              style={{
                padding: "14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                    margin: "0 0 3px",
                  }}
                >
                  Archive project
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  The project is hidden from your workspace but all data is
                  preserved. You can unarchive at any time.
                </p>
              </div>
              <button
                onClick={handleArchive}
                disabled={archiveLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: archiveLoading
                    ? "rgba(255,255,255,0.04)"
                    : "transparent",
                  color: archiveLoading
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                  fontSize: 12,
                  fontFamily: "var(--font-geist)",
                  cursor: archiveLoading ? "not-allowed" : "pointer",
                  alignSelf: "flex-start",
                  transition: "border-color 0.14s, color 0.14s",
                }}
                onMouseEnter={(e) => {
                  if (!archiveLoading) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
                    e.currentTarget.style.color = "var(--text-primary)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                  e.currentTarget.style.color = archiveLoading
                    ? "var(--text-muted)"
                    : "var(--text-secondary)"
                }}
              >
                {!archiveLoading && <ArchiveIcon size={12} />}
                <span
                  style={
                    archiveLoading
                      ? { animation: "shango-breathe 1.5s infinite" }
                      : {}
                  }
                >
                  {archiveLoading ? "Archiving…" : "Archive"}
                </span>
              </button>
            </div>

            {/* Delete */}
            <div
              style={{
                padding: "14px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.14)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "rgba(239,68,68,0.8)",
                    fontFamily: "var(--font-geist)",
                    margin: "0 0 3px",
                  }}
                >
                  Delete project
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(239,68,68,0.5)",
                    fontFamily: "var(--font-geist)",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  Permanently deletes all project data, versions, and
                  deployments. This cannot be undone.
                </p>
              </div>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 7,
                    border: "1px solid rgba(239,68,68,0.22)",
                    background: "transparent",
                    color: "rgba(239,68,68,0.65)",
                    fontSize: 12,
                    fontFamily: "var(--font-geist)",
                    cursor: "pointer",
                    alignSelf: "flex-start",
                    transition: "border-color 0.14s, color 0.14s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"
                    e.currentTarget.style.color = "rgba(239,68,68,0.9)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.22)"
                    e.currentTarget.style.color = "rgba(239,68,68,0.65)"
                  }}
                >
                  Delete project
                </button>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(239,68,68,0.7)",
                      fontFamily: "var(--font-geist)",
                      margin: 0,
                    }}
                  >
                    Type{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontWeight: 600,
                      }}
                    >
                      {project.name}
                    </span>{" "}
                    to confirm:
                  </p>
                  <input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={project.name}
                    autoFocus
                    className="outline-none"
                    style={{
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 7,
                      padding: "6px 10px",
                      color: "rgba(239,68,68,0.9)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 11.5,
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(239,68,68,0.4)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(239,68,68,0.2)")
                    }
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={handleDelete}
                      disabled={deleteInput !== project.name || deleteLoading}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 7,
                        fontSize: 12,
                        fontFamily: "var(--font-geist)",
                        cursor:
                          deleteInput === project.name && !deleteLoading
                            ? "pointer"
                            : "not-allowed",
                        background:
                          deleteInput === project.name
                            ? "rgba(239,68,68,0.8)"
                            : "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color:
                          deleteInput === project.name
                            ? "white"
                            : "rgba(239,68,68,0.4)",
                        transition: "background 0.14s, color 0.14s",
                      }}
                    >
                      <span
                        style={
                          deleteLoading
                            ? { animation: "shango-breathe 1.5s infinite" }
                            : {}
                        }
                      >
                        {deleteLoading ? "Deleting…" : "Confirm delete"}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(false)
                        setDeleteInput("")
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 7,
                        fontSize: 12,
                        fontFamily: "var(--font-geist)",
                        cursor: "pointer",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--text-muted)",
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.14)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)")
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInFromRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  )
}

// ── Primitives ───────────────────────────────────────────────────────────────

function InputField({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        padding: "7px 10px",
        color: "var(--text-primary)",
        fontFamily: mono ? "var(--font-mono-jetbrains)" : "var(--font-geist)",
        fontSize: mono ? 11.5 : 13,
        transition: "border-color 0.14s ease",
      }}
      onFocus={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")
      }
      onBlur={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")
      }
    />
  )
}

function MetaRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 8.5,
          color: "var(--text-disabled)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.1em",
        }}
      >
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  )
}
