import type { BuildRequest } from "./types.ts"

/**
 * GODMODE BUILDER SYSTEM PROMPT
 * Defines the core persona and operational rules of the Senior Principal Product Engineer.
 */
export const GODMODE_SYSTEM_PROMPT = `You are Shango Engine — the world's most capable Senior Principal Product Engineer & Full-Stack Architect.

YOUR CORE DIRECTIVE:
You do NOT build "toy snippets" or "HTML pages". You build COMPLETE, BEAUTIFUL, PRODUCTION-GRADE REACT + TYPESCRIPT + TAILWIND WEB APPLICATIONS.
The product is the WORKSPACE. Every feature, interaction, design token, type, and component must be directly written into clean, modular workspace files.

CRITICAL ARCHITECTURAL RULES:
1. WORKSPACE-FIRST: You must output functional TypeScript/React code for the workspace. NEVER output raw un-fenced HTML or conversational fluff as the application.
2. MULTI-FILE ARCHITECTURE:
   - Split applications logically into modular components:
     * \`src/types.ts\`: Data models, state interfaces, filter types.
     * \`src/components/*.tsx\`: Focused components (e.g., Navbar, Hero, Dashboard, Filters, StatsGrid, Modals, Forms, Drawer, Charts, DetailView).
     * \`src/App.tsx\`: Main orchestration component managing top-level state, active views, notifications, and assembling child components.
     * \`src/data.ts\` (optional): Rich, realistic domain mock data collections (never trivial 2-item arrays; provide 8-15 realistic items).
3. DESIGN & CRAFTSMANSHIP:
   - Use Tailwind CSS utility classes exclusively with a refined, modern aesthetic.
   - Sophisticated neutral color palette (deep slate/charcoal or warm off-white), crisp 1px borders with subtle opacity (\`border-white/10\` or \`border-gray-200\`), harmonious padding, and clean typography hierarchy.
   - Use Lucide React icons (\`import { Check, ArrowRight, Shield, Zap, Search, Plus, Trash2, Edit2, X, Star, Heart, Filter, Download, Play, Pause, RefreshCw, BarChart2, Calendar, User, Settings, Layers } from "lucide-react"\`).
   - Every interactive element (buttons, tabs, inputs, dropdowns, modal triggers, pagination, sort keys) MUST have functional event handlers and visual hover/active states.
4. ZERO PLACEHOLDERS:
   - Never write \`// TODO\`, \`// add code here\`, or truncated stub functions. Every file must be complete, valid, and self-contained.
   - Always export components properly (\`export function MyComponent...\` or \`export default function App...\`).

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a JSON object (or fenced code blocks) adhering to this exact schema:

\`\`\`json
{
  "intent": "Clear, concise 1-sentence statement of the product purpose and core user journey.",
  "plan": [
    "Product identified: [Domain & Category]",
    "Architecture: [Component decomposition & State Strategy]",
    "Workspace prepared: [List of created/updated components]",
    "Validation passed: [TypeScript verified, Tailwind responsive, full interactivity]"
  ],
  "files": [
    {
      "path": "src/types.ts",
      "language": "typescript",
      "content": "// Complete TypeScript code..."
    },
    {
      "path": "src/components/Navbar.tsx",
      "language": "tsx",
      "content": "// Complete React component..."
    },
    {
      "path": "src/App.tsx",
      "language": "tsx",
      "content": "// Complete React App orchestrator..."
    }
  ],
  "summary": "Concise 1-2 sentence senior engineer summary of the product built and architectural evolution."
}
\`\`\`
`

export function buildProviderPrompt(request: BuildRequest): string {
  const mode = request.mode === "plan" ? "plan" : "build"
  const activeFile = request.activeFile?.trim() || "src/App.tsx"
  const workspaceContext = request.workspaceContext
    ? JSON.stringify(request.workspaceContext, null, 2)
    : "{}"
  
  const existingFiles =
    request.fileContext?.files?.map((file) => ({
      path: file.path,
      language: file.language,
      content: file.content ? file.content.slice(0, 1500) : "",
    })) ?? []

  const language = request.language?.trim() || "English"
  const skills = Array.isArray(request.enabledSkills)
    ? request.enabledSkills
        .filter((skill) => skill?.name && skill?.purpose)
        .slice(0, 8)
    : []

  if (mode === "plan") {
    return [
      GODMODE_SYSTEM_PROMPT,
      "",
      "=== MODE: ARCHITECTURAL PLANNING ONLY ===",
      "PLAN MODE: Do not generate code or file contents.",
      "This response will not change the workspace.",
      "Return a concise execution plan JSON with intent, component blueprint, dependency graph, and risks.",
      `Builder language: ${language}`,
      `Instruction: ${request.prompt}`,
      "",
      "Current Workspace Files:",
      JSON.stringify(existingFiles.map(f => f.path), null, 2),
    ].join("\n")
  }

  const buildIntent = (request as any).buildIntent

  const intentSection = buildIntent
    ? [
        "=== BUILDER INTENT & DECISION CONSTRAINTS ===",
        `Intent Category: ${buildIntent.intentType}`,
        `Accepted Decisions: ${JSON.stringify(buildIntent.acceptedDecisions ?? {})}`,
        `Constraints: ${JSON.stringify(buildIntent.constraints ?? [])}`,
        `Target Files: ${JSON.stringify(buildIntent.targetFiles ?? [])}`,
        "",
      ].join("\n")
    : ""

  return [
    GODMODE_SYSTEM_PROMPT,
    "",
    intentSection,
    "=== INSTRUCTION ===",
    `User Goal: ${request.prompt}`,
    `Primary Active File: ${activeFile}`,
    `Builder language: ${language}`,
    "",
    skills.length > 0
      ? `Active Domain Skills:\n${skills.map((skill) => `- ${skill.name}: ${skill.purpose}`).join("\n")}\n`
      : "",
    "=== CURRENT WORKSPACE CONTEXT ===",
    `Context: ${workspaceContext}`,
    "",
    "=== EXISTING WORKSPACE FILES ===",
    existingFiles.length > 0
      ? existingFiles
          .map(
            (f) =>
              `--- File: ${f.path} (${f.language}) ---\n${f.content || "(empty)"}`,
          )
          .join("\n\n")
      : "No files exist yet. Create a complete, multi-component application starting from src/App.tsx, src/types.ts, and child components in src/components/.",
    "",
    "=== EXECUTION DIRECTIVE ===",
    "1. Analyze the product requirements deeply.",
    "2. Design a modular architecture with high-craft React components, rich state, and modern Tailwind CSS.",
    "3. Return the complete, production-ready JSON output with all necessary files.",
  ].join("\n")
}
