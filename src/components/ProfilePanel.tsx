import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import { savePersistedUser } from "../lib/persistence"
import { SettingsIcon, KeyboardIcon, LogOutIcon } from "./icons"
import { usageFraction } from "../lib/usageMeter"

interface Props {
  open: boolean
  onClose: () => void
  sidebarCollapsed?: boolean
}

export default function ProfilePanel({
  open,
  onClose,
  sidebarCollapsed,
}: Props) {
  const {
    currentUser,
    setCurrentUser,
    addToast,
    openModal,
    setShortcutOverlayOpen,
    usageMeter,
    setProjects,
    setActiveProject,
  } = useApp()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])

  if (!open) return null

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => null)
    } finally {
      savePersistedUser(null)
      setCurrentUser(null)
      // Clear project state so the builder doesn't see a previous user's work.
      setActiveProject(null)
      setProjects([])
      addToast("Signed out", "default")
      onClose()
    }
  }

  // ── Anonymous state ───────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          ...(sidebarCollapsed
            ? { bottom: 56, left: 60, right: "auto", width: 240 }
            : { bottom: 56, left: 8, right: "auto", width: 220 }),
          zIndex: 1000,
          borderRadius: 14,
          overflow: "hidden",
          background: "rgba(11,11,13,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)",
          animation: "shango-modal-enter 0.22s cubic-bezier(0.16,1,0.3,1) both",
          maxHeight: "min(480px, calc(100vh - 72px))",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "18px 16px 16px" }}>
          {/* Anonymous avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ opacity: 0.3 }}
              >
                <circle cx="7" cy="5" r="3" stroke="white" strokeWidth="1.3" />
                <path
                  d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Anonymous
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Work not saved
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              openModal("auth")
              onClose()
            }}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: 9,
              border: "none",
              background: "rgba(255,255,255,0.92)",
              color: "#0a0a0a",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "var(--font-geist)",
              cursor: "pointer",
              transition: "background 0.14s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.92)")
            }
          >
            Save my work →
          </button>
        </div>
        <style>{`@keyframes profileSlideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } } @keyframes profileSlideRight { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }`}</style>
      </div>
    )
  }

  // ── Credits calculation ───────────────────────────────────────────────────
  const creditPct = Math.round(usageFraction(usageMeter) * 100)
  const creditColor =
    creditPct >= 80
      ? "#ef4444"
      : creditPct >= 60
        ? "#f59e0b"
        : "rgba(255,255,255,0.45)"
  const creditBg =
    creditPct >= 80
      ? "rgba(239,68,68,0.08)"
      : creditPct >= 60
        ? "rgba(245,158,11,0.08)"
        : "rgba(255,255,255,0.04)"

  // ── Signed-in state ───────────────────────────────────────────────────────
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        ...(sidebarCollapsed
          ? { bottom: 56, left: 60, right: "auto", width: 248 }
          : { bottom: 56, left: 8, right: "auto", width: 248 }),
        zIndex: 1000,
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(11,11,13,0.97)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow:
          "0 8px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.025)",
        animation: "shango-modal-enter 0.22s cubic-bezier(0.16,1,0.3,1) both",
        maxHeight: "min(540px, calc(100vh - 72px))",
        overflowY: "auto",
      }}
    >
      {/* ── User identity block ── */}
      <div
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 13,
          }}
        >
          {/* Avatar with ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {currentUser && currentUser.name
                ? (currentUser.name[0]?.toUpperCase() ?? "?")
                : "?"}
            </div>
            {/* Status dot */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#4ade80",
                border: "1.5px solid rgba(11,11,13,0.97)",
                boxShadow: "0 0 6px rgba(74,222,128,0.5)",
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "var(--font-geist)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentUser.name}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10.5,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-geist)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentUser.email}
            </p>
          </div>

          {/* Plan badge */}
          <span
            style={{
              fontSize: 8.5,
              padding: "2px 7px",
              borderRadius: 4,
              flexShrink: 0,
              background:
                currentUser.plan === "pro"
                  ? "rgba(251,191,36,0.1)"
                  : "rgba(255,255,255,0.05)",
              border: `1px solid ${
                currentUser.plan === "pro"
                  ? "rgba(251,191,36,0.2)"
                  : "rgba(255,255,255,0.07)"
              }`,
              color:
                currentUser.plan === "pro"
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.1em",
            }}
          >
            {(currentUser.plan ?? "FREE").toUpperCase()}
          </span>
        </div>

        {/* ── Resource Allocation Progress Bar ── */}
        <div
          style={{
            borderRadius: 9,
            background: creditBg,
            border: `1px solid ${
              creditPct >= 80
                ? "rgba(239,68,68,0.15)"
                : creditPct >= 60
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(255,255,255,0.05)"
            }`,
            padding: "9px 11px",
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              TOKEN USAGE
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontFamily: "var(--font-mono-jetbrains)",
                color: creditColor,
                letterSpacing: "0.04em",
                transition: "color 0.3s ease",
              }}
            >
              {usageMeter.used.toLocaleString()} /{" "}
              {usageMeter.limit.toLocaleString()}
            </span>
          </div>

          {/* Track */}
          <div
            style={{
              height: 3,
              borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, creditPct)}%`,
                borderRadius: 3,
                background:
                  creditPct >= 80
                    ? "linear-gradient(to right, #ef4444, #f87171)"
                    : creditPct >= 60
                      ? "linear-gradient(to right, #f59e0b, #fbbf24)"
                      : "linear-gradient(to right, rgba(255,255,255,0.3), rgba(255,255,255,0.2))",
                boxShadow:
                  creditPct >= 80
                    ? "0 0 8px rgba(239,68,68,0.5)"
                    : creditPct >= 60
                      ? "0 0 8px rgba(245,158,11,0.4)"
                      : "none",
                transition:
                  "width 0.6s cubic-bezier(0.16,1,0.3,1), background 0.3s ease",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 5,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.2)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {creditPct >= 80
                ? "⚠ Approaching limit"
                : creditPct >= 60
                  ? "Moderate usage"
                  : "Healthy"}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.18)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {creditPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ padding: "5px 6px" }}>
        {[
          {
            icon: <SettingsIcon size={12} />,
            label: "Settings",
            action: () => {
              navigate("/settings")
              onClose()
            },
          },
          {
            icon: <KeyboardIcon size={12} />,
            label: "Keyboard shortcuts",
            action: () => {
              setShortcutOverlayOpen(true)
              onClose()
            },
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-geist)",
              fontSize: 12.5,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.12s ease, color 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              e.currentTarget.style.color = "rgba(255,255,255,0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "rgba(255,255,255,0.5)"
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.25)",
                display: "flex",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.04)",
          margin: "0 6px",
        }}
      />

      {/* ── Sign out ── */}
      <div style={{ padding: "5px 6px 7px" }}>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 10px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "var(--font-geist)",
            fontSize: 12.5,
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.12s ease, color 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.07)"
            e.currentTarget.style.color = "#ef4444"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "rgba(255,255,255,0.35)"
          }}
        >
          <span style={{ display: "flex", flexShrink: 0, opacity: 0.6 }}>
            <LogOutIcon size={12} />
          </span>
          Sign out
        </button>
      </div>

      <style>{`@keyframes profileSlideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
