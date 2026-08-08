import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  BackIcon,
  HistoryIcon,
  SettingsIcon,
  ShareIcon,
  DeployIcon,
} from "./icons"
import { statusToLine } from "../lib/activityStatus"
import type { Project } from "../lib/store"
import ShareModal from "./ShareModal"
import DeployModal from "./DeployModal"

interface Props {
  project: Project
  versionsCount: number
  onOpenHistory: () => void
  onOpenProjectSettings: () => void
  onOpenInspector?: () => void
  shareOpen?: boolean
  deployOpen?: boolean
  onShareOpen?: (v: boolean) => void
  onDeployOpen?: (v: boolean) => void
  activityStatus?: import("../lib/activityStatus").ActivityStatus
}

export default function TopBar({
  project,
  versionsCount,
  onOpenHistory,
  onOpenProjectSettings,
  onOpenInspector,
  shareOpen: shareOpenProp,
  deployOpen: deployOpenProp,
  onShareOpen,
  onDeployOpen,
  activityStatus,
}: Props) {
  const navigate = useNavigate()
  const [shareOpenLocal, setShareOpenLocal] = useState(false)
  const [deployOpenLocal, setDeployOpenLocal] = useState(false)
  const [versionFlash, setVersionFlash] = useState(false)
  const prevCount = useRef(versionsCount)

  const shareOpen = shareOpenProp !== undefined ? shareOpenProp : shareOpenLocal
  const deployOpen =
    deployOpenProp !== undefined ? deployOpenProp : deployOpenLocal
  const setShareOpen = onShareOpen ?? setShareOpenLocal
  const setDeployOpen = onDeployOpen ?? setDeployOpenLocal

  // Flash version badge when a new version is added
  useEffect(() => {
    if (versionsCount > prevCount.current) {
      setVersionFlash(true)
      const t = setTimeout(() => setVersionFlash(false), 900)
      prevCount.current = versionsCount
      return () => clearTimeout(t)
    }
    prevCount.current = versionsCount
  }, [versionsCount])

  return (
    <>
      <div
        className="flex items-center h-12 px-3 gap-2 flex-shrink-0 shango-workspace-header"
        style={{
          background: "#131314",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          zIndex: 5,
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate("/projects")}
          className="shango-btn-icon p-1.5 rounded-md flex-shrink-0"
          style={{ width: 30, height: 30 }}
          title="Back to projects ⌘H"
        >
          <BackIcon size={14} />
        </button>

        <div
          style={{
            width: 1,
            height: 16,
            background: "var(--border-default)",
            flexShrink: 0,
          }}
        />

        {/* Project identity */}
        <div className="flex items-center gap-2 flex-1 overflow-hidden min-w-0">
          <svg
            width={13}
            height={13}
            viewBox="0 0 40 40"
            fill="none"
            style={{ flexShrink: 0, opacity: 0.4 }}
          >
            <path d="M24 4L8 22H20L16 36L32 18H20L24 4Z" fill="white" />
          </svg>
          <span
            className="text-sm font-medium truncate"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              maxWidth: 280,
            }}
          >
            {project.name}
          </span>
          {/* Shared activity status (optional) */}
          {activityStatus && (
            <div style={{ marginLeft: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.64)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {statusToLine(activityStatus).title}
              </div>
            </div>
          )}
          <LiveStatusChip status={project.status} />
          <button
            onClick={onOpenProjectSettings}
            className="p-1 rounded-md flex-shrink-0 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)"
              e.currentTarget.style.background = "var(--surface-3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)"
              e.currentTarget.style.background = "transparent"
            }}
            title="Project settings"
          >
            <SettingsIcon size={12} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Inspector */}
          {onOpenInspector && (
            <button
              onClick={onOpenInspector}
              className="shango-btn-icon p-1.5 rounded-md"
              style={{ width: 30, height: 30 }}
              title="Inspector"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="11"
                  height="11"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path d="M1 4.5h11" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M4.5 4.5v7.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
          )}

          {/* Version history */}
          <button
            onClick={onOpenHistory}
            className="shango-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
            style={{
              background: versionFlash
                ? "rgba(255,255,255,0.1)"
                : "var(--surface-3)",
              color: versionFlash
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              border: `1px solid ${
                versionFlash ? "rgba(255,255,255,0.2)" : "var(--border-default)"
              }`,
              fontFamily: "var(--font-geist)",
              transition:
                "background 0.3s ease, color 0.3s ease, border-color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (!versionFlash)
                e.currentTarget.style.color = "var(--text-primary)"
            }}
            onMouseLeave={(e) => {
              if (!versionFlash)
                e.currentTarget.style.color = "var(--text-secondary)"
            }}
            title="Version history ⌘Y"
          >
            <HistoryIcon size={12} />v{versionsCount}
          </button>

          {/* Share */}
          <button
            onClick={() => setShareOpen(true)}
            className="shango-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              fontFamily: "var(--font-geist)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            title="Share ⌘S"
          >
            <ShareIcon size={12} />
            Share
          </button>

          {/* Deploy */}
          <button
            onClick={() => setDeployOpen(true)}
            className="shango-btn-primary shango-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ fontFamily: "var(--font-geist)" }}
            title="Deploy ⌘D"
          >
            <DeployIcon size={12} />
            Deploy
          </button>
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectName={project.name}
        projectId={project.id}
      />
      <DeployModal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        projectName={project.name}
        projectId={project.id}
        currentVersion={project.versions.length || 1}
      />
    </>
  )
}

function LiveStatusChip({ status }: { status: string }) {
  const isLive = status === "LIVE"
  const isDraft = status === "DRAFT"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1.5px 6px",
        borderRadius: 4,
        background: isLive ? "rgba(74,222,128,0.07)" : "transparent",
        border: `1px solid ${
          isLive ? "rgba(74,222,128,0.14)" : "var(--border-subtle)"
        }`,
        fontFamily: "var(--font-mono-jetbrains)",
        fontSize: 8.5,
        letterSpacing: "0.07em",
        color: isLive
          ? "#4ade80"
          : isDraft
            ? "var(--text-muted)"
            : "var(--text-disabled)",
        flexShrink: 0,
      }}
    >
      {isLive && (
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 4px rgba(74,222,128,0.7)",
            animation: "live-pulse 2.4s ease-in-out infinite",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {status}
    </span>
  )
}
