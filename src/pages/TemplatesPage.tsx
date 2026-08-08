import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import { BackIcon, SearchIcon } from "../components/icons"

type Category = "all" | "saas" | "ecommerce" | "dashboard" | "portfolio" | "api" | "mobile"

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "saas", label: "SaaS" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "dashboard", label: "Dashboard" },
  { id: "portfolio", label: "Portfolio" },
  { id: "api", label: "API" },
  { id: "mobile", label: "Mobile" },
]

const TEMPLATES = [
  {
    id: "t1",
    name: "Community Savings",
    category: "saas" as Category,
    desc: "Chama and rotating savings platform with contribution tracking and payout schedules",
    featured: true,
  },
  {
    id: "t2",
    name: "SaaS Dashboard",
    category: "dashboard" as Category,
    desc: "Analytics and user management for SaaS products",
    featured: true,
  },
  {
    id: "t3",
    name: "E-commerce Store",
    category: "ecommerce" as Category,
    desc: "Product catalog, cart, and checkout flow",
    featured: true,
  },
  {
    id: "t4",
    name: "Portfolio",
    category: "portfolio" as Category,
    desc: "Minimal portfolio with case studies and contact",
    featured: false,
  },
  {
    id: "t5",
    name: "Logistics Tracker",
    category: "mobile" as Category,
    desc: "Farm-to-market shipment and fleet monitoring with status updates",
    featured: false,
  },
  {
    id: "t6",
    name: "Payment Dashboard",
    category: "dashboard" as Category,
    desc: "Mobile money and transaction tracking with settlement reporting",
    featured: false,
  },
  {
    id: "t7",
    name: "Landing Page",
    category: "saas" as Category,
    desc: "High-conversion landing with hero, features, and pricing",
    featured: false,
  },
  {
    id: "t8",
    name: "Admin Panel",
    category: "dashboard" as Category,
    desc: "Data tables, charts, and user management",
    featured: false,
  },
  {
    id: "t9",
    name: "API Explorer",
    category: "api" as Category,
    desc: "Interactive API documentation and testing console",
    featured: false,
  },
  {
    id: "t10",
    name: "School Portal",
    category: "saas" as Category,
    desc: "Fee collection, attendance tracking, and parent communications",
    featured: false,
  },
  {
    id: "t11",
    name: "Mobile App",
    category: "mobile" as Category,
    desc: "Responsive mobile-first application shell",
    featured: false,
  },
  {
    id: "t12",
    name: "Blog Platform",
    category: "saas" as Category,
    desc: "Content management with editor and reader view",
    featured: false,
  },
  {
    id: "t13",
    name: "Booking System",
    category: "saas" as Category,
    desc: "Calendar-based appointment and reservation system",
    featured: false,
  },
  {
    id: "t14",
    name: "CRM",
    category: "saas" as Category,
    desc: "Customer relationship management with pipeline view",
    featured: false,
  },
  {
    id: "t15",
    name: "Marketplace",
    category: "ecommerce" as Category,
    desc: "Multi-vendor marketplace with search and listings",
    featured: false,
  },
]

export default function TemplatesPage() {
  const navigate = useNavigate()
  const { createProject, addToast } = useApp()
  const [category, setCategory] = useState<Category>("all")
  const [search, setSearch] = useState("")

  const filtered = TEMPLATES.filter((t) => {
    if (category !== "all" && t.category !== category) return false
    if (
      search &&
      !t.name.toLowerCase().includes(search.toLowerCase()) &&
      !t.desc.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const featured = filtered.filter((t) => t.featured)
  const rest = filtered.filter((t) => !t.featured)

  const handleUseTemplate = (t: typeof TEMPLATES[0]) => {
    const p = createProject(`Create a ${t.name}: ${t.desc}`, {
      name: t.name,
      description: t.desc,
      template: { id: t.id, name: t.name, category: t.category },
    })
    addToast(`Workspace started: ${t.name}`, "default")
    navigate(`/project/${p.id}`)
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-3)"
            e.currentTarget.style.color = "var(--text-secondary)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--text-muted)"
          }}
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
          Templates
        </span>
        <span
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
        >
          — start from a solid foundation
        </span>
        <div className="flex-1" />
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 outline-none bg-transparent text-xs"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
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
      </header>

      {/* Category filter */}
      <div
        className="flex items-center gap-1 px-5"
        style={{
          height: 44,
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
        }}
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
            style={{
              background:
                category === c.id ? "var(--surface-3)" : "transparent",
              border: `1px solid ${
                category === c.id ? "var(--border-default)" : "transparent"
              }`,
              color:
                category === c.id ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
            onMouseEnter={(e) => {
              if (category !== c.id)
                e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              if (category !== c.id)
                e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto" style={{ padding: "28px 24px" }}>
        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-10">
            <p
              className="text-xs mb-4"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              FEATURED
            </p>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {featured.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onUse={() => handleUseTemplate(t)}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* All */}
        {rest.length > 0 && (
          <section>
            {featured.length > 0 && (
              <p
                className="text-xs mb-4"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                }}
              >
                ALL TEMPLATES
              </p>
            )}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              }}
            >
              {rest.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onUse={() => handleUseTemplate(t)}
                  featured={false}
                />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SearchIcon
                size={18}
                style={{ color: "var(--text-muted)", opacity: 0.5 }}
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
                No templates found
              </p>
              <p
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Try a different search or category
              </p>
            </div>
            <button
              onClick={() => {
                setSearch("")
                setCategory("all")
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "var(--surface-3)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
                border: "1px solid var(--border-default)",
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// Category-specific wireframe SVGs
function WireframeSVG({ category, size }: { category: string; size: number }) {
  const s = size === 1 ? 1 : 0.75
  const w = Math.round(120 * s)
  const h = Math.round(80 * s)

  if (category === "mobile") {
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 120 80"
        fill="none"
        style={{ opacity: 0.11 }}
      >
        <rect
          x="38"
          y="2"
          width="44"
          height="76"
          rx="8"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <rect x="42" y="10" width="36" height="56" rx="3" fill="white" />
        <rect x="50" y="4" width="20" height="3" rx="1.5" fill="white" />
      </svg>
    )
  }

  const paths: Record<string, string> = {
    dashboard:
      "M4 4h112v10H4zM4 20h28v56H4zM38 20h38v24H38zM82 20h34v24H82zM38 50h78v26H38z",
    ecommerce:
      "M4 4h112v10H4zM4 20h22v56H4zM32 20h26v26H32zM64 20h26v26H64zM96 20h20v26H96zM32 52h26v24H32zM64 52h26v24H64zM96 52h20v24H96z",
    portfolio: "M4 4h112v34H4zM4 44h34v32H4zM44 44h34v32H44zM84 44h32v32H84z",
    saas: "M4 4h112v8H4zM24 18h72v20H24zM36 44h18v18H36zM61 44h18v18H61zM86 44h18v18H86zM20 66h80v8H20z",
    api: "M4 4h112v10H4zM4 20h58v8H4zM4 34h48v8H4zM4 48h64v8H4zM4 62h40v8H4zM70 20h46v50H70z",
  }

  const d = paths[category] ?? paths.saas

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 120 80"
      fill="none"
      style={{ opacity: 0.11 }}
    >
      {d
        .split("z")
        .filter(Boolean)
        .map((seg, i) => (
          <path key={i} d={seg + "z"} fill="white" />
        ))}
    </svg>
  )
}

function TemplateCard({
  template,
  onUse,
  featured,
}: {
  template: typeof TEMPLATES[0]
  onUse: () => void
  featured: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const thumbnailHeight = featured ? 140 : 100

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${
          hovered ? "rgba(255,255,255,0.1)" : "var(--border-subtle)"
        }`,
        transition: "border-color 0.16s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: thumbnailHeight,
          background:
            "linear-gradient(135deg, var(--surface-0) 0%, rgba(255,255,255,0.04) 100%)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        {/* Category wireframe */}
        <WireframeSVG category={template.category} size={featured ? 1 : 0.75} />
        {/* Category label */}
        <span
          className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-md"
          style={{
            background: "rgba(0,0,0,0.5)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
            fontSize: 8,
            letterSpacing: "0.06em",
            backdropFilter: "blur(4px)",
          }}
        >
          {template.category.toUpperCase()}
        </span>
        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.38)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.16s ease",
            backdropFilter: "blur(2px)",
          }}
        >
          <span
            className="text-xs px-4 py-2 rounded-lg font-medium"
            style={{
              background: "white",
              color: "#0a0a0a",
              fontFamily: "var(--font-geist)",
              letterSpacing: "0.01em",
            }}
          >
            Use template →
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3">
        <p
          className="text-sm font-medium"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {template.name}
        </p>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.55,
          }}
        >
          {template.desc}
        </p>
        <button
          onClick={onUse}
          className="w-full mt-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: hovered ? "white" : "var(--surface-3)",
            color: hovered ? "#0a0a0a" : "var(--text-secondary)",
            border: hovered ? "none" : "1px solid var(--border-default)",
            fontFamily: "var(--font-geist)",
            transition:
              "background 0.16s ease, color 0.16s ease, border-color 0.16s ease",
            cursor: "pointer",
          }}
        >
          Use template →
        </button>
      </div>
    </div>
  )
}
