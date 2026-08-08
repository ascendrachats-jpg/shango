import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import ParticleBackground from "../components/ParticleBackground"
import Sidebar from "../components/Sidebar"
import { timeAgo } from "../lib/store"
import type { Project } from "../lib/store"
import { resolveGenerationPreferences } from "../lib/generation"
import {
  GEMINI_MODEL_OPTIONS,
  getModelOption,
  DEFAULT_MODEL_ID,
  resolveModelId,
  saveModelSelection,
} from "../lib/models"

// ── Template shelf data ───────────────────────────────────────────────────────
const HUB_TEMPLATES = [
  {
    id: "t1",
    name: "Patient Portal",
    category: "HEALTHCARE",
    accent: "#059669",
    icon: "🏥",
  },
  {
    id: "t2",
    name: "Chama Tracker",
    category: "FINTECH",
    accent: "#d97706",
    icon: "💰",
  },
  {
    id: "t3",
    name: "Fleet Dashboard",
    category: "LOGISTICS",
    accent: "#2563eb",
    icon: "🚛",
  },
  {
    id: "t4",
    name: "e-Commerce Store",
    category: "COMMERCE",
    accent: "#7c3aed",
    icon: "🛒",
  },
  {
    id: "t5",
    name: "Analytics Hub",
    category: "DATA",
    accent: "#0891b2",
    icon: "📊",
  },
  {
    id: "t6",
    name: "Booking System",
    category: "SERVICES",
    accent: "#dc2626",
    icon: "📅",
  },
]

function projectAccent(name: string): string {
  const hues = [200, 240, 160, 280, 20, 340, 60, 300]
  let h = 0
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xfffffff
  return `hsl(${hues[h % hues.length]}deg 35% 16%)`
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, createProject, openModal, setActiveProject, addToast } =
    useApp()
  const [visible, setVisible] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
  const [omniValue, setOmniValue] = useState("")
  const [omniFocused, setOmniFocused] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [awakening, setAwakening] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const extensionRef = useRef<HTMLDivElement>(null)
  const modelToggleRef = useRef<HTMLButtonElement>(null)
  const [modelMenuPos, setModelMenuPos] = useState<{
    left: number
    bottom: number
  } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("shango_sidebar") !== "false",
  )
  const [activeSection, setActiveSection] = useState("")
  const [modelOpen, setModelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const preferences = resolveGenerationPreferences()
    return resolveModelId(preferences.model)
  })
  const [voiceActive, setVoiceActive] = useState(false)
  const [planMode, setPlanMode] = useState(
    () => resolveGenerationPreferences().mode === "plan",
  )
  const [lowDataMode] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("shango_settings") ?? "{}")
          .dataSaver === true
      )
    } catch {
      return false
    }
  })

  const handleSectionNav = (s: string) => {
    const routes: Record<string, string> = {
      apps: "/projects",
      history: "/projects",
      templates: "/templates",
      deployments: "/deployments",
      skills: "/skills",
    }
    if (routes[s]) navigate(routes[s])
    else setActiveSection((prev) => (prev === s ? "" : s))
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (lowDataMode) return
    let cancelled = false
    void import("../imports/SHANGO_typography_pulsing_energy_202607151603.mp4")
      .then((module) => {
        if (!cancelled) setHeroVideoUrl(module.default)
      })
      .catch(() => {
        // Graceful fallback if video asset is omitted
      })
    return () => {
      cancelled = true
    }
  }, [lowDataMode])

  // Background video playback controller
  useEffect(() => {
    const video = videoRef.current
    if (!video || !heroVideoUrl) return

    const ensurePlaying = () => {
      if (video.paused) {
        video.play().catch(() => {})
      }
    }

    // Initial play attempt
    ensurePlaying()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensurePlaying()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", ensurePlaying)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", ensurePlaying)
    }
  }, [heroVideoUrl])

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    if (search.get("new") !== "1") return
    const starterBrief = search.get("brief")
    if (starterBrief) setOmniValue(starterBrief)
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 180)
    return () => window.clearTimeout(timer)
  }, [location.search])

  useEffect(() => {
    if (!state.user && state.projects.length > 0) {
      const t = setTimeout(() => setShowNudge(true), 2500)
      return () => clearTimeout(t)
    }
  }, [state.user, state.projects.length])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px"
  }, [omniValue])

  const handleSubmit = async () => {
    const trimmed = omniValue.trim()
    if (!trimmed || awakening || isSubmitting) return
    setAwakening(true)
    setIsSubmitting(true)
    setOmniValue("")
    const persistMode = planMode ? "plan" : "build"
    const project = createProject(trimmed, {
      model: selectedModel,
      mode: persistMode,
    })

    try {
      if (project?.id) {
        setActiveProject(project.id)
        navigate(`/project/${project.id}`)
      } else {
        throw new Error("Project creation failed locally.")
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create project"
      addToast(message, "error")
    } finally {
      setIsSubmitting(false)
      setAwakening(false)
    }
  }

  const handleModeChange = (nextPlanMode: boolean) => {
    setPlanMode(nextPlanMode)
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "shango_generation_mode",
        nextPlanMode ? "plan" : "build",
      )
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const preferences = resolveGenerationPreferences()
    setPlanMode(preferences.mode === "plan")
    setSelectedModel(resolveModelId(preferences.model))
  }, [])

  // ── Model dropdown portal positioning ──────────────────────────────
  // The omnibox uses overflow:hidden on its border/inner shells, which clips
  // any absolutely-positioned child.  We render the menu via a portal to
  // document.body and position it relative to the toggle button so it is
  // never clipped.
  const computeModelMenuPos = useCallback(() => {
    const el = modelToggleRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setModelMenuPos({
      left: rect.right,
      bottom: window.innerHeight - rect.top + 6,
    })
  }, [])

  useLayoutEffect(() => {
    if (!modelOpen) {
      setModelMenuPos(null)
      return
    }
    computeModelMenuPos()
    const onScroll = () => computeModelMenuPos()
    const onResize = () => computeModelMenuPos()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [modelOpen, computeModelMenuPos])

  // Close on outside click / Escape
  useEffect(() => {
    if (!modelOpen) return
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        modelToggleRef.current?.contains(target) ||
        document.getElementById("shango-model-menu")?.contains(target)
      )
        return
      setModelOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModelOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [modelOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = omniValue.trim().length > 0

  // ── Hero content — identical for both signed-out and signed-in ─────────────
  const heroContent = (
    <>
      {/* Storm video background */}
      {!lowDataMode && heroVideoUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: videoReady ? 1 : 0,
            transition: "opacity 1.4s ease",
          }}
        >
          <video
            ref={videoRef}
            src={heroVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => {
              setVideoReady(true)
              videoRef.current?.play().catch(() => {})
            }}
            onLoadedData={() => {
              setVideoReady(true)
              videoRef.current?.play().catch(() => {})
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.52) contrast(0.9) saturate(0.85)",
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      {/* Particle atmosphere */}
      {!lowDataMode && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <ParticleBackground />
        </div>
      )}

      {/* Background watermark — pushed deep behind all content */}
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          bottom: "8%",
          left: 0,
          right: 0,
          pointerEvents: "none",
          userSelect: "none",
          fontSize: "clamp(80px, 18vw, 180px)",
          fontWeight: 800,
          letterSpacing: "0.32em",
          color: "white",
          opacity: 0.016,
          fontFamily: "var(--font-geist)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* The Genesis Sequence: Infinite architectural marquee */}
        <div
          style={{
            display: "flex",
            animation: "shango-marquee 120s linear infinite",
          }}
        >
          <span style={{ paddingRight: "20vw" }}>SHANGO</span>
          <span style={{ paddingRight: "20vw" }}>SHANGO</span>
          <span style={{ paddingRight: "20vw" }}>SHANGO</span>
          <span style={{ paddingRight: "20vw" }}>SHANGO</span>
        </div>
      </div>

      {/* Gradient vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          background: [
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 100%)",
            "linear-gradient(to bottom, rgba(6,6,6,0.52) 0%, rgba(6,6,6,0.08) 30%, rgba(6,6,6,0.06) 65%, rgba(6,6,6,0.75) 100%)",
          ].join(", "),
          pointerEvents: "none",
        }}
      />

      {/* Atmospheric focus blur — blurs the entire cinematic environment when omnibox is active */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 9,
          backdropFilter: omniFocused
            ? "blur(8px) brightness(0.85)"
            : "blur(0px) brightness(1)",
          WebkitBackdropFilter: omniFocused
            ? "blur(8px) brightness(0.85)"
            : "blur(0px) brightness(1)",
          transition:
            "backdrop-filter 0.55s cubic-bezier(0.16,1,0.3,1), -webkit-backdrop-filter 0.55s cubic-bezier(0.16,1,0.3,1)",
          background: omniFocused ? "rgba(0,0,0,0.12)" : "transparent",
          pointerEvents: "none",
        }}
      />

      {/* Pinned tagline — top-center technical header */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: visible ? (omniFocused ? 0.1 : 0.3) : 0,
          transition: "opacity 0.5s 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: 8.5,
            letterSpacing: "0.36em",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "var(--font-mono-jetbrains)",
            fontWeight: 400,
            textTransform: "uppercase",
            display: "flex",
            gap: 12,
          }}
        >
          {["DESCRIBE", "·", "BUILD", "·", "SHIP"].map((word, i) => (
            <span
              key={i}
              style={{
                animation: visible
                  ? `shango-blur-reveal 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.15 + 0.4}s both`
                  : "none",
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Top nav — signed-out only; sidebar handles branding when signed in */}
      {!state.user && (
        <nav
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            height: 64,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
            opacity: visible ? (omniFocused ? 0.38 : 1) : 0,
            transition: "opacity 0.5s 0.4s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              userSelect: "none",
            }}
          >
            <svg width="12" height="18" viewBox="0 0 11 16" fill="none">
              <path
                d="M6.5 1L1 9h5L4.5 15 10 7H5.5L6.5 1z"
                fill="rgba(255,255,255,0.9)"
              />
            </svg>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.2em",
              }}
            >
              SHANGO
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogInBtn onClick={() => openModal("auth")} />
            <GetStartedBtn onClick={() => textareaRef.current?.focus()} />
          </div>
        </nav>
      )}

      {/* Anon nudge banner */}
      {showNudge && !state.user && (
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            zIndex: 21,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "8px 20px",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            fontSize: 11.5,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Your work exists only in this session.
          <button
            onClick={() => openModal("auth")}
            style={{
              padding: "2px 9px",
              borderRadius: 5,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Keep it →
          </button>
          <button
            onClick={() => setShowNudge(false)}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.2)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Center content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          animation: awakening
            ? "shango-singularity-expand 0.4s cubic-bezier(0.8, 0, 0.2, 1) 0.4s forwards"
            : "none",
        }}
      >
        {/* Omnibox */}
        <div
          style={{
            width: "100%",
            maxWidth: omniFocused ? 720 : 620,
            opacity: visible ? 1 : 0,
            transform: visible
              ? omniFocused
                ? "translateY(0) scale(1.04)"
                : "translateY(0) scale(1)"
              : "translateY(14px) scale(1)",
            transition: omniFocused
              ? "opacity 0.6s 0.55s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1), max-width 0.5s cubic-bezier(0.16,1,0.3,1)"
              : "opacity 0.6s 0.55s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1), max-width 0.4s cubic-bezier(0.16,1,0.3,1)",
            animation: awakening
              ? "shango-singularity-collapse 0.6s cubic-bezier(0.8, 0, 0.2, 1) forwards"
              : "none",
          }}
        >
          {/* Animated border shell */}
          <div
            style={{
              position: "relative",
              borderRadius: 16,
              padding: "1px",
              overflow: "hidden",
              background: omniFocused ? "transparent" : "rgba(255,255,255,0.1)",
              boxShadow: omniFocused
                ? "0 24px 80px -10px var(--aura-color)"
                : "0 16px 48px rgba(0,0,0,0.5)",
              transition: "box-shadow 0.5s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {omniFocused && (
              <div
                style={{
                  position: "absolute",
                  width: "200%",
                  height: "200%",
                  top: "-50%",
                  left: "-50%",
                  background:
                    "conic-gradient(from 0deg at 50% 50%, rgba(18,18,18,1) 0%, rgba(18,18,18,1) 32%, var(--aura-color) 45%, rgba(255,255,255,0.92) 50%, var(--aura-color) 55%, rgba(18,18,18,1) 68%, rgba(18,18,18,1) 100%)",
                  animation: "border-orbit 4s linear infinite",
                  pointerEvents: "none",
                }}
              />
            )}

            <div
              style={{
                position: "relative",
                borderRadius: 15,
                background: omniFocused
                  ? "rgba(19,19,20,0.45)"
                  : "rgba(14,14,15,0.55)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                transition: "background 0.35s ease",
                overflow: "hidden",
              }}
            >
              <textarea
                ref={textareaRef}
                value={omniValue}
                onChange={(e) => setOmniValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setOmniFocused(true)}
                onBlur={() => setOmniFocused(false)}
                aria-label="Describe what you want Shango to create"
                placeholder={
                  planMode
                    ? "What would you like to plan?"
                    : "What do you want to build?"
                }
                rows={1}
                style={{
                  display: "block",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  padding: "14px 16px 8px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 15,
                  lineHeight: 1.5,
                  fontFamily: "var(--font-geist)",
                  caretColor: "rgba(210,210,210,1)",
                  minHeight: 0,
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 12px 10px",
                  gap: 6,
                }}
              >
                <ToolBtn title="Attach context">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M12 5.5l-5.5 5.5a3 3 0 01-4.24-4.24L8 1a1.75 1.75 0 012.47 2.47L5 9a.75.75 0 01-1.06-1.06L8.97 3.9"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ToolBtn>

                <ToolBtn
                  title="Voice input"
                  onClick={() => {
                    setVoiceActive((v) => !v)
                    if (!voiceActive) {
                      setTimeout(() => {
                        setVoiceActive(false)
                        setOmniValue(
                          (v) =>
                            v +
                            (v ? " " : "") +
                            "Build a mobile-first application",
                        )
                      }, 2000)
                    }
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {voiceActive && (
                      <div
                        style={{
                          position: "absolute",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "1.5px solid rgba(255,255,255,0.5)",
                          animation: "voice-ring 1s ease-out infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
                      <rect
                        x="3.5"
                        y="0.75"
                        width="5"
                        height="8"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M1 7.5a5 5 0 0010 0M6 12.5v2"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </ToolBtn>

                {/* Plan / Build capsule toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 7,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {(["Plan", "Build"] as const).map((mode) => {
                    const active = (mode === "Plan") === planMode
                    return (
                      <button
                        key={mode}
                        onClick={() => handleModeChange(mode === "Plan")}
                        style={{
                          padding: "3px 10px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 9.5,
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "0.08em",
                          background: active
                            ? "rgba(255,255,255,0.12)"
                            : "transparent",
                          color: active
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(255,255,255,0.3)",
                          transition: "background 0.18s ease, color 0.18s ease",
                        }}
                      >
                        {mode.toUpperCase()}
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1 }} />

                {/* Model selector */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={modelToggleRef}
                    onClick={() => setModelOpen((v) => !v)}
                    style={{
                      fontSize: 10.5,
                      color: "rgba(255,255,255,0.3)",
                      letterSpacing: "0.04em",
                      marginRight: 6,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 6px",
                      borderRadius: 5,
                      transition: "color 0.14s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
                    }
                  >
                    {getModelOption(selectedModel).label}
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                      <path
                        d="M1 1l2.5 3L6 1"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {modelOpen &&
                    modelMenuPos &&
                    createPortal(
                      <div
                        id="shango-model-menu"
                        style={{
                          position: "fixed",
                          left: modelMenuPos.left,
                          bottom: modelMenuPos.bottom,
                          transform: "translateX(-100%)",
                          background: "rgba(14,14,14,0.97)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10,
                          padding: "4px",
                          minWidth: 240,
                          maxWidth: 300,
                          maxHeight: 360,
                          overflowY: "auto",
                          boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
                          zIndex: 99999,
                          animation: "fadeIn 0.1s ease",
                        }}
                      >
                        {(GEMINI_MODEL_OPTIONS.map((m) => ({
                          id: m.id,
                          label: m.label,
                          desc: m.desc,
                        }))).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id)
                              saveModelSelection(m.id)
                              setModelOpen(false)
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "7px 10px",
                              borderRadius: 7,
                              background:
                                selectedModel === m.id
                                  ? "rgba(255,255,255,0.08)"
                                  : "transparent",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "background 0.12s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (selectedModel !== m.id)
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.04)"
                            }}
                            onMouseLeave={(e) => {
                              if (selectedModel !== m.id)
                                e.currentTarget.style.background = "transparent"
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.85)",
                                  fontFamily: "var(--font-geist)",
                                  fontWeight: selectedModel === m.id ? 500 : 400,
                                }}
                              >
                                {m.label}
                              </p>
                              <p
                                style={{
                                  fontSize: 9.5,
                                  color: "rgba(255,255,255,0.3)",
                                  fontFamily: "var(--font-geist)",
                                  marginTop: 1,
                                }}
                              >
                                {m.desc}
                              </p>
                            </div>
                            {selectedModel === m.id && (
                              <svg
                                width="10"
                                height="8"
                                viewBox="0 0 10 8"
                                fill="none"
                              >
                                <path
                                  d="M1 4l3 3 5-6"
                                  stroke="rgba(255,255,255,0.6)"
                                  strokeWidth="1.3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || awakening || isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 9,
                    border: "none",
                    background:
                      awakening || isSubmitting
                        ? "rgba(255,255,255,0.14)"
                        : canSubmit
                          ? "rgba(255,255,255,0.92)"
                          : "rgba(255,255,255,0.07)",
                    color:
                      awakening || isSubmitting
                        ? "rgba(255,255,255,0.5)"
                        : canSubmit
                          ? "#0a0a0a"
                          : "rgba(255,255,255,0.18)",
                    cursor:
                      canSubmit && !awakening && !isSubmitting
                        ? "pointer"
                        : "not-allowed",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    letterSpacing: "0.06em",
                    transition: "all 0.3s ease",
                    minWidth: 90,
                    animation: awakening
                      ? "awakening-pulse 1.6s ease-in-out infinite"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (canSubmit && !awakening && !isSubmitting) {
                      ;(e.currentTarget as HTMLElement).style.background =
                        "white"
                      ;(e.currentTarget as HTMLElement).style.transform =
                        "scale(1.02)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canSubmit && !awakening && !isSubmitting) {
                      ;(e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.92)"
                      ;(e.currentTarget as HTMLElement).style.transform =
                        "scale(1)"
                    }
                  }}
                >
                  {awakening ? (
                    <span
                      style={{
                        opacity: 0.7,
                        letterSpacing: "0.06em",
                        fontSize: 9,
                      }}
                    >
                      CREATING
                    </span>
                  ) : (
                    <>
                      <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
                        <path
                          d="M5.5 1L1 6.5h4L3.5 11 8 5H4.5L5.5 1z"
                          fill="currentColor"
                        />
                      </svg>
                      {planMode ? "PLAN" : "BUILD"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p
            style={{
              margin: "10px 4px 0",
              minHeight: 16,
              color: "rgba(255,255,255,0.34)",
              fontSize: 10.5,
              fontFamily: "var(--font-geist)",
              textAlign: "center",
            }}
          >
            {planMode
              ? "Start with a clear approach. Nothing is changed until you choose to build."
              : "Shango will shape a working first draft you can review and continue refining."}
          </p>

          {awakening && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                animation: "shango-fade-up 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="shango-loading-dot"
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(56,189,248,0.7)",
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11.5,
                  fontFamily: "var(--font-geist)",
                  letterSpacing: "0.01em",
                }}
              >
                Setting up your workspace…
              </span>
            </div>
          )}

          {/* Keyboard hints */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              marginTop: 18,
              color: "rgba(255,255,255,0.16)",
              fontSize: 10.5,
              letterSpacing: "0.03em",
              opacity: omniFocused ? 0.18 : 1,
              transition: "opacity 0.4s ease",
            }}
          >
            <span>↵ create</span>
            <span>⌘K anything</span>
            <span>⇧↵ newline</span>
          </div>
        </div>
      </div>
    </>
  )

  // ── Signed-out: original fixed layout, zero changes ────────────────────────
  if (!state.user) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#060606",
          fontFamily: "var(--font-geist)",
          overflow: "hidden",
        }}
      >
        {heroContent}
      </div>
    )
  }

  // ── Signed-in: sidebar left rail + rounded scrollable canvas right ────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        background: "var(--surface-0)",
        fontFamily: "var(--font-geist)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar rail — wrapped for focus-blur isolation */}
      <div style={{ position: "relative", flexShrink: 0, zIndex: 20 }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={(v) => {
            setSidebarCollapsed(v)
            localStorage.setItem("shango_sidebar", String(v))
          }}
          activeSection={activeSection}
          setActiveSection={handleSectionNav}
        />
        {/* Atmospheric blur overlay — softens the rail when omnibox is active */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: omniFocused
              ? "blur(6px) brightness(0.75)"
              : "blur(0px) brightness(1)",
            WebkitBackdropFilter: omniFocused
              ? "blur(6px) brightness(0.75)"
              : "blur(0px) brightness(1)",
            transition:
              "backdrop-filter 0.55s cubic-bezier(0.16,1,0.3,1), -webkit-backdrop-filter 0.55s cubic-bezier(0.16,1,0.3,1)",
            background: omniFocused ? "rgba(0,0,0,0.22)" : "transparent",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      </div>

      {/* Rounded sandbox canvas — hero + shelves scroll inside this frame */}
      <div
        style={{
          flex: 1,
          margin: "14px 14px 14px 0",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div className="scroll-hidden" style={{ flex: 1, overflowY: "auto" }}>
          {/* Hero — fills the canvas viewport exactly */}
          <div
            style={{
              height: "calc(100vh - 28px)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {heroContent}

            {/* Scroll invitation */}
            <div
              onClick={() =>
                extensionRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                position: "absolute",
                bottom: 20,
                left: 0,
                right: 0,
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                opacity: omniFocused ? 0 : 0.38,
                transition: "opacity 0.4s ease",
                animation: "scroll-hint-bob 2.8s ease-in-out infinite",
              }}
            >
              <span
                style={{
                  fontSize: 8.5,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                YOUR WORKSPACE
              </span>
              <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
                <path
                  d="M1 1l5.5 5 5.5-5"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Content shelves */}
          <div ref={extensionRef} style={{ background: "var(--surface-0)" }}>
            <AuthenticatedExtension
              projects={state.projects}
              onCreateProject={(prompt) => {
                const project = createProject(prompt)
                if (project) navigate(`/project/${project.id}`)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Authenticated extension — shelves only, no duplicate omnibox ─────────────

function AuthenticatedExtension({
  projects,
  onCreateProject,
}: {
  projects: Project[]
  onCreateProject: (prompt: string) => void
}) {
  const navigate = useNavigate()
  const { setActiveProject } = useApp()
  type Tab = "My projects" | "Recently viewed" | "SHANGO templates"
  const [activeTab, setActiveTab] = useState<Tab>("My projects")

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime(),
    )
    .slice(0, 8)

  return (
    <div
      style={{
        padding: "40px 36px 60px",
        animation: "shango-fade-up 0.26s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Unified hub wrapper */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(19,19,20,0.45)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        {/* Tab nav row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            height: 46,
            gap: 2,
          }}
        >
          {/* Search field */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 10px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              marginRight: 8,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle
                cx="5"
                cy="5"
                r="3.5"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.2"
              />
              <path
                d="M8 8l2 2"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontSize: 11.5,
                color: "rgba(255,255,255,0.22)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Search
            </span>
          </div>

          {/* Tabs */}
          {([
            "My projects",
            "Recently viewed",
            "SHANGO templates",
          ] as const).map((tab) => (
            <HubTab
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            />
          ))}

          <div style={{ flex: 1 }} />

          {/* Browse all */}
          <button
            onClick={() =>
              navigate(
                activeTab === "SHANGO templates" ? "/templates" : "/projects",
              )
            }
            style={{
              fontSize: 11.5,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-geist)",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color 0.14s ease",
              padding: "4px 0",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.65)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
            }
          >
            Browse all →
          </button>
        </div>

        {/* Grid track */}
        <div style={{ padding: "20px 20px 24px" }}>
          {activeTab === "My projects" &&
            (recentProjects.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {recentProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => {
                      setActiveProject(p.id)
                      navigate(`/project/${p.id}`)
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptySlate label="No projects yet — describe something above to start." />
            ))}

          {activeTab === "Recently viewed" &&
            (recentProjects.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {recentProjects
                  .slice()
                  .reverse()
                  .map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onClick={() => {
                        setActiveProject(p.id)
                        navigate(`/project/${p.id}`)
                      }}
                    />
                  ))}
              </div>
            ) : (
              <EmptySlate label="Nothing viewed yet." />
            ))}

          {activeTab === "SHANGO templates" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {HUB_TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => onCreateProject(`Build a ${t.name}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hub nav sub-components ────────────────────────────────────────────────────

function HubTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0 12px",
        height: "100%",
        border: "none",
        background: "none",
        color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.32)",
        fontSize: 12.5,
        fontWeight: active ? 500 : 400,
        fontFamily: "var(--font-geist)",
        cursor: "pointer",
        borderBottom: active
          ? "1.5px solid rgba(255,255,255,0.7)"
          : "1.5px solid transparent",
        transition: "color 0.15s ease, border-color 0.15s ease",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.55)"
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.32)"
      }}
    >
      {label}
    </button>
  )
}

function EmptySlate({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "36px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.2)",
        fontSize: 12,
        fontFamily: "var(--font-geist)",
        fontStyle: "italic",
      }}
    >
      {label}
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const accent = projectAccent(project.name)
  const versionNum = project.versions.length > 0 ? project.versions.length : 1
  const isLive = project.status === "LIVE"

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: hovered
          ? "rgba(255,255,255,0.035)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"
        }`,
        cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 32px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.15)",
        transition:
          "transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s cubic-bezier(0.16,1,0.3,1), border-color 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 80,
          background: accent,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Version stamp */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 9,
            fontSize: 8.5,
            fontFamily: "var(--font-mono-jetbrains)",
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.06em",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            padding: "1.5px 6px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          v{versionNum}
        </div>

        {/* Status badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 9,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            borderRadius: 100,
            padding: "2px 7px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              flexShrink: 0,
              background: isLive ? "#4ade80" : "rgba(255,255,255,0.22)",
              boxShadow: isLive ? "0 0 6px rgba(74,222,128,0.6)" : "none",
              animation: isLive
                ? "live-pulse 2.4s ease-in-out infinite"
                : "none",
            }}
          />
          <span
            style={{
              fontSize: 7.5,
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.12em",
              color: isLive ? "#4ade80" : "rgba(255,255,255,0.3)",
            }}
          >
            {isLive ? "LIVE" : "DRAFT"}
          </span>
        </div>

        {hovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "shango-fade-up 0.14s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "var(--font-geist)",
                letterSpacing: "0.03em",
              }}
            >
              Continue →
            </span>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div
        style={{
          padding: "9px 12px 11px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            fontFamily: "var(--font-geist)",
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            fontSize: 9.5,
            color: "rgba(255,255,255,0.28)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.04em",
          }}
        >
          {timeAgo(project.lastEdited)}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  onClick,
}: {
  template: typeof HUB_TEMPLATES[0]
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 172,
        flexShrink: 0,
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--surface-2)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 10px 30px rgba(0,0,0,0.35)"
          : "0 2px 8px rgba(0,0,0,0.12)",
        transition:
          "transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s cubic-bezier(0.16,1,0.3,1), border-color 0.15s ease",
      }}
    >
      <div
        style={{
          height: 68,
          background: `${template.accent}1a`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          position: "relative",
        }}
      >
        {template.icon}
        {hovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "shango-fade-up 0.14s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Use template →
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: "9px 13px 12px" }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
            marginBottom: 2,
          }}
        >
          {template.name}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.08em",
          }}
        >
          {template.category}
        </div>
      </div>
    </div>
  )
}

// ── Hero sub-components — unchanged from original ─────────────────────────────

function LogInBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "6px 14px",
        borderRadius: 7,
        border: "none",
        background: "transparent",
        color: hov ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "color 0.15s",
        letterSpacing: "0.01em",
      }}
    >
      Log in
    </button>
  )
}

function GetStartedBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "6px 16px",
        borderRadius: 7,
        border: "1px solid rgba(255,255,255,0.18)",
        background: hov ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.92)",
        color: "#0a0a0a",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        letterSpacing: "0.01em",
        transition: "background 0.15s, border-color 0.15s",
        boxShadow: hov ? "0 2px 12px rgba(255,255,255,0.15)" : "none",
      }}
    >
      Get started
    </button>
  )
}

function ToolBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "none",
        background: hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: hov ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s, background 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}
