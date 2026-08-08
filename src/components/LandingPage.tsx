import ParticleBackground from "./ParticleBackground"
import Omnibox from "./Omnibox"

interface Props {
  onSubmit: (prompt: string) => void
  visible: boolean
}

export default function LandingPage({ onSubmit, visible }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      <ParticleBackground />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          padding: "0 24px",
          gap: 0,
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s 0.1s ease, transform 0.5s 0.1s ease",
          }}
        >
          {/* Lightning icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
              <path
                d="M8 1L1 11h6l-1 8 7-11H7l1-7z"
                fill="white"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "white",
              letterSpacing: "0.12em",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            SHANGO
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: 13.5,
            letterSpacing: "0.02em",
            marginBottom: 48,
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 400,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.5s 0.18s ease, transform 0.5s 0.18s ease",
          }}
        >
          Africa's AI-native application builder.
        </p>

        {/* Omnibox */}
        <div
          style={{
            width: "100%",
            maxWidth: 680,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.5s 0.26s ease, transform 0.5s 0.26s ease",
          }}
        >
          <Omnibox onSubmit={onSubmit} />
        </div>
      </div>

      {/* Bottom context bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 28px 20px",
          display: "flex",
          alignItems: "center",
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s 0.4s ease",
        }}
      >
        <ContextDropdown label="New Project" />
        <div style={{ width: 12 }} />
        <ContextDropdown label="New Chat" />
        <div style={{ flex: 1 }} />
        <button
          aria-label="More options"
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
            fontSize: 18,
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.7)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.35)")
          }
        >
          ···
        </button>
      </div>
    </div>
  )
}

function ContextDropdown({ label }: { label: string }) {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.45)",
        fontSize: 12.5,
        fontFamily: "'Inter', -apple-system, sans-serif",
        cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s, background 0.15s",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "rgba(255,255,255,0.16)"
        el.style.color = "rgba(255,255,255,0.7)"
        el.style.background = "rgba(255,255,255,0.07)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "rgba(255,255,255,0.08)"
        el.style.color = "rgba(255,255,255,0.45)"
        el.style.background = "rgba(255,255,255,0.04)"
      }}
    >
      {label}
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        style={{ opacity: 0.6 }}
      >
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
