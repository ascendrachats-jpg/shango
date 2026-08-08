import _React, { useState, useEffect, useRef } from "react"

export interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "http" | "system"
  stream: "stdout" | "stderr"
  message: string
  statusCode?: number
  latencyMs?: number
  path?: string
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    level: "system",
    stream: "stdout",
    message:
      "[CloudRun] Container instance cr-singapore-014a initialized. Binding to 0.0.0.0:3000",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 3.8).toISOString(),
    level: "system",
    stream: "stdout",
    message:
      "[Vite Server] Production build loaded. Vite SPA & API endpoints active.",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 3.5).toISOString(),
    level: "info",
    stream: "stdout",
    message:
      "[Database] Connected to Cloud SQL PostgreSQL instance (sslmode=require, pool=10)",
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    level: "http",
    stream: "stdout",
    message: "GET /api/health 200",
    statusCode: 200,
    latencyMs: 3.2,
    path: "/api/health",
  },
  {
    id: "log-5",
    timestamp: new Date(Date.now() - 1000 * 60 * 2.2).toISOString(),
    level: "http",
    stream: "stdout",
    message: "GET / 200",
    statusCode: 200,
    latencyMs: 12.4,
    path: "/",
  },
  {
    id: "log-6",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.8).toISOString(),
    level: "info",
    stream: "stdout",
    message: "[Auth] Verified JWT session for user redtalkz2@gmail.com",
  },
  {
    id: "log-7",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.1).toISOString(),
    level: "warn",
    stream: "stdout",
    message:
      "[Memory] Heap usage 148MB exceeds 128MB soft threshold. Garbage collection scheduled.",
  },
  {
    id: "log-8",
    timestamp: new Date(Date.now() - 1000 * 30).toISOString(),
    level: "http",
    stream: "stdout",
    message: "POST /api/generate 200",
    statusCode: 200,
    latencyMs: 142.8,
    path: "/api/generate",
  },
]

const SAMPLE_LIVE_MESSAGES = [
  {
    level: "http" as const,
    stream: "stdout" as const,
    message: "GET /api/projects 200",
    statusCode: 200,
    latencyMs: 8.4,
    path: "/api/projects",
  },
  {
    level: "http" as const,
    stream: "stdout" as const,
    message: "POST /api/sync 200",
    statusCode: 200,
    latencyMs: 18.2,
    path: "/api/sync",
  },
  {
    level: "info" as const,
    stream: "stdout" as const,
    message: "[Sync] AST cache re-indexed 4 files in 12ms",
  },
  {
    level: "system" as const,
    stream: "stdout" as const,
    message: "[Heartbeat] Container health ping OK (200ms)",
  },
  {
    level: "warn" as const,
    stream: "stdout" as const,
    message: "[RateLimiter] IP 10.42.0.1 requests at 85/min threshold",
  },
  {
    level: "http" as const,
    stream: "stdout" as const,
    message: "GET /api/metrics 200",
    statusCode: 200,
    latencyMs: 4.1,
    path: "/api/metrics",
  },
  {
    level: "error" as const,
    stream: "stderr" as const,
    message: "[PostgreSQL] Connection pool warning: 8/10 sockets active",
  },
]

export default function ContainerLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [isLive, setIsLive] = useState(true)
  const [filterText, setFilterText] = useState("")
  const [selectedLevel, setSelectedLevel] =
    useState<"all" | "stdout" | "stderr" | "http" | "error">("all")
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Live log simulation timer
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      const sample =
        SAMPLE_LIVE_MESSAGES[
          Math.floor(Math.random() * SAMPLE_LIVE_MESSAGES.length)
        ]
      const newEntry: LogEntry = {
        id:
          "log-" +
          Date.now() +
          "-" +
          Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        ...sample,
      }
      setLogs((prev) => [...prev.slice(-150), newEntry])
    }, 2800)
    return () => clearInterval(interval)
  }, [isLive])

  // Auto-scroll handler
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedLevel === "stdout" && log.stream !== "stdout") return false
    if (selectedLevel === "stderr" && log.stream !== "stderr") return false
    if (selectedLevel === "http" && log.level !== "http") return false
    if (
      selectedLevel === "error" &&
      log.level !== "error" &&
      log.level !== "warn"
    )
      return false

    if (filterText) {
      const q = filterText.toLowerCase()
      return (
        log.message.toLowerCase().includes(q) ||
        (log.path && log.path.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleClear = () => setLogs([])

  const handleDownloadLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.stream.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}`,
      )
      .join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shango-cloudrun-container-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="flex flex-col gap-4 max-w-4xl"
      style={{ animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)" }}
    >
      {/* Container Health Stats Ribbon */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold text-white"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                Cloud Run Container #cr-singapore-014a
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                RUNNING (PORT 3000)
              </span>
            </div>
            <p
              className="text-[11px] text-zinc-400 mt-0.5"
              style={{ fontFamily: "var(--font-mono-jetbrains)" }}
            >
              Image: gcr.io/shango-builds/app:v1.4.2 · Region: asia-southeast1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-300 font-mono">
          <div>
            <span className="text-zinc-500 text-[10px] block">
              CPU UTILIZATION
            </span>
            <span className="text-emerald-400 font-medium">1.8%</span> / 1.0
            vCPU
          </div>
          <div
            style={{ width: 1, height: 24, background: "var(--border-subtle)" }}
          />
          <div>
            <span className="text-zinc-500 text-[10px] block">
              MEMORY USAGE
            </span>
            <span className="text-zinc-200 font-medium">142 MB</span> / 512 MB
          </div>
          <div
            style={{ width: 1, height: 24, background: "var(--border-subtle)" }}
          />
          <div>
            <span className="text-zinc-500 text-[10px] block">
              INGRESS TRAFFIC
            </span>
            <span className="text-blue-400 font-medium">24 req/s</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter & Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search container logs (e.g., /api, 200, error)..."
              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            />
            {filterText && (
              <button
                onClick={() => setFilterText("")}
                className="absolute right-2 top-1.2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-1 p-0.5 rounded-lg"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            {(["all", "stdout", "stderr", "http", "error"] as const).map(
              (lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className="px-2 py-1 rounded text-[11px] capitalize transition-colors"
                  style={{
                    background:
                      selectedLevel === lvl
                        ? "rgba(255,255,255,0.12)"
                        : "transparent",
                    color:
                      selectedLevel === lvl ? "white" : "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  {lvl}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: isLive ? "rgba(74,222,128,0.12)" : "var(--surface-2)",
              border: `1px solid ${
                isLive ? "rgba(74,222,128,0.3)" : "var(--border-default)"
              }`,
              color: isLive ? "#4ade80" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            {isLive ? "Streaming Live" : "Paused"}
          </button>

          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg text-xs"
            style={{
              background: autoScroll
                ? "rgba(255,255,255,0.08)"
                : "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: autoScroll ? "white" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
            title="Auto-scroll to bottom"
          >
            ↓ Auto-scroll
          </button>

          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            Clear
          </button>

          <button
            onClick={handleDownloadLogs}
            className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            Export .log
          </button>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div
        ref={scrollRef}
        className="rounded-xl p-4 h-[420px] overflow-y-auto font-mono text-[11px] leading-relaxed select-text"
        style={{
          background: "#0a0d14",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 font-sans text-xs">
            No container logs match current filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              fractionalSecondDigits: 3,
            } as any)

            let levelColor = "text-zinc-400"
            let levelBg = "bg-zinc-800/50"

            if (log.level === "error" || log.stream === "stderr") {
              levelColor = "text-red-400"
              levelBg = "bg-red-500/10 border border-red-500/20"
            } else if (log.level === "warn") {
              levelColor = "text-amber-400"
              levelBg = "bg-amber-500/10"
            } else if (log.level === "http") {
              levelColor =
                log.statusCode && log.statusCode >= 400
                  ? "text-red-400"
                  : "text-emerald-400"
              levelBg = "bg-emerald-500/10"
            } else if (log.level === "system") {
              levelColor = "text-cyan-400"
              levelBg = "bg-cyan-500/10"
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-1 border-b border-zinc-900/60 hover:bg-zinc-900/40 rounded px-1 transition-colors"
              >
                {/* Timestamp */}
                <span className="text-zinc-500 flex-shrink-0 select-none">
                  {timeStr}
                </span>

                {/* Stream Tag */}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase flex-shrink-0 ${
                    log.stream === "stderr"
                      ? "text-red-400 bg-red-950/60"
                      : "text-zinc-400 bg-zinc-800/60"
                  }`}
                >
                  {log.stream}
                </span>

                {/* Level Badge */}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase flex-shrink-0 ${levelColor} ${levelBg}`}
                >
                  {log.level}
                </span>

                {/* Message */}
                <span
                  className={`flex-1 break-all ${
                    log.stream === "stderr" ? "text-red-300" : "text-zinc-200"
                  }`}
                >
                  {log.message}
                  {log.latencyMs !== undefined && (
                    <span className="text-zinc-500 ml-2 text-[10px]">
                      ({log.latencyMs}ms)
                    </span>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
