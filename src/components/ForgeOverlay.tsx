import { useEffect, useState } from "react"
import { useApp } from "../store/AppContext"

const QUOTES = [
  "Every masterpiece begins with a single decision.",
  "The world changes because someone chooses to build.",
  "Creation begins before certainty arrives.",
  "Ideas deserve extraordinary execution.",
  "Build with intention. Leave a legacy.",
  "The strongest foundations are often invisible.",
  "Every great civilisation was once an idea.",
  "What you create today may outlive you.",
  "Do not fear beginning. Every masterpiece once started unfinished.",
  "The future remembers those who build it.",
  "Every line you write shapes tomorrow.",
  "The blank canvas does not intimidate the committed.",
  "Build quietly. Ship loudly.",
  "Precision is the foundation of ambition.",
  "The distance between idea and existence is smaller than you think.",
  "Not what exists. What should exist.",
  "The world does not need another idea. It needs another builder.",
  "Creation is an act of faith in what has not yet happened.",
  "There is no greater statement than a live product.",
  "Small teams have always built the things that changed everything.",
  "The window between idea and impact has never been smaller.",
  "Every great thing was built by someone who did not know it was impossible.",
  "Your architecture begins before your first line.",
  "Civilisations are built by people who refused to wait.",
  "The tools are ready. The only question is whether you are.",
  "Something real is about to exist.",
  "You are not using a tool. You are building a future.",
  "One idea, fully executed, changes everything.",
  "Begin. The rest will follow.",
  "The world is not waiting. Neither is SHANGO.",
]

export default function ForgeOverlay() {
  const { isForge, endForge } = useApp()

  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [typing, setTyping] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [textOpacity, setTextOpacity] = useState(1)
  const [cursorOn, setCursorOn] = useState(true)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    if (!isForge) return

    setOverlayOpacity(0)
    setTyping(false)
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length))
    setDisplayText("")
    setTextOpacity(1)
    setRevealing(false)

    let raf1: number, raf2: number
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOverlayOpacity(1))
    })

    const t1 = setTimeout(() => setTyping(true), 1050)
    const t2 = setTimeout(() => {
      setTyping(false)
      setRevealing(true)
      setOverlayOpacity(0)
    }, 6100)
    const t3 = setTimeout(() => endForge(), 7050)

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isForge, endForge])

  // When isForge goes false, the CSS opacity transition (0.92s) is already complete.
  // A separate effect handles setRevealing(false) so React cleanup on the main
  // effect cannot cancel it — this is what actually unmounts the overlay.
  useEffect(() => {
    if (isForge) return
    const t = setTimeout(() => setRevealing(false), 100)
    return () => clearTimeout(t)
  }, [isForge])

  useEffect(() => {
    if (!typing) return
    const t = setInterval(() => setCursorOn((v) => !v), 530)
    return () => clearInterval(t)
  }, [typing])

  useEffect(() => {
    if (!typing) return
    let cancelled = false
    let charIdx = 0
    const quote = QUOTES[quoteIndex % QUOTES.length]

    setDisplayText("")
    setTextOpacity(1)

    const tick = () => {
      if (cancelled) return
      charIdx++
      setDisplayText(quote.slice(0, charIdx))
      if (charIdx < quote.length) {
        setTimeout(tick, 44 + Math.random() * 28)
      } else {
        setTimeout(() => {
          if (cancelled) return
          setTextOpacity(0)
          setTimeout(() => {
            if (cancelled) return
            setQuoteIndex((i) => i + 1)
          }, 450)
        }, 1100)
      }
    }

    const t = setTimeout(tick, quoteIndex === 0 ? 420 : 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [quoteIndex, typing])

  if (!isForge && !revealing) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "#000",
        opacity: overlayOpacity,
        transition: revealing
          ? "opacity 0.92s cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 1.05s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "all",
      }}
    >
      {typing && (
        <div
          style={{
            maxWidth: 500,
            padding: "0 40px",
            textAlign: "center",
            opacity: textOpacity,
            transition:
              textOpacity === 0 ? "opacity 0.42s ease" : "opacity 0.18s ease",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 300,
              lineHeight: 1.75,
              letterSpacing: "0.025em",
              color: "rgba(255,255,255,0.84)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {displayText}
            <span
              style={{
                display: "inline-block",
                width: 1.5,
                height: "1.1em",
                background: "rgba(210,210,210,0.8)",
                marginLeft: 2,
                verticalAlign: "text-bottom",
                opacity: cursorOn ? 0.75 : 0,
                transition: "opacity 0.07s ease",
              }}
            />
          </p>
        </div>
      )}
    </div>
  )
}
