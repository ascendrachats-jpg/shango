import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip, Mic } from "lucide-react"

interface Props {
  onSubmit: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  "Mobile money dashboard",
  "NGO donation page",
  "Restaurant menu app",
  "Farmer crop tracker",
  "E-commerce storefront",
  "Real estate rental app",
]

export default function Omnibox({ onSubmit }: Props) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px"
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = value.trim().length > 0

  return (
    <div style={{ width: "100%", maxWidth: 680 }}>
      {/* Box */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          border: `1px solid ${
            focused ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"
          }`,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: focused
            ? "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.6)"
            : "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe your app..."
          rows={1}
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            padding: "20px 20px 0",
            color: "rgba(255,255,255,0.92)",
            fontSize: 15,
            lineHeight: 1.6,
            fontFamily: "'Inter', -apple-system, sans-serif",
            caretColor: "white",
            minHeight: 56,
            boxSizing: "border-box",
          }}
        />
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 14px 14px",
            gap: 4,
          }}
        >
          <button
            aria-label="Attach file"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.75)"
              ;(e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.06)"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.4)"
              ;(e.currentTarget as HTMLElement).style.background = "transparent"
            }}
          >
            <Paperclip size={15} strokeWidth={1.75} />
          </button>

          <button
            aria-label="Voice input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.75)"
              ;(e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.06)"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.4)"
              ;(e.currentTarget as HTMLElement).style.background = "transparent"
            }}
          >
            <Mic size={15} strokeWidth={1.75} />
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Generate"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: canSubmit ? "white" : "rgba(255,255,255,0.12)",
              color: canSubmit ? "#000" : "rgba(255,255,255,0.3)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 0.2s, color 0.2s, transform 0.1s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                ;(e.currentTarget as HTMLElement).style.transform =
                  "scale(1.05)"
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.transform = "scale(1)"
            }}
            onMouseDown={(e) => {
              if (canSubmit) {
                ;(e.currentTarget as HTMLElement).style.transform =
                  "scale(0.95)"
              }
            }}
            onMouseUp={(e) => {
              if (canSubmit) {
                ;(e.currentTarget as HTMLElement).style.transform =
                  "scale(1.05)"
              }
            }}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 16,
          justifyContent: "center",
        }}
      >
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              setValue(prompt)
              textareaRef.current?.focus()
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 12.5,
              fontFamily: "'Inter', -apple-system, sans-serif",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "rgba(255,255,255,0.22)"
              el.style.color = "rgba(255,255,255,0.8)"
              el.style.background = "rgba(255,255,255,0.07)"
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "rgba(255,255,255,0.1)"
              el.style.color = "rgba(255,255,255,0.5)"
              el.style.background = "rgba(255,255,255,0.04)"
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 24,
          color: "rgba(255,255,255,0.22)",
          fontSize: 11,
          fontFamily: "'Inter', -apple-system, sans-serif",
          letterSpacing: "0.03em",
        }}
      >
        <span>↵ to generate</span>
        <span>⌘K for commands</span>
        <span>⇧↵ for newline</span>
      </div>
    </div>
  )
}
