import _React, {
  useState,
  useEffect,
  RefObject,
  KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { useApp } from "../store/AppContext"
import { ALL_SKILLS } from "../lib/skills"

interface ForgeInputProps {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onStop: () => void
  isGenerating: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function ForgeInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  onStop,
  isGenerating,
  textareaRef,
}: ForgeInputProps) {
  const [focused, setFocused] = useState(false)
  const [planMode, setPlanMode] = useState(() => {
    if (typeof window === "undefined") return false
    const savedMode = localStorage.getItem("shango_generation_mode")
    return savedMode === "plan"
  })
  const [attachedContext, setAttachedContext] = useState<Array<{
    id: string
    name: string
    type: "image" | "file" | "voice"
  }>>([])
  const { enabledSkills } = useApp()
  const canSend = value.trim().length > 0 && !isGenerating
  const skillMonograms = enabledSkills.slice(0, 3)

  // Active state when focused, typing, prompting, or generating
  const isActive = focused || value.trim().length > 0 || isGenerating

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }, [value])

  const handleAttachMockImage = () => {
    if (attachedContext.some((c) => c.type === "image")) return
    setAttachedContext((prev) => [
      ...prev,
      { id: "img-1", name: "design-reference.png", type: "image" },
    ])
  }

  const handleAttachMockFile = () => {
    if (attachedContext.some((c) => c.type === "file")) return
    setAttachedContext((prev) => [
      ...prev,
      { id: "file-1", name: "schema.prisma", type: "file" },
    ])
  }

  const handleRemoveChip = (id: string) => {
    setAttachedContext((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
      }}
    >
      {/* Inline keyframes and reset for borderless omnibox textarea */}
      <style>{`
                @keyframes circulatingGlow {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .omnibox-textarea:focus,
                .omnibox-textarea:active,
                .omnibox-textarea {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    -webkit-appearance: none !important;
                }
            `}</style>

      {/* AI Studio Suggestion Chips Row - Floating Above Omnibox */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <div
          className="scroll-hidden"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            padding: "2px 8px 4px",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 24px), transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 24px), transparent 100%)",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.35)",
              padding: "0 2px",
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          {[
            {
              label: "AI Features",
              prompt: "Add AI smart features to the app",
            },
            {
              label: "Refactor Convo into Timeline",
              prompt: "Refactor conversation history into a timeline view",
            },
            {
              label: "Simplify Project",
              prompt: "Simplify project layout and remove clutter",
            },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => onChange(chip.prompt)}
              style={{
                padding: "4px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.72)",
                fontSize: 11.5,
                fontFamily: "var(--font-geist)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                e.currentTarget.style.color = "#ffffff"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)"
                e.currentTarget.style.color = "rgba(255,255,255,0.72)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
              }}
            >
              {chip.label}
            </button>
          ))}
          <button
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.25)",
              cursor: "pointer",
              fontSize: 12,
              padding: "0 4px",
              marginLeft: "auto",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Omnibox Outer Container with Circulating Hairline Border */}
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          padding: 1, // Hairline border thickness (1px)
          overflow: "hidden",
          background: isActive ? "transparent" : "rgba(255, 255, 255, 0.08)",
          boxShadow: isActive
            ? "0 12px 32px rgba(0,0,0,0.85), 0 0 16px rgba(255,255,255,0.06)"
            : "0 4px 16px rgba(0,0,0,0.4)",
          transition: "background 0.25s ease, boxShadow 0.25s ease",
        }}
      >
        {/* Circulating Hairline Glow Layer when active */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "350%",
              aspectRatio: "1 / 1",
              background:
                "conic-gradient(from 0deg, rgba(255, 255, 255, 0.95) 0deg, rgba(255, 255, 255, 0.25) 45deg, rgba(255, 255, 255, 0.02) 160deg, rgba(255, 255, 255, 0.25) 280deg, rgba(255, 255, 255, 0.95) 360deg)",
              animation: "circulatingGlow 3.2s linear infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Inner Omnibox Card */}
        <div
          style={{
            position: "relative",
            borderRadius: 13,
            background: "rgba(10, 10, 12, 0.98)",
            padding: "10px 12px 8px",
            zIndex: 1,
          }}
        >
          {/* Context chips bar if items attached */}
          {attachedContext.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 0 6px",
                flexWrap: "wrap",
              }}
            >
              {attachedContext.map((chip) => (
                <div
                  key={chip.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 8px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      opacity: 0.7,
                    }}
                  >
                    {chip.type === "image" ? (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    ) : chip.type === "file" ? (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                    ) : (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    )}
                  </span>
                  <span>{chip.name}</span>
                  <button
                    onClick={() => handleRemoveChip(chip.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      padding: "0 2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Make changes, add new features, ask for anything"
            rows={2}
            className="w-full resize-none scroll-hidden omnibox-textarea"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              boxShadow: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              fontSize: 13.5,
              lineHeight: 1.6,
              padding: "6px 2px 8px",
              caretColor: "rgba(220,220,220,0.9)",
              position: "relative",
              zIndex: 2,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Plan / Build capsule toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 7,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  marginRight: 3,
                }}
              >
                {(["Plan", "Build"] as const).map((mode) => {
                  const active = (mode === "Plan") === planMode
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        const nextPlanMode = mode === "Plan"
                        setPlanMode(nextPlanMode)
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            "shango_generation_mode",
                            nextPlanMode ? "plan" : "build",
                          )
                        }
                      }}
                      style={{
                        padding: "3px 9px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 9.5,
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.08em",
                        background: active
                          ? "rgba(255,255,255,0.1)"
                          : "transparent",
                        color: active
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(255,255,255,0.3)",
                        transition: "background 0.16s ease, color 0.16s ease",
                      }}
                    >
                      {mode.toUpperCase()}
                    </button>
                  )
                })}
              </div>

              {skillMonograms.length > 0 && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 3 }}
                  title={`${enabledSkills.length} skill${
                    enabledSkills.length !== 1 ? "s" : ""
                  } active`}
                >
                  {skillMonograms.map((sid) => {
                    const skill = ALL_SKILLS.find((s) => s.id === sid)
                    if (!skill) return null
                    return (
                      <div
                        key={sid}
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: 4,
                          background: "var(--surface-3)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title={skill.name}
                      >
                        <span
                          style={{
                            fontSize: 5.5,
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono-jetbrains)",
                          }}
                        >
                          {skill.monogram}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handleAttachMockFile}
                style={{
                  padding: "4px 6px",
                  borderRadius: 8,
                  background: "transparent",
                  color: "rgba(255,255,255,0.45)",
                  display: "flex",
                  alignItems: "center",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.14s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.85)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
                }
                title="Voice input"
              >
                <svg width="12" height="14" viewBox="0 0 10 13" fill="none">
                  <rect
                    x="2.5"
                    y="0.5"
                    width="5"
                    height="7"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="1.15"
                  />
                  <path
                    d="M1 6.5A4 4 0 009 6.5M5 10.5v2"
                    stroke="currentColor"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                onClick={handleAttachMockImage}
                style={{
                  padding: "4px 6px",
                  borderRadius: 8,
                  background: "transparent",
                  color: "rgba(255,255,255,0.45)",
                  display: "flex",
                  alignItems: "center",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.14s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.85)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
                }
                title="Attach context (Image/File reference)"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              {isGenerating ? (
                <button
                  onClick={onStop}
                  title="Stop generation"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect width="16" height="16" x="4" y="4" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  id="shango-send-btn"
                  onClick={onSend}
                  disabled={!canSend}
                  title="Send prompt"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: canSend ? "#ffffff" : "rgba(255,255,255,0.1)",
                    border: "none",
                    color: canSend ? "#000000" : "rgba(255,255,255,0.25)",
                    cursor: canSend ? "pointer" : "default",
                    transition: "all 0.18s ease",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 10V2M6 2L2.5 5.5M6 2L9.5 5.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
