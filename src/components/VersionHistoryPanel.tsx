import { useState } from "react"
import { XIcon, RestoreIcon, ForkIcon } from "./icons"
import type { Version } from "../lib/store"
import { useApp } from "../store/AppContext"
import { restoreVersion, forkProjectFromVersion } from "../lib/versioning"
import { useNavigate } from "react-router-dom"
import ConfirmationModal from "./ConfirmationModal"

interface Props {
  open: boolean
  onClose: () => void
  versions: Version[]
  onRestore?: (versionId: string) => void
  onFork?: (versionId: string) => void
}

export default function VersionHistoryPanel({
  open,
  onClose,
  versions,
  onRestore,
  onFork,
}: Props) {
  const { addToast, setProjects, projects, setActiveProject } = useApp()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restoreCandidate, setRestoreCandidate] = useState<Version | null>(null)

  const confirmRestore = () => {
    if (!restoreCandidate) return
    if (onRestore) {
      onRestore(restoreCandidate.id)
      setSelectedId(null)
      setRestoreCandidate(null)
      return
    }
    const currentProject = projects.find((project) =>
      project.versions.some((version) => version.id === restoreCandidate.id),
    )
    if (!currentProject) return
    const restored = restoreVersion(currentProject, restoreCandidate.id)
    if (!restored) return
    setProjects((prev) =>
      prev.map((project) =>
        project.id === currentProject.id ? restored : project,
      ),
    )
    setActiveProject(currentProject.id)
    addToast(`Restored to v${restoreCandidate.number}`, "success")
    setSelectedId(null)
    setRestoreCandidate(null)
  }

  if (!open) return null

  const sorted = [...versions].reverse()
  const totalVersions = versions.length
  const selectedVersion = versions.find((v) => v.id === selectedId) ?? null
  const canRestore = selectedVersion && !selectedVersion.isCurrent

  return (
    <div
      className="absolute top-0 right-0 h-full z-30 flex flex-col"
      style={{
        width: 296,
        background: "rgba(12,12,12,0.96)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        animation: "slideInFromRight 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <ConfirmationModal
        open={Boolean(restoreCandidate)}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={confirmRestore}
        title={`Restore v${restoreCandidate?.number ?? ""}?`}
        message="This replaces the current workspace with this saved version. Version history remains available so you can recover another saved snapshot later."
        confirmLabel="Restore version"
        destructive
      />
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 52, borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-sm font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Version History
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.06em",
            }}
          >
            {totalVersions} {totalVersions === 1 ? "version" : "versions"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors"
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

      {/* Timeline */}
      <div
        className="flex-1 overflow-y-auto scroll-hidden"
        style={{ padding: "20px 0" }}
      >
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 40 40" fill="none">
                <path
                  d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
                  fill="white"
                  opacity="0.2"
                />
              </svg>
            </div>
            <div className="text-center">
              <p
                className="text-sm"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                No versions yet
              </p>
              <p
                className="text-xs mt-1"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Each build you submit becomes a saved milestone.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative px-5">
            {/* Vertical rail */}
            <div
              className="absolute top-4 bottom-4"
              style={{
                left: 30,
                width: 1,
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)",
              }}
            />

            <div className="flex flex-col gap-0">
              {sorted.map((v, idx) => (
                <VersionEntry
                  key={v.id}
                  version={v}
                  isFirst={idx === 0}
                  isSelected={selectedId === v.id}
                  onSelect={() =>
                    setSelectedId((prev) => (prev === v.id ? null : v.id))
                  }
                  onRestore={() => setRestoreCandidate(v)}
                  onFork={() => {
                    if (onFork) {
                      onFork(v.id)
                      setSelectedId(null)
                      return
                    }
                    const currentProject = projects.find((project) =>
                      project.versions.some((version) => version.id === v.id),
                    )
                    if (!currentProject) return
                    const forked = forkProjectFromVersion(currentProject, v.id)
                    if (!forked) return
                    setProjects((prev) => [forked, ...prev])
                    setActiveProject(forked.id)
                    addToast(`Forked from v${v.number}`, "default")
                    navigate(`/project/${forked.id}`)
                    setSelectedId(null)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky restore CTA — visible when a non-current version is selected */}
      {canRestore && (
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(10,10,10,0.8)",
            animation: "fadeIn 0.16s ease",
          }}
        >
          <p
            className="text-xs mb-2.5"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Viewing{" "}
            <span
              style={{
                fontFamily: "var(--font-mono-jetbrains)",
                color: "var(--text-secondary)",
              }}
            >
              v{selectedVersion!.number}
            </span>{" "}
            — {selectedVersion!.label}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setRestoreCandidate(selectedVersion!)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(255,255,255,0.9)",
                color: "#0a0a0a",
                fontFamily: "var(--font-geist)",
                border: "none",
                cursor: "pointer",
                transition: "background 0.14s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.9)")
              }
            >
              <RestoreIcon size={11} />
              Restore v{selectedVersion!.number}
            </button>
            <button
              onClick={() => {
                if (onFork) {
                  onFork(selectedVersion!.id)
                  setSelectedId(null)
                  return
                }
                const currentProject = projects.find((project) =>
                  project.versions.some(
                    (version) => version.id === selectedVersion!.id,
                  ),
                )
                if (!currentProject) return
                const forked = forkProjectFromVersion(
                  currentProject,
                  selectedVersion!.id,
                )
                if (!forked) return
                setProjects((prev) => [forked, ...prev])
                setActiveProject(forked.id)
                addToast(`Forked from v${selectedVersion!.number}`, "default")
                navigate(`/project/${forked.id}`)
                setSelectedId(null)
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{
                background: "transparent",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                cursor: "pointer",
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
              <ForkIcon size={11} />
              Fork
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

interface EntryProps {
  version: Version
  isFirst: boolean
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
  onFork: () => void
}

function VersionEntry({
  version: v,
  isFirst,
  isSelected,
  onSelect,
  onRestore,
  onFork,
}: EntryProps) {
  return (
    <div
      className="relative flex gap-4 pb-7 group cursor-pointer rounded-xl"
      onClick={onSelect}
      style={{
        padding: "8px 4px 28px",
        background: isSelected ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.14s ease",
        marginLeft: -4,
        marginRight: -4,
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "rgba(255,255,255,0.02)"
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent"
      }}
    >
      {/* Node */}
      <div
        className="relative z-10 flex-shrink-0 flex flex-col items-center"
        style={{ width: 20 }}
      >
        {v.isCurrent ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "white",
              boxShadow:
                "0 0 0 3px rgba(255,255,255,0.1), 0 0 12px rgba(255,255,255,0.08)",
              marginTop: 2,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#0a0a0a" }}
            />
          </div>
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--text-muted)", opacity: 0.5 }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 2 }}>
        {/* Version badge + label */}
        <div className="flex items-start gap-2 mb-1">
          <span
            className="text-xs font-medium flex-shrink-0"
            style={{
              color: v.isCurrent ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 10,
              letterSpacing: "0.04em",
            }}
          >
            v{v.number}
          </span>
          {v.isCurrent && isFirst && (
            <span
              className="text-xs px-1.5 py-px rounded flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 8,
                letterSpacing: "0.1em",
              }}
            >
              CURRENT
            </span>
          )}
        </div>

        <p
          className="text-xs font-medium leading-snug mb-1"
          style={{
            color: v.isCurrent
              ? "var(--text-primary)"
              : "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {v.label}
        </p>

        {v.prompt && (
          <p
            className="text-xs leading-relaxed mb-1.5 line-clamp-2"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              fontStyle: "italic",
            }}
          >
            "{v.prompt.slice(0, 80)}
            {v.prompt.length > 80 ? "…" : ""}"
          </p>
        )}

        <p
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {v.timestamp}
        </p>

        {/* Hover actions */}
        <div
          className="flex items-center gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transitionDuration: "0.18s" }}
        >
          {!v.isCurrent && (
            <button
              onClick={onRestore}
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
              <RestoreIcon size={10} />
              Restore
            </button>
          )}
          <button
            onClick={onFork}
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
            <ForkIcon size={10} />
            Fork
          </button>
        </div>
      </div>
    </div>
  )
}
