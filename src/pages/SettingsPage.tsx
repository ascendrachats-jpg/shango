import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import { BackIcon, CheckIcon, ZapIcon } from "../components/icons"
import { ALL_SKILLS, type SkillCategory } from "../lib/skills"
import { usageFraction, resetLabel } from "../lib/usageMeter"
import { GEMINI_MODEL_OPTIONS, DEFAULT_MODEL_ID, resolveModelId } from "../lib/models"

type Tab = "general" | "api-keys" | "models" | "skills" | "memory" | "deployments" | "notifications" | "appearance" | "billing" | "shortcuts" | "privacy" | "developer"

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "api-keys", label: "API Keys" },
  { id: "models", label: "Models" },
  { id: "skills", label: "Skills" },
  { id: "memory", label: "Memory & Context" },
  { id: "deployments", label: "Deployments" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "billing", label: "Billing" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "privacy", label: "Privacy" },
  { id: "developer", label: "Developer" },
]

const CAPABILITIES = GEMINI_MODEL_OPTIONS.map((option) => ({
  id: option.id,
  label: option.label,
  desc: option.desc,
  recommended: option.recommended,
}))

const SHORTCUTS = [
  {
    group: "Navigation",
    items: [
      { action: "Command palette", keys: ["⌘", "K"] },
      { action: "Keyboard shortcuts", keys: ["⌘", "/"] },
      { action: "Go home", keys: ["⌘", "H"] },
    ],
  },
  {
    group: "Builder",
    items: [
      { action: "Toggle sidebar", keys: ["⌘", "B"] },
      { action: "Toggle conversation", keys: ["⌘", "P"] },
      { action: "Version history", keys: ["⌘", "Y"] },
      { action: "Share", keys: ["⌘", "S"] },
      { action: "Deploy", keys: ["⌘", "D"] },
      { action: "Regenerate", keys: ["⌘", "R"] },
    ],
  },
  {
    group: "Preview",
    items: [
      { action: "Desktop viewport", keys: ["⌘", "1"] },
      { action: "Tablet viewport", keys: ["⌘", "2"] },
      { action: "Mobile viewport", keys: ["⌘", "3"] },
    ],
  },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const {
    currentUser,
    addToast,
    installedSkills,
    enabledSkills,
    enableSkill,
    disableSkill,
    uninstallSkill,
    usageMeter,
    setPlan,
  } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>("general")
  const [skillCategoryFilter, setSkillCategoryFilter] =
    useState<SkillCategory | "all">("all")
  const [apiKey, setApiKey] = useState("")
  const [keySaved, setKeySaved] = useState(false)

  // Persisted settings — load from localStorage on mount
  const loadSettings = () => {
    try {
      return JSON.parse(localStorage.getItem("shango_settings") ?? "{}")
    } catch {
      return {}
    }
  }
  const [selectedModel, setSelectedModel] = useState<string>(
    () => resolveModelId(loadSettings().model),
  )
  const [motionReduced, setMotionReduced] = useState<boolean>(
    () => loadSettings().motion ?? false,
  )
  const [telemetry, setTelemetry] = useState<boolean>(
    () => loadSettings().telemetry ?? true,
  )
  const [crashReports, setCrashReports] = useState<boolean>(
    () => loadSettings().crashReports ?? true,
  )
  const [accentColor, setAccentColor] = useState<string>(
    () => loadSettings().accent ?? "white",
  )
  const [themeDensity, setThemeDensity] = useState<string>(
    () => loadSettings().density ?? "dark",
  )
  const [dataSaver, setDataSaver] = useState<boolean>(
    () => loadSettings().dataSaver ?? false,
  )
  const [preferredLanguage, setPreferredLanguage] = useState<string>(
    () => loadSettings().language ?? "English",
  )

  // Persist on any change
  useEffect(() => {
    localStorage.setItem(
      "shango_settings",
      JSON.stringify({
        model: selectedModel,
        motion: motionReduced,
        telemetry,
        crashReports,
        accent: accentColor,
        density: themeDensity,
        dataSaver,
        language: preferredLanguage,
      }),
    )
    window.dispatchEvent(new Event("shango-preferences-changed"))
  }, [
    selectedModel,
    motionReduced,
    telemetry,
    crashReports,
    accentColor,
    themeDensity,
    dataSaver,
    preferredLanguage,
  ])

  const saveKey = () => {
    setKeySaved(true)
    addToast("Key available for this session only", "default")
    setTimeout(() => setKeySaved(false), 3000)
  }

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
          Settings
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.1em",
          }}
        >
          SHANGO
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Tab sidebar */}
        <div
          className="flex-shrink-0 py-3"
          style={{
            width: 196,
            borderRight: "1px solid var(--border-default)",
            background: "var(--surface-1)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full text-left relative transition-colors"
              style={{
                padding: "8px 16px",
                color:
                  activeTab === tab.id
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                background:
                  activeTab === tab.id
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                fontFamily: "var(--font-geist)",
                fontSize: 13,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = "var(--text-secondary)"
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = "var(--text-muted)"
              }}
            >
              {activeTab === tab.id && (
                <div
                  className="absolute left-0 top-1.5 bottom-1.5 rounded-r-full"
                  style={{
                    width: 2.5,
                    background: "white",
                    boxShadow: "1px 0 6px rgba(255,255,255,0.25)",
                  }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="flex-1 overflow-y-auto scroll-hidden"
          style={{ padding: "36px 40px", maxWidth: 560 }}
        >
          {/* ── General ──────────────────────────────────────────── */}
          {activeTab === "general" && (
            <Section
              title="General"
              desc="Manage your account details and preferences."
            >
              <Field label="Display name">
                <SettingsInput
                  defaultValue={currentUser?.name || "Anonymous"}
                />
              </Field>
              <Field label="Email address">
                <SettingsInput
                  defaultValue={currentUser?.email || ""}
                  placeholder="your@email.com"
                />
              </Field>
              <Field label="Default language">
                <select
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(e.target.value)
                    addToast(
                      `Generation language set to ${e.target.value}`,
                      "default",
                    )
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  <option>English</option>
                  <option>French</option>
                  <option>Arabic</option>
                  <option>Swahili</option>
                  <option>Portuguese</option>
                </select>
              </Field>
              <button
                className="shango-btn px-5 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: "white",
                  color: "#0a0a0a",
                  fontFamily: "var(--font-geist)",
                  width: "fit-content",
                }}
                onClick={() => addToast("Settings saved", "success")}
              >
                Save changes
              </button>
            </Section>
          )}

          {/* ── API Keys ─────────────────────────────────────────── */}
          {activeTab === "api-keys" && (
            <Section
              title="API Keys"
              desc="Add your own API keys for higher rate limits and premium models."
            >
              <Field label="OpenRouter API Key">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-..."
                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  />
                  <button
                    onClick={saveKey}
                    className="px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    style={{
                      background: keySaved
                        ? "rgba(74,222,128,0.1)"
                        : "var(--surface-3)",
                      border: `1px solid ${
                        keySaved
                          ? "rgba(74,222,128,0.2)"
                          : "var(--border-default)"
                      }`,
                      color: keySaved ? "#4ade80" : "var(--text-primary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {keySaved ? (
                      <>
                        <CheckIcon size={11} /> Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </Field>
              <Field label="Anthropic API Key">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                />
              </Field>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.65,
                  }}
                >
                  This prototype keeps keys in memory for the current session
                  only. Do not enter a production key until secure key
                  management is implemented.
                </p>
              </div>
            </Section>
          )}

          {/* ── Models ───────────────────────────────────────────── */}
          {activeTab === "models" && (
            <Section
              title="Gemini Model"
              desc="Choose which Gemini model Shango uses to generate your projects."
            >
              <div className="flex flex-col gap-2">
                {CAPABILITIES.map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => setSelectedModel(cap.id)}
                    className="flex items-start gap-3.5 p-4 rounded-xl text-left transition-all"
                    style={{
                      background:
                        selectedModel === cap.id
                          ? "var(--surface-2)"
                          : "var(--surface-1)",
                      border: `1px solid ${
                        selectedModel === cap.id
                          ? "rgba(255,255,255,0.14)"
                          : "var(--border-subtle)"
                      }`,
                    }}
                  >
                    <div
                      className="rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        width: 14,
                        height: 14,
                        borderColor:
                          selectedModel === cap.id
                            ? "white"
                            : "var(--border-strong)",
                      }}
                    >
                      {selectedModel === cap.id && (
                        <div
                          className="rounded-full"
                          style={{ width: 6, height: 6, background: "white" }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p
                          className="text-sm font-medium"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-geist)",
                          }}
                        >
                          {cap.label}
                        </p>
                        {cap.recommended && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-geist)",
                              fontSize: 10,
                            }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {cap.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* ── Skills ───────────────────────────────────────────── */}
          {activeTab === "skills" && (
            <SkillsSettingsTab
              installedSkills={installedSkills}
              enabledSkills={enabledSkills}
              enableSkill={enableSkill}
              disableSkill={disableSkill}
              uninstallSkill={uninstallSkill}
              addToast={addToast}
              navigate={navigate}
              categoryFilter={skillCategoryFilter}
              setCategoryFilter={setSkillCategoryFilter}
            />
          )}

          {/* ── Appearance ───────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <Section
              title="Appearance"
              desc="Customise how SHANGO looks and feels."
            >
              <Field label="Theme">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  {([
                    { id: "dark", label: "Dark", bg: "#0a0a0a" },
                    { id: "darker", label: "Darker", bg: "#050505" },
                    { id: "obsidian", label: "Obsidian", bg: "#000000" },
                  ] as const).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setThemeDensity(theme.id)
                        addToast(`${theme.label} theme applied`, "default")
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                      style={{
                        background:
                          themeDensity === theme.id
                            ? "var(--surface-2)"
                            : "var(--surface-1)",
                        border: `1px solid ${
                          themeDensity === theme.id
                            ? "rgba(255,255,255,0.14)"
                            : "var(--border-subtle)"
                        }`,
                      }}
                    >
                      <div
                        className="rounded-md flex-shrink-0"
                        style={{
                          width: 24,
                          height: 18,
                          background: theme.bg,
                          border: "1px solid var(--border-default)",
                        }}
                      />
                      <p
                        className="text-xs"
                        style={{
                          color:
                            themeDensity === theme.id
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                          fontSize: 11,
                        }}
                      >
                        {theme.label}
                      </p>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Accent color">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "white", color: "#ffffff", label: "Default" },
                    { id: "blue", color: "#60a5fa", label: "Blue" },
                    { id: "purple", color: "#a78bfa", label: "Purple" },
                    { id: "green", color: "#4ade80", label: "Green" },
                    { id: "orange", color: "#fb923c", label: "Orange" },
                    { id: "pink", color: "#f472b6", label: "Pink" },
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      title={acc.label}
                      onClick={() => {
                        setAccentColor(acc.id)
                        addToast(`${acc.label} accent applied`, "default")
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: acc.color,
                        border:
                          accentColor === acc.id
                            ? `2.5px solid rgba(255,255,255,0.8)`
                            : "2px solid rgba(255,255,255,0.1)",
                        boxShadow:
                          accentColor === acc.id
                            ? `0 0 0 1.5px rgba(0,0,0,0.8), 0 0 8px ${acc.color}55`
                            : "none",
                        transition: "all 0.16s ease",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Motion">
                <Toggle
                  label="Reduce motion"
                  desc="Minimise animations and transitions"
                  value={motionReduced}
                  onChange={(v) => {
                    setMotionReduced(v)
                    addToast(
                      v ? "Reduced motion enabled" : "Motion restored",
                      "default",
                    )
                  }}
                />
              </Field>

              <Field label="Data use">
                <Toggle
                  label="Low-data mode"
                  desc="Turn off ambient video and particle effects on the home workspace"
                  value={dataSaver}
                  onChange={(v) => {
                    setDataSaver(v)
                    addToast(
                      v ? "Low-data mode enabled" : "Full visual mode restored",
                      "default",
                    )
                  }}
                />
              </Field>

              <Field label="Font size">
                <div className="flex items-center gap-3">
                  {(["Small", "Default", "Large"] as const).map((size) => (
                    <button
                      key={size}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{
                        background:
                          size === "Default"
                            ? "var(--surface-3)"
                            : "transparent",
                        border: `1px solid ${
                          size === "Default"
                            ? "var(--border-default)"
                            : "transparent"
                        }`,
                        color:
                          size === "Default"
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
          )}

          {/* ── Billing ──────────────────────────────────────────── */}
          {activeTab === "billing" && (
            <Section title="Billing" desc="Manage your subscription and usage.">
              <div
                className="rounded-xl p-5 mb-2"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {currentUser?.plan?.toUpperCase() ?? "FREE"} Plan
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      Current subscription
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "var(--surface-4)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 9,
                      letterSpacing: "0.06em",
                    }}
                  >
                    ACTIVE
                  </span>
                </div>{" "}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      Credits used this month
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      {usageMeter.used.toLocaleString()} /{" "}
                      {usageMeter.limit.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 4, background: "var(--surface-4)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(usageFraction(usageMeter) * 100)}%`,
                        background:
                          usageFraction(usageMeter) >= 1
                            ? "rgba(239,68,68,0.6)"
                            : "rgba(255,255,255,0.35)",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      fontSize: 10,
                    }}
                  >
                    Resets on {resetLabel(usageMeter)}
                  </p>
                </div>
                <button
                  className="shango-btn w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    background: "white",
                    color: "#0a0a0a",
                    fontFamily: "var(--font-geist)",
                  }}
                  onClick={() => {
                    if (currentUser?.plan === "pro") {
                      setPlan("free")
                      addToast(
                        "Downgraded to Free plan (local preview)",
                        "default",
                      )
                    } else {
                      setPlan("pro")
                      addToast(
                        "Upgraded to Pro plan (local preview)",
                        "success",
                      )
                    }
                  }}
                >
                  {currentUser?.plan === "pro"
                    ? "Downgrade to Free"
                    : "Upgrade to Pro"}
                </button>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.65,
                  }}
                >
                  Pro — unlimited credits, priority generation, team
                  collaboration, custom domains, and advanced deployment
                  targets.
                </p>
              </div>
            </Section>
          )}

          {/* ── Shortcuts ────────────────────────────────────────── */}
          {activeTab === "shortcuts" && (
            <Section
              title="Keyboard Shortcuts"
              desc="Every action, accessible without the mouse."
            >
              {SHORTCUTS.map((group) => (
                <div key={group.group} className="mb-6">
                  <p
                    className="text-xs mb-3"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {group.group.toUpperCase()}
                  </p>
                  <div
                    className="flex flex-col gap-0"
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {group.items.map((item, idx) => (
                      <div
                        key={item.action}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{
                          background: "var(--surface-1)",
                          borderBottom:
                            idx < group.items.length - 1
                              ? "1px solid var(--border-subtle)"
                              : "none",
                        }}
                      >
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-geist)",
                          }}
                        >
                          {item.action}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k) => (
                            <kbd
                              key={k}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--surface-3)",
                                border: "1px solid var(--border-default)",
                                color: "var(--text-secondary)",
                                fontFamily: "var(--font-mono-jetbrains)",
                                fontSize: 10,
                                minWidth: 20,
                                textAlign: "center",
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* ── Privacy ──────────────────────────────────────────── */}
          {activeTab === "privacy" && (
            <Section title="Privacy" desc="Control how your data is used.">
              <Field label="Data sharing">
                <div className="flex flex-col gap-3">
                  <Toggle
                    label="Usage analytics"
                    desc="Help improve SHANGO by sharing anonymous usage data"
                    value={telemetry}
                    onChange={(v) => {
                      setTelemetry(v)
                      addToast(
                        v ? "Analytics enabled" : "Analytics disabled",
                        "default",
                      )
                    }}
                  />
                  <Toggle
                    label="Crash reports"
                    desc="Automatically send error reports to help fix bugs"
                    value={crashReports}
                    onChange={(v) => {
                      setCrashReports(v)
                      addToast(
                        v ? "Crash reports enabled" : "Crash reports disabled",
                        "default",
                      )
                    }}
                  />
                </div>
              </Field>
              <Field label="Data">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() =>
                      addToast(
                        "Export requested — we'll email you a link",
                        "success",
                      )
                    }
                    className="px-4 py-2 rounded-lg text-xs text-left transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist)",
                      width: "fit-content",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-strong)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-default)")
                    }
                  >
                    Export all data →
                  </button>
                  <button
                    onClick={() =>
                      addToast(
                        "Contact support to delete your account",
                        "default",
                      )
                    }
                    className="px-4 py-2 rounded-lg text-xs text-left transition-colors"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "rgba(239,68,68,0.6)",
                      fontFamily: "var(--font-geist)",
                      width: "fit-content",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"
                      e.currentTarget.style.color = "rgba(239,68,68,0.8)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"
                      e.currentTarget.style.color = "rgba(239,68,68,0.6)"
                    }}
                  >
                    Delete account
                  </button>
                </div>
              </Field>
            </Section>
          )}

          {/* ── Memory & Context ─────────────────────────────────── */}
          {activeTab === "memory" && (
            <Section
              title="Memory & Knowledge Graph"
              desc="Configure how SHANGO indexes your workspace history and architectural decisions across sessions."
            >
              <Field label="Cross-Session Project Memory">
                <Toggle
                  label="Persistent Memory Graph"
                  desc="Store architectural decisions and file relationships across workspace restarts"
                  value={telemetry}
                  onChange={(v) =>
                    addToast(
                      v ? "Memory Graph active" : "Memory Graph paused",
                      "default",
                    )
                  }
                />
              </Field>
              <Field label="Auto-Indexing Depth">
                <select
                  defaultValue="deep"
                  onChange={() => addToast("AST depth updated", "success")}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  <option value="light">
                    Light (File names & export signatures only)
                  </option>
                  <option value="deep">
                    Deep (Full AST parse, export graph & import links)
                  </option>
                  <option value="max">
                    Maximum (Semantic embeddings + git commit history)
                  </option>
                </select>
              </Field>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.65,
                  }}
                >
                  Memory Graph status:{" "}
                  <span style={{ color: "#4ade80" }}>● Active</span> (1,420 AST
                  nodes indexed across active workspace).
                </p>
              </div>
            </Section>
          )}

          {/* ── Deployments ──────────────────────────────────────── */}
          {activeTab === "deployments" && (
            <Section
              title="Cloud Deployments"
              desc="Configure Cloud Run container defaults, target regions, and custom SSL domains."
            >
              <Field label="Default Cloud Region">
                <select
                  defaultValue="asia-southeast1"
                  onChange={(e) =>
                    addToast(
                      `Default region set to ${e.target.value}`,
                      "default",
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                  }}
                >
                  <option value="asia-southeast1">
                    asia-southeast1 (Singapore)
                  </option>
                  <option value="us-central1">us-central1 (Iowa, USA)</option>
                  <option value="europe-west1">europe-west1 (Belgium)</option>
                  <option value="asia-east1">asia-east1 (Taiwan)</option>
                </select>
              </Field>
              <Field label="Custom Domain Wildcard">
                <input
                  type="text"
                  placeholder="app.yourdomain.com"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                />
              </Field>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.65,
                  }}
                >
                  All deployments run on Google Cloud Run with automated TLS
                  certificate generation and port 3000 container ingress
                  proxying.
                </p>
              </div>
            </Section>
          )}

          {/* ── Notifications ───────────────────────────────────── */}
          {activeTab === "notifications" && (
            <Section
              title="Notifications"
              desc="Manage real-time builder alerts, community milestone updates, and build alerts."
            >
              <Field label="Alert Channels">
                <div className="flex flex-col gap-3">
                  <Toggle
                    label="Build & Linter Warnings"
                    desc="Notify when workspace background builds generate AST linter errors"
                    value={true}
                    onChange={(v) =>
                      addToast(
                        v ? "Build alerts on" : "Build alerts muted",
                        "default",
                      )
                    }
                  />
                  <Toggle
                    label="Community Upvotes & Portfolio Hits"
                    desc="Receive real-time notifications when other builders view or clone your projects"
                    value={true}
                    onChange={(v) =>
                      addToast(
                        v ? "Community alerts on" : "Community alerts muted",
                        "default",
                      )
                    }
                  />
                  <Toggle
                    label="Startup Mentor Intelligence"
                    desc="Contextual strategy suggestions during active workspace sessions"
                    value={true}
                    onChange={(v) =>
                      addToast(
                        v ? "Startup Mentor active" : "Startup Mentor muted",
                        "default",
                      )
                    }
                  />
                </div>
              </Field>
            </Section>
          )}

          {/* ── Developer ────────────────────────────────────────── */}
          {activeTab === "developer" && (
            <Section
              title="Developer Vault & Webhooks"
              desc="Manage environment variable injection, webhooks, and raw system execution logs."
            >
              <Field label="Container Ingress Port">
                <input
                  type="text"
                  disabled
                  value="PORT = 3000 (Cloud Run Reverse Proxy)"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none opacity-60"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                />
              </Field>
              <Field label="Webhook Endpoint URL">
                <input
                  type="text"
                  placeholder="https://your-api.com/webhooks/shango"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                />
              </Field>
              <button
                onClick={() =>
                  addToast("Developer webhook endpoint saved", "success")
                }
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: "white",
                  color: "#0a0a0a",
                  fontFamily: "var(--font-geist)",
                  width: "fit-content",
                }}
              >
                Save Developer Settings
              </button>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Skills Settings Tab ─────────────────────────────────────────────────────

function SkillsSettingsTab({
  installedSkills,
  enabledSkills,
  enableSkill,
  disableSkill,
  uninstallSkill,
  addToast,
  navigate,
  categoryFilter,
  setCategoryFilter,
}: {
  installedSkills: string[]
  enabledSkills: string[]
  enableSkill: (id: string) => void
  disableSkill: (id: string) => void
  uninstallSkill: (id: string) => void
  addToast: (m: string, t?: "default" | "success" | "error") => void
  navigate: (path: string) => void
  categoryFilter: SkillCategory | "all"
  setCategoryFilter: (c: SkillCategory | "all") => void
}) {
  const installedSkillObjects = ALL_SKILLS.filter((s) =>
    installedSkills.includes(s.id),
  )
  const filteredSkills =
    categoryFilter === "all"
      ? installedSkillObjects
      : installedSkillObjects.filter((s) => s.category === categoryFilter)

  const enabledCount = enabledSkills.length
  const installedCount = installedSkills.length

  const usedCategories = [
    ...new Set(installedSkillObjects.map((s) => s.category)),
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2
          className="text-base font-semibold mb-1"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          Skills
        </h2>
        <p
          className="text-xs leading-relaxed"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.6,
          }}
        >
          Manage the skills that expand SHANGO's capabilities. Active skills
          inform every build, suggestion, and output.
        </p>
      </div>

      {/* Summary row */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <span
              className="text-base font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {installedCount}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              installed
            </span>
          </div>
          <div
            style={{
              width: 1,
              height: 28,
              background: "var(--border-default)",
            }}
          />
          <div className="flex flex-col">
            <span
              className="text-base font-semibold"
              style={{
                color:
                  enabledCount > 0
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {enabledCount}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              active
            </span>
          </div>
          {enabledCount > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  height: 28,
                  background: "var(--border-default)",
                }}
              />
              <div className="flex items-center gap-1.5">
                <span
                  className="rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#4ade80",
                    boxShadow: "0 0 4px rgba(74,222,128,0.6)",
                    display: "inline-block",
                    animation: "live-pulse 2.4s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "#4ade80",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.06em",
                  }}
                >
                  SHANGO IS LISTENING
                </span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => navigate("/skills")}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)"
            e.currentTarget.style.color = "var(--text-primary)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)"
            e.currentTarget.style.color = "var(--text-secondary)"
          }}
        >
          Browse Library →
        </button>
      </div>

      {installedCount === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-xl gap-3 py-14"
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-muted)",
            }}
          >
            <ZapIcon size={16} />
          </div>
          <div className="text-center px-6">
            <p
              className="text-sm font-medium mb-1"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              No skills installed
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.65,
              }}
            >
              Install skills to teach SHANGO your stack, preferences, and
              patterns.
            </p>
          </div>
          <button
            onClick={() => navigate("/skills")}
            className="text-xs px-4 py-2 rounded-lg"
            style={{
              background: "white",
              color: "#0a0a0a",
              fontFamily: "var(--font-geist)",
              fontWeight: 500,
            }}
          >
            Open Skills Library
          </button>
        </div>
      ) : (
        <>
          {/* Category filter — only when multiple categories present */}
          {usedCategories.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className="px-2.5 py-1 rounded-md text-xs transition-colors"
                style={{
                  background:
                    categoryFilter === "all"
                      ? "var(--surface-3)"
                      : "transparent",
                  border: `1px solid ${
                    categoryFilter === "all"
                      ? "var(--border-default)"
                      : "transparent"
                  }`,
                  color:
                    categoryFilter === "all"
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                All
              </button>
              {usedCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className="px-2.5 py-1 rounded-md text-xs transition-colors"
                  style={{
                    background:
                      categoryFilter === cat
                        ? "var(--surface-3)"
                        : "transparent",
                    border: `1px solid ${
                      categoryFilter === cat
                        ? "var(--border-default)"
                        : "transparent"
                    }`,
                    color:
                      categoryFilter === cat
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                  }}
                  onMouseEnter={(e) => {
                    if (categoryFilter !== cat)
                      e.currentTarget.style.color = "var(--text-secondary)"
                  }}
                  onMouseLeave={(e) => {
                    if (categoryFilter !== cat)
                      e.currentTarget.style.color = "var(--text-muted)"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Skill rows */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border-default)" }}
          >
            {filteredSkills.map((skill, idx) => {
              const isEnabled = enabledSkills.includes(skill.id)
              return (
                <div
                  key={skill.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: "var(--surface-1)",
                    borderBottom:
                      idx < filteredSkills.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  {/* Monogram */}
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      background: isEnabled
                        ? "rgba(255,255,255,0.07)"
                        : "var(--surface-3)",
                      border: `1px solid ${
                        isEnabled
                          ? "rgba(255,255,255,0.1)"
                          : "var(--border-default)"
                      }`,
                      transition: "background 0.18s ease",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: isEnabled
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {skill.monogram}
                    </span>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {skill.name}
                      </p>
                      {isEnabled && (
                        <span
                          className="rounded-full flex-shrink-0"
                          style={{
                            width: 5,
                            height: 5,
                            background: "#4ade80",
                            boxShadow: "0 0 4px rgba(74,222,128,0.5)",
                            display: "inline-block",
                            animation: "live-pulse 2.4s ease-in-out infinite",
                          }}
                        />
                      )}
                      {skill.hasUpdate && (
                        <span
                          className="text-xs px-1.5 py-px rounded flex-shrink-0"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.18)",
                            color: "#f59e0b",
                            fontFamily: "var(--font-mono-jetbrains)",
                            fontSize: 8,
                            letterSpacing: "0.06em",
                          }}
                        >
                          UPDATE
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist)",
                        marginTop: 1,
                      }}
                    >
                      {skill.purpose}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Enable/disable toggle */}
                    <SkillRowToggle
                      enabled={isEnabled}
                      onToggle={() => {
                        if (isEnabled) {
                          disableSkill(skill.id)
                          addToast(`${skill.name} disabled`, "default")
                        } else {
                          enableSkill(skill.id)
                          addToast(`${skill.name} enabled`, "default")
                        }
                      }}
                    />
                    {/* Remove */}
                    <button
                      onClick={() => {
                        uninstallSkill(skill.id)
                        addToast(`${skill.name} removed`, "default")
                      }}
                      className="p-1.5 rounded-md transition-colors"
                      title="Remove skill"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ef4444"
                        e.currentTarget.style.background =
                          "rgba(239,68,68,0.06)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)"
                        e.currentTarget.style.background = "transparent"
                      }}
                    >
                      <svg
                        width={11}
                        height={11}
                        viewBox="0 0 11 11"
                        fill="none"
                      >
                        <path
                          d="M2 2.5h7M4 2.5V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v.5M4.5 4.5v3M6.5 4.5v3M2.5 2.5l.5 6a.5.5 0 00.5.5h4a.5.5 0 00.5-.5l.5-6"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer note */}
          <p
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.65,
            }}
          >
            Disabled skills remain installed but do not influence SHANGO's
            outputs.{" "}
            <button
              onClick={() => navigate("/skills")}
              className="underline"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Browse the library
            </button>{" "}
            to discover more.
          </p>
        </>
      )}
    </div>
  )
}

function SkillRowToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Disable" : "Enable"}
      style={{
        width: 32,
        height: 18,
        background: enabled ? "rgba(255,255,255,0.15)" : "var(--surface-3)",
        border: `1px solid ${
          enabled ? "rgba(255,255,255,0.2)" : "var(--border-default)"
        }`,
        borderRadius: 9,
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
          left: enabled ? 14 : 2,
          width: 12,
          height: 12,
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

// ─── Shared primitives ────────────────────────────────────────────────────────

function Section({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-5"
      style={{ animation: "shango-fade-up 0.2s cubic-bezier(0.16,1,0.3,1)" }}
    >
      <div className="mb-1">
        <h2
          className="text-base font-semibold mb-1"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {title}
        </h2>
        {desc && (
          <p
            className="text-xs leading-relaxed"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.6,
            }}
          >
            {desc}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-xs"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          fontSize: 9,
          letterSpacing: "0.1em",
        }}
      >
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  )
}

function SettingsInput({
  defaultValue,
  placeholder,
  type = "text",
}: {
  defaultValue?: string
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${
          focused ? "rgba(255,255,255,0.14)" : "var(--border-default)"
        }`,
        color: "var(--text-primary)",
        fontFamily: "var(--font-geist)",
        boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.025)" : "none",
      }}
    />
  )
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div>
        <p
          className="text-sm"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {label}
        </p>
        <p
          className="text-xs mt-0.5 leading-relaxed"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 rounded-full transition-all"
        style={{
          width: 36,
          height: 20,
          background: value ? "rgba(255,255,255,0.9)" : "var(--surface-4)",
          border: `1px solid ${
            value ? "transparent" : "var(--border-default)"
          }`,
          position: "relative",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: value ? "#0a0a0a" : "var(--text-muted)",
            transition: "left 0.18s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </button>
    </div>
  )
}
