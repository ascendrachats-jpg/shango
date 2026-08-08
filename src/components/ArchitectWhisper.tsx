import { SparklesIcon } from "lucide-react"

interface WhisperProps {
  message: string
  visible: boolean
}

export default function ArchitectWhisper({ message, visible }: WhisperProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 24,
        background: "rgba(10, 11, 15, 0.78)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: 10,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 260,
        boxShadow: "0 8px 18px rgba(0,0,0,0.26)",
        animation: "shango-fade-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <SparklesIcon size={10} color="rgba(255,255,255,0.7)" />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.78)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.45,
          letterSpacing: "0.01em",
        }}
      >
        {message}
      </div>
    </div>
  )
}
