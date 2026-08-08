import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import {
  isProjectSyncPending,
  PROJECT_SYNC_QUEUE_EVENT,
  saveProjectStateSnapshot,
} from "../lib/persistence"
import Logo from "../components/Logo"
import ContextMenu from "../components/ContextMenu"
import ConfirmationModal from "../components/ConfirmationModal"
import {
  SearchIcon,
  PlusIcon,
  GridIcon,
  ListIcon,
  DotsIcon,
  ArchiveIcon,
  DuplicateIcon,
  ForkIcon,
  XIcon,
  ZapIcon,
} from "../components/icons"
import type { Project } from "../lib/store"
import { duplicateProject, updateProject } from "../lib/store"
import { forkProjectFromCurrentVersion } from "../lib/versioning"

type ViewMode = "grid" | "list"
type Filter = "all" | "live" | "draft" | "archived"

export default function ProjectsPage() {
  const navigate = useNavigate()
  const {
    projects,
    setProjects,
    setActiveProject,
    currentUser,
    setAuthSheetOpen,
    addToast,
    persistenceError,
  } = useApp()
  const [view, setView] = useState<ViewMode>("grid")
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    project: Project
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<Project | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [syncQueueVersion, setSyncQueueVersion] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const pendingSyncProjectIds = useMemo(
    () =>
      new Set(
        projects
          .filter((project) => isProjectSyncPending(project.id))
          .map((project) => project.id),
      ),
    [projects, syncQueueVersion],
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/projects")
        if (!mounted) return
        if (!res.ok) throw new Error("Unable to load projects")
        const body = await res.json().catch(() => null)
        const remoteProjects = Array.isArray(body)
          ? body
          : Array.isArray(body?.projects)
            ? body.projects
            : []
        if (remoteProjects.length > 0) {
          setProjects((prev) => (prev.length > 0 ? prev : remoteProjects))
        }
      } catch {
        // keep local state if the backend is unavailable
      } finally {
        if (mounted) setIsLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [setProjects])

  useEffect(() => {
    const refreshSyncQueue = () => setSyncQueueVersion((version) => version + 1)
    window.addEventListener(PROJECT_SYNC_QUEUE_EVENT, refreshSyncQueue)
    return () =>
      window.removeEventListener(PROJECT_SYNC_QUEUE_EVENT, refreshSyncQueue)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const filtered = projects.filter((p) => {
    if (filter === "live" && p.status !== "LIVE") return false
    if (filter === "draft" && p.status !== "DRAFT") return false
    if (filter === "archived" && p.status !== "ARCHIVED") return false
    if (filter !== "archived" && filter === "all" && p.status === "ARCHIVED")
      return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const handleDuplicate = async (p: Project) => {
    const localCopy = duplicateProject(p)
    setProjects((prev) => [localCopy, ...prev])
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(p.id)}/duplicate`,
        { method: "POST" },
      )
      if (!res.ok) throw new Error("Unable to duplicate project")
      const body = await res.json().catch(() => null)
      const remoteProject = body?.project ?? body
      if (remoteProject?.id) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === localCopy.id
              ? {
                  ...project,
                  id: remoteProject.id,
                  name: remoteProject.name ?? project.name,
                  updatedAt: remoteProject.updatedAt ?? project.updatedAt,
                }
              : project,
          ),
        )
      }
      addToast(`Duplicated "${p.name}"`, "success")
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Unable to duplicate project",
        "error",
      )
    }
  }

  const handleDelete = async (p: Project) => {
    const previousProjects = projects
    const nextProjects = projects.filter((x) => x.id !== p.id)
    setProjects((prev) => prev.filter((x) => x.id !== p.id))
    saveProjectStateSnapshot(nextProjects, null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Unable to delete project")
      addToast(`Deleted "${p.name}"`, "success")
    } catch (error) {
      setProjects(previousProjects)
      addToast(
        error instanceof Error ? error.message : "Unable to delete project",
        "error",
      )
    }
  }

  const handleArchive = async (p: Project) => {
    const next = updateProject(p, { status: "ARCHIVED" })
    setProjects((prev) => prev.map((x) => (x.id === p.id ? next : x)))
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })
      if (!res.ok) throw new Error("Unable to archive project")
      addToast(`Archived "${p.name}"`, "success")
    } catch (error) {
      setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)))
      addToast(
        error instanceof Error ? error.message : "Unable to archive project",
        "error",
      )
    }
  }

  const handleFork = async (p: Project) => {
    const forked = forkProjectFromCurrentVersion(p, `${p.name} (fork)`)
    if (!forked) {
      addToast("Unable to fork project", "error")
      return
    }

    setProjects((prev) => [
      forked,
      ...prev.filter((project) => project.id !== forked.id),
    ])
    setActiveProject(forked.id)
    addToast(`Forked "${p.name}"`, "success")
    navigate(`/project/${forked.id}`)

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(p.id)}/fork`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      )
      if (!res.ok) throw new Error("Unable to fork project")
      const body = await res.json().catch(() => null)
      const remoteProject = body?.project ?? body
      if (remoteProject?.id) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === forked.id
              ? {
                  ...project,
                  ...remoteProject,
                  id: remoteProject.id,
                  name: remoteProject.name ?? project.name,
                  updatedAt: remoteProject.updatedAt ?? project.updatedAt,
                }
              : project,
          ),
        )
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Unable to fork project",
        "error",
      )
    }
  }

  const handleRenameStart = (p: Project) => {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  const handleRenameFinish = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null)
      return
    }
    const target = projects.find((p) => p.id === editingId)
    if (!target) {
      setEditingId(null)
      return
    }
    const nextName = editingName.trim()
    const previous = target
    setProjects((prev) =>
      prev.map((p) =>
        p.id === editingId ? updateProject(p, { name: nextName }) : p,
      ),
    )
    setEditingId(null)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nextName }),
        },
      )
      if (!res.ok) throw new Error("Unable to rename project")
      addToast("Project renamed", "success")
    } catch (error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === editingId ? previous : p)),
      )
      addToast(
        error instanceof Error ? error.message : "Unable to rename project",
        "error",
      )
    }
  }

  const openContextMenu = (e: React.MouseEvent, p: Project) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, project: p })
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "draft", label: "Draft" },
    { id: "archived", label: "Archived" },
  ]

  return (
    <div
      className="min-h-screen flex flex-col shango-page-arrive relative"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 100%)",
          zIndex: 0,
        }}
      />

      {/* Top nav */}
      <header
        className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 relative z-10"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          background: "rgba(9, 10, 15, 0.4)",
          backdropFilter: "blur(12px)",
          height: 56,
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        >
          <Logo size="sm" showWordmark={false} />
        </button>
        <div
          style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }}
        />
        <span
          className="text-sm"
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: "var(--font-geist)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          The Archive
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            width: 220,
          }}
        >
          <SearchIcon
            size={13}
            style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}
          />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archive... ⌘F"
            className="flex-1 outline-none bg-transparent text-xs placeholder:text-neutral-600"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          />
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-0.5 rounded-md px-1 py-0.5"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => setView("grid")}
            className="p-1.5 rounded transition-colors"
            style={{
              background:
                view === "grid" ? "rgba(255,255,255,0.06)" : "transparent",
              color:
                view === "grid"
                  ? "var(--text-primary)"
                  : "rgba(255,255,255,0.3)",
            }}
          >
            <GridIcon size={13} />
          </button>
          <button
            onClick={() => setView("list")}
            className="p-1.5 rounded transition-colors"
            style={{
              background:
                view === "list" ? "rgba(255,255,255,0.06)" : "transparent",
              color:
                view === "list"
                  ? "var(--text-primary)"
                  : "rgba(255,255,255,0.3)",
            }}
          >
            <ListIcon size={13} />
          </button>
        </div>

        {currentUser ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ml-2 cursor-pointer transition-transform hover:scale-105"
            style={{
              background: "var(--surface-3)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {currentUser && currentUser.name
              ? (currentUser.name[0]?.toUpperCase() ?? "?")
              : "?"}
          </div>
        ) : (
          <button
            onClick={() => setAuthSheetOpen(true)}
            className="text-xs ml-2 hover:text-white transition-colors"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Sign in
          </button>
        )}
      </header>

      {/* Filter bar */}
      <div
        className="flex items-center gap-1.5 px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: filter === f.id ? "var(--surface-3)" : "transparent",
              border: `1px solid ${
                filter === f.id ? "var(--border-default)" : "transparent"
              }`,
              color:
                filter === f.id ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {f.label}
            <span
              className="ml-1.5 text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {
                projects.filter((p) => {
                  if (f.id === "all") return p.status !== "ARCHIVED"
                  return p.status.toLowerCase() === f.id
                }).length
              }
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-5">
        {isLoading ? (
          <SkeletonGrid />
        ) : persistenceError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="rounded-xl border px-6 py-5 max-w-xl w-full"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-default)",
              }}
            >
              <p
                className="text-sm font-medium"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Projects could not be loaded
              </p>
              <p
                className="mt-2 text-sm"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.6,
                }}
              >
                {persistenceError}
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium"
              style={{
                background: "white",
                color: "#0a0a0a",
                fontFamily: "var(--font-geist)",
              }}
            >
              <PlusIcon size={12} />
              Create a project
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => navigate("/")} hasSearch={!!search} />
        ) : view === "grid" ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {filter === "all" && !search && (
              <div
                className="rounded-xl overflow-hidden cursor-pointer group relative flex flex-col shango-card"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  transition:
                    "transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.2s ease, background 0.2s ease",
                  minHeight: 220,
                }}
                onClick={() => navigate("/")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                  e.currentTarget.style.transform = "translateY(-4px)"
                  e.currentTarget.style.boxShadow =
                    "0 24px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)"
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <div
                  className="flex-1 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                      opacity: 0.5,
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 18,
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "var(--font-geist)",
                        fontWeight: 500,
                      }}
                    >
                      What are we building today?
                    </span>
                    <span
                      style={{
                        width: 2,
                        height: 18,
                        background: "#38bdf8",
                        animation: "shango-breathe 1.5s ease-in-out infinite",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    Click to open the Builder
                  </span>
                </div>
              </div>
            )}
            {filtered.map((p) => (
              <ProjectCardGrid
                key={p.id}
                project={p}
                syncPending={pendingSyncProjectIds.has(p.id)}
                editingId={editingId}
                editingName={editingName}
                setEditingName={setEditingName}
                onRenameFinish={handleRenameFinish}
                onClick={() => {
                  if (editingId !== p.id) {
                    setActiveProject(p.id)
                    navigate(`/project/${p.id}`)
                  }
                }}
                onContextMenu={(e) => openContextMenu(e, p)}
                onDotsClick={(e, proj) => openContextMenu(e, proj)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div
              className="grid px-3 py-2 text-xs"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr auto",
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                letterSpacing: "0.06em",
              }}
            >
              <span>NAME</span>
              <span>STATUS</span>
              <span>LAST EDITED</span>
              <span></span>
            </div>
            {filtered.map((p) => (
              <ProjectCardList
                key={p.id}
                project={p}
                syncPending={pendingSyncProjectIds.has(p.id)}
                onClick={() => {
                  setActiveProject(p.id)
                  navigate(`/project/${p.id}`)
                }}
                onContextMenu={(e) => openContextMenu(e, p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Open",
              icon: <ZapIcon size={12} />,
              action: () => {
                setActiveProject(contextMenu.project.id)
                navigate(`/project/${contextMenu.project.id}`)
              },
            },
            {
              label: "Rename",
              icon: <XIcon size={12} />,
              action: () => handleRenameStart(contextMenu.project),
            },
            {
              label: "Duplicate",
              icon: <DuplicateIcon size={12} />,
              action: () => handleDuplicate(contextMenu.project),
            },
            {
              label: "Fork",
              icon: <ForkIcon size={12} />,
              action: () => handleFork(contextMenu.project),
            },
            { label: "", separator: true, action: () => {} },
            {
              label: "Archive",
              icon: <ArchiveIcon size={12} />,
              action: () => setArchiveConfirm(contextMenu.project),
            },
            {
              label: "Delete",
              icon: <XIcon size={12} />,
              action: () => setDeleteConfirm(contextMenu.project),
              destructive: true,
            },
          ]}
        />
      )}

      {/* Confirmations */}
      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title={`Delete "${deleteConfirm?.name}"?`}
        message="This cannot be undone. The project and all its versions will be permanently deleted."
        confirmLabel="Delete →"
        destructive
      />
      <ConfirmationModal
        open={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={() => archiveConfirm && handleArchive(archiveConfirm)}
        title={`Archive "${archiveConfirm?.name}"?`}
        message="You can restore it later from the Archived filter."
        confirmLabel="Archive"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "LIVE"
  return (
    <span
      className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md"
      style={{
        background: isLive ? "rgba(74,222,128,0.08)" : "var(--surface-4)",
        border: `1px solid ${isLive ? "rgba(74,222,128,0.15)" : "transparent"}`,
        color: isLive
          ? "#4ade80"
          : status === "ARCHIVED"
            ? "var(--text-disabled)"
            : "var(--text-muted)",
        fontFamily: "var(--font-mono-jetbrains)",
        fontSize: 9,
        letterSpacing: "0.07em",
      }}
    >
      {isLive && (
        <span
          className="rounded-full flex-shrink-0"
          style={{
            width: 5,
            height: 5,
            background: "#4ade80",
            boxShadow: "0 0 4px rgba(74,222,128,0.7)",
            display: "inline-block",
            animation: "live-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}
      {status}
    </span>
  )
}

function SyncPendingBadge() {
  return (
    <span
      title="Saved on this device and waiting to sync"
      style={{
        fontSize: 8,
        color: "#fcd34d",
        background: "rgba(252,211,77,0.08)",
        border: "1px solid rgba(252,211,77,0.2)",
        borderRadius: 4,
        padding: "2px 4px",
        fontFamily: "var(--font-mono-jetbrains)",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      SAVED LOCAL
    </span>
  )
}

// Subtle per-project accent derived from name hash
function getProjectAccent(name: string) {
  const ACCENTS = [
    "rgba(99,102,241,0.07)",
    "rgba(59,130,246,0.07)",
    "rgba(16,185,129,0.06)",
    "rgba(245,158,11,0.06)",
    "rgba(236,72,153,0.05)",
    "rgba(139,92,246,0.07)",
  ]
  let h = 0
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return ACCENTS[Math.abs(h) % ACCENTS.length]
}

// Wireframe SVG — 4 layout variants based on hash mod 4
function ThumbnailWireframe({ seed }: { seed: number }) {
  const v = seed % 4
  if (v === 0)
    return (
      <svg
        width={100}
        height={68}
        viewBox="0 0 120 80"
        fill="none"
        style={{ opacity: 0.11 }}
      >
        <rect x="4" y="4" width="112" height="14" rx="2" fill="white" />
        <rect x="4" y="24" width="36" height="52" rx="2" fill="white" />
        <rect x="46" y="24" width="70" height="24" rx="2" fill="white" />
        <rect x="46" y="52" width="33" height="24" rx="2" fill="white" />
        <rect x="83" y="52" width="33" height="24" rx="2" fill="white" />
      </svg>
    )
  if (v === 1)
    return (
      <svg
        width={100}
        height={68}
        viewBox="0 0 120 80"
        fill="none"
        style={{ opacity: 0.11 }}
      >
        <rect x="4" y="4" width="112" height="14" rx="2" fill="white" />
        <rect x="4" y="24" width="55" height="52" rx="2" fill="white" />
        <rect x="64" y="24" width="52" height="24" rx="2" fill="white" />
        <rect x="64" y="52" width="52" height="24" rx="2" fill="white" />
      </svg>
    )
  if (v === 2)
    return (
      <svg
        width={100}
        height={68}
        viewBox="0 0 120 80"
        fill="none"
        style={{ opacity: 0.11 }}
      >
        <rect x="4" y="4" width="112" height="14" rx="2" fill="white" />
        <rect x="4" y="24" width="36" height="24" rx="2" fill="white" />
        <rect x="44" y="24" width="36" height="24" rx="2" fill="white" />
        <rect x="84" y="24" width="32" height="24" rx="2" fill="white" />
        <rect x="4" y="52" width="112" height="24" rx="2" fill="white" />
      </svg>
    )
  // v === 3
  return (
    <svg
      width={100}
      height={68}
      viewBox="0 0 120 80"
      fill="none"
      style={{ opacity: 0.11 }}
    >
      <rect x="4" y="4" width="50" height="36" rx="2" fill="white" />
      <rect x="60" y="4" width="56" height="36" rx="2" fill="white" />
      <rect x="4" y="46" width="112" height="30" rx="2" fill="white" />
    </svg>
  )
}

function ProjectCardGrid({
  project,
  syncPending,
  editingId,
  editingName,
  setEditingName,
  onRenameFinish,
  onClick,
  onContextMenu,
  onDotsClick,
}: {
  project: Project
  syncPending: boolean
  editingId: string | null
  editingName: string
  setEditingName: (v: string) => void
  onRenameFinish: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDotsClick: (e: React.MouseEvent, p: Project) => void
}) {
  const isEditing = editingId === project.id
  const accent = getProjectAccent(project.name)
  let nameSeed = 0
  for (let i = 0; i < project.name.length; i++)
    nameSeed = (nameSeed * 31 + project.name.charCodeAt(i)) & 0xffffffff

  const isRecent =
    project.lastEdited.includes("now") ||
    project.lastEdited.includes("min") ||
    project.lastEdited.includes("hr")
  const entropy = Math.min(100, project.versions.length * 12)

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer group relative shango-card"
      style={
        {
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
          "--aura-color": accent,
          animation: isRecent
            ? "shango-aura-pulse 4s ease-in-out infinite"
            : undefined,
          transition:
            "transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.2s ease, background 0.2s ease",
        } as React.CSSProperties
      }
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
        e.currentTarget.style.background = "var(--surface-3)"
        e.currentTarget.style.transform = "translateY(-4px)"
        e.currentTarget.style.boxShadow =
          "0 24px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)"
        e.currentTarget.style.background = "var(--surface-2)"
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      {/* Thumbnail */}
      <div
        className="flex items-center justify-center relative overflow-hidden"
        style={{
          height: 148,
          background: `linear-gradient(135deg, var(--surface-0) 0%, ${accent} 100%)`,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="transform transition-transform duration-700 ease-out group-hover:scale-[1.15] group-hover:-translate-y-1">
          <ThumbnailWireframe seed={Math.abs(nameSeed)} />
        </div>
        {/* SHANGO watermark */}
        <div
          style={{ position: "absolute", bottom: 8, right: 10, opacity: 0.06 }}
        >
          <svg width={14} height={14} viewBox="0 0 40 40" fill="none">
            <path d="M24 4L8 22H20L16 36L32 18H20L24 4Z" fill="white" />
          </svg>
        </div>
        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "rgba(0,0,0,0.32)",
            backdropFilter: "blur(3px)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "var(--font-geist)",
              background: "white",
              color: "#0a0a0a",
              padding: "5px 14px",
              borderRadius: 8,
              letterSpacing: "0.02em",
            }}
          >
            Open →
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={onRenameFinish}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameFinish()
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="w-full text-sm outline-none rounded px-1 -mx-1"
                style={{
                  background: "var(--surface-4)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                  border: "1px solid var(--border-strong)",
                }}
              />
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.name}
              </p>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {project.lastEdited}
              </p>
              {project.versions.length > 0 && (
                <>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    ITER:{project.versions.length}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    ENTROPY:{entropy}%
                  </span>
                </>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <StatusBadge status={project.status} />
            {syncPending && <SyncPendingBadge />}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDotsClick(e, project)
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              <DotsIcon size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectCardList({
  project,
  syncPending,
  onClick,
  onContextMenu,
}: {
  project: Project
  syncPending: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="grid items-center px-3 py-3 rounded-lg cursor-pointer group"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr auto",
        border: "1px solid transparent",
        transition: "background 0.16s ease, border-color 0.16s ease",
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-2)"
        e.currentTarget.style.borderColor = "var(--border-default)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent"
        e.currentTarget.style.borderColor = "transparent"
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 30,
            height: 22,
            borderRadius: 6,
            background: "var(--surface-3)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <svg width={10} height={10} viewBox="0 0 40 40" fill="none">
            <path
              d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
              fill="white"
              opacity="0.35"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            minWidth: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project.name}
          </p>
          {project.versions.length > 0 && (
            <span
              style={{
                fontSize: 9,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              v{project.versions.length}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusBadge status={project.status} />
        {syncPending && <SyncPendingBadge />}
      </div>
      <span
        className="text-xs"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
        }}
      >
        {project.lastEdited}
      </span>
      <button
        className="p-1 rounded opacity-0 group-hover:opacity-100"
        style={{ color: "var(--text-muted)" }}
        onClick={(e) => {
          e.stopPropagation()
          onContextMenu(e)
        }}
      >
        <DotsIcon size={13} />
      </button>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            animationDelay: `${i * 0.06}s`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="shango-skeleton rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36 }}
            />
            <div className="flex flex-col gap-1.5 flex-1">
              <div
                className="shango-skeleton rounded"
                style={{ height: 10, width: "65%" }}
              />
              <div
                className="shango-skeleton rounded"
                style={{ height: 8, width: "40%" }}
              />
            </div>
            <div
              className="shango-skeleton rounded-full"
              style={{ height: 18, width: 40 }}
            />
          </div>
          <div
            className="shango-skeleton rounded"
            style={{ height: 8, width: "80%" }}
          />
          <div className="flex items-center justify-between mt-1">
            <div
              className="shango-skeleton rounded"
              style={{ height: 7, width: "45%" }}
            />
            <div
              className="shango-skeleton rounded"
              style={{ height: 7, width: 20 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const EMPTY_PROJECT_STARTERS = [
  "Hospital appointment system",
  "M-Pesa payment dashboard",
  "Fleet logistics tracker",
  "Community savings app",
  "e-Commerce store",
]

function EmptyState({
  onNew,
  hasSearch,
}: {
  onNew: () => void
  hasSearch: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      {/* Geometric illustration */}
      <div style={{ position: "relative", width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 96 96" fill="none">
          {/* Outer ring */}
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <circle
            cx="48"
            cy="48"
            r="32"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Grid lines */}
          <line
            x1="4"
            y1="48"
            x2="92"
            y2="48"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <line
            x1="48"
            y1="4"
            x2="48"
            y2="92"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          {/* Corner dots */}
          <circle cx="48" cy="4" r="2" fill="rgba(255,255,255,0.12)" />
          <circle cx="92" cy="48" r="2" fill="rgba(255,255,255,0.12)" />
          <circle cx="48" cy="92" r="2" fill="rgba(255,255,255,0.12)" />
          <circle cx="4" cy="48" r="2" fill="rgba(255,255,255,0.12)" />
          {/* SHANGO bolt */}
          <path
            d="M54 22L38 50H50L46 74L62 46H50L54 22Z"
            fill="rgba(255,255,255,0.18)"
          />
        </svg>
        {/* Soft glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            filter: "blur(16px)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div className="text-center flex flex-col gap-1.5">
        <p
          className="text-base font-medium"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            letterSpacing: "-0.01em",
          }}
        >
          {hasSearch
            ? "Nothing matches that search"
            : "Start your first project"}
        </p>
        <p
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.6,
          }}
        >
          {hasSearch
            ? "Try different words or clear the filter."
            : "Describe what you want to build — SHANGO handles the rest."}
        </p>
      </div>

      {!hasSearch && (
        <>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: "white",
              color: "#0a0a0a",
              fontFamily: "var(--font-geist)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <PlusIcon size={12} />
            New project
          </button>

          <div className="flex flex-col items-center gap-2 mt-1">
            <p
              style={{
                fontSize: 9,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.1em",
              }}
            >
              START WITH A SUGGESTED BRIEF
            </p>
            <div
              className="flex flex-wrap gap-2 justify-center"
              style={{ maxWidth: 420 }}
            >
              {EMPTY_PROJECT_STARTERS.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    navigate(`/?new=1&brief=${encodeURIComponent(t)}`)
                  }
                  className="px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    transition: "border-color 0.14s ease, color 0.14s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)"
                    e.currentTarget.style.color = "var(--text-secondary)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)"
                    e.currentTarget.style.color = "var(--text-muted)"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
