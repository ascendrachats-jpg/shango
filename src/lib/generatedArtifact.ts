import type { ProjectArtifact, ProjectArtifactFile } from "./store"

export interface GeneratedArtifact extends ProjectArtifact {}

function sanitizeText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function _slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "app"
  )
}

function buildReactAppCode(title: string, description: string): string {
  const safeTitle = title.replace(/"/g, '\\"')
  const safeDesc = description.replace(/"/g, '\\"')

  return `import React, { useState } from "react"
import { Check, ArrowRight, Shield, Zap, Search, Plus, Filter, Star, RefreshCw, BarChart2 } from "lucide-react"

export default function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "metrics">("overview")
  const [query, setQuery] = useState("")
  const [items, setItems] = useState([
    { id: "1", title: "Core Workflows", status: "Active", metric: "99.9%", tag: "Engine" },
    { id: "2", title: "Data Pipeline", status: "Operational", metric: "14ms", tag: "Stream" },
    { id: "3", title: "Access Policies", status: "Secured", metric: "AES-256", tag: "Auth" },
    { id: "4", title: "Edge Dispatch", status: "Healthy", metric: "6 Nodes", tag: "Cloud" },
  ])

  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) ||
      i.tag.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans antialiased selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              ✦
            </div>
            <span className="font-semibold text-sm tracking-tight">${safeTitle}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
            {(["overview", "modules", "metrics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={\`px-3 py-1 rounded-md capitalize transition-all \${
                  activeTab === tab
                    ? "bg-white/10 text-white font-medium shadow-sm"
                    : "text-white/50 hover:text-white"
                }\`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all shadow-sm active:scale-95">
            <Plus className="w-3.5 h-3.5" />
            <span>New Action</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Card */}
        <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Zap className="w-3.5 h-3.5" /> Ready for Production
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              ${safeTitle}
            </h1>
            <p className="text-sm text-white/60 max-w-xl leading-relaxed">
              ${safeDesc}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-center min-w-[110px]">
              <div className="text-xl font-bold text-blue-400">99.9%</div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">Availability</div>
            </div>
            <div className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-center min-w-[110px]">
              <div className="text-xl font-bold text-emerald-400">&lt; 15ms</div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">Latency</div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components or records..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="text-xs text-white/40 font-mono">
            {filtered.length} components available
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-[#111114] border border-white/10 hover:border-blue-500/40 transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/70 border border-white/5">
                  {item.tag}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" /> {item.status}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-white mb-1 group-hover:text-blue-400 transition-colors">
                {item.title}
              </h3>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                <span>Performance</span>
                <span className="font-mono text-white/80 font-medium">{item.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
`
}

function buildArtifactFiles(artifact: ProjectArtifact): ProjectArtifactFile[] {
  const title = artifact.title?.trim() || "Web Application"
  const description =
    artifact.description?.trim() || "Modular production workspace."

  // The artifact.html may be static preview HTML OR actual TSX from a
  // real generation. Detect TSX so we don't double-wrap it.
  const isCompleteTsx =
    artifact.html &&
    (artifact.html.includes("export default") ||
      artifact.html.includes("import React") ||
      artifact.html.includes("function App"))

  return [
    {
      path: "index.html",
      language: "html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>`,
    },
    {
      path: "src/App.tsx",
      language: "tsx",
      // If artifact.html is real TSX (from Gemini), use it directly.
      // Otherwise generate the TSX from title/description.
      content: isCompleteTsx
        ? artifact.html!
        : buildReactAppCode(title, description),
    },
    {
      path: "src/styles.css",
      language: "css",
      content: artifact.css?.trim() || "@import \"tailwindcss\";",
    },
  ]
}

export function createGeneratedArtifact(
  prompt: string,
  fallbackText: string,
): GeneratedArtifact {
  const title = prompt.trim() ? prompt.trim().slice(0, 60) : "Web Application"
  const description =
    sanitizeText(fallbackText) || "Engineered workspace application."
  // html/css are left empty — the preview system now uses the Babel
  // transpiler to render the TSX modules from the files array directly.
  // The actual TSX source lives in the files array for the code
  // inspector, export, and the in-browser transpilation preview.
  const artifact: ProjectArtifact = {
    title,
    description,
    html: "",
    css: "",
    js: "",
    createdAt: new Date().toISOString(),
  }
  return {
    ...artifact,
    files: buildArtifactFiles(artifact),
  }
}

export function createArtifactFromHtmlResponse(
  prompt: string,
  source: string,
): GeneratedArtifact | null {
  const trimmed = source.trim()
  if (!trimmed) return null

  // If the source is actually React/TSX code
  if (
    trimmed.includes("export default") ||
    trimmed.includes("import React") ||
    trimmed.includes("function App")
  ) {
    const titleMatch = trimmed.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const title = titleMatch ? sanitizeText(titleMatch[1]) : prompt.slice(0, 50)
    const artifact: ProjectArtifact = {
      title: title || "Web Application",
      description: `Engineered React application for ${title || prompt}`,
      html: trimmed,
      createdAt: new Date().toISOString(),
    }
    return {
      ...artifact,
      files: buildArtifactFiles(artifact),
    }
  }

  const titleMatch =
    trimmed.match(/<title>([\s\S]*?)<\/title>/i) ||
    trimmed.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title =
    sanitizeText(titleMatch?.[1] || prompt).slice(0, 80) || "Web Application"
  const description =
    sanitizeText(trimmed).slice(0, 160) || "Engineered workspace application."

  const styleMatch = trimmed.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const scriptMatch = trimmed.match(/<script[^>]*>([\s\S]*?)<\/script>/i)

  const artifact: GeneratedArtifact = {
    title,
    description,
    html: trimmed,
    css: styleMatch ? styleMatch[1].trim() : "",
    js: scriptMatch ? scriptMatch[1].trim() : "",
    createdAt: new Date().toISOString(),
  }

  return {
    ...artifact,
    files: buildArtifactFiles(artifact),
  }
}
