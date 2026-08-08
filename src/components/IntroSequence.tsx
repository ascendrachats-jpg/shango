import { useEffect, useState } from "react"

interface Props {
  onComplete: () => void
}

export default function IntroSequence({ onComplete }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0)

  // 0: black  1: sparks  2: bolt assembles  3: wordmark  4: exit
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120)
    const t2 = setTimeout(() => setPhase(2), 420)
    const t3 = setTimeout(() => setPhase(3), 700)
    const t4 = setTimeout(() => setPhase(4), 1050)
    const t5 = setTimeout(() => onComplete(), 1600)
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, [onComplete])

  const exiting = phase === 4

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transition: exiting
          ? "opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
        pointerEvents: exiting ? "none" : "all",
      }}
    >
      {/* Sparks scatter */}
      {phase >= 1 && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {SPARKS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                borderRadius: "50%",
                background: "white",
                opacity: phase === 1 ? s.opacity : 0,
                transform:
                  phase === 1
                    ? "scale(1)"
                    : `translate(${s.dx}px, ${s.dy}px) scale(0)`,
                transition: `opacity ${s.dur}ms ${s.delay}ms ease, transform ${s.dur}ms ${s.delay}ms ease`,
              }}
            />
          ))}
        </div>
      )}

      {/* Lightning bolt */}
      <div
        style={{
          position: "relative",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "scale(1)" : "scale(0.6)",
          transition: "opacity 0.22s ease-out, transform 0.22s ease-out",
        }}
      >
        <svg width="32" height="46" viewBox="0 0 32 46" fill="none">
          <defs>
            <filter id="bolt-glow" x="-60%" y="-40%" width="220%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M19 2L4 24h13L13 44l15.5-23H15.5L19 2z"
            fill="white"
            filter="url(#bolt-glow)"
            opacity={phase === 2 ? 0.5 : phase >= 3 ? 1 : 0}
            style={{ transition: "opacity 0.2s ease" }}
          />
        </svg>

        {/* Electric pulse ring */}
        {phase === 2 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.4)",
              animation: "pulse-ring 0.6s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* SHANGO wordmark */}
      <div
        style={{
          marginTop: 18,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.28s ease-out, transform 0.28s ease-out",
          letterSpacing: "0.2em",
          fontSize: 16,
          fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          fontFamily: "'Inter', -apple-system, sans-serif",
          userSelect: "none",
        }}
      >
        SHANGO
      </div>
    </div>
  )
}

// Sparks that scatter toward the center
const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2
  const dist = 28 + Math.random() * 22
  return {
    x: 50 + Math.cos(angle) * (15 + Math.random() * 8),
    y: 50 + Math.sin(angle) * (15 + Math.random() * 8),
    dx: -Math.cos(angle) * dist,
    dy: -Math.sin(angle) * dist,
    size: 1.5 + Math.random() * 2,
    opacity: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 80,
    dur: 180 + Math.random() * 120,
  }
})
