import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import type { Notification } from "../store/AppContext"
import ConversationPanel from "../components/ConversationPanel"
import ShareModal from "../components/ShareModal"
import DeployModal from "../components/DeployModal"
import ExportModal from "../components/ExportModal"
import PreviewPanel from "../components/PreviewPanel"
import VersionHistoryPanel from "../components/VersionHistoryPanel"
import ProjectSettingsSheet from "../components/ProjectSettingsSheet"
import {
  SettingsIcon,
  ShareIcon,
  DeployIcon,
} from "../components/icons"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import ConnectorsDrawer from "../components/ConnectorsDrawer"
import ZenCommandPalette from "../components/ZenCommandPalette"
import ProjectMemoryScreen from "../components/ProjectMemoryScreen"
import ActivityStatusLine from "../components/ActivityStatusLine"
import ConfirmationModal from "../components/ConfirmationModal"
import { duplicateProject, ensureProjectInList, generateId } from "../lib/store"
import {
  generateProjectResponse,
  resolveGenerationPreferences,
  type GenerationResult,
} from "../lib/generation"
import { resolveModelId, DEFAULT_MODEL_ID } from "../lib/models"
import {
  isProjectSyncPending,
  mergePersistedProjects,
  PROJECT_SYNC_QUEUE_EVENT,
  syncProjectToBackend,
} from "../lib/persistence"
import {
  applyGenerationResultToProject,
  applyVersionAction,
  findSensitiveWorkspaceChanges,
  mergeVersionActionProject,
  restoreVersion,
  forkProjectFromVersion,
  revertFileOperations,
} from "../lib/versioning"
import { ALL_SKILLS } from "../lib/skills"
import type { StreamedFileSnapshot } from "../lib/preview"
import type { Project } from "../lib/store"
import { deriveComposerValue } from "../lib/builderComposer"
import type { ActivityStatus } from "../lib/activityStatus"
import { initialActivityStatus, pipelineStatusToState } from "../lib/activityStatus"
import {
  createUserDialogueBlock,
  createShangoDialogueBlock,
  createExecutionBlock,
  createResultBlock,
  createErrorBlock,
  type ConversationBlock,
  type ExecutionBlock as ExecutionBlockType,
} from "../lib/conversation"
import {
  getRetryPromptFromBlocks,
  getLastUserPromptFromBlocks,
} from "../lib/conversationHelpers"
import { buildGenerationReview } from "../lib/generationReview"
import { usageFraction } from "../lib/usageMeter"
import { getActiveMaturityLabel } from "../lib/workspaceEvolution"
import { requestProjectExport } from "../lib/exportShare"
import { ForgeInput, type OmniboxContext } from "../components/ForgeInput"

// ── Types ────────────────────────────────────────────────────────────────────

export type Viewport = "desktop" | "tablet" | "mobile"

export interface ConsoleEntry {
  ts: string
  level: "info" | "success" | "warn" | "error"
  msg: string
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function buildConsoleLogs(projectName: string): ConsoleEntry[] {
  const now = () =>
    new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  return [
    {
      ts: now(),
      level: "info",
      msg: `▶ Preparing workspace preview — ${projectName}`,
    },
    { ts: now(), level: "info", msg: "  Reading the current workspace files" },
    { ts: now(), level: "info", msg: "  Refreshing the derived local preview" },
    {
      ts: now(),
      level: "info",
      msg: "  No production build or provider deployment is running",
    },
    {
      ts: now(),
      level: "success",
      msg: "✓ Workspace preview ready for review",
    },
  ]
}

interface PendingGenerationReview {
  project: Project
  prompt: string
  result: GenerationResult
  completedAt: string
  addVersion: boolean
  mode: "plan" | "build"
  pendingAssistantId: string
  executionBlockId: string
}

function unwrapProjectResponse(
  payload: Project | { project?: Project },
): Project | null {
  return "id" in payload ? payload : (payload.project ?? null)
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Main component ─────────────────────────────────────────────────────────────

export default function BuilderScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    projects,
    setProjects,
    setActiveProject,
    addToast,
    currentUser,
    notifications,
    enabledSkills,
  } = useApp()

  const project = projects.find((p) => p.id === id)
  const [isProjectLoading, setIsProjectLoading] = useState(false)
  const [projectLoadTried, setProjectLoadTried] = useState(false)
  const [syncPending, setSyncPending] = useState(() =>
    isProjectSyncPending(project?.id),
  )

  // ── Panel state ──
  const [conversationCollapsed, setConversationCollapsed] = useState(false)
  const [_memoryCollapsed, _setMemoryCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<"workspace" | "history">(
    "workspace",
  )
  const [zenPaletteOpen, setZenPaletteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deployOpen, setDeployOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set())
  const [connectorsOpen, setConnectorsOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(380)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // ── Stage state (lifted from PreviewPanel) ──
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [codeView, setCodeView] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [activeFile, setActiveFile] = useState("src/App.tsx")
  const [previewKey, setPreviewKey] = useState(0)
  const [streamedFiles, setStreamedFiles] = useState<StreamedFileSnapshot[]>([])
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [buildSuccess, setBuildSuccess] = useState(false)
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    initialActivityStatus,
  )
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([])
  const prevVersionCount = useRef(project?.versions.length ?? 0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Forge state ──
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(() =>
    Boolean(project?.generatingAt),
  )
  const [retryPrompt, setRetryPrompt] = useState<string | null>(() =>
    getRetryPromptFromBlocks(project?.blocks ?? []),
  )
  const [pendingGenerationReview, setPendingGenerationReview] =
    useState<PendingGenerationReview | null>(null)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const projectRef = useRef(project)

  useEffect(() => {
    projectRef.current = project ?? undefined
  }, [project?.id, project?.blocks, project?.versions, project?.artifact])

  useEffect(() => {
    if (!project?.generatingAt)
      setRetryPrompt(getRetryPromptFromBlocks(project?.blocks ?? []))
  }, [project?.id, project?.blocks, project?.generatingAt])

  useEffect(() => {
    const refreshSyncStatus = () =>
      setSyncPending(isProjectSyncPending(project?.id))
    refreshSyncStatus()
    window.addEventListener(PROJECT_SYNC_QUEUE_EVENT, refreshSyncStatus)
    window.addEventListener("online", refreshSyncStatus)
    return () => {
      window.removeEventListener(PROJECT_SYNC_QUEUE_EVENT, refreshSyncStatus)
      window.removeEventListener("online", refreshSyncStatus)
    }
  }, [project?.id])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (conversationCollapsed) {
          setZenPaletteOpen((prev) => !prev)
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [conversationCollapsed])

  // A project started from the omnibox begins generation before this screen mounts.
  // Mirror that in-flight state so the builder immediately explains what is happening.
  useEffect(() => {
    if (project?.generatingAt) {
      setIsGenerating(true)
      setActivityStatus({ status: "understanding" })
      return
    }

    if (!abortControllerRef.current) {
      setIsGenerating(false)
    }
  }, [project?.id, project?.generatingAt])

  useEffect(() => {
    setInput((prev) => deriveComposerValue(project, prev))
  }, [project?.id, project?.blocks, project?.initialPrompt])

  // Prefer explicit state transitions driven by real signals (generation/rebuild events)
  // - buildSuccess: brief ready state then back to idle
  // - isRebuilding: show building while local version rebuild is in progress
  // - isGenerating: mark submitted unless more specific events (deltas/files) update the stage
  useEffect(() => {
    if (isGenerating && activityStatus.status === "idle") {
      setActivityStatus({ status: "understanding" })
    }
  }, [isGenerating, activityStatus.status])

  // Redirect if project not found
  useEffect(() => {
    if (!id) return
    if (project) {
      setActiveProject(project.id)
      return
    }
    if (projectLoadTried || isProjectLoading) return

    setIsProjectLoading(true)
    fetch(`/api/projects/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Project load failed ${res.status}`)
        const payload = (await res.json()) as Project | { project?: Project }
        const projectData = unwrapProjectResponse(payload)
        if (!projectData) throw new Error("Project response was invalid")
        setProjects((prev) => mergePersistedProjects(prev, [projectData]))
        setProjects((prev) => ensureProjectInList(prev, projectData))
        setActiveProject(projectData.id)
      })
      .catch(() => {
        // project not found remotely or inability to load should fall through to redirect
      })
      .finally(() => {
        setIsProjectLoading(false)
        setProjectLoadTried(true)
      })
  }, [
    id,
    project,
    projectLoadTried,
    isProjectLoading,
    setProjects,
    setActiveProject,
  ])

  useEffect(() => {
    if (project || isProjectLoading) return
    if (!id || projectLoadTried) {
      navigate("/projects")
      return
    }
  }, [project?.id, id, isProjectLoading, projectLoadTried, navigate])

  // Build trigger — watches version count
  useEffect(() => {
    if (!project) return
    if (project.versions.length > prevVersionCount.current) {
      prevVersionCount.current = project.versions.length
      setPreviewKey((k) => k + 1)
      setBuildSuccess(true)
      const t = setTimeout(() => setBuildSuccess(false), 1500)
      return () => clearTimeout(t)
    }
  }, [project?.versions.length])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === "p") {
        e.preventDefault()
        setConversationCollapsed((v) => !v)
      }
      if (mod && e.key === "y") {
        e.preventDefault()
        setHistoryOpen((v) => !v)
      }
      if (mod && e.key === "d") {
        e.preventDefault()
        setDeployOpen(true)
      }
      if (mod && e.key === "s") {
        e.preventDefault()
        setShareOpen(true)
      }
      if (mod && e.key === "h") {
        e.preventDefault()
        navigate("/")
      }
      if (mod && e.key === "n") {
        e.preventDefault()
        navigate("/?new=1")
      }
      if (mod && e.key === "e") {
        e.preventDefault()
        setCodeView((v) => !v)
      }
      if (mod && e.key === ",") {
        e.preventDefault()
        setProjectSettingsOpen(true)
      }
      if (mod && e.key === "1") {
        e.preventDefault()
        setViewport("desktop")
      }
      if (mod && e.key === "2") {
        e.preventDefault()
        setViewport("tablet")
      }
      if (mod && e.key === "3") {
        e.preventDefault()
        setViewport("mobile")
      }
      if (e.key === "Escape") {
        setFullscreen(false)
      }
      if (mod && e.key === "r") {
        e.preventDefault()
        if (!isGenerating) {
          const lastUserPrompt = getLastUserPromptFromBlocks(
            projectRef.current?.blocks ?? [],
          )
          if (lastUserPrompt) {
            setIsGenerating(true)
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
            aiTimerRef.current = setTimeout(() => {
              void handleGenerationResponse(lastUserPrompt, {
                addVersion: false,
              })
            }, 0)
          }
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isGenerating, project?.blocks])

  // Resize handle
  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      setPanelWidth(
        Math.max(240, Math.min(560, dragStartWidth.current + delta)),
      )
    }
    const handleUp = () => setIsDragging(false)
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
  }, [isDragging])

  // Send handler: append the user message as a dialogue block to the
  // conversation. Version creation happens after successful generation.
  const handleSend = (msg: string) => {
    const currentProject = projectRef.current
    if (!currentProject || !id) return
    const now = new Date().toISOString()
    const userBlock = createUserDialogueBlock(msg)
    // Stamp generatingAt so mergePersistedProjects protects this project from
    // remote overwrites while generation is in flight.
    const updatedProject: Project = {
      ...currentProject,
      generatingAt: now,
      blocks: [...(currentProject.blocks ?? []), userBlock],
      lastEdited: now,
      updatedAt: now,
    }
    projectRef.current = updatedProject
    setProjects((prev) => prev.map((p) => (p.id === id ? updatedProject : p)))
    setActiveProject(id)
    void syncProjectToBackend(updatedProject)
  }

  const handleGenerationResponse = async (
    prompt: string,
    options: { addVersion: boolean },
  ) => {
    const currentProject = projectRef.current
    if (!currentProject || !id) return

    const pendingAssistantId = generateId()
    const executionBlockId = generateId()
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Helper: update a single block by ID inside the current project's blocks
    // array, persisting the change via setProjects.
    const updateBlock = (
      blockId: string,
      updater: (block: ConversationBlock) => ConversationBlock,
    ) => {
      const proj = projectRef.current
      if (!proj) return
      const blocks = proj.blocks ?? []
      const nextBlocks = blocks.map((b) =>
        b.id === blockId ? updater(b) : b,
      )
      const nextProj = { ...proj, blocks: nextBlocks }
      projectRef.current = nextProj
      setProjects((prev) => prev.map((p) => (p.id === id ? nextProj : p)))
    }

    // Helper: append a new block to the current project's blocks array.
    const appendBlock = (block: ConversationBlock) => {
      const proj = projectRef.current
      if (!proj) return
      const nextProj = { ...proj, blocks: [...(proj.blocks ?? []), block] }
      projectRef.current = nextProj
      setProjects((prev) => prev.map((p) => (p.id === id ? nextProj : p)))
    }

    const appendConsoleEntry = (
      message: string,
      level: ConsoleEntry["level"] = "info",
    ) => {
      const ts = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      setConsoleLogs((prev) => [...prev, { ts, level, msg: message }])
      setConsoleOpen(true)
    }

    const upsertStreamedFile = (file: StreamedFileSnapshot) => {
      setStreamedFiles((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => entry.path === file.path,
        )
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = { ...next[existingIndex], ...file }
          return next
        }
        return [...prev, file]
      })
    }

    setStreamedFiles([])

    // Create a pending Shango dialogue block (resolved when generation
    // completes) and an execution block that tracks real build progress
    // from SSE pipeline events.
    const pendingShangoBlock = createShangoDialogueBlock("", true)
    pendingShangoBlock.id = pendingAssistantId
    const executionBlock = createExecutionBlock("Understanding your request")
    executionBlock.id = executionBlockId
    appendBlock(pendingShangoBlock)
    appendBlock(executionBlock)

    try {
      const currentVersionPrompt =
        currentProject.versions.find((v) => v.isCurrent)?.prompt ??
        currentProject.initialPrompt
      const { mode, model, language } = resolveGenerationPreferences()
      const result = await generateProjectResponse(prompt, {
        previousArtifact: currentProject.artifact,
        previousPrompt: currentVersionPrompt,
        mode,
        model,
        language,
        projectId: currentProject.id,
        activeFile,
        enabledSkills: enabledSkills.flatMap((id) => {
          const skill = ALL_SKILLS.find((candidate) => candidate.id === id)
          return skill
            ? [{ id: skill.id, name: skill.name, purpose: skill.purpose }]
            : []
        }),
        workspaceFiles: (currentProject.files ?? []).map((file) => ({
          path: file.path,
          content: file.content,
          language: file.language,
        })),
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "status") {
            const data = (event.data && typeof event.data === "object" ? event.data : {}) as {
              status?: string
              details?: { filesChanged?: number; path?: string }
              message?: string
            }
            const statusKey = data.status ?? (typeof event.data === "string" ? event.data : undefined)
            if (statusKey) {
              setActivityStatus({
                status: pipelineStatusToState(statusKey),
                details: data.details,
                message: data.message ?? event.message,
              })
              // Update the execution block with real status text + validation state.
              updateBlock(executionBlockId, (b) => {
                if (b.type !== "execution") return b
                const stateKey = pipelineStatusToState(statusKey)
                const text =
                  data.message ?? event.message ?? b.statusText
                const validationStatus: ExecutionBlockType["validationStatus"] =
                  stateKey === "validating" ? "validating" :
                  stateKey === "repairing" ? "failed" :
                  stateKey === "ready" ? "passed" :
                  stateKey === "failed" ? "failed" :
                  b.validationStatus
                return {
                  ...b,
                  statusText: text,
                  validationStatus,
                }
              })
            }
          }
          if (event.type === "delta" && typeof event.content === "string") {
            // Stream the assistant's text into the pending Shango dialogue block.
            updateBlock(pendingAssistantId, (b) => {
              if (b.type !== "dialogue.shango") return b
              return {
                ...b,
                content: `${b.content}${event.content}`.slice(0, 900),
              }
            })
          }
          if (event.type === "console" && typeof event.message === "string") {
            appendConsoleEntry(event.message, "info")
          }
          if (
            event.type === "file" &&
            event.file &&
            typeof event.file === "object"
          ) {
            const filePayload = event.file as {
              path?: string
              operation?: string
              language?: string
              content?: string
            }
            if (filePayload.path) {
              setActiveFile(filePayload.path)
              if (typeof filePayload.content === "string") {
                upsertStreamedFile({
                  path: filePayload.path,
                  content: filePayload.content,
                  language: filePayload.language,
                })
              } else {
                upsertStreamedFile({
                  path: filePayload.path,
                  language: filePayload.language,
                })
              }
              // Record the real file operation in the execution block.
              updateBlock(executionBlockId, (b) => {
                if (b.type !== "execution") return b
                const op: "create" | "modify" | "delete" =
                  filePayload.operation === "delete" ? "delete" :
                  filePayload.operation === "create" ? "create" : "modify"
                const exists = b.files.some((f) => f.path === filePayload.path)
                const files = exists
                  ? b.files.map((f) => f.path === filePayload.path ? { ...f, operation: op } : f)
                  : [...b.files, { path: filePayload.path!, operation: op }]
                return {
                  ...b,
                  files,
                  statusText: `${op === "create" ? "Created" : op === "delete" ? "Removed" : "Updated"} ${filePayload.path}`,
                }
              })
            }
          }
          if (
            event.type === "version" &&
            event.version &&
            typeof event.version === "object"
          ) {
            const versionPayload = event.version as {
              label?: string
              prompt?: string
            }
            if (versionPayload.label) {
              appendConsoleEntry(
                `Version checkpoint: ${versionPayload.label}`,
                "success",
              )
            }
          }
        },
      })
      const now = new Date().toISOString()
      const sensitiveChanges = findSensitiveWorkspaceChanges(
        currentProject.files,
        result.fileChanges,
      )
      if (sensitiveChanges.length > 0) {
        setPendingGenerationReview({
          project: currentProject,
          prompt,
          result,
          completedAt: now,
          addVersion: options.addVersion,
          mode,
          pendingAssistantId,
          executionBlockId,
        })
        updateBlock(pendingAssistantId, (b) => {
          if (b.type !== "dialogue.shango") return b
          return {
            ...b,
            content:
              "This direction touches protected workspace work. Review the change before it is applied.",
            pending: false,
          }
        })
        addToast("Review required before protected work is changed", "default")
        return
      }

      commitGeneration({
        project: currentProject,
        prompt,
        result,
        completedAt: now,
        addVersion: options.addVersion,
        mode,
        pendingAssistantId,
        executionBlockId,
      })
    } catch (error) {
      if (controller.signal.aborted) {
        updateBlock(pendingAssistantId, (b) => {
          if (b.type !== "dialogue.shango") return b
          return {
            ...b,
            content: b.content || "Generation stopped.",
            pending: false,
          }
        })
        updateBlock(executionBlockId, (b) => {
          if (b.type !== "execution") return b
          return { ...b, failed: true, statusText: "Stopped" }
        })
        addToast("Stopped", "default")
        return
      }
      const message =
        error instanceof Error ? error.message : "Generation failed"
      setActivityStatus({ status: "failed" })
      updateBlock(pendingAssistantId, (b) => {
        if (b.type !== "dialogue.shango") return b
        return {
          ...b,
          content:
            "The generation request could not be completed. Please try again.",
          pending: false,
        }
      })
      updateBlock(executionBlockId, (b) => {
        if (b.type !== "execution") return b
        return { ...b, failed: true, statusText: "Build failed" }
      })
      // Append an error block so the conversation shows the real failure and
      // the retry prompt can be derived from it.
      appendBlock(
        createErrorBlock(
          "The generation request could not be completed. You can retry the same instruction.",
        ),
      )
      // Persist a recoverable failure state so a refresh does not lose the retry context.
      const clearedProject = { ...currentProject, generatingAt: undefined }
      projectRef.current = clearedProject
      setProjects((prev) => prev.map((p) => (p.id === id ? clearedProject : p)))
      void syncProjectToBackend(clearedProject)
      setRetryPrompt(prompt)
      addToast(message, "error")
    } finally {
      setIsGenerating(false)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const startWorkspaceGeneration = (
    prompt: string,
    options: { appendUserMessage?: boolean } = {},
  ) => {
    if (!prompt || isGenerating || !project) return
    const appendUserMessage = options.appendUserMessage ?? true
    const selectedModel = (() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("shango_settings") ?? "{}",
        ).model
        return resolveModelId(stored)
      } catch {
        return DEFAULT_MODEL_ID
      }
    })()
    setInput("")
    setRetryPrompt(null)
    setActivityStatus({ status: "understanding" })
    setIsGenerating(true)
    if (appendUserMessage) {
      handleSend(prompt)
    } else {
      const retryProject = {
        ...projectRef.current!,
        generatingAt: new Date().toISOString(),
      }
      projectRef.current = retryProject
      setProjects((prev) => prev.map((p) => (p.id === id ? retryProject : p)))
      void syncProjectToBackend(retryProject)
    }
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    void handleGenerationResponse(prompt, { addVersion: true })
    addToast(`Sending to ${selectedModel} model`, "default")
  }

  const commitGeneration = (review: PendingGenerationReview) => {
    const nextProject = applyGenerationResultToProject(
      review.project,
      review.prompt,
      review.result,
      review.completedAt,
      { addVersion: review.addVersion, mode: review.mode },
    )
    if (nextProject) {
      const clearedProject = { ...nextProject, generatingAt: undefined }
      projectRef.current = clearedProject
      setProjects((prev) => prev.map((p) => (p.id === id ? clearedProject : p)))
      void syncProjectToBackend(clearedProject)
      setActivityStatus({
        status: "ready",
        details: {
          filesChanged: review.result.fileChanges?.length ?? undefined,
        },
      })
      // Resolve the pending Shango dialogue block with the real assistant text.
      const blocks = clearedProject.blocks ?? []
      const resolvedBlocks = blocks.map((b) =>
        b.id === review.pendingAssistantId && b.type === "dialogue.shango"
          ? { ...b, content: review.result.assistant || b.content, pending: false }
          : b,
      )
      // Mark the execution block as completed and append a result block.
      const finalBlocks = resolvedBlocks.map((b) =>
        b.id === review.executionBlockId && b.type === "execution"
          ? { ...b, completed: true, statusText: "Build complete" }
          : b,
      )
      const fileCount = review.result.fileChanges?.length ?? 0
      const withResult: Project = {
        ...clearedProject,
        blocks: [
          ...finalBlocks,
          createResultBlock(
            review.result.assistant?.slice(0, 180) || "Build complete",
            fileCount,
            "ready",
          ),
        ],
      }
      projectRef.current = withResult
      setProjects((prev) => prev.map((p) => (p.id === id ? withResult : p)))
    }
    setRetryPrompt(null)
    setPendingGenerationReview(null)
    addToast(
      review.mode === "plan"
        ? "Plan ready"
        : review.addVersion
          ? "Version saved"
          : "Regenerated",
      review.result.usedFallback ? "default" : "success",
    )
  }

  const dismissGenerationReview = () => {
    const review = pendingGenerationReview
    if (!review) return
    const clearedProject = { ...review.project, generatingAt: undefined }
    projectRef.current = clearedProject
    setProjects((prev) => prev.map((p) => (p.id === id ? clearedProject : p)))
    void syncProjectToBackend(clearedProject)
    const blocks = clearedProject.blocks ?? []
    const updatedBlocks = blocks.map((b) => {
      if (b.id === review.pendingAssistantId && b.type === "dialogue.shango") {
        return {
          ...b,
          content:
            "No files were changed. The proposed removal was not applied.",
          pending: false,
        }
      }
      if (b.id === review.executionBlockId && b.type === "execution") {
        return { ...b, completed: true, statusText: "No changes applied" }
      }
      return b
    })
    const withBlocks = { ...clearedProject, blocks: updatedBlocks }
    projectRef.current = withBlocks
    setProjects((prev) => prev.map((p) => (p.id === id ? withBlocks : p)))
    setPendingGenerationReview(null)
    addToast("Change review dismissed", "default")
    setActivityStatus({ status: "idle" })
  }

  const handleWorkspaceSend = () => {
    startWorkspaceGeneration(input.trim())
  }

  const retryFailedGeneration = () => {
    if (!retryPrompt) return
    startWorkspaceGeneration(retryPrompt, { appendUserMessage: false })
  }

  const stopGeneration = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
    const proj = projectRef.current
    if (proj) {
      const blocks = proj.blocks ?? []
      const updatedBlocks = blocks.map((b) => {
        if (b.type === "dialogue.shango" && b.pending) {
          return { ...b, content: b.content || "Generation stopped.", pending: false }
        }
        if (b.type === "execution" && !b.completed && !b.failed) {
          return { ...b, failed: true, statusText: "Stopped" }
        }
        return b
      })
      const withBlocks = { ...proj, blocks: updatedBlocks }
      projectRef.current = withBlocks
      setProjects((prev) => prev.map((p) => (p.id === id ? withBlocks : p)))
    }
    addToast("Stopped", "default")
    setActivityStatus({ status: "stopped" })
  }

  const handleForgeKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleWorkspaceSend()
    }
  }

  if (!project) return null

  // Derive omnibox context from real project + activity state so the
  // input placeholder and affordances reflect reality.
  const hasFiles = (project.files ?? []).length > 0
  const omniboxContext: OmniboxContext = isGenerating
    ? activityStatus.status === "repairing"
      ? "repairing"
      : "building"
    : activityStatus.status === "failed"
      ? "failed"
      : hasFiles
        ? activityStatus.status === "ready"
          ? "completed"
          : "existing"
        : "empty"

  const versionsCount = project.versions.length || 1
  const slug = project.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 28)
  const reviewChanges = pendingGenerationReview
    ? buildGenerationReview(
        pendingGenerationReview.project.files,
        pendingGenerationReview.result.fileChanges,
      )
    : []
  const { label: maturityLabel, status: maturityStatus } =
    getActiveMaturityLabel(
      project.messages ?? [],
      project.versions || [],
      isGenerating,
    )

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#080809",
        fontFamily: "var(--font-geist)",
      }}
    >
      <ProjectMemoryScreen project={project} />
      {/* Top status line: shared single-line activity status for the builder */}
      <div style={{ position: "relative", zIndex: 6 }}>
        {/* Render shared activity status in the page header area */}
        <ActivityStatusLine activityStatus={activityStatus} />
      </div>

      {/* ── Modals (escape canvas stacking context) ── */}
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
        currentVersion={versionsCount}
      />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectName={project.name}
      />
      <ConfirmationModal
        open={Boolean(pendingGenerationReview)}
        onClose={dismissGenerationReview}
        onConfirm={() => {
          if (pendingGenerationReview) commitGeneration(pendingGenerationReview)
        }}
        title="Review protected changes"
        message={(() => {
          const sensitive = pendingGenerationReview
            ? findSensitiveWorkspaceChanges(
                pendingGenerationReview.project.files,
                pendingGenerationReview.result.fileChanges,
              )
            : []
          const names = sensitive
            .slice(0, 3)
            .map((change) => change.path)
            .join(", ")
          const remainder =
            sensitive.length > 3 ? ` and ${sensitive.length - 3} more` : ""
          return `Shango prepared ${sensitive.length} protected change${
            sensitive.length === 1 ? "" : "s"
          }: ${names}${remainder}. Your workspace will not change until you approve this review.`
        })()}
        confirmLabel="Apply changes"
        destructive
        details={
          reviewChanges.length > 0 ? (
            <div
              style={{
                marginBottom: 20,
                maxHeight: 190,
                overflowY: "auto",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 7,
              }}
            >
              {reviewChanges.map((change) => (
                <div
                  key={`${change.operation}:${change.path}`}
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 9.5,
                    }}
                  >
                    <span
                      style={{
                        color:
                          change.operation === "delete"
                            ? "#fca5a5"
                            : change.operation === "create"
                              ? "#86efac"
                              : "#fcd34d",
                        textTransform: "uppercase",
                      }}
                    >
                      {change.operation}
                    </span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {change.path}
                    </span>
                  </div>
                  {change.removedPreview.map((line, index) => (
                    <div
                      key={`remove-${index}`}
                      style={{
                        marginTop: 4,
                        color: "rgba(252,165,165,0.75)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontSize: 9,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      − {line}
                    </div>
                  ))}
                  {change.addedPreview.map((line, index) => (
                    <div
                      key={`add-${index}`}
                      style={{
                        marginTop: 3,
                        color: "rgba(134,239,172,0.75)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontSize: 9,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      + {line}
                    </div>
                  ))}
                  {(change.removedDetails.length > 0 ||
                    change.addedDetails.length > 0 ||
                    change.removedHiddenCount > 0 ||
                    change.addedHiddenCount > 0) && (
                    <details style={{ marginTop: 7 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "rgba(255,255,255,0.5)",
                          fontFamily: "var(--font-geist)",
                          fontSize: 9,
                        }}
                      >
                        Show more changed lines
                      </summary>
                      {change.removedDetails.map((line, index) => (
                        <div
                          key={`remove-detail-${index}`}
                          style={{
                            marginTop: 4,
                            color: "rgba(252,165,165,0.75)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            fontSize: 9,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          − {line}
                        </div>
                      ))}
                      {change.addedDetails.map((line, index) => (
                        <div
                          key={`add-detail-${index}`}
                          style={{
                            marginTop: 3,
                            color: "rgba(134,239,172,0.75)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            fontSize: 9,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          + {line}
                        </div>
                      ))}
                      {(change.removedHiddenCount > 0 ||
                        change.addedHiddenCount > 0) && (
                        <div
                          style={{
                            marginTop: 5,
                            color: "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-geist)",
                            fontSize: 9,
                          }}
                        >
                          Large change:{" "}
                          {change.removedHiddenCount + change.addedHiddenCount}{" "}
                          additional lines are not shown.
                        </div>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : undefined
        }
      />
      <ConnectorsDrawer
        open={connectorsOpen}
        onClose={() => setConnectorsOpen(false)}
      />
      <ZenCommandPalette
        isOpen={zenPaletteOpen}
        onClose={() => setZenPaletteOpen(false)}
        onSubmit={(prompt) => {
          setInput(prompt)
          // We need to defer handleWorkspaceSend slightly so state can settle
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.value = prompt
              textareaRef.current.dispatchEvent(
                new Event("change", { bubbles: true }),
              )
              const sendBtn = document.getElementById("shango-send-btn")
              sendBtn?.click()
            }
          }, 50)
        }}
        isGenerating={isGenerating}
      />

      {/* ── Master canvas ── */}
      <div
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.055)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0b",
          cursor: isDragging ? "col-resize" : "default",
          userSelect: isDragging ? "none" : "auto",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* ══ SINGLE MASTER HEADER — 48px, full canvas width ══════════════════ */}
        <header
          style={{
            height: 48,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            gap: 0,
            background: "rgba(14,14,16,0.98)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            zIndex: 20,
            opacity: 1,
            pointerEvents: "auto",
            transition: "opacity 0.2s ease",
          }}
        >
          {/* ── LEFT — Profile + project context ── */}
          <div
            style={{
              width: conversationCollapsed
                ? "auto"
                : Math.max(180, panelWidth - 10),
              display: "flex",
              alignItems: "center",
              justifyContent: conversationCollapsed
                ? "flex-start"
                : "space-between",
              gap: 4,
              flexShrink: 0,
              paddingRight: conversationCollapsed ? 0 : 4,
              boxSizing: "border-box",
              transition: isDragging
                ? "none"
                : "width 0.32s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                minWidth: 0,
              }}
            >
              {/* Profile avatar */}
              <div style={{ position: "relative", marginRight: 2 }}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  title={currentUser ? currentUser.name : "Sign in"}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: currentUser
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      profileOpen
                        ? "rgba(255,255,255,0.18)"
                        : currentUser
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.07)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    fontFamily: "var(--font-geist)",
                    fontWeight: 600,
                    transition: "all 0.14s ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)"
                  }}
                  onMouseLeave={(e) => {
                    if (!profileOpen) {
                      e.currentTarget.style.borderColor = currentUser
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.07)"
                      e.currentTarget.style.color = "rgba(255,255,255,0.45)"
                    }
                  }}
                >
                  {currentUser && currentUser.name ? (
                    (currentUser.name[0]?.toUpperCase() ?? "?")
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle
                        cx="5"
                        cy="3.5"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M1.5 9c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
                {profileOpen && (
                  <BuilderProfilePopover
                    currentUser={currentUser}
                    onClose={() => setProfileOpen(false)}
                    onSignIn={() => {
                      addToast("Opening sign in...", "default")
                      setProfileOpen(false)
                    }}
                    onSignOut={() => {
                      addToast("Signed out", "default")
                      setProfileOpen(false)
                    }}
                  />
                )}
              </div>

              <HeaderDivider />

              {/* Project context dropdown */}
              <ProjectContextMenu
                currentProject={project}
                notifications={notifications}
                readNotifs={readNotifs}
                onMarkNotifsRead={() =>
                  setReadNotifs(new Set(notifications.map((n) => n.id)))
                }
                onOpenConnectors={() => setConnectorsOpen(true)}
                onOpenSettings={() => setProjectSettingsOpen(true)}
                onNavigate={navigate}
                onDuplicate={() => {
                  const duplicatedProject = duplicateProject(project)
                  setProjects((prev) => [
                    duplicatedProject,
                    ...prev.filter(
                      (existing) => existing.id !== duplicatedProject.id,
                    ),
                  ])
                  setActiveProject(duplicatedProject.id)
                  projectRef.current = duplicatedProject
                  addToast("Project duplicated", "success")
                  navigate(`/project/${duplicatedProject.id}`)
                }}
              />

              {/* Live badge */}
              {project.status === "LIVE" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 6px",
                    marginLeft: 4,
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 8.5,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.6)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.5)",
                      display: "inline-block",
                    }}
                  />
                  LIVE
                </span>
              )}
            </div>

            {/* Closebar button aligned precisely with the panel divider line */}
            <HeaderBtn
              onClick={() => setConversationCollapsed((v) => !v)}
              active={!conversationCollapsed}
              title={
                conversationCollapsed
                  ? "Show Architect Panel  ⌘P"
                  : "Hide Architect Panel  ⌘P"
              }
              style={{ flexShrink: 0 }}
            >
              {conversationCollapsed ? (
                <PanelLeftOpen size={14} color="currentColor" strokeWidth={2} />
              ) : (
                <PanelLeftClose
                  size={14}
                  color="currentColor"
                  strokeWidth={2}
                />
              )}
            </HeaderBtn>
          </div>

          {/* ── CENTER — URL bar (clamped breadcrumb) ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                flex: "0 1 340px",
                margin: "0 8px",
                height: 28,
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "0 10px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)",
                minWidth: 0,
                cursor: "default",
              }}
            >
              {/* Globe */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ flexShrink: 0, opacity: 0.22 }}
              >
                <circle
                  cx="5"
                  cy="5"
                  r="4.2"
                  stroke="white"
                  strokeWidth="1.2"
                />
                <path
                  d="M5 0.8C5 0.8 3.4 2.8 3.4 5s1.6 4.2 1.6 4.2M5 0.8C5 0.8 6.6 2.8 6.6 5S5 9.2 5 9.2M0.8 5h8.4"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.01em",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.2)" }}>
                  shango.local/
                </span>
                <span style={{ color: "rgba(255,255,255,0.48)" }}>{slug}</span>
              </span>

              {/* Status indicator */}
              {isRebuilding ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.6)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                    }}
                  >
                    BUILDING
                  </span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="shango-loading-dot"
                        style={{
                          animationDelay: `${i * 0.16}s`,
                          background: "rgba(255,255,255,0.5)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : buildSuccess ? (
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                    flexShrink: 0,
                    animation: "fadeIn 0.2s ease",
                  }}
                >
                  READY
                </span>
              ) : syncPending ? (
                <span
                  title="Saved on this device. Shango will sync this project when the connection is restored."
                  style={{
                    fontSize: 8.5,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  SAVED LOCAL
                </span>
              ) : project.versions.length > 0 ? (
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    flexShrink: 0,
                    animation: "live-pulse 2.4s ease-in-out infinite",
                  }}
                />
              ) : null}
            </div>

            {/* Open in new tab */}
            <button
              onClick={() =>
                window.open(`https://shango.local/${slug}`, "_blank")
              }
              title="Open in new tab"
              style={{
                width: 26,
                height: 26,
                flexShrink: 0,
                marginLeft: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "rgba(255,255,255,0.22)",
                cursor: "pointer",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.65)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.22)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
                e.currentTarget.style.background = "transparent"
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M4 1.5H1.5v7h7V6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 1.5h2.5v2.5M8.5 1.5L4.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          {/* end centered URL wrapper */}

          {/* ── RIGHT — Stage controls + actions ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {/* Cycle viewport — single smart toggle: Desktop → Tablet → Mobile → Desktop */}
            <HeaderBtn
              onClick={() =>
                setViewport((v) =>
                  v === "desktop"
                    ? "tablet"
                    : v === "tablet"
                      ? "mobile"
                      : "desktop",
                )
              }
              title={`Viewport: ${
                viewport?.[0]
                  ? viewport[0].toUpperCase() + viewport.slice(1)
                  : ""
              }  ⌘1/2/3`}
            >
              {viewport === "desktop" && <DesktopIcon />}
              {viewport === "tablet" && <TabletIcon />}
              {viewport === "mobile" && <MobileIcon />}
            </HeaderBtn>

            <HeaderDivider />

            {/* Code view ⌘E */}
            <HeaderBtn
              onClick={() => setCodeView((v) => !v)}
              active={codeView}
              title="Code Inspector  ⌘E"
            >
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                <path
                  d="M4 1.5L1 5l3 3.5M9 1.5L12 5 9 8.5M7.5 1l-2 8"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </HeaderBtn>

            {/* GitHub — Save my project safely */}
            <button
              onClick={async () => {
                try {
                  await requestProjectExport(project.id, "github", project.name)
                  addToast("Project safely saved to GitHub", "success")
                } catch {
                  addToast("Failed to save project to GitHub", "error")
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 9px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "var(--font-geist)",
                fontWeight: 450,
                transition: "all 0.14s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.85)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
                e.currentTarget.style.background = "rgba(255,255,255,0.07)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              }}
              title="Save project safely to GitHub"
            >
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.5 0.5C3.187 0.5 0.5 3.187 0.5 6.5c0 2.65 1.718 4.9 4.1 5.695.3.055.41-.13.41-.29v-1.015c-1.668.362-2.02-.805-2.02-.805-.273-.694-.667-0.879-.667-.879-.545-.373.041-.365.041-.365.603.042.92.619.92.619.537.92 1.408.654 1.751.5.054-.389.21-.654.38-.804-1.332-.152-2.732-.666-2.732-2.964 0-.655.234-1.19.618-1.61-.062-.152-.267-.762.059-1.587 0 0 .504-.161 1.65.616A5.748 5.748 0 016.5 3.685c.51.002 1.023.069 1.503.202 1.145-.777 1.648-.616 1.648-.616.327.825.121 1.435.06 1.587.385.42.617.955.617 1.61 0 2.304-1.403 2.81-2.74 2.96.215.185.407.55.407 1.11v1.644c0 .162.108.349.413.29A6.004 6.004 0 0012.5 6.5C12.5 3.187 9.813 0.5 6.5 0.5z"
                  fill="currentColor"
                />
              </svg>
              Save to GitHub
            </button>

            {/* Fullscreen */}
            <HeaderBtn
              onClick={() => setFullscreen((v) => !v)}
              active={fullscreen}
              title={fullscreen ? "Exit fullscreen  Esc" : "Fullscreen"}
            >
              {fullscreen ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M4 1v3H1M8 1v3h3M4 11V8H1M8 11V8h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </HeaderBtn>

            <HeaderDivider />

            {/* Share */}
            <button
              onClick={() => setShareOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: 11.5,
                fontFamily: "var(--font-geist)",
                fontWeight: 450,
                transition: "all 0.14s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.78)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
                e.currentTarget.style.background = "rgba(255,255,255,0.07)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.5)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              }}
              title="Share  ⌘S"
            >
              <ShareIcon size={10} />
              Share
            </button>

            {/* Deploy */}
            <button
              onClick={() => setDeployOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 12px",
                marginLeft: 4,
                borderRadius: 7,
                background: "rgba(255,255,255,0.92)",
                border: "none",
                color: "#0a0a0a",
                cursor: "pointer",
                fontSize: 11.5,
                fontFamily: "var(--font-geist)",
                fontWeight: 600,
                transition: "background 0.14s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
              }
              title="Deploy  ⌘D"
            >
              <DeployIcon size={10} />
              Deploy
            </button>
          </div>
        </header>

        {/* ── Two-column body ── */}
        <div
          style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}
        >
          {/* Collapsed edge strip */}
          {conversationCollapsed && (
            <button
              onClick={() => setConversationCollapsed(false)}
              style={{
                width: 14,
                flexShrink: 0,
                background: "rgba(14,14,16,0.98)",
                borderRight: "1px solid rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.18)",
                fontSize: 10,
                cursor: "pointer",
                border: "none",
                transition: "color 0.14s ease, background 0.14s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.5)"
                e.currentTarget.style.background = "rgba(255,255,255,0.03)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.18)"
                e.currentTarget.style.background = "rgba(14,14,16,0.98)"
              }}
              title="Show Architect Panel  ⌘P"
            >
              ›
            </button>
          )}

          {/* ── LEFT — Conversation column ── */}
          <div
            style={{
              width: conversationCollapsed ? 0 : panelWidth,
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(14,14,16,0.98)",
              borderRight: conversationCollapsed
                ? "none"
                : "1px solid rgba(255,255,255,0.04)",
              transition:
                "width 0.32s cubic-bezier(0.16,1,0.3,1), opacity 1.2s cubic-bezier(0.16,1,0.3,1)",
              opacity: 1,
              pointerEvents: "auto",
            }}
          >
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <ConversationPanel
                blocks={project.blocks || []}
                versions={project.versions}
                isGenerating={isGenerating}
                activityStatus={activityStatus}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                projectName={project.name}
                lastGeneration={project.lastGeneration}
                onRevertOperation={(path: string) => {
                  const currentProject = projects.find((p) => p.id === id)
                  if (!currentProject) return
                  const reverted = revertFileOperations(currentProject, [path])
                  if (!reverted) {
                    addToast?.(
                      "Could not revert — no previous version to restore from",
                      "error",
                    )
                    return
                  }
                  setProjects((prev) =>
                    prev.map((p) => (p.id === id ? reverted : p)),
                  )
                  addToast?.(`Reverted ${path}`, "default")
                }}
                failedPrompt={retryPrompt}
                onRetry={retryFailedGeneration}
                onRestore={(versionId: string) => {
                  const currentProject = projects.find((p) => p.id === id)
                  if (!currentProject) return
                  void (async () => {
                    try {
                      const response = await fetch(
                        `/api/projects/${encodeURIComponent(currentProject.id)}/versions/${encodeURIComponent(versionId)}/restore`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        },
                      )
                      if (!response.ok) throw new Error("Restore failed")
                      const responseBody =
                        (await response.json()) as Project | {
                          project?: Project
                        }
                      const payload = unwrapProjectResponse(responseBody)
                      if (!payload)
                        throw new Error("Restore payload was invalid")
                      const merged = mergeVersionActionProject(
                        currentProject,
                        payload,
                      )
                      if (!merged)
                        throw new Error("Restore payload was invalid")
                      projectRef.current = merged
                      setProjects((prev) =>
                        prev.map((p) => (p.id === id ? merged : p)),
                      )
                      setActiveProject(id ?? null)
                      setPreviewKey((k) => k + 1)
                      setBuildSuccess(false)
                      setIsRebuilding(false)
                      setConsoleOpen(true)
                      setConsoleLogs(buildConsoleLogs(merged.name))
                      addToast("Version restored", "success")
                    } catch {
                      const result = applyVersionAction(
                        currentProject,
                        versionId,
                        "restore",
                      )
                      if (!result) return
                      projectRef.current = result.project
                      setProjects((prev) =>
                        prev.map((p) => (p.id === id ? result.project : p)),
                      )
                      setActiveProject(id ?? null)
                      setPreviewKey((k) => k + 1)
                      setBuildSuccess(false)
                      setIsRebuilding(false)
                      setConsoleOpen(true)
                      setConsoleLogs(buildConsoleLogs(result.project.name))
                      addToast("Version restored", "success")
                    }
                  })()
                }}
                onFork={(versionId: string) => {
                  const currentProject = projects.find((p) => p.id === id)
                  if (!currentProject) return
                  void (async () => {
                    try {
                      const response = await fetch(
                        `/api/projects/${encodeURIComponent(currentProject.id)}/versions/${encodeURIComponent(versionId)}/fork`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        },
                      )
                      if (!response.ok) throw new Error("Fork failed")
                      const responseBody =
                        (await response.json()) as Project | {
                          project?: Project
                        }
                      const payload = unwrapProjectResponse(responseBody)
                      if (!payload) throw new Error("Fork payload was invalid")
                      const merged = mergeVersionActionProject(
                        currentProject,
                        payload,
                      )
                      if (!merged) throw new Error("Fork payload was invalid")
                      setProjects((prev) => [
                        merged,
                        ...prev.filter((existing) => existing.id !== merged.id),
                      ])
                      setActiveProject(merged.id)
                      projectRef.current = merged
                      addToast("Project forked", "default")
                      navigate(`/project/${merged.id}`)
                    } catch {
                      const result = applyVersionAction(
                        currentProject,
                        versionId,
                        "fork",
                        `${currentProject.name} (fork)`,
                      )
                      if (!result) return
                      setProjects((prev) => [
                        result.project,
                        ...prev.filter(
                          (existing) => existing.id !== result.project.id,
                        ),
                      ])
                      setActiveProject(result.project.id)
                      projectRef.current = result.project
                      addToast("Project forked", "default")
                      navigate(`/project/${result.project.id}`)
                    }
                  })()
                }}
              />
            </div>

            {/* Forge input */}
            <div
              style={{
                flexShrink: 0,
                background:
                  "linear-gradient(to top, var(--surface-0) 60%, transparent)",
                padding: "24px 14px 20px",
                position: "relative",
                zIndex: 10,
                marginTop: "-24px",
              }}
            >
              <ForgeInput
                value={input}
                onChange={setInput}
                onKeyDown={handleForgeKeyDown}
                onSend={handleWorkspaceSend}
                onStop={stopGeneration}
                isGenerating={isGenerating}
                textareaRef={textareaRef}
                context={omniboxContext}
              />
            </div>
          </div>

          {/* Resize handle — between conversation column and stage */}
          {!conversationCollapsed && (
            <div
              style={{
                width: 6,
                flexShrink: 0,
                background: "transparent",
                position: "relative",
                zIndex: 2,
                cursor: "col-resize",
              }}
              onMouseDown={handleMouseDown}
              onDoubleClick={() => setPanelWidth(380)}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  height: 36,
                  width: 1.5,
                  borderRadius: 2,
                  background: isDragging
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.04)",
                  transition: "background 0.18s ease",
                }}
              />
            </div>
          )}

          {/* ── RIGHT — The Stage (pure preview canvas) ── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              position: "relative",
              background: "#0d0d0e",
              overflow: "hidden",
            }}
          >
            <PreviewPanel
              project={project}
              streamedFiles={streamedFiles}
              conversationCollapsed={conversationCollapsed}
              setConversationCollapsed={setConversationCollapsed}
              viewport={viewport}
              activityStatus={activityStatus}
              codeView={codeView}
              activeFile={activeFile}
              setActiveFile={setActiveFile}
              consoleOpen={consoleOpen}
              setConsoleOpen={setConsoleOpen}
              consoleLogs={consoleLogs}
              setConsoleLogs={setConsoleLogs}
              isRebuilding={isRebuilding}
              buildSuccess={buildSuccess}
              previewKey={previewKey}
              fullscreen={fullscreen}
              setFullscreen={setFullscreen}
              onExport={() => setExportOpen(true)}
              onRuntimeDiagnostic={(diag) => {
                console.warn("[BuilderScreen] Preview runtime diagnostic:", diag)
              }}
            />

            {historyOpen && (
              <VersionHistoryPanel
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                versions={project.versions}
                onRestore={(versionId: string) => {
                  const currentProject = projects.find((p) => p.id === id)
                  if (!currentProject) return
                  void (async () => {
                    try {
                      const response = await fetch(
                        `/api/projects/${encodeURIComponent(currentProject.id)}/versions/${encodeURIComponent(versionId)}/restore`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        },
                      )
                      if (!response.ok) throw new Error("Restore failed")
                      const responseBody =
                        (await response.json()) as Project | {
                          project?: Project
                        }
                      const payload = unwrapProjectResponse(responseBody)
                      if (!payload)
                        throw new Error("Restore payload was invalid")
                      const merged = mergeVersionActionProject(
                        currentProject,
                        payload,
                      )
                      if (!merged)
                        throw new Error("Restore payload was invalid")
                      projectRef.current = merged
                      setProjects((prev) =>
                        prev.map((p) => (p.id === id ? merged : p)),
                      )
                      setActiveProject(id ?? null)
                      setPreviewKey((k) => k + 1)
                      setBuildSuccess(false)
                      setIsRebuilding(false)
                      setConsoleOpen(true)
                      setConsoleLogs(buildConsoleLogs(merged.name))
                      addToast("Version restored", "success")
                      setHistoryOpen(false)
                    } catch {
                      const restored = restoreVersion(currentProject, versionId)
                      if (!restored) return
                      projectRef.current = restored
                      setProjects((prev) =>
                        prev.map((p) => (p.id === id ? restored : p)),
                      )
                      setActiveProject(id ?? null)
                      setPreviewKey((k) => k + 1)
                      setBuildSuccess(false)
                      setIsRebuilding(false)
                      setConsoleOpen(true)
                      setConsoleLogs(buildConsoleLogs(restored.name))
                      addToast("Version restored", "success")
                      setHistoryOpen(false)
                    }
                  })()
                }}
                onFork={(versionId: string) => {
                  const currentProject = projects.find((p) => p.id === id)
                  if (!currentProject) return
                  void (async () => {
                    try {
                      const response = await fetch(
                        `/api/projects/${encodeURIComponent(currentProject.id)}/versions/${encodeURIComponent(versionId)}/fork`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        },
                      )
                      if (!response.ok) throw new Error("Fork failed")
                      const responseBody =
                        (await response.json()) as Project | {
                          project?: Project
                        }
                      const payload = unwrapProjectResponse(responseBody)
                      if (!payload) throw new Error("Fork payload was invalid")
                      const merged = mergeVersionActionProject(
                        currentProject,
                        payload,
                      )
                      if (!merged) throw new Error("Fork payload was invalid")
                      setProjects((prev) => [
                        merged,
                        ...prev.filter((existing) => existing.id !== merged.id),
                      ])
                      setActiveProject(merged.id)
                      projectRef.current = merged
                      addToast("Project forked", "default")
                      setHistoryOpen(false)
                      navigate(`/project/${merged.id}`)
                    } catch {
                      const forked = forkProjectFromVersion(
                        currentProject,
                        versionId,
                        `${currentProject.name} (fork)`,
                      )
                      if (!forked) return
                      setProjects((prev) => [
                        forked,
                        ...prev.filter((existing) => existing.id !== forked.id),
                      ])
                      setActiveProject(forked.id)
                      projectRef.current = forked
                      addToast("Project forked", "default")
                      setHistoryOpen(false)
                      navigate(`/project/${forked.id}`)
                    }
                  })()
                }}
              />
            )}

            {projectSettingsOpen && (
              <ProjectSettingsSheet
                open={projectSettingsOpen}
                onClose={() => setProjectSettingsOpen(false)}
                project={project}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Header primitives ────────────────────────────────────────────────────────

function HeaderDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 16,
        background: "rgba(255,255,255,0.06)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  )
}

interface HeaderBtnProps {
  onClick?: () => void
  title?: string
  active?: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}

function HeaderBtn({
  onClick,
  title,
  active = false,
  style,
  children,
}: HeaderBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
        border: active
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid transparent",
        background: active ? "rgba(0,0,0,0.4)" : "transparent",
        color: active ? "var(--aura-color)" : "rgba(255,255,255,0.3)",
        boxShadow: active ? "inset 0 2px 8px rgba(0,0,0,0.8)" : "none",
        transform: active ? "scale(0.94)" : "scale(1)",
        cursor: "pointer",
        transition: "all 0.24s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.65)"
          e.currentTarget.style.background = "rgba(255,255,255,0.05)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.3)"
          e.currentTarget.style.background = "transparent"
        }
      }}
    >
      {children}
    </button>
  )
}

// ── Viewport icons ─────────────────────────────────────────────────────────────

function DesktopIcon() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
      <rect
        x="0.75"
        y="0.75"
        width="11.5"
        height="7.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M4.5 10.25h4M6.5 8.25v2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TabletIcon() {
  return (
    <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
      <rect
        x="0.75"
        y="0.75"
        width="7.5"
        height="10.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="4.5" cy="9.8" r="0.65" fill="currentColor" />
    </svg>
  )
}

function MobileIcon() {
  return (
    <svg width="7.5" height="12" viewBox="0 0 7.5 12" fill="none">
      <rect
        x="0.75"
        y="0.75"
        width="6"
        height="10.5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M2.75 2.5h2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="3.75" cy="9.8" r="0.6" fill="currentColor" />
    </svg>
  )
}

// ── Project Switcher ──────────────────────────────────────────────────────────

// ── ProjectContextMenu ────────────────────────────────────────────────────────

interface ProjectContextMenuProps {
  currentProject: { id: string; name: string; status?: string }
  notifications: Notification[]
  readNotifs: Set<string>
  onMarkNotifsRead: () => void
  onOpenConnectors: () => void
  onOpenSettings: () => void
  onNavigate: (path: string) => void
  onDuplicate: () => void
}

function ProjectContextMenu({
  currentProject,
  notifications,
  readNotifs,
  onMarkNotifsRead,
  onOpenConnectors,
  onOpenSettings,
  onNavigate,
  onDuplicate,
}: ProjectContextMenuProps) {
  const { currentUser, usageMeter, setProjects, addToast } = useApp()
  const [open, setOpen] = useState(false)
  const [starred, setStarred] = useState(false)
  const [notifExpanded, setNotifExpanded] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(currentProject.name)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNameValue(currentProject.name)
  }, [currentProject.name])

  const saveName = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== currentProject.name) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === currentProject.id
            ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
            : p,
        ),
      )
      addToast?.("Project renamed", "success")
    } else {
      setNameValue(currentProject.name)
    }
    setIsEditingName(false)
  }

  const creditPct = Math.round(usageFraction(usageMeter) * 100)
  const unread = notifications.filter(
    (n) => !n.read && !readNotifs.has(n.id),
  ).length

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setNotifExpanded(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const close = () => {
    setOpen(false)
    setNotifExpanded(false)
  }

  const menuItems = [
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 1h3.5v3.5M11 1L5.5 6.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: "Go to Dashboard",
      action: () => {
        onNavigate("/")
        close()
      },
      shortcut: "⌘H",
    },
    {
      icon: <SettingsIcon size={12} />,
      label: "Project Settings",
      action: () => {
        onOpenSettings()
        close()
      },
    },
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle
            cx="6"
            cy="6"
            r="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.64 2.64l1.06 1.06M8.3 8.3l1.06 1.06M9.36 2.64L8.3 3.7M3.7 8.3l-1.06 1.06"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
      label: "Project Connectors",
      action: () => {
        onOpenConnectors()
        close()
      },
    },
    {
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 8.5V11h2.5L10 4.5 7.5 2 1 8.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 1l2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
      label: "Remix / Duplicate",
      action: () => {
        onDuplicate()
        close()
      },
    },
  ]

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      {/* Trigger — editable project name + dropdown caret */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName()
              if (e.key === "Escape") {
                setNameValue(currentProject.name)
                setIsEditingName(false)
              }
            }}
            onBlur={saveName}
            style={{
              height: 28,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-geist)",
              outline: "none",
              width: Math.max(110, Math.min(220, nameValue.length * 8 + 20)),
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px 3px 5px",
              height: 28,
              borderRadius: 7,
              border: `1px solid ${
                open ? "rgba(255,255,255,0.09)" : "transparent"
              }`,
              background: open ? "rgba(255,255,255,0.05)" : "transparent",
              cursor: "pointer",
              transition: "all 0.13s ease",
              maxWidth: 260,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!open) {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
              }
            }}
            onMouseLeave={(e) => {
              if (!open) {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "transparent"
              }
            }}
          >
            <span
              onClick={(e) => {
                // Double click or title click renames directly
                e.stopPropagation()
                setIsEditingName(true)
              }}
              title="Click to rename project"
              style={{
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-geist)",
                color: "rgba(255,255,255,0.88)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
                cursor: "text",
              }}
            >
              {currentProject.name}
            </span>
            {unread > 0 && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "#ef4444",
                  boxShadow: "0 0 5px rgba(239,68,68,0.6)",
                }}
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen((v) => !v)
              }}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "rgba(255,255,255,0.4)",
              }}
              title="Project menu"
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                style={{
                  flexShrink: 0,
                  transform: open ? "rotate(180deg)" : "none",
                  transition: "transform 0.14s ease",
                }}
              >
                <path
                  d="M1.5 3l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 260,
            background: "rgba(16,16,18,0.98)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4)",
            overflow: "hidden",
            zIndex: 200,
            animation: "shango-fade-up 0.14s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Project identity */}
          <div
            style={{
              padding: "12px 14px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "var(--font-geist)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentProject.name}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 9.5,
                    color: "rgba(255,255,255,0.28)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {currentProject.status ?? "DRAFT"}
                </p>
              </div>
              {/* Star */}
              <button
                onClick={() => setStarred((v) => !v)}
                title={starred ? "Unstar" : "Star project"}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  border: "none",
                  flexShrink: 0,
                  background: starred
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.13s ease",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill={starred ? "#fbbf24" : "none"}
                >
                  <path
                    d="M5.5 1L6.9 4.2H10.2L7.5 6.3 8.5 9.5 5.5 7.5 2.5 9.5 3.5 6.3 0.8 4.2H4.1L5.5 1Z"
                    stroke={starred ? "#fbbf24" : "rgba(255,255,255,0.3)"}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Resource meter */}
            {currentUser && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8.5,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    CREDITS
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontFamily: "var(--font-mono-jetbrains)",
                      color:
                        creditPct >= 80
                          ? "#ef4444"
                          : creditPct >= 60
                            ? "#f59e0b"
                            : "rgba(255,255,255,0.3)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {usageMeter.used} / {usageMeter.limit}
                  </span>
                </div>
                <div
                  style={{
                    height: 2.5,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, creditPct)}%`,
                      borderRadius: 2,
                      background:
                        creditPct >= 80
                          ? "linear-gradient(to right, #ef4444, #f87171)"
                          : creditPct >= 60
                            ? "linear-gradient(to right, #f59e0b, #fbbf24)"
                            : "linear-gradient(to right, rgba(255,255,255,0.3), rgba(255,255,255,0.2))",
                      transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification row */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => {
                setNotifExpanded((v) => !v)
                onMarkNotifsRead()
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "background 0.11s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ flexShrink: 0, opacity: 0.4 }}
              >
                <path
                  d="M6 1a3.5 3.5 0 013.5 3.5v2.2l1 1.5H1.5l1-1.5V4.5A3.5 3.5 0 016 1z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.5 9.5a1.5 1.5 0 003 0"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: "var(--font-geist)",
                  color: "rgba(255,255,255,0.55)",
                  textAlign: "left",
                }}
              >
                Notifications
              </span>
              {unread > 0 && (
                <span
                  style={{
                    fontSize: 8.5,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                >
                  {unread}
                </span>
              )}
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                style={{
                  opacity: 0.25,
                  transform: notifExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.14s ease",
                }}
              >
                <path
                  d="M1.5 2.5l2.5 2.5 2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {notifExpanded && (
              <div
                style={{ maxHeight: 180, overflowY: "auto", paddingBottom: 4 }}
              >
                {notifications.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      padding: "6px 14px 10px",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    No notifications
                  </p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "5px 14px",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        borderLeft: `2px solid ${
                          n.read || readNotifs.has(n.id)
                            ? "transparent"
                            : "rgba(255,255,255,0.2)"
                        }`,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background:
                            n.read || readNotifs.has(n.id)
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(255,255,255,0.5)",
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-geist)",
                          color: "rgba(255,255,255,0.5)",
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action items */}
          <div style={{ padding: "5px 5px" }}>
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-geist)",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.11s ease, color 0.11s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  e.currentTarget.style.color = "rgba(255,255,255,0.82)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)"
                }}
              >
                <span style={{ opacity: 0.45, display: "flex", flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono-jetbrains)",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}

            {/* Move to folder */}
            <button
              onClick={() => close()}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 9px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-geist)",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.11s ease, color 0.11s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                e.currentTarget.style.color = "rgba(255,255,255,0.82)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "rgba(255,255,255,0.5)"
              }}
            >
              <span style={{ opacity: 0.45, display: "flex", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 3a1 1 0 011-1h3l1.5 1.5H10a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Move to Folder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notification Popover ──────────────────────────────────────────────────────

// ── Builder Profile Popover ───────────────────────────────────────────────────

interface User {
  name: string
  email?: string
  plan?: string
}

function BuilderProfilePopover({
  currentUser,
  onClose,
  onSignIn,
  onSignOut,
}: {
  currentUser: User | null
  onClose: () => void
  onSignIn: () => void
  onSignOut: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 200,
        width: 220,
        background: "rgba(12,12,14,0.98)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
        overflow: "hidden",
        animation: "shango-fade-up 0.18s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {currentUser ? (
        <>
          {/* User info */}
          <div
            style={{
              padding: "14px 14px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "var(--font-geist)",
                  flexShrink: 0,
                }}
              >
                {currentUser && currentUser.name
                  ? (currentUser.name[0]?.toUpperCase() ?? "?")
                  : "?"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "var(--font-geist)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-geist)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 1,
                  }}
                >
                  {currentUser.email ??
                    `${currentUser.plan?.toUpperCase() ?? "FREE"} plan`}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "6px" }}>
            <ProfileItem
              label="Profile & Settings"
              icon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle
                    cx="6.5"
                    cy="4.5"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M2 11c0-2.485 2.015-4.5 4.5-4.5S11 8.515 11 11"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              }
              onClick={onClose}
            />
            <ProfileItem
              label="Keyboard shortcuts"
              icon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect
                    x="1.5"
                    y="3"
                    width="10"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4 6h1M6.5 6h1M4 8h5"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                </svg>
              }
              onClick={onClose}
            />
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.05)",
              margin: "0 6px",
            }}
          />

          <div style={{ padding: "6px" }}>
            <ProfileItem
              label="Sign out"
              icon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M5 6.5h6M9 4.5l2 2-2 2M7 3.5V2H2v9h5V9.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              onClick={onSignOut}
              danger
            />
          </div>
        </>
      ) : (
        <div style={{ padding: "16px 14px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              fontFamily: "var(--font-geist)",
            }}
          >
            Anonymous
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.5,
            }}
          >
            Your work isn't saved yet
          </p>
          <button
            onClick={onSignIn}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.92)",
              border: "none",
              color: "#0a0a0a",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "var(--font-geist)",
              cursor: "pointer",
              transition: "background 0.14s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
            }
          >
            Save my work →
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileItem({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 9px",
        borderRadius: 7,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        transition: "background 0.12s ease",
        textAlign: "left",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.06)"
          : "rgba(255,255,255,0.04)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        style={{
          color: danger ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.3)",
          flexShrink: 0,
          display: "flex",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 12,
          color: danger ? "#ef4444" : "rgba(255,255,255,0.6)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {label}
      </span>
    </button>
  )
}

// ── Forge Input ───────────────────────────────────────────────────────────────
// Imported from ../components/ForgeInput
