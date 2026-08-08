import { useState, useRef, useEffect } from "react"
import {
  Zap,
  ChevronLeft,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  RotateCcw,
  Code2,
  Eye,
  Send,
  Plus,
  Hash,
  Clock,
  Pin,
  Settings,
  ChevronDown,
  MoreHorizontal,
  X,
  Loader2,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Props {
  initialPrompt: string
  visible: boolean
  onBack: () => void
}

type DeviceMode = "desktop" | "tablet" | "phone"

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  phone: "390px",
}

const CHAT_STAGES = [
  { label: "Thinking...", duration: 1200 },
  { label: "Planning architecture...", duration: 900 },
  { label: "Generating components...", duration: 1500 },
  { label: "Polishing styles...", duration: 800 },
]

export default function WorkspaceView({
  initialPrompt,
  visible,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: initialPrompt, timestamp: new Date() },
  ])
  const [generatingStage, setGeneratingStage] = useState<number | null>(0)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop")
  const [chatInput, setChatInput] = useState("")
  const [previewTab, setPreviewTab] = useState<"preview" | "code">("preview")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [maximized, setMaximized] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Simulate generation completing
  useEffect(() => {
    let stage = 0
    const advance = () => {
      stage++
      if (stage < CHAT_STAGES.length) {
        setGeneratingStage(stage)
        setTimeout(advance, CHAT_STAGES[stage].duration)
      } else {
        setTimeout(() => {
          setGeneratingStage(null)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Your app is ready. I've built a clean, responsive layout based on your description. You can refine any section by describing what to change.",
              timestamp: new Date(),
            },
          ])
        }, 600)
      }
    }
    const t = setTimeout(advance, CHAT_STAGES[0].duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = () => {
    const trimmed = chatInput.trim()
    if (!trimmed || generatingStage !== null) return
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date() },
    ])
    setChatInput("")
    setGeneratingStage(0)
    let stage = 0
    const advance = () => {
      stage++
      if (stage < CHAT_STAGES.length) {
        setGeneratingStage(stage)
        setTimeout(advance, CHAT_STAGES[stage].duration)
      } else {
        setTimeout(() => {
          setGeneratingStage(null)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Done. The changes have been applied. Let me know if you want to adjust anything.",
              timestamp: new Date(),
            },
          ])
        }, 600)
      }
    }
    setTimeout(advance, CHAT_STAGES[0].duration)
  }

  const isGenerating = generatingStage !== null
  const currentStageLabel =
    generatingStage !== null ? CHAT_STAGES[generatingStage]?.label : null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        zIndex: 20,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          height: 48,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Back + Brand */}
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            fontSize: 13,
            padding: "4px 6px",
            borderRadius: 6,
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "rgba(255,255,255,0.8)"
            el.style.background = "rgba(255,255,255,0.06)"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "rgba(255,255,255,0.45)"
            el.style.background = "transparent"
          }}
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Zap
            size={14}
            strokeWidth={2}
            style={{ color: "rgba(255,255,255,0.7)" }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              letterSpacing: "0.08em",
            }}
          >
            SHANGO
          </span>
        </div>

        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.25)",
            fontSize: 13,
          }}
        >
          <span>/</span>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>
            Untitled Project
          </span>
          <span>/</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>Chat 1</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Model badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11.5,
            letterSpacing: "0.02em",
          }}
        >
          Gemini 2.0
          <ChevronDown size={11} strokeWidth={2} />
        </div>

        {/* Generation status */}
        {isGenerating && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
            }}
          >
            <Loader2
              size={12}
              strokeWidth={2}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span>{currentStageLabel}</span>
          </div>
        )}

        {/* Profile */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
          }}
        >
          S
        </div>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 7,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "rgba(255,255,255,0.7)"
            el.style.background = "rgba(255,255,255,0.06)"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "rgba(255,255,255,0.35)"
            el.style.background = "transparent"
          }}
        >
          <Settings size={14} strokeWidth={1.75} />
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebarOpen && !maximized && (
          <aside
            style={{
              width: 220,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              background: "rgba(8,8,8,0.8)",
            }}
          >
            <div
              style={{
                padding: "14px 12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <button
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "rgba(255,255,255,0.07)"
                  el.style.borderColor = "rgba(255,255,255,0.16)"
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "rgba(255,255,255,0.04)"
                  el.style.borderColor = "rgba(255,255,255,0.1)"
                }}
              >
                <Plus size={13} strokeWidth={2} />
                New Chat
              </button>
            </div>

            <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
              <SidebarSection label="Recent" icon={Clock}>
                <SidebarItem
                  label={
                    initialPrompt.slice(0, 28) +
                    (initialPrompt.length > 28 ? "…" : "")
                  }
                  active
                />
              </SidebarSection>
              <SidebarSection label="Projects" icon={Hash}>
                <SidebarItem label="Untitled Project" />
              </SidebarSection>
              <SidebarSection label="Pinned" icon={Pin}>
                <div
                  style={{
                    padding: "4px 8px",
                    color: "rgba(255,255,255,0.2)",
                    fontSize: 11.5,
                  }}
                >
                  Nothing pinned yet
                </div>
              </SidebarSection>
            </nav>

            <div
              style={{
                padding: "10px 12px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 7,
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = "rgba(255,255,255,0.65)"
                  el.style.background = "rgba(255,255,255,0.05)"
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = "rgba(255,255,255,0.35)"
                  el.style.background = "transparent"
                }}
              >
                <Settings size={13} strokeWidth={1.75} />
                Settings
              </button>
            </div>
          </aside>
        )}

        {/* Chat panel */}
        {!maximized && (
          <div
            style={{
              width: 340,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            {/* Chat header */}
            <div
              style={{
                height: 44,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: 8,
              }}
            >
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = "rgba(255,255,255,0.65)"
                  el.style.background = "rgba(255,255,255,0.06)"
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = "rgba(255,255,255,0.35)"
                  el.style.background = "transparent"
                }}
              >
                <Hash size={13} strokeWidth={2} />
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                Chat
              </span>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.25)",
                  cursor: "pointer",
                }}
              >
                <MoreHorizontal size={13} strokeWidth={2} />
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {msg.role === "user" ? "You" : "⚡ Shango"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.65,
                      color:
                        msg.role === "user"
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(255,255,255,0.9)",
                      background:
                        msg.role === "user"
                          ? "rgba(255,255,255,0.05)"
                          : "transparent",
                      padding: msg.role === "user" ? "10px 12px" : "0",
                      borderRadius: msg.role === "user" ? 10 : 0,
                      borderLeft:
                        msg.role === "assistant"
                          ? "2px solid rgba(255,255,255,0.12)"
                          : "none",
                      paddingLeft: msg.role === "assistant" ? 10 : undefined,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Generating indicator */}
              {isGenerating && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    ⚡ Shango
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 12.5,
                      borderLeft: "2px solid rgba(255,255,255,0.08)",
                      paddingLeft: 10,
                    }}
                  >
                    <Loader2
                      size={12}
                      strokeWidth={2}
                      style={{
                        animation: "spin 1s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    {currentStageLabel}
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  padding: "8px 10px",
                  transition: "border-color 0.15s",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={
                    isGenerating ? "Generating..." : "Refine your app..."
                  }
                  disabled={isGenerating}
                  rows={1}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    caretColor: "white",
                    maxHeight: 100,
                    overflowY: "auto",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={isGenerating || !chatInput.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background:
                      chatInput.trim() && !isGenerating
                        ? "white"
                        : "rgba(255,255,255,0.1)",
                    color:
                      chatInput.trim() && !isGenerating
                        ? "#000"
                        : "rgba(255,255,255,0.25)",
                    cursor:
                      chatInput.trim() && !isGenerating
                        ? "pointer"
                        : "not-allowed",
                    flexShrink: 0,
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <Send size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Preview toolbar */}
          <div
            style={{
              height: 44,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                padding: 3,
              }}
            >
              {(["preview", "code"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPreviewTab(tab)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    background:
                      previewTab === tab
                        ? "rgba(255,255,255,0.1)"
                        : "transparent",
                    color:
                      previewTab === tab
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.35)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    fontFamily: "'Inter', -apple-system, sans-serif",
                  }}
                >
                  {tab === "preview" ? (
                    <Eye size={12} strokeWidth={2} />
                  ) : (
                    <Code2 size={12} strokeWidth={2} />
                  )}
                  {tab === "preview" ? "Preview" : "Code"}
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Device switcher */}
            {previewTab === "preview" && (
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                {[
                  { mode: "desktop" as DeviceMode, Icon: Monitor },
                  { mode: "tablet" as DeviceMode, Icon: Tablet },
                  { mode: "phone" as DeviceMode, Icon: Smartphone },
                ].map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setDeviceMode(mode)}
                    title={mode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "none",
                      background:
                        deviceMode === mode
                          ? "rgba(255,255,255,0.1)"
                          : "transparent",
                      color:
                        deviceMode === mode
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? "Restore" : "Maximize preview"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 7,
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = "rgba(255,255,255,0.65)"
                el.style.background = "rgba(255,255,255,0.06)"
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = "rgba(255,255,255,0.3)"
                el.style.background = "transparent"
              }}
            >
              {maximized ? (
                <X size={13} strokeWidth={2} />
              ) : (
                <Maximize2 size={13} strokeWidth={1.75} />
              )}
            </button>

            <button
              title="Reload"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 7,
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = "rgba(255,255,255,0.65)"
                el.style.background = "rgba(255,255,255,0.06)"
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = "rgba(255,255,255,0.3)"
                el.style.background = "transparent"
              }}
            >
              <RotateCcw size={12} strokeWidth={2} />
            </button>
          </div>

          {/* Preview content */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              background: "#111",
              display: "flex",
              alignItems: deviceMode === "desktop" ? "stretch" : "flex-start",
              justifyContent: "center",
              padding: deviceMode === "desktop" ? 0 : "24px",
            }}
          >
            <div
              style={{
                width: DEVICE_WIDTHS[deviceMode],
                height: deviceMode === "desktop" ? "100%" : undefined,
                minHeight: deviceMode !== "desktop" ? 600 : undefined,
                background: "#1a1a1a",
                borderRadius: deviceMode !== "desktop" ? 12 : 0,
                overflow: "hidden",
                border:
                  deviceMode !== "desktop"
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "none",
                transition: "width 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {isGenerating ? (
                <GeneratingState
                  stage={generatingStage}
                  label={currentStageLabel}
                />
              ) : previewTab === "code" ? (
                <CodePreview prompt={initialPrompt} />
              ) : (
                <PreviewState prompt={initialPrompt} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneratingState({
  stage,
  label,
}: {
  stage: number | null
  label: string | null
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: 40,
      }}
    >
      {/* Lightning pulse */}
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            animation: "pulse-ring 1.8s ease-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            animation: "pulse-ring 1.8s ease-out 0.4s infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="26" viewBox="0 0 18 26" fill="none">
            <path
              d="M10 1L1 14h7l-1 11 9-15H9l1-9z"
              fill="rgba(255,255,255,0.85)"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 13,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      {/* Progress bar */}
      <div
        style={{
          width: 180,
          height: 2,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 1,
            width: `${(((stage ?? 0) + 1) / CHAT_STAGES.length) * 100}%`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  )
}

function PreviewState({ prompt }: { prompt: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f8f9fa",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Simulated app nav */}
      <div
        style={{
          height: 56,
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 24,
          flexShrink: 0,
        }}
      >
        <div
          style={{ width: 80, height: 14, background: "#111", borderRadius: 3 }}
        />
        <div style={{ flex: 1 }} />
        {[60, 50, 55].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 10,
              background: "#d1d5db",
              borderRadius: 3,
            }}
          />
        ))}
        <div
          style={{ width: 80, height: 32, background: "#111", borderRadius: 6 }}
        />
      </div>
      {/* Hero */}
      <div
        style={{
          background: "#111",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 200,
            height: 28,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            width: 320,
            height: 14,
            background: "rgba(255,255,255,0.3)",
            borderRadius: 3,
          }}
        />
        <div
          style={{
            width: 260,
            height: 14,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 3,
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <div
            style={{
              width: 110,
              height: 36,
              background: "white",
              borderRadius: 8,
            }}
          />
          <div
            style={{
              width: 110,
              height: 36,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </div>
      {/* Cards */}
      <div
        style={{ padding: "24px", display: "flex", gap: 14, flexWrap: "wrap" }}
      >
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 180px",
              background: "white",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                width: "100%",
                height: 80,
                background: "#f3f4f6",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                width: "70%",
                height: 12,
                background: "#d1d5db",
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: "50%",
                height: 10,
                background: "#e5e7eb",
                borderRadius: 3,
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "0 24px",
          color: "#6b7280",
          fontSize: 11,
          fontFamily: "monospace",
          opacity: 0.6,
        }}
      >
        ← {prompt}
      </div>
    </div>
  )
}

function CodePreview({ prompt }: { prompt: string }) {
  const code = `import React, { useState } from 'react'

// Generated by ⚡ Shango
// Prompt: "${prompt}"

export default function App() {
  const [items, setItems] = useState([])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center">
        <h1 className="font-semibold text-gray-900">My App</h1>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome
        </h2>
        {/* Content generated here */}
      </main>
    </div>
  )
}`

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d1117",
        padding: "20px",
        overflow: "auto",
      }}
    >
      <pre
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 12.5,
          lineHeight: 1.7,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          margin: 0,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

function SidebarSection({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px 6px",
          color: "rgba(255,255,255,0.25)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <Icon size={10} strokeWidth={2} />
        {label}
      </div>
      {children}
    </div>
  )
}

function SidebarItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        borderRadius: 7,
        border: "none",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)",
        fontSize: 12.5,
        cursor: "pointer",
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontFamily: "'Inter', -apple-system, sans-serif",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = "rgba(255,255,255,0.05)"
          el.style.color = "rgba(255,255,255,0.6)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = "transparent"
          el.style.color = "rgba(255,255,255,0.4)"
        }
      }}
    >
      {label}
    </button>
  )
}
