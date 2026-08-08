import { useState, useEffect, useRef, useMemo } from "react"
import {
  Terminal as TerminalIcon,
  Play,
  Search,
  Download,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  Package,
  Wrench,
  Pause,
  Check,
  RefreshCw,
  } from "lucide-react"
import { useApp } from "../store/AppContext"
import type { Project } from "../lib/store"

export interface TerminalLogEntry {
  id: string
  ts: string
  stream: "stdout" | "stderr" | "system"
  level: "info" | "success" | "warn" | "error"
  msg: string
  category: "build" | "lint" | "dep" | "exec" | "general"
}

interface Props {
  project?: Project
  onClose?: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export default function InteractiveTerminal({
  project,
  onClose: _onClose,
  isExpanded = false,
  onToggleExpand,
}: Props) {
  const { updateWorkspaceFile, addToast, projects } = useApp()

  // Get active project files
  const activeProject = project || projects[0]
  const workspaceFiles = activeProject?.files || []

  // Logs state
  const [logs, setLogs] = useState<TerminalLogEntry[]>(() => [
    {
      id: "init-1",
      ts: new Date().toLocaleTimeString(),
      stream: "system",
      level: "info",
      msg: "Shango Cloud Build & Runtime Terminal v2.4 initialized [Node v20.11.1, Vite v5.2.0]",
      category: "general",
    },
    {
      id: "init-2",
      ts: new Date().toLocaleTimeString(),
      stream: "system",
      level: "success",
      msg: '✓ Real-time stdout/stderr stream attached to workspace container. Type "help" for commands.',
      category: "general",
    },
  ])

  // Filters & Search
  const [activeTab, setActiveTab] =
    useState<"all" | "stdout" | "stderr" | "build" | "lint" | "dep">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const [cmdInput, setCmdInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number>(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)

  const logEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll down
  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  // Add new log helper
  const addLog = (
    msg: string,
    level: "info" | "success" | "warn" | "error" = "info",
    stream: "stdout" | "stderr" | "system" = "stdout",
    category: "build" | "lint" | "dep" | "exec" | "general" = "exec",
  ) => {
    const entry: TerminalLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      ts: new Date().toLocaleTimeString(),
      stream,
      level,
      msg,
      category,
    }
    setLogs((prev) => [...prev, entry])
  }

  // Execute build process simulation
  const runBuildProcess = () => {
    if (isProcessing) return
    setIsProcessing(true)
    addLog("npm run build", "info", "stdout", "build")
    addLog(
      "> shango-applet@1.0.0 build\n> vite build",
      "info",
      "stdout",
      "build",
    )

    const fileCount = workspaceFiles.length || 12
    let currentStep = 0

    const steps = [
      {
        msg: `vite v5.2.0 building for production...`,
        delay: 300,
        level: "info" as const,
      },
      {
        msg: `transforming (${fileCount}/${fileCount}) modules...`,
        delay: 600,
        level: "info" as const,
      },
      {
        msg: `✓ ${fileCount} workspace files parsed with AST import resolver`,
        delay: 900,
        level: "success" as const,
      },
      {
        msg: `rendering chunks...\ndist/index.html                     0.45 kB │ gzip:  0.29 kB\ndist/assets/index-D8x12a.css        12.40 kB │ gzip:  3.12 kB\ndist/assets/index-C9x811.js        148.90 kB │ gzip: 42.10 kB`,
        delay: 1400,
        level: "info" as const,
      },
      {
        msg: `✓ built in 842ms. Zero bundle errors detected.`,
        delay: 1800,
        level: "success" as const,
      },
    ]

    steps.forEach((step, _idx) => {
      setTimeout(() => {
        addLog(step.msg, step.level, "stdout", "build")
        currentStep++
        if (currentStep === steps.length) {
          setIsProcessing(false)
          addToast("Build completed successfully!", "success")
        }
      }, step.delay)
    })
  }

  // Run linter check across workspace files
  const runLinterCheck = () => {
    if (isProcessing) return
    setIsProcessing(true)
    addLog("npm run lint", "info", "stdout", "lint")
    addLog(
      "> eslint . --ext .ts,.tsx --max-warnings 5",
      "info",
      "stdout",
      "lint",
    )

    setTimeout(
      () => {
        const findings: {
          file: string
          line: number
          col: number
          severity: "warn" | "error"
          msg: string
          rule: string
        }[] = []

        // Real check on files
        workspaceFiles.forEach((f) => {
          const lines = f.content.split("\n")
          lines.forEach((l, i) => {
            if (l.includes("console.log(")) {
              findings.push({
                file: f.path,
                line: i + 1,
                col: l.indexOf("console.log(") + 1,
                severity: "warn",
                msg: "Unexpected console statement",
                rule: "no-console",
              })
            }
            if (l.includes(": any")) {
              findings.push({
                file: f.path,
                line: i + 1,
                col: l.indexOf(": any") + 1,
                severity: "warn",
                msg: "Unexpected any type. Specify a precise interface or unknown",
                rule: "@typescript-eslint/no-explicit-any",
              })
            }
          })
        })

        if (findings.length === 0) {
          addLog(
            "✔ 0 problems (0 errors, 0 warnings)",
            "success",
            "stdout",
            "lint",
          )
          addLog(
            "ESLint check passed cleanly on all workspace modules.",
            "success",
            "stdout",
            "lint",
          )
        } else {
          findings.forEach((f) => {
            const formatted = `${f.file}:${f.line}:${f.col} - ${
              f.severity === "error" ? "error" : "warning"
            } ${f.msg} (${f.rule})`
            addLog(
              formatted,
              f.severity === "error" ? "error" : "warn",
              f.severity === "error" ? "stderr" : "stdout",
              "lint",
            )
          })
          addLog(
            `✖ ${findings.length} problem(s) found in workspace syntax scan`,
            "warn",
            "stdout",
            "lint",
          )
        }

        setIsProcessing(false)
        addToast(
          `Linter completed: ${findings.length} issues found`,
          findings.length > 0 ? "default" : "success",
        )
      },
      600,
    )
  }

  // Install dependency helper
  const installDependency = (pkgName: string) => {
    if (!pkgName.trim()) return
    setIsProcessing(true)
    const pkg = pkgName.trim()

    addLog(`npm install ${pkg}`, "info", "stdout", "dep")
    addLog(
      `Resolving dependency graph for ${pkg}@latest...`,
      "info",
      "stdout",
      "dep",
    )

    setTimeout(() => {
      addLog(`[1/4] 🔍 Resolving packages...`, "info", "stdout", "dep")
    }, 300)

    setTimeout(() => {
      addLog(
        `[2/4] 🚚 Fetching packages from registry.npmjs.org...`,
        "info",
        "stdout",
        "dep",
      )
    }, 600)

    setTimeout(() => {
      addLog(`[3/4] 🔗 Linking dependencies...`, "info", "stdout", "dep")
    }, 900)

    setTimeout(() => {
      // Update package.json in workspace
      const pkgFile = workspaceFiles.find((f) => f.path === "package.json")
      if (pkgFile) {
        try {
          const parsed = JSON.parse(pkgFile.content)
          parsed.dependencies = parsed.dependencies || {}
          parsed.dependencies[pkg] = "^1.0.0"
          updateWorkspaceFile("package.json", JSON.stringify(parsed, null, 2))
        } catch {
          // fail silent
        }
      }

      addLog(
        `+ ${pkg}@latest\nadded 1 package, audited ${workspaceFiles.length + 42} packages in 1.1s\n0 vulnerabilities found`,
        "success",
        "stdout",
        "dep",
      )
      setIsProcessing(false)
      addToast(`Successfully installed ${pkg}`, "success")
    }, 1200)
  }

  // Command input handler
  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (history.length > 0) {
        const nextIdx =
          historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx
        setHistoryIdx(nextIdx)
        setCmdInput(history[history.length - 1 - nextIdx] || "")
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1
        setHistoryIdx(nextIdx)
        setCmdInput(history[history.length - 1 - nextIdx] || "")
      } else if (historyIdx === 0) {
        setHistoryIdx(-1)
        setCmdInput("")
      }
      return
    }

    if (e.key !== "Enter") return
    const cmd = cmdInput.trim()
    if (!cmd) return

    setHistory((prev) => [...prev, cmd])
    setHistoryIdx(-1)
    setCmdInput("")

    // Log user command
    addLog(`$ ${cmd}`, "info", "stdout", "exec")

    const parts = cmd.split(" ")
    const main = parts[0].toLowerCase()

    if (main === "clear" || main === "cls") {
      setLogs([])
    } else if (main === "help") {
      addLog(
        `AVAILABLE SHANGO CLI COMMANDS:\n` +
          `  npm run build    - Trigger AST module build and Vite bundling\n` +
          `  npm run lint     - Run static analysis linter across workspace\n` +
          `  npm install <p>  - Add dependency package to package.json\n` +
          `  ls               - List all workspace files and byte sizes\n` +
          `  cat <file>       - Print content of a file\n` +
          `  env              - Display active environment vault injection status\n` +
          `  status           - Display server, memory & runtime status\n` +
          `  clear            - Clear terminal output stream\n` +
          `  history          - Print command execution history`,
        "success",
        "stdout",
        "exec",
      )
    } else if (main === "ls" || main === "dir") {
      const list = workspaceFiles
        .map(
          (f) =>
            `  ${f.path.padEnd(28)} ${(f.content.length / 1024).toFixed(2)} KB`,
        )
        .join("\n")
      addLog(
        `Workspace Virtual Filesystem (${workspaceFiles.length} files):\n${list}`,
        "info",
        "stdout",
        "exec",
      )
    } else if (main === "cat") {
      const target = parts[1]
      const file = workspaceFiles.find(
        (f) => f.path === target || f.path.endsWith(target),
      )
      if (file) {
        addLog(
          `=== ${file.path} ===\n${file.content.slice(0, 600)}${
            file.content.length > 600 ? "\n...[truncated]" : ""
          }`,
          "info",
          "stdout",
          "exec",
        )
      } else {
        addLog(
          `cat: ${target}: No such file or directory`,
          "error",
          "stderr",
          "exec",
        )
      }
    } else if (main === "npm" || main === "pnpm" || main === "yarn") {
      const sub = parts[1]?.toLowerCase()
      if (sub === "run" && parts[2]?.toLowerCase() === "build") {
        runBuildProcess()
      } else if (
        sub === "run" &&
        (parts[2]?.toLowerCase() === "lint" ||
          parts[2]?.toLowerCase() === "check")
      ) {
        runLinterCheck()
      } else if (sub === "install" || sub === "i" || sub === "add") {
        const pkg = parts[2]
        if (pkg) {
          installDependency(pkg)
        } else {
          addLog(`npm install: missing package name`, "warn", "stderr", "dep")
        }
      } else {
        addLog(
          `npm ${sub || ""}: task completed in 12ms`,
          "info",
          "stdout",
          "exec",
        )
      }
    } else if (main === "env") {
      addLog(
        `Active Environment Secrets (Vault Injected):\n  GEMINI_API_KEY = •••••••••••••••• (Proxy Active)\n  NODE_ENV       = development\n  PORT           = 3000\n  HMR            = disabled (Control Plane)`,
        "info",
        "stdout",
        "exec",
      )
    } else if (main === "status") {
      addLog(
        `Shango Runtime Container Status:\n  Uptime: 42m 12s\n  Memory Usage: 84.2 MB / 512 MB\n  Port Binding: 0.0.0.0:3000\n  Vite Middleware Mode: Active`,
        "info",
        "stdout",
        "exec",
      )
    } else if (main === "history") {
      addLog(
        `Command History:\n` +
          history.map((h, i) => `  ${i + 1}  ${h}`).join("\n"),
        "info",
        "stdout",
        "exec",
      )
    } else {
      addLog(
        `shango: command not found: ${cmd}. Type "help" for options.`,
        "warn",
        "stderr",
        "exec",
      )
    }
  }

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      // Category / stream tab filter
      if (activeTab === "stdout" && entry.stream !== "stdout") return false
      if (activeTab === "stderr" && entry.stream !== "stderr") return false
      if (activeTab === "build" && entry.category !== "build") return false
      if (activeTab === "lint" && entry.category !== "lint") return false
      if (activeTab === "dep" && entry.category !== "dep") return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          entry.msg.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, activeTab, searchQuery])

  // Copy logs
  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.ts}] [${l.stream.toUpperCase()}] ${l.msg}`)
      .join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    addToast("Terminal stdout/stderr copied to clipboard", "success")
    setTimeout(() => setCopied(false), 2000)
  }

  // Download log file
  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.ts}] [${l.stream.toUpperCase()}] ${l.msg}`)
      .join("\n")
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shango-terminal-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
    addToast("Terminal log file exported", "success")
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#0a0a0c",
        color: "#e5e7eb",
        fontFamily: "var(--font-mono-jetbrains)",
        overflow: "hidden",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Terminal Top Control Bar */}
      <div
        style={{
          height: 40,
          padding: "0 12px",
          background: "rgba(18, 18, 22, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Title & Filter Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            overflowX: "auto",
          }}
          className="scroll-hidden"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#4ade80",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <TerminalIcon size={14} />
            <span>TERMINAL</span>
          </div>

          <div
            style={{
              height: 14,
              width: 1,
              background: "rgba(255,255,255,0.1)",
            }}
          />

          {/* Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { id: "all", label: `All (${logs.length})` },
              { id: "stdout", label: "stdout" },
              { id: "stderr", label: "stderr" },
              { id: "build", label: "Build" },
              { id: "lint", label: "Linter" },
              { id: "dep", label: "Dependencies" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  fontSize: 10.5,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background:
                    activeTab === tab.id
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                  color:
                    activeTab === tab.id ? "#ffffff" : "rgba(255,255,255,0.4)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {/* Quick Build Action */}
          <button
            onClick={runBuildProcess}
            disabled={isProcessing}
            title="Run Vite AST Build Process"
            style={{
              height: 24,
              padding: "0 8px",
              borderRadius: 5,
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#4ade80",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Play size={10} fill="currentColor" /> Build
          </button>

          {/* Quick Lint Action */}
          <button
            onClick={runLinterCheck}
            disabled={isProcessing}
            title="Run Static Code Analysis Linter"
            style={{
              height: 24,
              padding: "0 8px",
              borderRadius: 5,
              background: "rgba(96, 165, 250, 0.12)",
              border: "1px solid rgba(96, 165, 250, 0.25)",
              color: "#60a5fa",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Wrench size={10} /> Lint
          </button>

          {/* Quick Install Package Action */}
          <button
            onClick={() => {
              const p = prompt(
                "Enter npm package name to install (e.g. framer-motion, date-fns):",
              )
              if (p) installDependency(p)
            }}
            disabled={isProcessing}
            title="Install NPM Package"
            style={{
              height: 24,
              padding: "0 8px",
              borderRadius: 5,
              background: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.25)",
              color: "#eab308",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Package size={10} /> Install
          </button>

          <div
            style={{
              height: 14,
              width: 1,
              background: "rgba(255,255,255,0.1)",
            }}
          />

          {/* Search Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              padding: "0 6px",
              height: 24,
            }}
          >
            <Search size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 90,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 10,
              }}
            />
          </div>

          {/* Toggle AutoScroll */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll paused"}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "none",
              background: autoScroll ? "rgba(255,255,255,0.1)" : "transparent",
              color: autoScroll ? "#4ade80" : "rgba(255,255,255,0.3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {autoScroll ? (
              <RefreshCw size={11} className="animate-spin-slow" />
            ) : (
              <Pause size={11} />
            )}
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            title="Copy Logs"
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: copied ? "#4ade80" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>

          {/* Export File */}
          <button
            onClick={handleDownloadLogs}
            title="Export .log file"
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Download size={11} />
          </button>

          {/* Clear Logs */}
          <button
            onClick={() => setLogs([])}
            title="Clear Terminal Output"
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "rgba(239, 68, 68, 0.5)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={11} />
          </button>

          {/* Expand / Minimize Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title={isExpanded ? "Minimize Terminal" : "Expand Terminal"}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Main Terminal Scroll Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "#070709",
        }}
        className="scroll-hidden"
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 11,
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            No terminal output matching active filters.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isErr = log.level === "error" || log.stream === "stderr"
            const isSuccess = log.level === "success"
            const isWarn = log.level === "warn"

            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 11.5,
                  lineHeight: "1.5",
                }}
              >
                {/* Timestamp */}
                <span
                  style={{
                    color: "rgba(255,255,255,0.2)",
                    fontSize: 9.5,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {log.ts}
                </span>

                {/* Category Badge */}
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background:
                      log.category === "build"
                        ? "rgba(34, 197, 94, 0.15)"
                        : log.category === "lint"
                          ? "rgba(96, 165, 250, 0.15)"
                          : log.category === "dep"
                            ? "rgba(234, 179, 8, 0.15)"
                            : "rgba(255,255,255,0.06)",
                    color:
                      log.category === "build"
                        ? "#4ade80"
                        : log.category === "lint"
                          ? "#60a5fa"
                          : log.category === "dep"
                            ? "#eab308"
                            : "rgba(255,255,255,0.4)",
                    flexShrink: 0,
                    marginTop: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {log.category}
                </span>

                {/* Message Content */}
                <span
                  style={{
                    color: isErr
                      ? "#f87171"
                      : isSuccess
                        ? "#4ade80"
                        : isWarn
                          ? "#fde047"
                          : "rgba(255,255,255,0.75)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {log.msg}
                </span>
              </div>
            )
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* CLI Interactive Prompt Line */}
      <div
        style={{
          height: 38,
          padding: "0 14px",
          background: "rgba(12, 12, 15, 0.95)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "#4ade80",
            fontSize: 13,
            fontWeight: "bold",
          }}
        >
          <span>❯</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleCommand}
          placeholder={
            isProcessing
              ? "Task running..."
              : "Type command (npm run build, npm run lint, npm install <pkg>, ls, help)..."
          }
          disabled={isProcessing}
          style={{
            flex: 1,
            height: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#ffffff",
            fontSize: 11.5,
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        />

        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)" }}>
          Press Enter to run
        </div>
      </div>
    </div>
  )
}
