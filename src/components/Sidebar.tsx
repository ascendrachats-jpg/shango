import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  HomeIcon,
  AppsIcon,
  TemplatesIcon,
  IntegrationsIcon,
  DeployIcon,
  LockIcon,
  ZapIcon,
  CommunityIcon,
} from "./icons"
import ProfilePanel from "./ProfilePanel"
import ConnectorsDrawer from "./ConnectorsDrawer"
import { useApp } from "../store/AppContext"

interface Props {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  activeSection: string
  setActiveSection: (s: string) => void
}

const NAV_ITEMS = [
  { id: "home", icon: HomeIcon, label: "Home", path: "/" },
  { id: "apps", icon: AppsIcon, label: "Projects", path: "/projects" },
  {
    id: "templates",
    icon: TemplatesIcon,
    label: "Templates",
    path: "/templates",
  },
  {
    id: "community",
    icon: CommunityIcon,
    label: "Community",
    external: "https://discord.gg/shango",
  },
]

const BOTTOM_ITEMS = [
  {
    id: "deployments",
    icon: DeployIcon,
    label: "Deployments",
    path: "/deployments",
  },
  { id: "integrations", icon: IntegrationsIcon, label: "Connectors" }, // opens drawer
  { id: "skills", icon: ZapIcon, label: "Skills", path: "/skills" },
]

export default function Sidebar({
  collapsed,
  setCollapsed,
  activeSection,
  setActiveSection,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, openModal, enabledSkills, connectedConnectors } =
    useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [connectorsOpen, setConnectorsOpen] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)

  const handleNav = (item: {
    id: string
    path?: string
    external?: string
    disabled?: boolean
  }) => {
    if (item.disabled) return
    if (item.external) {
      window.open(item.external, "_blank", "noopener,noreferrer")
      return
    }
    if (item.id === "integrations") {
      setConnectorsOpen(true)
      return
    }
    if (item.path) {
      navigate(item.path)
      setActiveSection("")
    } else setActiveSection(activeSection === item.id ? "" : item.id)
  }

  return (
    <>
      <div
        className="relative flex flex-col h-full flex-shrink-0"
        style={{
          width: collapsed ? 52 : 200,
          background: "rgba(10, 10, 11, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          zIndex: 10,
          transition: "width 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
        // No hover expand/collapse — manual toggle only
      >
        {/* The Telemetry Rail: Gradient edge */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 1,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Logo + collapse toggle */}
        <div
          style={{
            height: 52,
            padding: "0 8px 0 14px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          {/* Brand mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              overflow: "hidden",
              minWidth: 0,
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            <div
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition:
                  "filter 0.3s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)",
                transform: logoHovered ? "scale(1.08)" : "scale(1)",
                filter: logoHovered
                  ? "drop-shadow(0 0 16px var(--aura-color)) brightness(1.2)"
                  : "drop-shadow(0 0 6px rgba(255,255,255,0.2))",
                animation:
                  "shango-core-breathe 4s ease-in-out infinite alternate",
              }}
            >
              <svg width={18} height={18} viewBox="0 0 40 40" fill="none">
                <path
                  d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
                  fill="white"
                  opacity="0.92"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-geist)",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                opacity: collapsed ? 0 : 1,
                transform: collapsed ? "translateX(-4px)" : "translateX(0)",
                transition: "opacity 0.18s ease, transform 0.18s ease",
              }}
            >
              SHANGO
            </span>
          </div>

          {/* Manual collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.22)",
              cursor: "pointer",
              transition: "color 0.14s ease, background 0.14s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)"
              e.currentTarget.style.background = "rgba(255,255,255,0.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.22)"
              e.currentTarget.style.background = "transparent"
            }}
          >
            {collapsed ? (
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                <path
                  d="M1 2h11M1 5h8M1 8h5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                <path
                  d="M12 2H1M12 5H4M12 8H7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>

        <div style={{ padding: "10px 8px 5px" }}>
          <button
            type="button"
            onClick={() => navigate("/?new=1")}
            title="Start a new project"
            aria-label="Start a new project"
            style={{
              width: "100%",
              height: 34,
              display: "flex",
              alignItems: "center",
              gap: 9,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? 0 : "0 10px",
              border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.84)",
              fontFamily: "var(--font-geist)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition:
                "background 0.16s ease, border-color 0.16s ease, transform 0.14s var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.13)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.97)"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <ZapIcon size={14} />
            {!collapsed && (
              <span style={{ flex: 1, textAlign: "left" }}>New project</span>
            )}
            {!collapsed && (
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                N
              </span>
            )}
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-hidden py-1.5">
          <div className="flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.path
                ? location.pathname === item.path ||
                  (item.id === "apps" &&
                    location.pathname.startsWith("/project/"))
                : activeSection === item.id
              const Icon = item.icon
              return (
                <NavItem
                  key={item.id}
                  icon={<Icon width={16} height={16} />}
                  label={item.label}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={() => handleNav(item)}
                />
              )
            })}
          </div>

          {/* Section divider */}
          <div
            className="mx-3 my-2"
            style={{ height: 1, background: "rgba(255,255,255,0.04)" }}
          />

          <div className="flex flex-col gap-0.5 px-2">
            {BOTTOM_ITEMS.map((item) => {
              const isActive = item.path
                ? location.pathname === item.path
                : activeSection === item.id
              const Icon = item.icon
              const badge =
                item.id === "skills" && enabledSkills.length > 0
                  ? enabledSkills.length
                  : item.id === "integrations" && connectedConnectors.length > 0
                    ? connectedConnectors.length
                    : undefined
              return (
                <NavItem
                  key={item.id}
                  icon={<Icon width={16} height={16} />}
                  label={item.label}
                  isActive={isActive}
                  collapsed={collapsed}
                  badge={badge}
                  onClick={() => handleNav(item)}
                />
              )
            })}
          </div>
        </nav>

        {/* Profile zone — circular avatar */}
        <div
          className="flex-shrink-0 relative"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "8px 8px",
          }}
        >
          <button
            onClick={() =>
              currentUser ? setProfileOpen((v) => !v) : openModal("auth")
            }
            className="w-full flex items-center group"
            style={{
              gap: 10,
              height: 40,
              padding: collapsed ? "0" : "0 8px",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "var(--text-muted)",
              transition:
                "background 0.16s ease, color 0.16s ease, padding 0.24s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease",
              background: "transparent",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)"
              e.currentTarget.style.color = "var(--text-secondary)"
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow =
                "0 8px 24px -8px rgba(0,0,0,0.5), 0 0 16px rgba(255,255,255,0.02)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            {/* Circular avatar */}
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                flexShrink: 0,
                background: currentUser
                  ? "rgba(255,255,255,0.09)"
                  : "rgba(255,255,255,0.05)",
                border: currentUser
                  ? "1.5px solid rgba(255,255,255,0.18)"
                  : "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11.5,
                fontWeight: 600,
                color: currentUser
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                transition: "border-color 0.16s ease",
              }}
            >
              {currentUser && currentUser.name ? (
                (currentUser.name[0]?.toUpperCase() ?? "?")
              ) : (
                <LockIcon size={11} />
              )}
            </div>

            {/* User info — animated out when collapsed */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                minWidth: 0,
                flex: 1,
                opacity: collapsed ? 0 : 1,
                transform: collapsed ? "translateX(-4px)" : "translateX(0)",
                transition: "opacity 0.18s ease, transform 0.18s ease",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "var(--font-geist)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {currentUser ? currentUser.name : "Anonymous"}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.2,
                }}
              >
                {currentUser
                  ? (currentUser.plan?.toUpperCase() ?? "FREE")
                  : "Sign in →"}
              </span>
            </div>

            {/* Caret */}
            {currentUser && (
              <svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  opacity: collapsed ? 0 : 0.35,
                  transition: "opacity 0.18s ease",
                }}
              >
                <polyline points="2,4 5,7 8,4" />
              </svg>
            )}
          </button>

          <ProfilePanel
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            sidebarCollapsed={collapsed}
          />
        </div>
      </div>

      {/* Connectors drawer — renders outside the sidebar so it's truly full-screen */}
      <ConnectorsDrawer
        open={connectorsOpen}
        onClose={() => setConnectorsOpen(false)}
      />
    </>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  collapsed: boolean
  disabled?: boolean
  badge?: number
  onClick: () => void
}

function NavItem({
  icon,
  label,
  isActive,
  collapsed,
  disabled,
  badge,
  onClick,
}: NavItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="relative w-full flex items-center rounded-lg"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          gap: 10,
          height: 34,
          paddingLeft: 10,
          paddingRight: 8,
          background: isActive
            ? "transparent"
            : hovered && !disabled
              ? "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, transparent 100%)"
              : "transparent",
          color: disabled
            ? "var(--text-disabled)"
            : isActive
              ? "var(--text-primary)"
              : hovered
                ? "var(--text-secondary)"
                : "var(--text-muted)",
          textShadow: isActive ? "0 0 10px rgba(255,255,255,0.3)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.35 : 1,
          transition:
            "background 0.14s ease, color 0.14s ease, text-shadow 0.14s ease",
          overflow: "visible",
          border: "none",
          outline: "none",
        }}
      >
        {/* Active left-rail indicator (Aura Bar) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "10%",
            bottom: "10%",
            width: 3,
            borderRadius: "0 2px 2px 0",
            background: "var(--aura-color)",
            opacity: isActive ? 1 : 0,
            transform: isActive ? "scaleY(1)" : "scaleY(0.2)",
            transition:
              "opacity 0.18s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: isActive
              ? "0 0 16px var(--aura-color), 2px 0 8px var(--aura-color)"
              : "none",
          }}
        />

        {/* Icon */}
        <span
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            opacity: isActive ? 1 : 0.6,
            transition: "opacity 0.14s ease",
          }}
        >
          {icon}
        </span>

        {/* Label */}
        <span
          style={{
            fontFamily: "var(--font-geist)",
            fontSize: 12.5,
            fontWeight: isActive ? 500 : 400,
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(-4px)" : "translateX(0)",
            transition: "opacity 0.18s ease, transform 0.18s ease",
            flex: 1,
            textAlign: "left",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>

        {/* Badge */}
        {badge !== undefined && (
          <span
            style={{
              background: "rgba(74, 222, 128, 0.08)",
              color: "#4ade80",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              padding: "2px 5px",
              borderRadius: 4,
              flexShrink: 0,
              opacity: collapsed ? 0 : 1,
              transition: "opacity 0.18s ease",
              textShadow: "0 0 8px rgba(74,222,128,0.4)",
            }}
          >
            [ {badge} ]
          </span>
        )}
      </button>

      {/* Tooltip — only when collapsed */}
      {collapsed && hovered && (
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 10px)",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(12,12,14,0.92)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "5px 10px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            animation: "fadeIn 0.1s cubic-bezier(0.16,1,0.3,1) both",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "4px solid rgba(12,12,14,0.92)",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-geist)",
              color: "var(--text-primary)",
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
