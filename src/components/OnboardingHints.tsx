import { useState, useEffect } from "react"
import { useApp } from "../store/AppContext"

interface Props {
  context: "home" | "builder"
}

interface Hint {
  id: number
  text: string
  delay: number
  duration: number
}

const HINTS: Record<Props["context"], Hint[]> = {
  home: [
    {
      id: 0,
      text: "Describe your idea in plain language. Press ↵ to build.",
      delay: 2500,
      duration: 9000,
    },
  ],
  builder: [
    {
      id: 1,
      text: "Keep refining with follow-up prompts.",
      delay: 3000,
      duration: 6000,
    },
    {
      id: 2,
      text: "Switch between Desktop, Tablet, and Mobile preview.",
      delay: 4000,
      duration: 5000,
    },
  ],
}

export default function OnboardingHints({ context }: Props) {
  const { state, dispatch } = useApp()
  const [visibleHints, setVisibleHints] = useState<Set<number>>(new Set())

  // Don't render if user has completed onboarding
  if (state.hasSeenOnboarding) return null

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
      }}
    >
      {HINTS[context].map((hint) => (
        <HintItem
          key={hint.id}
          hint={hint}
          onDismiss={() => {
            setVisibleHints((prev) => {
              const s = new Set(prev)
              s.delete(hint.id)
              return s
            })
            const _total = HINTS[context].reduce((a, _h) => a + 1, 0)
            const allSeen = HINTS[context].every(
              (h) => h.id === hint.id || !visibleHints.has(h.id),
            )
            if (context === "builder" && allSeen) {
              dispatch({ type: "SET_ONBOARDED" })
            }
          }}
        />
      ))}
    </div>
  )
}

function HintItem({ hint, onDismiss }: { hint: Hint; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), hint.delay)
    return () => clearTimeout(showTimer)
  }, [hint.delay])

  useEffect(() => {
    if (!visible) return
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 350)
    }, hint.duration)
    return () => clearTimeout(hideTimer)
  }, [visible, hint.duration])

  if (!visible) return null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        padding: "5px 11px",
        fontSize: 11.5,
        color: "rgba(255,255,255,0.5)",
        animation: "fade-in 0.35s ease",
        cursor: "default",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 28 38"
        fill="white"
        style={{ opacity: 0.5, flexShrink: 0 }}
      >
        <path d="M16 2L2 20h11l-3 16 16-22H13L16 2z" />
      </svg>
      {hint.text}
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(onDismiss, 350)
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: "rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          marginLeft: 2,
        }}
        aria-label="Dismiss hint"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 2l6 6M8 2l-6 6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
