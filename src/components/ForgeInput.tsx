import _React, {
  useState,
  useEffect,
  RefObject,
  KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { useApp } from "../store/AppContext"
import { ALL_SKILLS } from "../lib/skills"

/**
 * The project-state context the omnibox lives in. This drives the
 * placeholder text and any contextual affordances — never fake ones.
 */
export type OmniboxContext =
  | "empty" // No project / no files yet
  | "building" // Generation in progress
  | "existing" // Project has files, idle, ready for next request
  | "repairing" // Repair loop running
  | "failed" // Last build failed
  | "completed" // Build completed, preview ready

interface ForgeInputProps {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onStop: () => void
  isGenerating: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
  context?: OmniboxContext
}

const PLACEHOLDER_BY_CONTEXT: Record<OmniboxContext, string> = {
  empty: "Describe what you'd like to build...",
  building: "Generating — type your next request for when it finishes...",
  existing: "Ask for changes, new features, or fixes...",
  repairing: "Repairing an issue — your next request will run after...",
  failed: "The last build didn't complete. Describe what to fix or try again...",
  completed: "Your app is ready. Ask for refinements or new features...",
}

export function ForgeInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  onStop,
  isGenerating,
  textareaRef,
  context = "empty",
}: ForgeInputProps) {
  const [focused, setFocused] = useState(false)
  const [planMode, setPlanMode] = useState(() => {
    if (typeof window === "undefined") return false
    const savedMode = localStorage.getItem("shango_generation_mode")
    return savedMode === "plan"
  })
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
      }}
    >
      {/* Reset for borderless textarea */}
      <style>{`
                .omnibox-textarea:focus,
                .omnibox-textarea:active,
                .omnibox-textarea {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    -webkit-appearance: none !important;
                }
            `}</style>

      {/* Main Omnibox Container — flat, monochrome, no glow */}
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          background: isActive
            ? "rgba(255, 255, 255, 0.06)"
            : "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${
            isActive
              ? "rgba(255, 255, 255, 0.14)"
              : "rgba(255, 255, 255, 0.08)"
          }`,
          boxShadow: isActive
            ? "0 8px 24px rgba(0,0,0,0.5)"
            : "0 4px 16px rgba(0,0,0,0.3)",
          transition:
            "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
          padding: "10px 12px 8px",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDER_BY_CONTEXT[context]}
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
            {/* Plan / Build capsule toggle — real control, affects pipeline */}
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
  )
}
