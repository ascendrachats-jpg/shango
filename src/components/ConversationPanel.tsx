import _React, { useState, useRef, useEffect, useMemo } from "react"
import type {
  ConversationBlock as ConversationBlockType,
  ProjectVersion,
  GenerationProvenance,
} from "../lib/store"
import { useApp } from "../store/AppContext"
import ConfirmationModal from "./ConfirmationModal"
import type { ActivityStatus } from "../lib/activityStatus"
import { statusToLine } from "../lib/activityStatus"
import { ConversationBlock } from "./conversation/ConversationBlock"

interface Props {
  blocks: ConversationBlockType[]
  versions: ProjectVersion[]
  isGenerating: boolean
  activityStatus?: ActivityStatus
  activeTab: "workspace" | "history" | "timeline" | "chat"
  setActiveTab: (t: "workspace" | "history") => void
  projectName?: string
  failedPrompt?: string | null
  onRetry?: () => void
  onRestore?: (versionId: string) => void
  onFork?: (versionId: string) => void
  lastGeneration?: GenerationProvenance
  onRevertOperation?: (path: string) => void
  onSelectFile?: (filePath: string) => void
}

/**
 * Minimalist, monochrome conversation timeline.
 * Driven entirely by real blocks and real activity status.
 */
export default function ConversationPanel({
  blocks,
  versions,
  isGenerating,
  activityStatus,
  activeTab,
  setActiveTab,
  projectName = "Untitled App",
  failedPrompt,
  onRetry,
  onRestore,
  onFork,
}: Props) {
  const { addToast: _addToast } = useApp()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [restoreModalVersion, setRestoreModalVersion] = useState<string | null>(
    null,
  )

  const isWorkspaceTab =
    activeTab === "workspace" ||
    activeTab === "timeline" ||
    activeTab === "chat"

  // Auto-scroll to bottom on new blocks or generation updates
  useEffect(() => {
    if (isWorkspaceTab) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [blocks, isWorkspaceTab, isGenerating])

  const statusInfo = useMemo(() => {
    if (!activityStatus) return null
    return statusToLine(activityStatus)
  }, [activityStatus])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0c0c0e",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Top Tab Strip ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 40,
          background: "rgba(255, 255, 255, 0.015)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-geist)",
              cursor: "pointer",
              border: "none",
              background: isWorkspaceTab
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              color: isWorkspaceTab
                ? "#ffffff"
                : "rgba(255, 255, 255, 0.45)",
              transition: "all 0.15s ease",
            }}
          >
            Workspace
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-geist)",
              cursor: "pointer",
              border: "none",
              background:
                activeTab === "history"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "transparent",
              color:
                activeTab === "history"
                  ? "#ffffff"
                  : "rgba(255, 255, 255, 0.45)",
              transition: "all 0.15s ease",
            }}
          >
            <span>History</span>
            {versions.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "0 5px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {versions.length}
              </span>
            )}
          </button>
        </div>

        {/* Live generation status pill — monochrome, factual */}
        {isGenerating && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.6)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {statusInfo?.title || "Working"}
            </span>
          </div>
        )}
      </div>

      {/* ── Main View Content ── */}
      {isWorkspaceTab ? (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 14px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {blocks.length === 0 && (
            <div
              style={{
                margin: "auto 0",
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 16,
                }}
              >
                ◆
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: 4,
                }}
              >
                {projectName === "Untitled App"
                  ? "What would you like to build?"
                  : `Continue building ${projectName}`}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "rgba(255, 255, 255, 0.4)",
                  maxWidth: 280,
                  margin: "0 auto",
                }}
              >
                Type an instruction below to start building your product.
              </div>
            </div>
          )}

          {/* Blocks Stream */}
          {blocks.map((block) => (
            <ConversationBlock key={block.id} block={block} />
          ))}

          {/* Failed Prompt / Retry Banner */}
          {failedPrompt && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.6)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Generation was interrupted.
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      ) : (
        /* ── History Tab ── */
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {versions.length === 0 ? (
            <div
              style={{
                margin: "auto 0",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 12,
                fontFamily: "var(--font-geist)",
              }}
            >
              No checkpoints created yet.
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id || `ver-${idx}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-geist)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "rgba(255, 255, 255, 0.88)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ver.label || `Checkpoint ${versions.length - idx}`}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255, 255, 255, 0.4)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    {ver.timestamp || "Recent"} · {ver.files?.length || 0} files
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                >
                  {onRestore && (
                    <button
                      type="button"
                      onClick={() => setRestoreModalVersion(ver.id)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "rgba(255, 255, 255, 0.85)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      Restore
                    </button>
                  )}
                  {onFork && (
                    <button
                      type="button"
                      onClick={() => onFork(ver.id)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      Fork
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal for Restore */}
      {restoreModalVersion && (
        <ConfirmationModal
          open={!!restoreModalVersion}
          title="Restore Checkpoint"
          message="Restoring this checkpoint will roll back the workspace files to this point. Any uncommitted edits will be replaced."
          confirmLabel="Restore Checkpoint"
          onConfirm={() => {
            if (restoreModalVersion && onRestore) {
              onRestore(restoreModalVersion)
            }
            setRestoreModalVersion(null)
          }}
          onClose={() => setRestoreModalVersion(null)}
        />
      )}
    </div>
  )
}
