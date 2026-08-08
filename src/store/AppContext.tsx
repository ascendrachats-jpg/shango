import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  type Project,
  type Version,
  type ProjectTemplateOrigin,
  type ChatMessage,
  generateId,
} from "../lib/store"
import {
  type ConversationBlock,
  createIdeaBlock,
  createUserDialogueBlock,
  type ShangoDialogueBlock,
} from "../lib/conversation"
import {
  DEFAULT_INSTALLED_SKILL_IDS,
  DEFAULT_ENABLED_SKILL_IDS,
} from "../lib/skills"
import { DEFAULT_CONNECTED_CONNECTOR_IDS } from "../lib/connectors"
import {
  DEFAULT_DEPLOYMENT_RECORDS,
  normalizeDeploymentRecords,
  type DeploymentRecord,
} from "../lib/deployments"
import {
  loadPersistedProjectState,
  saveProjectStateSnapshot,
  loadPersistedUser,
  savePersistedUser,
  normalizeProject,
  normalizeProjects,
  mergePersistedProjects,
} from "../lib/persistence"
import {
  generateProjectResponse,
  type GenerationResult,
} from "../lib/generation"
import {
  deriveProjectArtifact,
  mergeWorkspaceFilesWithArtifact,
  updateProjectFile,
} from "../lib/workspace"
import {
  readUsagePeriod,
  recordGeneration,
  type UsagePeriod,
} from "../lib/usageMeter"

// ─── Types ────────────────────────────────────────────────────────────────────

export type { Project, Version }

export interface Toast {
  id: string
  message: string
  type: "default" | "success" | "error"
  action?: { label: string; onClick: () => void }
}

export interface Notification {
  id: string
  message: string
  read: boolean
  timestamp: string
  link?: string
}

export interface User {
  name: string
  email: string
  avatar?: string
  plan: "free" | "pro"
  // Usage metering shown in the auth/billing surfaces.
  creditsUsed?: number
  creditsTotal?: number
}

export type ModalType =
  | "share"
  | "deploy"
  | "export"
  | "auth"
  | "confirm"
  | "settings"
  | "project-settings"
  | null

export interface ConfirmPayload {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}

export interface CreateProjectOptions {
  model?: string
  mode?: "plan" | "build"
  name?: string
  description?: string
  template?: ProjectTemplateOrigin
}

interface AppState {
  user: User | null
  projects: Project[]
  activeProjectId: string | null
  persistenceError: string | null
  modal: ModalType
  confirmPayload: ConfirmPayload | null
  toasts: Toast[]
  isCommandPaletteOpen: boolean
  isShortcutsOpen: boolean
  isProfileOpen: boolean
  isNotificationsOpen: boolean
  notifications: Notification[]
  isForge: boolean
  installedSkills: string[] // skill IDs
  enabledSkills: string[] // subset of installed that are active
  connectedConnectors: string[] // connector IDs
  deploymentRecords: DeploymentRecord[]
  hasSeenOnboarding: boolean
}

type Action =
  | { type: "SET_USER"; payload: User | null }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "UPDATE_PROJECT"; payload: Partial<Project> & { id: string } }
  | { type: "DELETE_PROJECT"; payload: string }
  | { type: "STAR_PROJECT"; payload: string }
  | { type: "SET_ACTIVE_PROJECT"; payload: string | null }
  | { type: "OPEN_MODAL"; payload: ModalType }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_CONFIRM"; payload: ConfirmPayload | null }
  | { type: "PUSH_TOAST"; payload: Toast }
  | { type: "REMOVE_TOAST"; payload: string }
  | { type: "TOGGLE_COMMAND_PALETTE" }
  | { type: "TOGGLE_SHORTCUTS" }
  | { type: "TOGGLE_PROFILE" }
  | { type: "TOGGLE_NOTIFICATIONS" }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_ALL_READ" }
  | { type: "START_FORGE" }
  | { type: "END_FORGE" }
  | { type: "INSTALL_SKILL"; payload: string }
  | { type: "UNINSTALL_SKILL"; payload: string }
  | { type: "ENABLE_SKILL"; payload: string }
  | { type: "DISABLE_SKILL"; payload: string }
  | { type: "CONNECT_CONNECTOR"; payload: string }
  | { type: "DISCONNECT_CONNECTOR"; payload: string }
  | { type: "ADD_DEPLOYMENT"; payload: DeploymentRecord }
  | { type: "UPDATE_DEPLOYMENT"; payload: Partial<DeploymentRecord> & { id: string } }
  | { type: "SET_DEPLOYMENT_RECORDS"; payload: DeploymentRecord[] }
  | { type: "SET_ONBOARDED" }

const INITIAL_NOTIFICATIONS: Notification[] = []

const INITIAL: AppState = {
  user: null,
  projects: [],
  activeProjectId: null,
  persistenceError: null,
  modal: null,
  confirmPayload: null,
  toasts: [],
  isCommandPaletteOpen: false,
  isShortcutsOpen: false,
  isProfileOpen: false,
  isNotificationsOpen: false,
  notifications: INITIAL_NOTIFICATIONS,
  isForge: false,
  installedSkills: DEFAULT_INSTALLED_SKILL_IDS,
  enabledSkills: DEFAULT_ENABLED_SKILL_IDS,
  connectedConnectors: DEFAULT_CONNECTED_CONNECTOR_IDS,
  deploymentRecords: DEFAULT_DEPLOYMENT_RECORDS,
  hasSeenOnboarding: false,
}

/**
 * Migrates old project data from the `messages` format to the new `blocks` format.
 * This is a crucial function for backward compatibility.
 */
function migrateProjectToBlocks(project: any): Project {
  if (Array.isArray(project.blocks) && project.blocks.length > 0) {
    return project as Project;
  }

  if (Array.isArray(project.messages) && project.messages.length > 0) {
    const newBlocks: ConversationBlock[] = project.messages.map((msg: any) => {
      if (msg.role === 'user') {
        return createUserDialogueBlock(msg.content);
      }
      if (msg.role === 'assistant') {
        const block: ShangoDialogueBlock = {
          id: msg.id || generateId(),
          type: 'dialogue.shango',
          content: msg.content,
          createdAt: msg.timestamp || new Date().toISOString(),
          pending: msg.pending ?? false,
        };
        return block;
      }
      return null;
    }).filter(Boolean) as ConversationBlock[];

    const { messages, ...remaningProject } = project;
    return { ...remaningProject, blocks: newBlocks };
  }

  return project as Project;
}


function hydrateInitialState(): AppState {
  const persisted = loadPersistedProjectState()
  let persistedUser = loadPersistedUser()

  if (!persistedUser) {
    persistedUser = {
      name: "Test User",
      email: "test@example.com",
      plan: "free",
    }
  }

  if (persisted.state && Array.isArray(persisted.state.projects)) {
    const migratedProjects = persisted.state.projects.map(migrateProjectToBlocks);
    return {
      ...INITIAL,
      user: persistedUser,
      projects: normalizeProjects(migratedProjects as any[]),
      activeProjectId: persisted.state.activeProjectId,
      persistenceError: persisted.error ?? null,
    }
  }

  return {
    ...INITIAL,
    user: persistedUser,
    persistenceError: persisted.error ?? null,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload }
    case "ADD_PROJECT":
      return { ...state, projects: [action.payload, ...state.projects] }
    case "SET_PROJECTS":
      return { ...state, projects: action.payload }
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id
            ? normalizeProject({
                ...p,
                ...action.payload,
                lastEdited: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            : normalizeProject(p),
        ),
      }
    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
        activeProjectId:
          state.activeProjectId === action.payload
            ? null
            : state.activeProjectId,
      }
    case "STAR_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload ? { ...p, starred: !p.starred } : p,
        ),
      }
    case "SET_ACTIVE_PROJECT":
      return { ...state, activeProjectId: action.payload }
    case "OPEN_MODAL":
      return { ...state, modal: action.payload }
    case "CLOSE_MODAL":
      return { ...state, modal: null, confirmPayload: null }
    case "SET_CONFIRM":
      return { ...state, confirmPayload: action.payload }
    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts.slice(-2), action.payload] }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      }
    case "TOGGLE_COMMAND_PALETTE":
      return { ...state, isCommandPaletteOpen: !state.isCommandPaletteOpen }
    case "TOGGLE_SHORTCUTS":
      return { ...state, isShortcutsOpen: !state.isShortcutsOpen }
    case "TOGGLE_PROFILE":
      return { ...state, isProfileOpen: !state.isProfileOpen }
    case "TOGGLE_NOTIFICATIONS":
      return { ...state, isNotificationsOpen: !state.isNotificationsOpen }
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      }
    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }
    case "START_FORGE":
      return { ...state, isForge: true }
    case "END_FORGE":
      return { ...state, isForge: false }
    case "INSTALL_SKILL":
      if (state.installedSkills.includes(action.payload)) return state
      return {
        ...state,
        installedSkills: [...state.installedSkills, action.payload],
        enabledSkills: [...state.enabledSkills, action.payload],
      }
    case "UNINSTALL_SKILL":
      return {
        ...state,
        installedSkills: state.installedSkills.filter(
          (id) => id !== action.payload,
        ),
        enabledSkills: state.enabledSkills.filter(
          (id) => id !== action.payload,
        ),
      }
    case "ENABLE_SKILL":
      if (state.enabledSkills.includes(action.payload)) return state
      return {
        ...state,
        enabledSkills: [...state.enabledSkills, action.payload],
      }
    case "DISABLE_SKILL":
      return {
        ...state,
        enabledSkills: state.enabledSkills.filter(
          (id) => id !== action.payload,
        ),
      }
    case "CONNECT_CONNECTOR":
      if (state.connectedConnectors.includes(action.payload)) return state
      return {
        ...state,
        connectedConnectors: [...state.connectedConnectors, action.payload],
      }
    case "DISCONNECT_CONNECTOR":
      return {
        ...state,
        connectedConnectors: state.connectedConnectors.filter(
          (id) => id !== action.payload,
        ),
      }
    case "ADD_DEPLOYMENT":
      return {
        ...state,
        deploymentRecords: [action.payload, ...state.deploymentRecords],
      }
    case "UPDATE_DEPLOYMENT":
      return {
        ...state,
        deploymentRecords: state.deploymentRecords.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload } : d,
        ),
      }
    case "SET_DEPLOYMENT_RECORDS":
      return { ...state, deploymentRecords: action.payload }
    case "SET_ONBOARDED":
      return { ...state, hasSeenOnboarding: true }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  // Convenience helpers
  toast: (msg: string, type?: Toast["type"], action?: Toast["action"]) => void
  confirm: (payload: ConfirmPayload) => void
  openModal: (m: ModalType) => void
  closeModal: () => void
  createProject: (prompt: string, options?: CreateProjectOptions) => Project
  // Forge
  isForge: boolean
  startForge: () => void
  endForge: () => void
  // Aliases for Phase-based components
  projects: Project[]
  setProjects: (
    projects: Project[] | ((prev: Project[]) => Project[]),
  ) => boolean
  currentUser: User | null
  setCurrentUser: (u: User | null) => void
  setActiveProject: (id: string | null) => void
  persistenceError: string | null
  toasts: Toast[]
  addToast: (msg: string, type?: Toast["type"]) => void
  notifications: Notification[]
  addNotification: (msg: string) => void
  markAllRead: () => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  shortcutOverlayOpen: boolean
  setShortcutOverlayOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  authSheetOpen: boolean
  setAuthSheetOpen: (v: boolean) => void
  // Skills
  installedSkills: string[]
  enabledSkills: string[]
  installSkill: (id: string) => void
  uninstallSkill: (id: string) => void
  enableSkill: (id: string) => void
  disableSkill: (id: string) => void
  isSkillInstalled: (id: string) => boolean
  isSkillEnabled: (id: string) => boolean
  // Connectors
  connectedConnectors: string[]
  connectConnector: (id: string) => void
  disconnectConnector: (id: string) => void
  isConnectorConnected: (id: string) => boolean
  // Deployments
  deploymentRecords: DeploymentRecord[]
  addDeployment: (record: DeploymentRecord) => void
  updateDeployment: (id: string, update: Partial<DeploymentRecord>) => void
  // Workspace Editing
  updateWorkspaceFile: (path: string, content: string) => boolean
  // Usage metering
  usageMeter: UsagePeriod
  setPlan: (plan: "free" | "pro") => void
  // Server project sync
  loadServerProjects: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function createFallbackProject(): Project {
  const now = new Date().toISOString()
  return {
    id: "",
    name: "Untitled project",
    description: "",
    status: "DRAFT",
    lastEdited: now,
    updatedAt: now,
    createdAt: now,
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  }
}

export function applyGenerationResultToProjects(
  projects: Project[],
  projectId: string,
  result: GenerationResult,
  completedAt: string,
  mode: "plan" | "build" = "build",
): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId) return project

    const assistantBlock: ShangoDialogueBlock = {
      id: generateId(),
      type: "dialogue.shango",
      content: result.assistant,
      createdAt: completedAt,
      pending: false,
    }

    const pendingIndex = project.blocks.findIndex(
      (block) => block.type === "dialogue.shango" && block.pending,
    )
    const nextBlocks =
      pendingIndex >= 0
        ? project.blocks.map((block, index) =>
            index === pendingIndex
              ? { ...assistantBlock, id: block.id }
              : block,
          )
        : [...project.blocks, assistantBlock]

    // Mirror the same placeholder-replacement logic onto the messages array
    // so the chat transcript stays in sync with the conversation blocks.
    const pendingMessageIndex = project.messages.findIndex(
      (message) => message.role === "assistant" && message.pending,
    )
    const resolvedAssistantMessage: ChatMessage = {
      id: pendingMessageIndex >= 0 ? project.messages[pendingMessageIndex].id : generateId(),
      role: "assistant",
      content: result.assistant,
      timestamp: completedAt,
      pending: false,
    }
    const nextMessages =
      pendingMessageIndex >= 0
        ? project.messages.map((message, index) =>
            index === pendingMessageIndex ? resolvedAssistantMessage : message,
          )
        : [...project.messages, resolvedAssistantMessage]

    if (mode === "plan") {
      return {
        ...project,
        lastEdited: completedAt,
        updatedAt: completedAt,
        blocks: nextBlocks,
        messages: nextMessages,
        providerDiagnostics: result.diagnostics
          ? typeof result.diagnostics === "string"
            ? result.diagnostics
            : JSON.stringify(result.diagnostics)
          : project.providerDiagnostics,
      }
    }

    const artifactSnapshot = result.artifact
      ? { ...result.artifact, createdAt: completedAt }
      : project.artifact
    const derivedWorkspaceFiles = mergeWorkspaceFilesWithArtifact(
      project.files,
      artifactSnapshot,
      completedAt,
    )
    const derivedArtifact = deriveProjectArtifact(
      { ...project, files: derivedWorkspaceFiles, artifact: artifactSnapshot },
      completedAt,
    )
    const versions = project.versions.map((version) => {
      if (!version.isCurrent) return version
      return {
        ...version,
        artifact: derivedArtifact ?? version.artifact,
        assistantMessage: result.assistant,
      }
    })

    return {
      ...project,
      lastEdited: completedAt,
      updatedAt: completedAt,
      blocks: nextBlocks,
      messages: nextMessages,
      files: derivedWorkspaceFiles,
      artifact: derivedArtifact,
      versions,
      providerDiagnostics: result.diagnostics
        ? typeof result.diagnostics === "string"
          ? result.diagnostics
          : JSON.stringify(result.diagnostics)
        : project.providerDiagnostics,
    }
  })
}

const fallbackContextValue: AppContextValue = {
  state: INITIAL,
  dispatch: () => undefined,
  toast: () => undefined,
  confirm: () => undefined,
  openModal: () => undefined,
  closeModal: () => undefined,
  createProject: () => createFallbackProject(),
  isForge: false,
  startForge: () => undefined,
  endForge: () => undefined,
  projects: [],
  setProjects: () => true,
  currentUser: null,
  setCurrentUser: () => undefined,
  setActiveProject: () => undefined,
  persistenceError: null,
  toasts: [],
  addToast: () => undefined,
  notifications: [],
  addNotification: () => undefined,
  markAllRead: () => undefined,
  commandPaletteOpen: false,
  setCommandPaletteOpen: () => undefined,
  shortcutOverlayOpen: false,
  setShortcutOverlayOpen: () => undefined,
  authSheetOpen: false,
  setAuthSheetOpen: () => undefined,
  installedSkills: DEFAULT_INSTALLED_SKILL_IDS,
  enabledSkills: DEFAULT_ENABLED_SKILL_IDS,
  installSkill: () => undefined,
  uninstallSkill: () => undefined,
  enableSkill: () => undefined,
  disableSkill: () => undefined,
  isSkillInstalled: () => false,
  isSkillEnabled: () => false,
  connectedConnectors: DEFAULT_CONNECTED_CONNECTOR_IDS,
  connectConnector: () => undefined,
  disconnectConnector: () => undefined,
  isConnectorConnected: () => false,
  deploymentRecords: DEFAULT_DEPLOYMENT_RECORDS,
  addDeployment: () => undefined,
  updateDeployment: () => undefined,
  updateWorkspaceFile: () => false,
  usageMeter: readUsagePeriod("free"),
  setPlan: () => undefined,
  loadServerProjects: () => Promise.resolve(),
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrateInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // Usage metering — seeded from persisted localStorage; updated on each generation.
  const [usageMeter, setUsageMeter] = useState<UsagePeriod>(() =>
    readUsagePeriod((loadPersistedUser()?.plan ?? "free") as "free" | "pro"),
  )

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const response = await fetch("/api/deployments")
        if (!response.ok) throw new Error("Unable to load deployments")
        const body = await response.json().catch(() => null)
        const remoteDeployments = Array.isArray(body)
          ? body
          : Array.isArray(body?.deployments)
            ? body.deployments
            : []
        if (!mounted) return
        if (remoteDeployments.length > 0) {
          dispatch({
            type: "SET_DEPLOYMENT_RECORDS",
            payload: normalizeDeploymentRecords(
              remoteDeployments,
              DEFAULT_DEPLOYMENT_RECORDS,
            ),
          })
        }
      } catch {
        // keep seeded deployment history when the backend is unavailable
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        })
        if (!res.ok || !mounted) return
        const body = await res.json().catch(() => null)
        if (!mounted) return
        const raw = body?.user
        if (
          !raw ||
          typeof raw.name !== "string" ||
          typeof raw.email !== "string"
        )
          return
        const serverUser: User = {
          name: raw.name,
          email: raw.email,
          avatar: typeof raw.avatar === "string" ? raw.avatar : "",
          plan: raw.plan === "pro" ? "pro" : "free",
        }
        const current = stateRef.current.user
        if (
          !current ||
          current.email !== serverUser.email ||
          current.plan !== serverUser.plan
        ) {
          dispatch({ type: "SET_USER", payload: serverUser })
          savePersistedUser(serverUser)
          setUsageMeter(readUsagePeriod(serverUser.plan))
        }

        try {
          const projRes = await fetch("/api/projects", {
            credentials: "same-origin",
          })
          if (!projRes.ok || !mounted) return
          const projBody = await projRes.json().catch(() => null)
          if (!mounted) return
          const remote: unknown[] = Array.isArray(projBody?.projects)
            ? projBody.projects
            : Array.isArray(projBody)
              ? projBody
              : []
          if (remote.length > 0) {
            const next = normalizeProjects(
              mergePersistedProjects(
                stateRef.current.projects,
                remote as any[],
              ),
            )
            dispatch({ type: "SET_PROJECTS", payload: next })
            stateRef.current = { ...stateRef.current, projects: next }
            saveProjectStateSnapshot(next, stateRef.current.activeProjectId)
          }
        } catch {
          // project fetch failed — continue with local state
        }
      } catch {
        // session endpoint unavailable — continue with persisted state
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const toast = useCallback(
    (
      msg: string,
      type: Toast["type"] = "default",
      action?: Toast["action"],
    ) => {
      const id = generateId()
      dispatch({
        type: "PUSH_TOAST",
        payload: { id, message: msg, type, action },
      })
      setTimeout(() => dispatch({ type: "REMOVE_TOAST", payload: id }), 4000)
    },
    [],
  )

  const confirm = useCallback((payload: ConfirmPayload) => {
    dispatch({ type: "SET_CONFIRM", payload })
    dispatch({ type: "OPEN_MODAL", payload: "confirm" })
  }, [])

  const openModal = useCallback(
    (m: ModalType) => dispatch({ type: "OPEN_MODAL", payload: m }),
    [],
  )
  const closeModal = useCallback(() => dispatch({ type: "CLOSE_MODAL" }), [])

  const createProject = useCallback(
    (prompt: string, options: CreateProjectOptions = {}): Project => {
      const now = new Date().toISOString()
      const generationMode = options.mode ?? "build"
      const ideaBlock = createIdeaBlock(prompt)
      const pendingShangoBlock: ShangoDialogueBlock = {
        id: generateId(),
        type: "dialogue.shango",
        content: "Preparing your workspace and drafting the first version…",
        createdAt: now,
        pending: true,
      }
      const p: Project = {
        id: generateId(),
        name: options.name?.trim().slice(0, 48) || prompt.slice(0, 48),
        description: options.description?.trim() ?? "",
        status: "DRAFT",
        lastEdited: now,
        updatedAt: now,
        createdAt: now,
        starred: false,
        blocks: [ideaBlock, pendingShangoBlock],
        messages: [
          {
            id: generateId(),
            role: "user",
            content: prompt,
            timestamp: now,
          } satisfies ChatMessage,
        ],
        versions:
          generationMode === "build"
            ? [
                {
                  id: generateId(),
                  number: 1,
                  label:
                    options.name?.trim().slice(0, 48) || prompt.slice(0, 48),
                  timestamp: now,
                  prompt,
                  isCurrent: true,
                  createdAt: now,
                  trigger: { type: "initial-generation", prompt },
                },
              ]
            : [],
        initialPrompt: prompt,
        template: options.template,
        generatingAt: now,
      }
      const nextProjects = [
        normalizeProject(p),
        ...normalizeProjects(stateRef.current.projects),
      ]
      const persisted = saveProjectStateSnapshot(nextProjects, p.id)
      if (!persisted.ok) {
        toast(persisted.error, "error")
        return p
      }
      dispatch({ type: "ADD_PROJECT", payload: p })
      dispatch({ type: "SET_ACTIVE_PROJECT", payload: p.id })
      stateRef.current = {
        ...stateRef.current,
        projects: nextProjects,
        activeProjectId: p.id,
      }

      void (async () => {
        try {
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: p.id,
              name: p.name,
              description: p.description,
              status: p.status,
              blocks: p.blocks,
              versions: p.versions,
              initialPrompt: p.initialPrompt,
              template: p.template,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const txt = await res.text()
              toast(`Project persist failed: ${res.status} ${txt}`, "error")
              return
            }
            const serverProject = await res.json()
            setProjects((prev) =>
              prev.map((proj) =>
                proj.id === p.id
                  ? {
                      ...proj,
                      // @ts-ignore
                      serverId: serverProject.id,
                    }
                  : proj,
              ),
            )
          })
        } catch (err) {
          // non-fatal
        }
      })()

      void (async () => {
        try {
          const result = await generateProjectResponse(prompt, {
            model: options.model,
            mode: options.mode,
          })
          const completedAt = new Date().toISOString()
          const plan = (stateRef.current.user?.plan ?? "free") as "free" | "pro"
          setUsageMeter(recordGeneration(plan))
          const updateSucceeded = setProjects((prev) => {
            const withCleared = prev.map((proj) =>
              proj.id === p.id ? { ...proj, generatingAt: undefined } : proj,
            )
            return applyGenerationResultToProjects(
              withCleared,
              p.id,
              result,
              completedAt,
              options.mode ?? "build",
            )
          })
          if (!updateSucceeded) {
            toast("Unable to persist the generated project update.", "error")
          }
          addToast(
            result.usedFallback
              ? "Plan generated with fallback"
              : options.mode === "plan"
                ? "Plan ready"
                : "Project generated",
            result.usedFallback ? "default" : "success",
          )
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Generation failed"
          const applyFailure = (projects: Project[]): Project[] =>
            projects.map((project) => {
              if (project.id !== p.id) return project
              const assistantBlock: ShangoDialogueBlock = {
                id: generateId(),
                type: "dialogue.shango",
                content:
                  "The generation request could not be completed. Please try again.",
                createdAt: new Date().toISOString(),
              }
              return {
                ...project,
                lastEdited: now,
                updatedAt: now,
                blocks: [...project.blocks, assistantBlock],
                generatingAt: undefined,
              }
            })
          const updateSucceeded = setProjects((prev) => applyFailure(prev))
          if (!updateSucceeded) {
            toast("Unable to persist the failed generation update.", "error")
          }
          addToast(message, "error")
        }
      })()

      return p
    },
    [toast],
  )

  const startForge = useCallback(() => dispatch({ type: "START_FORGE" }), [])
  const endForge = useCallback(() => dispatch({ type: "END_FORGE" }), [])
  const setCurrentUser = useCallback(
    (u: User | null) => {
      dispatch({ type: "SET_USER", payload: u })
      const persisted = savePersistedUser(u)
      if (!persisted.ok) {
        toast(persisted.error, "error")
      }
    },
    [toast],
  )
  const addToast = useCallback(
    (msg: string, type: Toast["type"] = "default") => toast(msg, type),
    [toast],
  )
  const addNotification = useCallback((msg: string) => {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: generateId(),
        message: msg,
        read: false,
        timestamp: new Date().toISOString(),
      },
    })
  }, [])
  const markAllRead = useCallback(() => dispatch({ type: "MARK_ALL_READ" }), [])
  const setActiveProject = useCallback(
    (id: string | null) => {
      const resolvedId =
        id && stateRef.current.projects.some((project) => project.id === id)
          ? id
          : null
      dispatch({ type: "SET_ACTIVE_PROJECT", payload: resolvedId })
      stateRef.current = { ...stateRef.current, activeProjectId: resolvedId }

      const persisted = saveProjectStateSnapshot(
        stateRef.current.projects,
        resolvedId,
      )
      if (!persisted.ok) {
        toast(persisted.error, "error")
      }
    },
    [toast],
  )
  const setProjects = useCallback(
    (updater: Project[] | ((prev: Project[]) => Project[])): boolean => {
      const currentProjects = stateRef.current.projects
      const next = normalizeProjects(
        typeof updater === "function" ? updater(currentProjects) : updater,
      )
      const prevActiveProjectId = stateRef.current.activeProjectId
      const nextActiveProjectId =
        prevActiveProjectId &&
        !next.some((project) => project.id === prevActiveProjectId)
          ? null
          : prevActiveProjectId

      dispatch({ type: "SET_PROJECTS", payload: next })
      if (nextActiveProjectId !== prevActiveProjectId) {
        dispatch({ type: "SET_ACTIVE_PROJECT", payload: nextActiveProjectId })
      }
      stateRef.current = {
        ...stateRef.current,
        projects: next,
        activeProjectId: nextActiveProjectId,
      }

      const persisted = saveProjectStateSnapshot(next, nextActiveProjectId)
      if (!persisted.ok) {
        toast(persisted.error, "error")
        return false
      }

      void (async () => {
        try {
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          })
        } catch {
          // ignore remote sync failures in dev mode
        }
      })()

      return true
    },
    [toast],
  )
  const setCommandPaletteOpen = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(state.isCommandPaletteOpen) : v
      if (next !== state.isCommandPaletteOpen)
        dispatch({ type: "TOGGLE_COMMAND_PALETTE" })
    },
    [state.isCommandPaletteOpen],
  )
  const setShortcutOverlayOpen = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(state.isShortcutsOpen) : v
      if (next !== state.isShortcutsOpen) dispatch({ type: "TOGGLE_SHORTCUTS" })
    },
    [state.isShortcutsOpen],
  )
  const setAuthSheetOpen = useCallback((v: boolean) => {
    if (v) dispatch({ type: "OPEN_MODAL", payload: "auth" })
    else dispatch({ type: "CLOSE_MODAL" })
  }, [])

  const installSkill = useCallback(
    (id: string) => dispatch({ type: "INSTALL_SKILL", payload: id }),
    [],
  )
  const uninstallSkill = useCallback(
    (id: string) => dispatch({ type: "UNINSTALL_SKILL", payload: id }),
    [],
  )
  const enableSkill = useCallback(
    (id: string) => dispatch({ type: "ENABLE_SKILL", payload: id }),
    [],
  )
  const disableSkill = useCallback(
    (id: string) => dispatch({ type: "DISABLE_SKILL", payload: id }),
    [],
  )
  const isSkillInstalled = useCallback(
    (id: string) => state.installedSkills.includes(id),
    [state.installedSkills],
  )
  const isSkillEnabled = useCallback(
    (id: string) => state.enabledSkills.includes(id),
    [state.enabledSkills],
  )

  const connectConnector = useCallback(
    (id: string) => dispatch({ type: "CONNECT_CONNECTOR", payload: id }),
    [],
  )
  const disconnectConnector = useCallback(
    (id: string) => dispatch({ type: "DISCONNECT_CONNECTOR", payload: id }),
    [],
  )
  const isConnectorConnected = useCallback(
    (id: string) => state.connectedConnectors.includes(id),
    [state.connectedConnectors],
  )

  const addDeployment = useCallback(
    (record: DeploymentRecord) =>
      dispatch({ type: "ADD_DEPLOYMENT", payload: record }),
    [],
  )
  const updateDeployment = useCallback(
    (id: string, update: Partial<DeploymentRecord>) =>
      dispatch({ type: "UPDATE_DEPLOYMENT", payload: { ...update, id } }),
    [],
  )

  const updateWorkspaceFile = useCallback(
    (path: string, content: string): boolean => {
      const activeId = stateRef.current.activeProjectId
      if (!activeId) return false
      const now = new Date().toISOString()

      return setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeId) return p
          const updatedFiles = updateProjectFile(p.files, path, content, now)
          const updatedProject = {
            ...p,
            files: updatedFiles,
            lastEdited: now,
            updatedAt: now,
          }
          const derivedArtifact = deriveProjectArtifact(updatedProject, now)
          return {
            ...updatedProject,
            artifact: derivedArtifact,
          }
        }),
      )
    },
    [setProjects],
  )

  const setPlan = useCallback((plan: "free" | "pro") => {
    const current = stateRef.current.user
    if (!current) return
    const updated: User = { ...current, plan }
    dispatch({ type: "SET_USER", payload: updated })
    savePersistedUser(updated)
    setUsageMeter(readUsagePeriod(plan))
  }, [])

  const loadServerProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" })
      if (!res.ok) return
      const body = await res.json().catch(() => null)
      const remote: unknown[] = Array.isArray(body?.projects)
        ? body.projects
        : Array.isArray(body)
          ? body
          : []
      if (remote.length === 0) return
      const next = normalizeProjects(
        mergePersistedProjects(stateRef.current.projects, remote as any[]),
      )
      dispatch({ type: "SET_PROJECTS", payload: next })
      stateRef.current = { ...stateRef.current, projects: next }
      saveProjectStateSnapshot(next, stateRef.current.activeProjectId)
    } catch {
      // network unavailable — keep local state
    }
  }, [])

  const value: AppContextValue = {
    state,
    dispatch,
    toast,
    confirm,
    openModal,
    closeModal,
    createProject,
    isForge: state.isForge,
    startForge,
    endForge,
    projects: state.projects,
    setProjects,
    currentUser: state.user,
    setCurrentUser,
    setActiveProject,
    persistenceError: state.persistenceError,
    toasts: state.toasts,
    addToast,
    notifications: state.notifications,
    addNotification,
    markAllRead,
    commandPaletteOpen: state.isCommandPaletteOpen,
    setCommandPaletteOpen,
    shortcutOverlayOpen: state.isShortcutsOpen,
    setShortcutOverlayOpen,
    authSheetOpen: state.modal === "auth",
    setAuthSheetOpen,
    installedSkills: state.installedSkills,
    enabledSkills: state.enabledSkills,
    installSkill,
    uninstallSkill,
    enableSkill,
    disableSkill,
    isSkillInstalled,
    isSkillEnabled,
    connectedConnectors: state.connectedConnectors,
    connectConnector,
    disconnectConnector,
    isConnectorConnected,
    deploymentRecords: state.deploymentRecords,
    addDeployment,
    updateDeployment,
    updateWorkspaceFile,
    usageMeter,
    setPlan,
    loadServerProjects,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  return context ?? fallbackContextValue
}
