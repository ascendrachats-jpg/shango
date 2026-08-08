import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import { BackIcon, SearchIcon } from "../components/icons"
import {
  ALL_CONNECTORS,
  CONNECTOR_CATEGORIES,
  searchConnectors,
  getFeaturedConnectors,
  type Connector,
  type ConnectorCategory,
} from "../lib/connectors"
import ConnectorDetailSheet from "../components/ConnectorDetailSheet"
import ConnectorWizard from "../components/ConnectorWizard"

export default function IntegrationsPage() {
  const navigate = useNavigate()
  const { connectedConnectors } = useApp()

  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] =
    useState<ConnectorCategory | "all" | "connected">("all")
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null,
  )
  const [wizardConnector, setWizardConnector] = useState<Connector | null>(null)

  const connectedCount = connectedConnectors.length
  const featured = getFeaturedConnectors()

  const displayed = useMemo(() => {
    if (activeCategory === "connected") {
      const base = ALL_CONNECTORS.filter((c) =>
        connectedConnectors.includes(c.id),
      )
      return query
        ? base.filter((c) => searchConnectors(query).find((r) => r.id === c.id))
        : base
    }
    const base =
      activeCategory === "all"
        ? ALL_CONNECTORS
        : ALL_CONNECTORS.filter((c) => c.category === activeCategory)
    return query
      ? base.filter((c) => searchConnectors(query).find((r) => r.id === c.id))
      : base
  }, [query, activeCategory, connectedConnectors])

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
          Connectors
        </span>
        <span
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
        >
          — SHANGO's gateways into the digital world
        </span>

        <div style={{ flex: 1 }} />

        <div className="flex items-center gap-3">
          {/* Connected summary */}
          {connectedCount > 0 && (
            <div className="flex items-center gap-2">
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
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    fontSize: 9,
                    letterSpacing: "0.06em",
                  }}
                >
                  {connectedCount} CONNECTED
                </span>
              </div>
              <div className="flex -space-x-1">
                {connectedConnectors.slice(0, 5).map((id) => {
                  const c = ALL_CONNECTORS.find((x) => x.id === id)
                  if (!c) return null
                  return (
                    <div
                      key={id}
                      title={c.name}
                      className="flex items-center justify-center rounded-md flex-shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        background: "var(--surface-4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: 8,
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        fontWeight: 600,
                      }}
                    >
                      {c.monogram}
                    </div>
                  )
                })}
                {connectedCount > 5 && (
                  <div
                    className="flex items-center justify-center rounded-md"
                    style={{
                      width: 22,
                      height: 22,
                      background: "var(--surface-3)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: 8,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono-jetbrains)",
                    }}
                  >
                    +{connectedCount - 5}
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
              placeholder="Search connectors..."
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
        {(["all", "connected"] as const).map((tab) => (
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
            {tab === "all" ? "All" : "Connected"}
            {tab === "connected" && connectedCount > 0 && (
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
                {connectedCount}
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

        {CONNECTOR_CATEGORIES.map((cat) => {
          const catCount = ALL_CONNECTORS.filter(
            (c) => c.category === cat,
          ).length
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
        {/* Connected section — on All tab, not searching */}
        {activeCategory === "all" && !query && connectedCount > 0 && (
          <section className="mb-10">
            <SectionHeader label="CONNECTED" count={connectedCount} />
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {ALL_CONNECTORS.filter((c) =>
                connectedConnectors.includes(c.id),
              ).map((c) => (
                <ConnectorCard
                  key={c.id}
                  connector={c}
                  onSelect={() => setSelectedConnector(c)}
                  onConnect={() => setWizardConnector(c)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Featured — on All tab, not searching */}
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
                .filter((c) => !connectedConnectors.includes(c.id))
                .map((c) => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    featured
                    onSelect={() => setSelectedConnector(c)}
                    onConnect={() => setWizardConnector(c)}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Filtered / Library */}
        {displayed.length > 0 ? (
          <section>
            {(activeCategory !== "all" || query) && (
              <SectionHeader
                label={
                  activeCategory === "connected"
                    ? "CONNECTED"
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
                  connectedCount > 0 || featured.length > 0
                    ? "ALL CONNECTORS"
                    : "ALL CONNECTORS"
                }
                count={ALL_CONNECTORS.length}
              />
            )}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {displayed
                .filter((c) => {
                  if (activeCategory === "all" && !query) {
                    return !connectedConnectors.includes(c.id) && !c.featured
                  }
                  return true
                })
                .map((c) => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    onSelect={() => setSelectedConnector(c)}
                    onConnect={() => setWizardConnector(c)}
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

      {/* Detail sheet */}
      <ConnectorDetailSheet
        connector={selectedConnector}
        onClose={() => setSelectedConnector(null)}
        onConnect={(c) => {
          setSelectedConnector(null)
          setWizardConnector(c)
        }}
        onNavigate={setSelectedConnector}
      />

      {/* Connection wizard */}
      <ConnectorWizard
        connector={wizardConnector}
        onClose={() => setWizardConnector(null)}
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

// ── Connector Card ─────────────────────────────────────────────────────────

function ConnectorCard({
  connector,
  featured = false,
  onSelect,
  onConnect,
}: {
  connector: Connector
  featured?: boolean
  onSelect: () => void
  onConnect: () => void
}) {
  const { disconnectConnector, addToast, connectedConnectors } = useApp()
  const [hovered, setHovered] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  const isConnected = connectedConnectors.includes(connector.id)

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConnected) {
      disconnectConnector(connector.id)
      addToast(`${connector.name} disconnected`, "default")
    } else {
      onConnect()
    }
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl p-4 flex flex-col cursor-pointer"
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${
          isConnected
            ? "rgba(255,255,255,0.1)"
            : hovered
              ? "rgba(255,255,255,0.08)"
              : "var(--border-subtle)"
        }`,
        transition: "border-color 0.18s ease",
        position: "relative",
      }}
    >
      {/* Featured badge */}
      {featured && !isConnected && (
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

      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Monogram icon */}
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: isConnected
              ? "rgba(255,255,255,0.08)"
              : "var(--surface-3)",
            border: `1px solid ${
              isConnected ? "rgba(255,255,255,0.12)" : "var(--border-default)"
            }`,
            transition: "background 0.18s ease, border-color 0.18s ease",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isConnected ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {connector.monogram}
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
              {connector.name}
            </p>
            {isConnected && <ConnectedDot />}
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
            {connector.category.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Description */}
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
        {connector.description}
      </p>

      {/* Auth type chip */}
      <div className="flex flex-wrap gap-1 mb-3">
        <AuthTypeBadge type={connector.authType} />
        {connector.requiredSkills.length > 0 && (
          <span
            className="text-xs px-1.5 py-px rounded"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              fontSize: 9,
            }}
          >
            {connector.requiredSkills.length} skill
            {connector.requiredSkills.length !== 1 ? "s" : ""} needed
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-end gap-2 mt-auto">
        <button
          onClick={handleAction}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: isConnected ? "transparent" : "var(--surface-3)",
            border: `1px solid ${
              isConnected && btnHovered
                ? "rgba(239,68,68,0.3)"
                : "var(--border-default)"
            }`,
            color:
              isConnected && btnHovered
                ? "#ef4444"
                : isConnected
                  ? "var(--text-muted)"
                  : "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            minWidth: 80,
            justifyContent: "center",
            transition: "all 0.16s ease",
          }}
        >
          {isConnected
            ? isConnected && btnHovered
              ? "Disconnect"
              : "Manage"
            : "Connect →"}
        </button>
      </div>
    </div>
  )
}

// ── Connected dot ──────────────────────────────────────────────────────────

function ConnectedDot() {
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{
        width: 5,
        height: 5,
        background: "#4ade80",
        boxShadow: "0 0 4px rgba(74,222,128,0.6)",
        display: "inline-block",
        animation: "live-pulse 2.4s ease-in-out infinite",
      }}
    />
  )
}

// ── Auth type badge ────────────────────────────────────────────────────────

function AuthTypeBadge({ type }: { type: string }) {
  const label =
    type === "oauth" ? "OAuth" : type === "api-key" ? "API Key" : "Token"
  return (
    <span
      className="text-xs px-1.5 py-px rounded"
      style={{
        background: "var(--surface-3)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono-jetbrains)",
        fontSize: 9,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
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
          {hasQuery ? "No connectors match your search" : "No connectors found"}
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
            : "Browse all connectors to expand SHANGO's reach"}
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
        Browse all connectors
      </button>
    </div>
  )
}
