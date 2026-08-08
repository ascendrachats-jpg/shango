import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import { BackIcon, SearchIcon } from "../components/icons"
import {
  ALL_SKILLS,
  SKILL_CATEGORIES,
  searchSkills,
  getFeaturedSkills,
  type Skill,
  type SkillCategory,
} from "../lib/skills"
import SkillDetailSheet from "../components/SkillDetailSheet"

export default function SkillsPage() {
  const navigate = useNavigate()
  const { installedSkills, enabledSkills } = useApp()
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] =
    useState<SkillCategory | "all" | "installed">("all")
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  const featured = getFeaturedSkills()

  const displayed = useMemo(() => {
    if (activeCategory === "installed") {
      const base = ALL_SKILLS.filter((s) => installedSkills.includes(s.id))
      return query
        ? base.filter((s) => searchSkills(query).find((r) => r.id === s.id))
        : base
    }
    const base =
      activeCategory === "all"
        ? ALL_SKILLS
        : ALL_SKILLS.filter((s) => s.category === activeCategory)
    return query
      ? base.filter((s) => searchSkills(query).find((r) => r.id === s.id))
      : base
  }, [query, activeCategory, installedSkills])

  const installedCount = installedSkills.length
  const enabledCount = enabledSkills.length

  return (
    <div
      className="min-h-screen flex flex-col shango-page-arrive"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border-default)",
          background: "var(--surface-1)",
          height: 52,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="shango-btn-icon p-1.5 rounded-md"
          style={{ width: 30, height: 30 }}
        >
          <BackIcon size={14} />
        </button>
        <div
          style={{ width: 1, height: 16, background: "var(--border-default)" }}
        />
        <span
          className="text-sm font-medium"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          Skills
        </span>
        <span
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
        >
          — expand SHANGO's capabilities
        </span>

        <div style={{ flex: 1 }} />

        {/* Installed summary */}
        <div className="flex items-center gap-3">
          {installedCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {enabledCount}/{installedCount} active
              </span>
              <div className="flex -space-x-1">
                {installedSkills.slice(0, 5).map((id) => {
                  const skill = ALL_SKILLS.find((s) => s.id === id)
                  if (!skill) return null
                  const isEnabled = enabledSkills.includes(id)
                  return (
                    <div
                      key={id}
                      title={skill.name}
                      className="flex items-center justify-center rounded-md flex-shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        background: isEnabled
                          ? "var(--surface-4)"
                          : "var(--surface-2)",
                        border: `1px solid ${
                          isEnabled
                            ? "rgba(255,255,255,0.1)"
                            : "var(--border-subtle)"
                        }`,
                        fontSize: 8,
                        color: isEnabled
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {skill.monogram}
                    </div>
                  )
                })}
                {installedCount > 5 && (
                  <div
                    className="flex items-center justify-center rounded-md"
                    style={{
                      width: 22,
                      height: 22,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: 8,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    +{installedCount - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 rounded-lg"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              height: 32,
              width: 220,
            }}
          >
            <SearchIcon
              size={12}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills..."
              className="flex-1 outline-none bg-transparent text-xs"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category filter bar */}
      <div
        className="flex items-center gap-1 px-5 overflow-x-auto scroll-hidden flex-shrink-0"
        style={{
          height: 44,
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
        }}
      >
        {/* Special tabs */}
        {(["all", "installed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
            style={{
              background:
                activeCategory === tab ? "var(--surface-3)" : "transparent",
              border: `1px solid ${
                activeCategory === tab ? "var(--border-default)" : "transparent"
              }`,
              color:
                activeCategory === tab
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
            onMouseEnter={(e) => {
              if (activeCategory !== tab)
                e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              if (activeCategory !== tab)
                e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            {tab === "all" ? "All" : "Installed"}
            {tab === "installed" && installedCount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  color:
                    activeCategory === tab
                      ? "var(--text-secondary)"
                      : "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {installedCount}
              </span>
            )}
          </button>
        ))}

        <div
          style={{
            width: 1,
            height: 16,
            background: "var(--border-default)",
            margin: "0 4px",
            flexShrink: 0,
          }}
        />

        {/* Category tabs */}
        {SKILL_CATEGORIES.map((cat) => {
          const catCount = ALL_SKILLS.filter((s) => s.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
              style={{
                background:
                  activeCategory === cat ? "var(--surface-3)" : "transparent",
                border: `1px solid ${
                  activeCategory === cat
                    ? "var(--border-default)"
                    : "transparent"
                }`,
                color:
                  activeCategory === cat
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat)
                  e.currentTarget.style.color = "var(--text-secondary)"
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat)
                  e.currentTarget.style.color = "var(--text-muted)"
              }}
            >
              {cat}
              <span
                style={{
                  fontSize: 8,
                  color:
                    activeCategory === cat
                      ? "var(--text-muted)"
                      : "var(--text-disabled)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {catCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ padding: "24px" }}>
        {/* Installed section — only when on All tab and not searching */}
        {activeCategory === "all" && !query && installedCount > 0 && (
          <section className="mb-10">
            <SectionHeader label="INSTALLED" count={installedCount} />
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {ALL_SKILLS.filter((s) => installedSkills.includes(s.id)).map(
                (skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    installed
                    enabled={enabledSkills.includes(skill.id)}
                    onSelect={() => setSelectedSkill(skill)}
                  />
                ),
              )}
            </div>
          </section>
        )}

        {/* Featured — only when All tab and not searching */}
        {activeCategory === "all" && !query && (
          <section className="mb-10">
            <SectionHeader label="FEATURED" />
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {featured
                .filter((s) => !installedSkills.includes(s.id))
                .map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    installed={false}
                    enabled={false}
                    featured
                    onSelect={() => setSelectedSkill(skill)}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Library / filtered results */}
        {displayed.length > 0 ? (
          <section>
            {(activeCategory !== "all" || query) && (
              <SectionHeader
                label={
                  activeCategory === "installed"
                    ? "INSTALLED"
                    : activeCategory === "all"
                      ? "RESULTS"
                      : activeCategory.toUpperCase()
                }
                count={displayed.length}
              />
            )}
            {activeCategory === "all" && !query && (
              <SectionHeader
                label={
                  installedCount > 0 || featured.length > 0
                    ? "LIBRARY"
                    : "ALL SKILLS"
                }
                count={ALL_SKILLS.length}
              />
            )}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {displayed
                .filter((s) => {
                  // On 'all' tab without search, hide already-shown installed + featured
                  if (activeCategory === "all" && !query) {
                    return !installedSkills.includes(s.id) && !s.featured
                  }
                  return true
                })
                .map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    installed={installedSkills.includes(skill.id)}
                    enabled={enabledSkills.includes(skill.id)}
                    onSelect={() => setSelectedSkill(skill)}
                  />
                ))}
            </div>
          </section>
        ) : (
          <EmptyState
            onClear={() => {
              setQuery("")
              setActiveCategory("all")
            }}
            hasQuery={!!query}
          />
        )}
      </main>

      {/* Skill detail sheet */}
      <SkillDetailSheet
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onNavigate={setSelectedSkill}
      />
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <p
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          fontSize: 9,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </p>
      {count !== undefined && (
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

// ── Skill Card ──────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  installed,
  enabled,
  featured = false,
  onSelect,
}: {
  skill: Skill
  installed: boolean
  enabled: boolean
  featured?: boolean
  onSelect: () => void
}) {
  const { installSkill, uninstallSkill, enableSkill, disableSkill, addToast } =
    useApp()
  const [installing, setInstalling] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleInstall = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (installed) {
      uninstallSkill(skill.id)
      addToast(`${skill.name} removed`, "default")
      return
    }
    setInstalling(true)
    setTimeout(() => {
      installSkill(skill.id)
      setInstalling(false)
      addToast(`${skill.name} installed`, "success")
    }, 900)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enabled) {
      disableSkill(skill.id)
      addToast(`${skill.name} disabled`, "default")
    } else {
      enableSkill(skill.id)
      addToast(`${skill.name} enabled`, "default")
    }
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col cursor-pointer"
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${
          hovered
            ? "rgba(255,255,255,0.1)"
            : installed
              ? "rgba(255,255,255,0.07)"
              : "var(--border-subtle)"
        }`,
        transition: "border-color 0.18s ease",
        position: "relative",
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Featured badge */}
      {featured && !installed && (
        <div
          className="absolute top-3 right-3 text-xs px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
            fontSize: 8,
            letterSpacing: "0.08em",
          }}
        >
          FEATURED
        </div>
      )}

      {/* Update badge */}
      {skill.hasUpdate && installed && (
        <div
          className="absolute top-3 right-3 text-xs px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "#f59e0b",
            fontFamily: "var(--font-mono-jetbrains)",
            fontSize: 8,
            letterSpacing: "0.08em",
          }}
        >
          UPDATE
        </div>
      )}

      {/* Top row: monogram + meta */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: enabled ? "rgba(255,255,255,0.08)" : "var(--surface-3)",
            border: `1px solid ${
              enabled ? "rgba(255,255,255,0.12)" : "var(--border-default)"
            }`,
            transition: "background 0.18s ease, border-color 0.18s ease",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: enabled ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {skill.monogram}
          </span>
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <p
              className="text-sm font-medium truncate"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {skill.name}
            </p>
            {/* Health dot — only when installed */}
            {installed && <HealthDot health={skill.health} enabled={enabled} />}
          </div>
          <p
            className="text-xs mt-0.5"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.06em",
            }}
          >
            {skill.category.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Purpose */}
      <p
        className="text-xs mb-3 flex-1"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {skill.purpose}
      </p>

      {/* Language chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {skill.languages.slice(0, 3).map((lang) => (
          <span
            key={lang}
            className="text-xs px-1.5 py-px rounded"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.04em",
            }}
          >
            {lang}
          </span>
        ))}
        {skill.languages.length > 3 && (
          <span
            className="text-xs px-1.5 py-px rounded"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
            }}
          >
            +{skill.languages.length - 3}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          v{skill.version}
        </span>
        <div className="flex items-center gap-1.5">
          {installed && (
            <ToggleSwitch enabled={enabled} onToggle={handleToggle} />
          )}
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: installing
                ? "var(--surface-3)"
                : installed
                  ? "transparent"
                  : "var(--surface-3)",
              border: `1px solid ${
                installed ? "var(--border-default)" : "var(--border-default)"
              }`,
              color: installing
                ? "var(--text-muted)"
                : installed
                  ? "var(--text-muted)"
                  : "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
              cursor: installing ? "wait" : "pointer",
              minWidth: 72,
              justifyContent: "center",
              transition: "all 0.16s ease",
            }}
            onMouseEnter={(e) => {
              if (!installing && installed) {
                e.currentTarget.style.color = "#ef4444"
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"
              } else if (!installing) {
                e.currentTarget.style.color = "var(--text-primary)"
                e.currentTarget.style.borderColor = "var(--border-strong)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = installed
                ? "var(--text-muted)"
                : "var(--text-secondary)"
              e.currentTarget.style.borderColor = "var(--border-default)"
            }}
          >
            {installing ? (
              <InstallProgress />
            ) : installed ? (
              "Remove"
            ) : (
              "Install →"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Health dot ──────────────────────────────────────────────────────────────

function HealthDot({ health, enabled }: { health: string; enabled: boolean }) {
  if (!enabled)
    return (
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: 5,
          height: 5,
          background: "var(--surface-4)",
          border: "1px solid var(--border-default)",
          display: "inline-block",
        }}
      />
    )
  const color =
    health === "healthy"
      ? "#4ade80"
      : health === "degraded"
        ? "#f59e0b"
        : "#6b7280"
  const glow =
    health === "healthy"
      ? "0 0 4px rgba(74,222,128,0.6)"
      : health === "degraded"
        ? "0 0 4px rgba(245,158,11,0.5)"
        : "none"
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{
        width: 5,
        height: 5,
        background: color,
        boxShadow: glow,
        display: "inline-block",
        animation:
          health === "healthy"
            ? "live-pulse 2.4s ease-in-out infinite"
            : "none",
      }}
    />
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Disable" : "Enable"}
      style={{
        width: 28,
        height: 16,
        background: enabled ? "rgba(255,255,255,0.15)" : "var(--surface-3)",
        border: `1px solid ${
          enabled ? "rgba(255,255,255,0.2)" : "var(--border-default)"
        }`,
        borderRadius: 8,
        position: "relative",
        cursor: "pointer",
        transition:
          "background 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: enabled ? 12 : 2,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: enabled ? "white" : "var(--text-disabled)",
          transition:
            "left 0.2s cubic-bezier(0.16,1,0.3,1), background 0.2s ease",
          display: "block",
        }}
      />
    </button>
  )
}

// ── Install progress indicator ────────────────────────────────────────────

function InstallProgress() {
  return (
    <div className="flex items-center gap-1.5">
      <svg
        width={10}
        height={10}
        viewBox="0 0 10 10"
        fill="none"
        style={{
          animation: "spin 0.8s linear infinite",
          color: "var(--text-muted)",
        }}
      >
        <circle
          cx="5"
          cy="5"
          r="4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="16"
          strokeDashoffset="8"
          strokeLinecap="round"
        />
      </svg>
      <span>Installing</span>
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  onClear,
  hasQuery,
}: {
  onClear: () => void
  hasQuery: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 44,
          height: 44,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <SearchIcon
          size={18}
          style={{ color: "var(--text-muted)", opacity: 0.4 }}
        />
      </div>
      <div className="text-center">
        <p
          className="text-sm font-medium mb-1"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {hasQuery ? "No skills match your search" : "No skills installed yet"}
        </p>
        <p
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {hasQuery
            ? "Try a different keyword or browse by category"
            : "Browse the library to expand SHANGO's capabilities"}
        </p>
      </div>
      <button
        onClick={onClear}
        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: "var(--surface-3)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-geist)",
          border: "1px solid var(--border-default)",
        }}
      >
        Browse all skills
      </button>
    </div>
  )
}
