import { useState, useEffect, useRef } from "react"
import { SparklesIcon } from "lucide-react"

interface ZenCommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
  isGenerating: boolean
}

export default function ZenCommandPalette({
  isOpen,
  onClose,
  onSubmit,
  isGenerating,
}: ZenCommandPaletteProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setInput("")
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) setIsSubmitting(false)
  }, [isOpen])

  if (!isOpen) return null

  const handlePaletteSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating || isSubmitting) return
    setIsSubmitting(true)
    onSubmit(trimmed)
    onClose()
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "shango-fade-up 0.15s ease-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes circulatingGlow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          borderRadius: 16,
          padding: 1,
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.08)",
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circulating Hairline Glow Layer */}
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

        {/* Inner Command Palette Container */}
        <div
          style={{
            position: "relative",
            borderRadius: 15,
            background: "#0e0f14",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            padding: "12px 20px",
            gap: 12,
            zIndex: 1,
          }}
        >
          <SparklesIcon size={20} color="#38bdf8" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handlePaletteSubmit()
              }
            }}
            disabled={isGenerating || isSubmitting}
            placeholder="State the direction..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 18,
              fontFamily: "var(--font-geist)",
              padding: "8px 0",
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.3)",
              fontFamily: "var(--font-geist)",
              background: "rgba(255,255,255,0.05)",
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            ESC to cancel
          </div>
        </div>
      </div>
    </div>
  )
}
