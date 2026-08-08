import { useState, useCallback, useRef } from "react"

export interface BuildOrchestrationStep {
  id: "understanding" | "architecture" | "execution" | "typecheck" | "build_verify" | "preview_sync"
  title: string
  subtitle: string
  status: "idle" | "running" | "completed" | "failed"
  durationMs?: number
  detail?: string
}

export interface GranularFileChange {
  path: string
  type: "added" | "modified" | "deleted"
  status: "queued" | "writing" | "completed"
  linesAdded?: number
}

export interface OrchestrationState {
  isOrchestrating: boolean
  currentStepId: BuildOrchestrationStep["id"] | null
  steps: BuildOrchestrationStep[]
  fileChanges: GranularFileChange[]
  activeMessage: string
  progressPercent: number
  startTime: number | null
  endTime: number | null
}

const INITIAL_STEPS: BuildOrchestrationStep[] = [
  {
    id: "understanding",
    title: "Understanding Intent & Requirements",
    subtitle: "Extracting functional constraints, data models & UI patterns",
    status: "idle",
  },
  {
    id: "architecture",
    title: "Architecture & Boundary Lock",
    subtitle: "Locking middleware, API routing & type safety interfaces",
    status: "idle",
  },
  {
    id: "execution",
    title: "Code Generation & File Creation",
    subtitle: "Constructing components, routes & state management",
    status: "idle",
  },
  {
    id: "typecheck",
    title: "TypeScript & Static Analysis",
    subtitle: "Validating types, imports & syntax rules",
    status: "idle",
  },
  {
    id: "build_verify",
    title: "Build Verification & Bundle Sync",
    subtitle: "Ensuring clean production bundle & zero runtime regressions",
    status: "idle",
  },
  {
    id: "preview_sync",
    title: "Living Workspace Preview Sync",
    subtitle: "Hot-syncing state & refreshing interactive evidence layer",
    status: "idle",
  },
]

export function useBuildOrchestration() {
  const [state, setState] = useState<OrchestrationState>({
    isOrchestrating: false,
    currentStepId: null,
    steps: INITIAL_STEPS,
    fileChanges: [],
    activeMessage: "System idle",
    progressPercent: 0,
    startTime: null,
    endTime: null,
  })

  const timerRef = useRef<NodeJS.Timeout[]>([])

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []
  }, [])

  const startOrchestration = useCallback(
    (_prompt: string, targetFiles: string[] = []) => {
      clearTimers()

      const filesList: GranularFileChange[] =
        targetFiles.length > 0
          ? targetFiles.map((path) => ({
              path,
              type:
                path.includes("route") || path.includes("page")
                  ? "added"
                  : "modified",
              status: "queued",
              linesAdded: Math.floor(Math.random() * 40) + 12,
            }))
          : [
              {
                path: "app/(auth)/login/page.tsx",
                type: "added",
                status: "queued",
                linesAdded: 48,
              },
              {
                path: "app/(auth)/register/page.tsx",
                type: "added",
                status: "queued",
                linesAdded: 52,
              },
              {
                path: "app/api/auth/login/route.ts",
                type: "added",
                status: "queued",
                linesAdded: 36,
              },
              {
                path: "lib/auth.ts",
                type: "modified",
                status: "queued",
                linesAdded: 24,
              },
              {
                path: "middleware.ts",
                type: "modified",
                status: "queued",
                linesAdded: 16,
              },
            ]

      setState({
        isOrchestrating: true,
        currentStepId: "understanding",
        steps: INITIAL_STEPS.map((s, idx) =>
          idx === 0 ? { ...s, status: "running" } : s,
        ),
        fileChanges: filesList,
        activeMessage: "Analyzing user direction...",
        progressPercent: 5,
        startTime: Date.now(),
        endTime: null,
      })

      // Step 1 -> Step 2 (Understanding to Architecture) after 400ms
      const t1 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepId: "architecture",
          progressPercent: 25,
          activeMessage: "Locking architecture boundaries & security rules...",
          steps: prev.steps.map((s) => {
            if (s.id === "understanding")
              return { ...s, status: "completed", durationMs: 400 }
            if (s.id === "architecture") return { ...s, status: "running" }
            return s
          }),
        }))
      }, 400)
      timerRef.current.push(t1)

      // Step 2 -> Step 3 (Architecture to Execution) after 900ms
      const t2 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepId: "execution",
          progressPercent: 50,
          activeMessage: "Executing code generation & writing files...",
          fileChanges: prev.fileChanges.map((f, idx) =>
            idx === 0 ? { ...f, status: "writing" } : f,
          ),
          steps: prev.steps.map((s) => {
            if (s.id === "architecture")
              return { ...s, status: "completed", durationMs: 500 }
            if (s.id === "execution") return { ...s, status: "running" }
            return s
          }),
        }))
      }, 900)
      timerRef.current.push(t2)

      // Simulating file writing progress during execution
      const t3 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          fileChanges: prev.fileChanges.map((f) => ({
            ...f,
            status: "completed",
          })),
          progressPercent: 70,
        }))
      }, 1500)
      timerRef.current.push(t3)

      // Step 3 -> Step 4 (Typecheck) after 1800ms
      const t4 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepId: "typecheck",
          progressPercent: 82,
          activeMessage: "Running static TypeScript verification...",
          steps: prev.steps.map((s) => {
            if (s.id === "execution")
              return { ...s, status: "completed", durationMs: 900 }
            if (s.id === "typecheck") return { ...s, status: "running" }
            return s
          }),
        }))
      }, 1800)
      timerRef.current.push(t4)

      // Step 4 -> Step 5 (Build Verify) after 2300ms
      const t5 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepId: "build_verify",
          progressPercent: 92,
          activeMessage: "Verifying zero runtime build errors...",
          steps: prev.steps.map((s) => {
            if (s.id === "typecheck")
              return { ...s, status: "completed", durationMs: 500 }
            if (s.id === "build_verify") return { ...s, status: "running" }
            return s
          }),
        }))
      }, 2300)
      timerRef.current.push(t5)

      // Step 5 -> Step 6 (Preview Sync) after 2700ms
      const t6 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepId: "preview_sync",
          progressPercent: 98,
          activeMessage: "Hot-syncing living workspace preview...",
          steps: prev.steps.map((s) => {
            if (s.id === "build_verify")
              return { ...s, status: "completed", durationMs: 400 }
            if (s.id === "preview_sync") return { ...s, status: "running" }
            return s
          }),
        }))
      }, 2700)
      timerRef.current.push(t6)

      // Finish Orchestration after 3100ms
      const t7 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isOrchestrating: false,
          currentStepId: null,
          progressPercent: 100,
          activeMessage: "All checks passed. Preview updated.",
          endTime: Date.now(),
          steps: prev.steps.map((s) => ({ ...s, status: "completed" })),
        }))
      }, 3100)
      timerRef.current.push(t7)
    },
    [clearTimers],
  )

  const cancelOrchestration = useCallback(() => {
    clearTimers()
    setState((prev) => ({
      ...prev,
      isOrchestrating: false,
      activeMessage: "Build cancelled",
    }))
  }, [clearTimers])

  return {
    orchestrationState: state,
    startOrchestration,
    cancelOrchestration,
  }
}
