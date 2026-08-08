import { useState } from "react"
import { XIcon } from "./icons"
import { useApp } from "../store/AppContext"
import { getSkillById, type Skill } from "../lib/skills"

interface Props {
  skill: Skill | null
  onClose: () => void
  onNavigate: (skill: Skill) => void
}

export default function SkillDetailSheet({
  skill,
  onClose,
  onNavigate,
}: Props) {
  if (!skill) return null

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end pointer-events-none"
      style={{ top: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="relative pointer-events-auto flex flex-col"
        style={{
          width: 400,
          height: "100%",
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(28px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          animation: "slideInFromRight 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <SkillDetailContent
          skill={skill}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}

function SkillDetailContent({
  skill,
  onClose,
  onNavigate,
}: {
  skill: Skill
  onClose: () => void
  onNavigate: (s: Skill) => void
}) {
  const {
    installSkill,
    uninstallSkill,
    enableSkill,
    disableSkill,
    installedSkills,
    enabledSkills,
    addToast,
  } = useApp()
  const [installing, setInstalling] = useState(false)

  const installed = installedSkills.includes(skill.id)
  const enabled = enabledSkills.includes(skill.id)

  const recommendedSkillObjects = skill.recommendedSkills
    .map((id) => getSkillById(id))
    .filter(Boolean) as Skill[]

  const handleInstall = () => {
    if (installed) {
      uninstallSkill(skill.id)
      addToast(`${skill.name} removed`, "default")
      return
    }
    setInstalling(true)
    setTimeout(() => {
      installSkill(skill.id)
      setInstalling(false)
      addToast(
        `${skill.name} installed — SHANGO is now more capable`,
        "success",
      )
    }, 1200)
  }

  const handleToggle = () => {
    if (enabled) {
      disableSkill(skill.id)
      addToast(`${skill.name} disabled`, "default")
    } else {
      enableSkill(skill.id)
      addToast(`${skill.name} enabled`, "default")
    }
  }

  return (
    <>
      {/* Header */}
      <div
        className="flex items-start gap-3 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {/* Monogram */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: enabled ? "rgba(255,255,255,0.08)" : "var(--surface-3)",
            border: `1px solid ${
              enabled ? "rgba(255,255,255,0.12)" : "var(--border-default)"
            }`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: enabled ? "var(--text-primary)" : "var(--text-secondary)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {skill.monogram}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {skill.name}
            </h2>
            {skill.hasUpdate && installed && (
              <span
                className="text-xs px-1.5 py-px rounded"
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
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.06em",
              }}
            >
              {skill.category.toUpperCase()}
            </span>
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: "var(--text-disabled)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              v{skill.version}
            </span>
            <span
              style={{
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: "var(--text-disabled)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              by {skill.author}
            </span>
          </div>
          {/* Health */}
          {installed && (
            <div className="flex items-center gap-1.5 mt-1">
              <HealthIndicator health={skill.health} enabled={enabled} />
              <span
                style={{
                  fontSize: 9,
                  color:
                    skill.health === "healthy" && enabled
                      ? "#4ade80"
                      : "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.06em",
                }}
              >
                {!enabled ? "DISABLED" : skill.health.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)"
            e.currentTarget.style.background = "var(--surface-3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <XIcon size={12} />
        </button>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Install / Remove */}
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium flex-1 justify-center"
          style={{
            background: installing
              ? "var(--surface-3)"
              : installed
                ? "var(--surface-2)"
                : "rgba(255,255,255,0.92)",
            color: installing
              ? "var(--text-muted)"
              : installed
                ? "var(--text-muted)"
                : "#080808",
            border: installed ? "1px solid var(--border-default)" : "none",
            fontFamily: "var(--font-geist)",
            cursor: installing ? "wait" : "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            if (!installing && installed) {
              e.currentTarget.style.color = "#ef4444"
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = installed
              ? "var(--text-muted)"
              : "#080808"
            e.currentTarget.style.borderColor = installed
              ? "var(--border-default)"
              : "transparent"
          }}
        >
          {installing ? (
            <>
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
              Installing…
            </>
          ) : installed ? (
            "Remove Skill"
          ) : (
            "Install Skill"
          )}
        </button>

        {/* Enable / Disable toggle — only when installed */}
        {installed && (
          <button
            onClick={handleToggle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              background: "var(--surface-2)",
              border: `1px solid ${
                enabled ? "rgba(255,255,255,0.1)" : "var(--border-default)"
              }`,
              color: enabled ? "var(--text-secondary)" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              transition: "all 0.16s ease",
            }}
          >
            <ToggleOrb enabled={enabled} />
            {enabled ? "Enabled" : "Enable"}
          </button>
        )}

        {/* Update button */}
        {skill.hasUpdate && installed && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b",
              fontFamily: "var(--font-geist)",
            }}
            onClick={() =>
              addToast(
                `${skill.name} updated to v${skill.updateVersion}`,
                "success",
              )
            }
          >
            ↑ v{skill.updateVersion}
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scroll-hidden">
        {/* Purpose */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.7,
            }}
          >
            {skill.description}
          </p>
        </div>

        {/* Capabilities */}
        <Section title="CAPABILITIES">
          <ul className="space-y-1.5">
            {skill.capabilities.map((cap, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  style={{
                    color: "var(--text-disabled)",
                    marginTop: 4,
                    fontSize: 8,
                  }}
                >
                  ◆
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.6,
                  }}
                >
                  {cap}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Languages & Frameworks */}
        <Section title="LANGUAGES & FRAMEWORKS">
          <div className="space-y-2">
            {skill.languages.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  LANGUAGES
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.languages.map((l) => (
                    <Chip key={l} label={l} />
                  ))}
                </div>
              </div>
            )}
            {skill.frameworks.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                    marginTop: 10,
                  }}
                >
                  FRAMEWORKS
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.frameworks.map((f) => (
                    <Chip key={f} label={f} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Required connectors */}
        {skill.requiredConnectors.length > 0 && (
          <Section title="REQUIRED CONNECTORS">
            <div className="space-y-1.5">
              {skill.requiredConnectors.map((c) => (
                <div key={c} className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center rounded flex-shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      background: "var(--surface-3)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      {c.slice(0, 2)}
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {c}
                  </span>
                  <span
                    className="ml-auto text-xs"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 9,
                    }}
                  >
                    required
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Permissions */}
        <Section title="PERMISSIONS">
          <ul className="space-y-1.5">
            {skill.permissions.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 10 10"
                  fill="none"
                  style={{ color: "var(--text-disabled)", flexShrink: 0 }}
                >
                  <rect
                    x="1.5"
                    y="4.5"
                    width="7"
                    height="4.5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path
                    d="M3 4.5V3.5a2 2 0 014 0v1"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  {p}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Recommended skills */}
        {recommendedSkillObjects.length > 0 && (
          <Section title="PAIRS WELL WITH">
            <div className="space-y-1.5">
              {recommendedSkillObjects.map((s) => {
                const isInstalled = installedSkills.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => onNavigate(s)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                      transition: "border-color 0.16s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-subtle)")
                    }
                  >
                    <div
                      className="flex items-center justify-center rounded flex-shrink-0"
                      style={{
                        width: 26,
                        height: 26,
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {s.monogram}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {s.name}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                          fontSize: 10,
                        }}
                      >
                        {s.purpose}
                      </p>
                    </div>
                    {isInstalled ? (
                      <span
                        style={{
                          fontSize: 8,
                          color: "#4ade80",
                          fontFamily: "var(--font-mono-jetbrains)",
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        ON
                      </span>
                    ) : (
                      <svg
                        width={10}
                        height={10}
                        viewBox="0 0 10 10"
                        fill="none"
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      >
                        <path
                          d="M3 5h4M5 3l2 2-2 2"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* Documentation */}
        {skill.documentation && (
          <Section title="DOCUMENTATION">
            <p
              className="text-xs leading-relaxed"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.75,
              }}
            >
              {skill.documentation}
            </p>
          </Section>
        )}

        {/* Update history */}
        <Section title="UPDATE HISTORY" noBorder>
          <div className="relative">
            <div
              className="absolute top-2 bottom-2 w-px"
              style={{
                left: 7,
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
              }}
            />
            {skill.updateHistory.map((entry, i) => (
              <div key={i} className="flex gap-3 pb-4 relative">
                <div
                  className="flex-shrink-0 rounded-full"
                  style={{
                    width: 15,
                    height: 15,
                    background: i === 0 ? "white" : "var(--surface-3)",
                    border:
                      i === 0 ? "none" : "1px solid var(--border-default)",
                    marginTop: 1,
                    boxShadow:
                      i === 0 ? "0 0 0 2px rgba(255,255,255,0.06)" : "none",
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: i === 0 ? 4 : 3,
                      height: i === 0 ? 4 : 3,
                      borderRadius: "50%",
                      background: i === 0 ? "#0a0a0a" : "var(--text-disabled)",
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontSize: 10,
                      }}
                    >
                      v{entry.version}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--text-disabled)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      {entry.date}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      lineHeight: 1.5,
                    }}
                  >
                    {entry.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  children,
  noBorder = false,
}: {
  title: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      className="px-5 py-4"
      style={{
        borderBottom: noBorder ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      <p
        className="mb-3"
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Chip ──────────────────────────────────────────────────────────────────

function Chip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md"
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary)",
        fontFamily: "var(--font-mono-jetbrains)",
        fontSize: 10,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  )
}

// ── Health indicator ──────────────────────────────────────────────────────

function HealthIndicator({
  health,
  enabled,
}: {
  health: string
  enabled: boolean
}) {
  if (!enabled)
    return (
      <span
        className="rounded-full"
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
      className="rounded-full"
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

// ── Toggle orb ────────────────────────────────────────────────────────────

function ToggleOrb({ enabled }: { enabled: boolean }) {
  return (
    <span
      className="rounded-full"
      style={{
        width: 6,
        height: 6,
        background: enabled ? "rgba(255,255,255,0.7)" : "var(--text-disabled)",
        display: "inline-block",
        transition: "background 0.18s ease",
      }}
    />
  )
}
