import {
  useState,
  useCallback,
  useEffect,
  useRef,
  lazy,
  Suspense,
  type ReactNode,
} from "react"
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom"
import { AppProvider, useApp } from "./store/AppContext"
import {
  mergePersistedProjects,
  retryPendingProjectSyncs,
  syncProjectToBackend,
} from "./lib/persistence"
import IntroSequence from "./components/IntroSequence"
import ToastStack from "./components/ToastStack"
import CommandPalette from "./components/CommandPalette"
import KeyboardShortcutOverlay from "./components/KeyboardShortcutOverlay"
import AuthSheet from "./components/AuthSheet"
import ConfirmationModal from "./components/ConfirmationModal"
import NetworkErrorBanner from "./components/NetworkErrorBanner"

const HomePage = lazy(() => import("./pages/HomePage"))
const BuilderScreen = lazy(() => import("./pages/BuilderScreen"))
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"))
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"))
const SkillsPage = lazy(() => import("./pages/SkillsPage"))
const DeploymentPage = lazy(() => import("./pages/DeploymentPage"))
const CommunityPage = lazy(() => import("./pages/CommunityPage"))

function PageLoadBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          style={{
            minHeight: "100vh",
            background: "#080809",
            color: "rgba(255,255,255,0.55)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-geist)",
          }}
        >
          Opening workspace…
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function RootLayout() {
  const { state, closeModal, addToast } = useApp()
  const [networkError, setNetworkError] = useState<string | null>(() =>
    typeof navigator !== "undefined" && !navigator.onLine
      ? "You are offline. Your work stays on this device and will sync when you reconnect."
      : null,
  )
  const projectsRef = useRef(state.projects)
  useEffect(() => {
    projectsRef.current = state.projects
  }, [state.projects])

  useEffect(() => {
    const markOffline = () =>
      setNetworkError(
        "You are offline. Your work stays on this device and will sync when you reconnect.",
      )
    const syncWhenOnline = () => {
      setNetworkError(null)
      void Promise.all([
        retryPendingProjectSyncs(projectsRef.current),
        Promise.all(projectsRef.current.map(syncProjectToBackend)),
      ]).then(([retried, results]) => {
        if (retried > 0 || results.some(Boolean))
          addToast("Connection restored — local work synced", "success")
      })
    }
    window.addEventListener("offline", markOffline)
    window.addEventListener("online", syncWhenOnline)
    return () => {
      window.removeEventListener("offline", markOffline)
      window.removeEventListener("online", syncWhenOnline)
    }
  }, [addToast])

  useEffect(() => {
    const applyMotionPreference = () => {
      try {
        const settings = JSON.parse(
          window.localStorage.getItem("shango_settings") ?? "{}",
        )
        document.documentElement.dataset.reduceMotion =
          settings.motion === true ? "true" : "false"
      } catch {
        document.documentElement.dataset.reduceMotion = "false"
      }
    }
    applyMotionPreference()
    window.addEventListener("shango-preferences-changed", applyMotionPreference)
    return () =>
      window.removeEventListener(
        "shango-preferences-changed",
        applyMotionPreference,
      )
  }, [])

  return (
    <>
      <NetworkErrorBanner
        message={networkError ?? undefined}
        onDismiss={() => setNetworkError(null)}
      />
      <Outlet />
      <ToastStack />
      <CommandPalette />
      <KeyboardShortcutOverlay />
      <AuthSheet open={state.modal === "auth"} onClose={closeModal} />
      {state.modal === "confirm" && state.confirmPayload && (
        <ConfirmationModal
          open={true}
          onClose={closeModal}
          onConfirm={() => {
            state.confirmPayload!.onConfirm()
            closeModal()
          }}
          title={state.confirmPayload.title}
          message={state.confirmPayload.description}
          confirmLabel={state.confirmPayload.confirmLabel}
        />
      )}
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: (
          <PageLoadBoundary>
            <HomePage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/projects",
        element: (
          <PageLoadBoundary>
            <ProjectsPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/project/:id",
        element: (
          <PageLoadBoundary>
            <BuilderScreen />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/settings",
        element: (
          <PageLoadBoundary>
            <SettingsPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/templates",
        element: (
          <PageLoadBoundary>
            <TemplatesPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/integrations",
        element: (
          <PageLoadBoundary>
            <IntegrationsPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/skills",
        element: (
          <PageLoadBoundary>
            <SkillsPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/deployments",
        element: (
          <PageLoadBoundary>
            <DeploymentPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/community",
        element: (
          <PageLoadBoundary>
            <CommunityPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/community/:id",
        element: (
          <PageLoadBoundary>
            <CommunityPage />
          </PageLoadBoundary>
        ),
      },
      {
        path: "/community/builder/:username",
        element: (
          <PageLoadBoundary>
            <CommunityPage />
          </PageLoadBoundary>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

function AppShell() {
  const [introDone, setIntroDone] = useState(false)
  const handleIntroDone = useCallback(() => setIntroDone(true), [])

  const { setCurrentUser, setProjects, addToast } = useApp()

  // Capture setProjects and addToast in refs so the hydration effect below
  // can call them without listing them as reactive dependencies. Both are
  // stable callbacks from AppContext but their *references* change whenever
  // project state mutates (because their useCallback deps include `toast`).
  // Listing them as deps would cause this effect to re-fire every time a
  // project is created — overwriting optimistic local state with stale server data.
  const setProjectsRef = useRef(setProjects)
  const addToastRef = useRef(addToast)
  useEffect(() => {
    setProjectsRef.current = setProjects
  }, [setProjects])
  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  // Attempt to restore a session and available projects from the backend on mount.
  // Fires strictly once: deps are [setCurrentUser] only (stable callback).
  // Non-blocking and tolerant of failures; remote projects are merged additively.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [sessionRes, projectsRes] = await Promise.all([
          fetch("/api/me", { credentials: "same-origin" }).catch(() => null),
          fetch("/api/projects", { credentials: "same-origin" }).catch(
            () => null,
          ),
        ])

        if (!mounted) return

        if (sessionRes?.ok) {
          const body = await sessionRes.json().catch(() => null)
          const possibleUser =
            body && typeof body === "object" && "user" in body
              ? (body as any).user
              : body
          if (possibleUser && typeof possibleUser.name === "string") {
            setCurrentUser(possibleUser)
          }
        }

        if (projectsRes?.ok) {
          const responseBody = await projectsRes.json().catch(() => null)
          const remoteProjects = Array.isArray(responseBody)
            ? responseBody
            : Array.isArray(responseBody?.projects)
              ? responseBody.projects
              : []
          if (remoteProjects.length > 0) {
            setProjectsRef.current((prev) =>
              mergePersistedProjects(prev, remoteProjects as any),
            )
          }
        }
      } catch {
        // ignore — keep local state
      }
    })()
    return () => {
      mounted = false
    }
  }, [setCurrentUser]) // ← intentionally excludes setProjects / addToast (captured via ref above)

  return (
    <>
      {!introDone && <IntroSequence onComplete={handleIntroDone} />}
      <RouterProvider router={router} />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
