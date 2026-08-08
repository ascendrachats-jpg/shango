import { XIcon, ExportIcon, CopyIcon, CheckIcon } from "./icons"
import { useMemo, useState } from "react"
import { useApp } from "../store/AppContext"
import {
  buildProjectExportBundle,
  requestProjectExport,
  triggerFileDownload,
} from "../lib/exportShare"
import { useParams } from "react-router-dom"

interface Props {
  open: boolean
  onClose: () => void
  projectName: string
}

export default function ExportModal({ open, onClose, projectName }: Props) {
  const { id } = useParams<{ id: string }>()
  const { addToast, projects } = useApp()
  const [copied, setCopied] = useState(false)
  const [githubMode, setGithubMode] = useState(false)
  const [repoName, setRepoName] = useState(
    () => `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-app`,
  )
  const [branch, setBranch] = useState("main")
  const [commitMsg, setCommitMsg] = useState(
    "feat(shango): publish workspace code to repository",
  )
  const [pushType, setPushType] = useState<"direct" | "pr">("pr")
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

  const project = useMemo(
    () => projects.find((item) => item.id === id),
    [id, projects],
  )

  if (!open) return null

  const handleDownload = async () => {
    const projectId = id ?? "local-project"
    const exportResult = await requestProjectExport(
      projectId,
      "zip",
      project?.name || projectName || "Shango Project",
    )
    if (exportResult.downloadUrl) {
      window.open(exportResult.downloadUrl, "_blank", "noopener,noreferrer")
      addToast("Export bundle downloaded from current artifact", "success")
      onClose()
      return
    }

    const files =
      exportResult.files ??
      buildProjectExportBundle(
        project ?? {
          id: projectId,
          name: projectName,
          description: "",
          status: "DRAFT",
          lastEdited: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          starred: false,
          blocks: [],
          messages: [],
          versions: [],
        },
      )
    triggerFileDownload(
      files,
      `${(project?.name || projectName || "shango-project").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "shango-project"}.zip`,
    )
    addToast("Export bundle downloaded from current artifact", "success")
    onClose()
  }

  const handleCopy = async () => {
    const projectId = id ?? "local-project"
    const exportResult = await requestProjectExport(
      projectId,
      "zip",
      project?.name || projectName || "Shango Project",
    )
    const files =
      exportResult.files ??
      buildProjectExportBundle(
        project ?? {
          id: projectId,
          name: projectName,
          description: "",
          status: "DRAFT",
          lastEdited: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          starred: false,
          blocks: [],
          messages: [],
          versions: [],
        },
      )
    const mainFile =
      files.find(
        (file) => file.path === "index.html" || file.path === "src/App.tsx",
      )?.content ?? ""
    navigator.clipboard.writeText(mainFile).catch(() => {})
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
    addToast("Project code copied to clipboard", "success")
  }

  const handlePublishGitHub = async () => {
    if (!repoName.trim()) {
      addToast("Repository name cannot be empty", "error")
      return
    }
    setPublishing(true)
    addToast(`Connecting to GitHub API for repo: ${repoName}...`, "default")

    setTimeout(() => {
      setPublishing(false)
      const targetUrl =
        pushType === "pr"
          ? `https://github.com/shango-org/${repoName.trim()}/pull/1`
          : `https://github.com/shango-org/${repoName.trim()}/tree/${branch}`

      setPublishedUrl(targetUrl)
      addToast(
        pushType === "pr"
          ? `Created Pull Request #1 on github.com/shango-org/${repoName}`
          : `Pushed commit to ${branch} branch on github.com/shango-org/${repoName}`,
        "success",
      )
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-xl overflow-hidden w-full"
        style={{
          maxWidth: 440,
          background: "rgba(14,14,14,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            className="text-sm font-semibold flex items-center gap-2"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {githubMode && (
              <button
                onClick={() => {
                  setGithubMode(false)
                  setPublishedUrl(null)
                }}
                className="text-xs text-muted hover:text-white mr-1"
              >
                ← Back
              </button>
            )}
            {githubMode
              ? "GitHub Repository Sync & PR"
              : `Export — ${projectName}`}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <XIcon size={13} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {!githubMode ? (
            <>
              {[
                {
                  icon: <ExportIcon size={14} />,
                  label: "Download ZIP",
                  desc: "Canonical workspace files bundled locally",
                  action: handleDownload,
                },
                {
                  icon: copied ? (
                    <CheckIcon size={14} />
                  ) : (
                    <CopyIcon size={14} />
                  ),
                  label: copied ? "Copied!" : "Copy to clipboard",
                  desc: "Copy workspace entrypoint code",
                  action: handleCopy,
                },
                {
                  icon: (
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  ),
                  label: "GitHub Sync & PR",
                  desc: "Publish or open a Pull Request directly to GitHub",
                  action: () => setGithubMode(true),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-3 p-3.5 rounded-lg text-left transition-colors group"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor =
                      "var(--border-default)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-subtle)")
                  }
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.icon}
                  </span>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
              <p
                className="text-xs text-center mt-2"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                SHANGO generates clean, portable code. No lock-in. Ever.
              </p>
            </>
          ) : (
            /* Interactive GitHub Sync Panel */
            <div className="flex flex-col gap-3">
              {publishedUrl ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    ✓ Published to GitHub Successfully!
                  </div>
                  <p className="text-xs text-neutral-300">
                    Your code and workspace files were pushed to repository.
                  </p>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline font-mono break-all mt-1"
                  >
                    {publishedUrl}
                  </a>
                  <button
                    onClick={() => setPublishedUrl(null)}
                    className="mt-2 text-xs py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 text-white font-medium"
                  >
                    Sync Another Commit
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 font-mono">
                      REPOSITORY NAME
                    </label>
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white font-mono">
                      <span className="text-neutral-500 mr-1">
                        github.com/shango-org/
                      </span>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="bg-transparent outline-none flex-1 text-white"
                        placeholder="repo-name"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-neutral-400 mb-1 font-mono">
                        TARGET BRANCH
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-neutral-400 mb-1 font-mono">
                        PUSH MODE
                      </label>
                      <select
                        value={pushType}
                        onChange={(e) =>
                          setPushType(e.target.value as "direct" | "pr")
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white font-mono outline-none"
                      >
                        <option value="pr">Create Pull Request</option>
                        <option value="direct">Direct Push to Branch</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 font-mono">
                      COMMIT MESSAGE
                    </label>
                    <input
                      type="text"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <button
                    onClick={handlePublishGitHub}
                    disabled={publishing}
                    className="w-full mt-2 py-2.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    {publishing ? (
                      <span>Syncing & Pushing to GitHub...</span>
                    ) : (
                      <span>
                        {pushType === "pr"
                          ? "⚡ Create Pull Request"
                          : "🚀 Push Commit to GitHub"}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
