import { useEffect, useState } from "react"
import { XIcon, CopyIcon, CheckIcon } from "./icons"
import { useApp } from "../store/AppContext"
import { createShareLink } from "../lib/exportShare"
import { publishProject } from "../lib/community"

interface Props {
  open: boolean
  onClose: () => void
  projectName: string
  projectId: string
}

export default function ShareModal({
  open,
  onClose,
  projectName,
  projectId,
}: Props) {
  const { projects, addToast } = useApp()
  const [copied, setCopied] = useState(false)
  const previewReference = createShareLink(projectId)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const copy = () => {
    navigator.clipboard.writeText(previewReference).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast("Local preview reference copied", "success")
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-xl overflow-hidden w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-preview-title"
        style={{
          maxWidth: 480,
          background: "rgba(16,16,16,0.96)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          animation: "shango-modal-enter 0.2s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            id="share-preview-title"
            className="text-sm font-semibold"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Share preview — {projectName}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close share preview"
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon size={13} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div
            className="rounded-lg px-3 py-3 text-xs"
            style={{
              background: "rgba(250,204,21,0.06)",
              border: "1px solid rgba(250,204,21,0.14)",
              color: "rgba(253,230,138,0.78)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.55,
            }}
          >
            Local preview only. This reference does not publish the project,
            change visibility, create an embed, or send invitations. Those
            actions require a verified sharing service.
          </div>

          {/* Local reference */}
          <div>
            <label
              className="text-xs mb-2 block"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              LOCAL PREVIEW REFERENCE
            </label>
            <div className="flex gap-2 mb-4">
              <div
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewReference}
              </div>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: copied
                    ? "rgba(255,255,255,0.1)"
                    : "var(--surface-3)",
                  border: "1px solid var(--border-default)",
                  color: copied
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontFamily: "var(--font-geist)",
                  transition: "all 0.14s ease",
                  flexShrink: 0,
                }}
              >
                {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Explicit Community Publication */}
            <div
              className="pt-4 border-t"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <label
                className="text-xs mb-2 block"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                }}
              >
                SHANGO COMMUNITY
              </label>
              <button
                onClick={() => {
                  const currentProject = projects.find((p) => p.id === projectId) || {
                    id: projectId,
                    name: projectName,
                    description: "Published project",
                    status: "LIVE" as const,
                    lastEdited: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    starred: false,
                    blocks: [],
                    messages: [],
                    versions: [],
                  }
                  publishProject(currentProject, {
                    title: projectName,
                    description: "Published from Shango Builder",
                  })
                  addToast("Project published to Community", "success")
                  onClose()
                }}
                className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  color: "#0a0a0a",
                  fontFamily: "var(--font-geist)",
                  cursor: "pointer",
                }}
              >
                ✦ Publish to Community
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }`}</style>
      </div>
    </div>
  )
}
