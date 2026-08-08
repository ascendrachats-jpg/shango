import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import {
  SearchIcon,
  AppsIcon,
  TemplatesIcon,
  IntegrationsIcon,
  SettingsIcon,
  PlusIcon,
  ZapIcon,
} from "./icons"
import { searchSkills, ALL_SKILLS } from "../lib/skills"
import { searchConnectors, ALL_CONNECTORS } from "../lib/connectors"
import {
  GEMINI_MODEL_OPTIONS,
  saveModelSelection,
} from "../lib/models"

interface Command {
  id: string
  label: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

export default function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    projects,
    setShortcutOverlayOpen,
    installedSkills,
    connectedConnectors,
    openModal,
    setActiveProject,
  } = useApp()
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const SkillMonogram = ({ monogram }: { monogram: string }) => (
    <div
      style={{
        width: 13,
        height: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: "currentColor",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "-0.02em",
        }}
      >
        {monogram}
      </span>
    </div>
  )

  const DeployIcon2 = () => (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L14 8L8 14M2 8H14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
  const ShareIcon2 = () => (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M10.5 4.75L5.5 7.25M10.5 11.25L5.5 8.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
  const ExportIcon2 = () => (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2v8M5 7l3 3 3-3M3 12h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
  const AppearanceIcon = () => (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 2.5v11M2.5 8h11"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )

  const commands: Command[] = [
    // Actions
    {
      id: "deploy",
      label: "Deploy latest",
      shortcut: "⌘D",
      icon: <DeployIcon2 />,
      group: "Actions",
      action: () => {
        openModal("deploy")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "share",
      label: "Share project",
      shortcut: "⌘S",
      icon: <ShareIcon2 />,
      group: "Actions",
      action: () => {
        openModal("share")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "export",
      label: "Export code",
      shortcut: "",
      icon: <ExportIcon2 />,
      group: "Actions",
      action: () => {
        openModal("export")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "new",
      label: "New project",
      shortcut: "⌘N",
      icon: <PlusIcon size={13} />,
      group: "Actions",
      action: () => {
        navigate("/?new=1")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "shortcuts",
      label: "Keyboard shortcuts",
      shortcut: "⌘/",
      icon: <ZapIcon size={13} />,
      group: "Actions",
      action: () => {
        setShortcutOverlayOpen(true)
        setCommandPaletteOpen(false)
      },
    },
    // Navigate
    {
      id: "projects",
      label: "Go to Projects",
      shortcut: "",
      icon: <AppsIcon size={13} />,
      group: "Navigate",
      action: () => {
        navigate("/projects")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "templates",
      label: "Browse Templates",
      shortcut: "",
      icon: <TemplatesIcon size={13} />,
      group: "Navigate",
      action: () => {
        navigate("/templates")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "integrations",
      label: "Connectors",
      shortcut: "",
      icon: <IntegrationsIcon size={13} />,
      group: "Navigate",
      action: () => {
        navigate("/integrations")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "skills",
      label: "Skills Library",
      shortcut: "",
      icon: <ZapIcon size={13} />,
      group: "Navigate",
      action: () => {
        navigate("/skills")
        setCommandPaletteOpen(false)
      },
    },
    {
      id: "settings",
      label: "Settings",
      shortcut: "⌘,",
      icon: <SettingsIcon size={13} />,
      group: "Navigate",
      action: () => {
        navigate("/settings")
        setCommandPaletteOpen(false)
      },
    },
    // Appearance — Gemini model switching
    ...GEMINI_MODEL_OPTIONS.map((option) => ({
      id: `model-${option.id}`,
      label: `Switch to ${option.label} model`,
      shortcut: "",
      icon: <AppearanceIcon />,
      group: "Model",
      action: () => {
        saveModelSelection(option.id)
        setCommandPaletteOpen(false)
      },
    })),
    ...projects.slice(0, 5).map((p) => ({
      id: p.id,
      label: p.name,
      shortcut: "",
      icon: (
        <svg width={13} height={13} viewBox="0 0 40 40" fill="none">
          <path
            d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>
      ),
      group: "Recent projects",
      action: () => {
        setActiveProject(p.id)
        navigate(`/project/${p.id}`)
        setCommandPaletteOpen(false)
      },
    })),
    // Installed skills
    ...ALL_SKILLS.filter((s) => installedSkills.includes(s.id)).map((s) => ({
      id: `skill-${s.id}`,
      label: `${s.name} skill`,
      shortcut: "",
      icon: <SkillMonogram monogram={s.monogram} />,
      group: "Skills",
      action: () => {
        navigate(`/skills`)
        setCommandPaletteOpen(false)
      },
    })),
    // Connected connectors
    ...ALL_CONNECTORS.filter((c) => connectedConnectors.includes(c.id)).map(
      (c) => ({
        id: `connector-${c.id}`,
        label: `${c.name}`,
        shortcut: "",
        icon: <SkillMonogram monogram={c.monogram} />,
        group: "Connectors",
        action: () => {
          navigate("/integrations")
          setCommandPaletteOpen(false)
        },
      }),
    ),
  ]

  const filtered = query
    ? (() => {
        const q = query.toLowerCase()
        // Also search skills by tag/language/framework
        const skillMatches = searchSkills(query).map((s) => ({
          id: `skill-${s.id}`,
          label: `${s.name} skill`,
          shortcut: "",
          icon: <SkillMonogram monogram={s.monogram} />,
          group: "Skills",
          action: () => {
            navigate("/skills")
            setCommandPaletteOpen(false)
          },
        }))
        const connectorMatches = searchConnectors(query).map((c) => ({
          id: `connector-${c.id}`,
          label: c.name,
          shortcut: "",
          icon: <SkillMonogram monogram={c.monogram} />,
          group: "Connectors",
          action: () => {
            navigate("/integrations")
            setCommandPaletteOpen(false)
          },
        }))
        const baseFiltered = commands.filter(
          (c) =>
            c.label.toLowerCase().includes(q) &&
            !c.id.startsWith("skill-") &&
            !c.id.startsWith("connector-"),
        )
        const allIds = new Set(baseFiltered.map((c) => c.id))
        const skillFiltered = skillMatches.filter((c) => !allIds.has(c.id))
        const connectorFiltered = connectorMatches.filter(
          (c) => !allIds.has(c.id),
        )
        return [...baseFiltered, ...skillFiltered, ...connectorFiltered]
      })()
    : commands

  const groups = Array.from(new Set(filtered.map((c) => c.group)))

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("")
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (!commandPaletteOpen) return
      if (e.key === "Escape") setCommandPaletteOpen(false)
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, filtered.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      }
      if (e.key === "Enter") {
        e.preventDefault()
        filtered[selected]?.action()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [commandPaletteOpen, filtered, selected, setCommandPaletteOpen])

  if (!commandPaletteOpen) return null

  let idx = -1

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh]">
      <div
        className="absolute inset-0 shango-overlay-enter"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div
        className="relative w-full rounded-xl overflow-hidden shango-command-enter"
        style={{
          maxWidth: 520,
          background: "rgba(16,16,16,0.96)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid var(--border-default)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <SearchIcon
            size={15}
            style={{
              color: "var(--text-muted)",
              flexShrink: 0,
              transition: "color 0.2s ease",
            }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            placeholder="What are you looking for?"
            className="flex-1 outline-none bg-transparent"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              fontSize: 14,
              letterSpacing: "0.01em",
            }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--surface-4)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            esc
          </kbd>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
          {groups.map((group) => (
            <div key={group}>
              <div className="px-4 pt-3 pb-1">
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                  }}
                >
                  {group.toUpperCase()}
                </span>
              </div>
              {filtered
                .filter((c) => c.group === group)
                .map((cmd) => {
                  idx++
                  const i = idx
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelected(i)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      style={{
                        background:
                          selected === i
                            ? "rgba(255,255,255,0.05)"
                            : "transparent",
                        color:
                          selected === i
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        fontFamily: "var(--font-geist)",
                        fontSize: 13,
                        transition: "background 0.12s ease, color 0.12s ease",
                        borderLeft:
                          selected === i
                            ? "2px solid rgba(255,255,255,0.3)"
                            : "2px solid transparent",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        {cmd.icon}
                      </span>
                      <span style={{ flex: 1 }}>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--surface-4)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono-jetbrains)",
                          }}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p
                className="text-sm"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Nothing found for "{query}"
              </p>
              <p
                className="text-xs mt-1"
                style={{
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Try a different keyword or check spelling
              </p>
            </div>
          )}
        </div>
        {/* Footer hints */}
        <div
          className="flex items-center justify-end gap-4 px-4 py-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {[
            ["↑↓", "navigate"],
            ["↵", "select"],
            ["esc", "close"],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd
                style={{
                  fontSize: 9,
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  background: "var(--surface-3)",
                  padding: "1px 4px",
                  borderRadius: 3,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {key}
              </kbd>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
