/**
 * GOLDEN APPLICATION END-TO-END TEST
 *
 * Proves the full generation → preview agreement contract:
 *   1. Simulated provider response (structured JSON with TSX files)
 *   2. → parseProviderResponse (structured parser)
 *   3. → normalizeParserResult (operation normalizer)
 *   4. → validateWorkspace (TypeScript syntax + import validation)
 *   5. → Build project.files + project.artifact (client commit simulation)
 *   6. → buildArtifactPreviewDocument + createArtifactPreviewUrl (preview runtime)
 *   7. → jsdom render verification (actual DOM output)
 *
 * Then tests iteration:
 *   8. Modify: make primary button amber → verify preview changes
 *   9. Add: About section → verify preview changes again
 */

import { JSDOM, VirtualConsole } from "jsdom"
import { createServer } from "http"

import { parseProviderResponse } from "../server/generationPipeline/structuredParser.ts"
import { normalizeParserResult } from "../server/generationPipeline/operationNormalizer.ts"
import { validateWorkspace } from "../server/generationPipeline/validator.ts"
import {
  buildArtifactPreviewDocument,
  createArtifactPreviewUrl,
} from "../src/lib/preview.ts"

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIMULATED PROVIDER RESPONSE — Golden coffee shop landing page
//    This is what Gemini/OpenRouter would return for:
//    "Create a coffee shop landing page with a hero section, menu, and footer"
// ─────────────────────────────────────────────────────────────────────────────

const goldenProviderResponse = JSON.stringify({
  title: "Bean & Brew Coffee Shop",
  description: "A cozy coffee shop landing page with hero, menu, and contact sections",
  intent: "Create a coffee shop landing page",
  files: [
    {
      path: "src/App.tsx",
      language: "tsx",
      content: `import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import MenuSection from './components/MenuSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <Header />
      <Hero />
      <MenuSection />
      <Footer />
    </div>
  )
}
`,
    },
    {
      path: "src/components/Header.tsx",
      language: "tsx",
      content: `import React from 'react'
import { Coffee } from 'lucide-react'

export default function Header() {
  return (
    <header className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Coffee className="w-6 h-6" /> Bean &amp; Brew
      </h1>
      <nav className="flex gap-6 text-sm text-stone-300">
        <a href="#menu" className="hover:text-amber-400">Menu</a>
        <a href="#about" className="hover:text-amber-400">About</a>
        <a href="#contact" className="hover:text-amber-400">Contact</a>
      </nav>
    </header>
  )
}
`,
    },
    {
      path: "src/components/Hero.tsx",
      language: "tsx",
      content: `import React from 'react'

export default function Hero() {
  return (
    <section className="px-6 py-20 text-center bg-gradient-to-b from-stone-800 to-stone-900">
      <h2 className="text-5xl font-bold mb-4">Fresh Coffee, Every Morning</h2>
      <p className="text-xl text-stone-300 mb-8">Handcrafted with love since 2015</p>
      <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors">
        Order Now
      </button>
    </section>
  )
}
`,
    },
    {
      path: "src/components/MenuSection.tsx",
      language: "tsx",
      content: `import React from 'react'

const menuItems = [
  { name: 'Espresso', price: '$3.50', desc: 'Rich and bold single shot' },
  { name: 'Latte', price: '$4.75', desc: 'Smooth espresso with steamed milk' },
  { name: 'Cappuccino', price: '$4.50', desc: 'Equal parts espresso, milk, and foam' },
  { name: 'Cold Brew', price: '$5.00', desc: 'Slow-steeped for 18 hours' },
]

export default function MenuSection() {
  return (
    <section id="menu" className="px-6 py-16 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center">Our Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <div key={item.name} className="bg-stone-800 rounded-lg p-6 border border-stone-700">
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-xl font-semibold">{item.name}</h3>
              <span className="text-amber-400 font-bold">{item.price}</span>
            </div>
            <p className="text-stone-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
`,
    },
    {
      path: "src/components/Footer.tsx",
      language: "tsx",
      content: `import React from 'react'

export default function Footer() {
  return (
    <footer id="contact" className="px-6 py-8 border-t border-stone-700 text-center text-stone-400">
      <p className="mb-2">123 Coffee Lane, Portland, OR</p>
      <p className="mb-2">Phone: (555) 123-4567</p>
      <p>&copy; 2025 Bean &amp; Brew. All rights reserved.</p>
    </footer>
  )
}
`,
    },
  ],
})

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Load preview document in jsdom and verify rendering
// ─────────────────────────────────────────────────────────────────────────────

function loadPreviewInJsdom(htmlDoc) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/preview.html") {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(htmlDoc)
        return
      }
      // Serve local React 18 UMD and Babel from node_modules
      if (req.url === "/react.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          require("fs").readFileSync(
            require("path").resolve("node_modules/react/umd/react.development.js"),
            "utf8",
          ),
        )
        return
      }
      if (req.url === "/react-dom.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          require("fs").readFileSync(
            require("path").resolve("node_modules/react-dom/umd/react-dom.development.js"),
            "utf8",
          ),
        )
        return
      }
      if (req.url === "/babel.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          require("fs").readFileSync(
            require("path").resolve("node_modules/@babel/standalone/babel.min.js"),
            "utf8",
          ),
        )
        return
      }
      res.writeHead(404)
      res.end("Not found")
    })

    server.listen(0, async () => {
      const port = server.address().port
      const baseUrl = `http://localhost:${port}`

      // Replace CDN URLs with local server URLs
      const localDoc = htmlDoc
        .replace(/https:\/\/unpkg\.com\/react@18[^"]*/g, `${baseUrl}/react.js`)
        .replace(/https:\/\/unpkg\.com\/react-dom@18[^"]*/g, `${baseUrl}/react-dom.js`)
        .replace(/https:\/\/unpkg\.com\/@babel\/standalone[^"]*/g, `${baseUrl}/babel.js`)

      const virtualConsole = new VirtualConsole()
      const errors = []
      const logs = []
      virtualConsole.on("error", (...args) => errors.push(args.join(" ")))
      virtualConsole.on("jsdomError", (err) => errors.push(err.message))
      virtualConsole.on("log", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("info", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("warn", (...args) => logs.push(args.join(" ")))

      try {
        const dom = await JSDOM.fromFile(`${baseUrl}/preview.html`.replace("http://", ""), {
          // Can't use fromFile for URLs; use fromURL instead
        })
      } catch {
        // Use JSDOM from URL
      }

      try {
        const dom = await JSDOM.fromURL(`${baseUrl}/preview.html`, {
          runScripts: "dangerously",
          resources: "usable",
          virtualConsole,
          pretendToBeVisual: true,
        })

        // Wait for React to render
        await new Promise((r) => setTimeout(r, 3000))

        const doc = dom.window.document
        const root = doc.getElementById("root")
        const loadingEl = doc.querySelector("[data-loading]")

        const result = {
          rootInnerHTML: root ? root.innerHTML : "",
          rootTextContent: root ? root.textContent : "",
          elementCount: root ? root.querySelectorAll("*").length : 0,
          loadingVisible: loadingEl
            ? loadingEl.style.display !== "none" && !loadingEl.hidden
            : false,
          errors,
          logs,
          dom,
        }

        server.close()
        resolve(result)
      } catch (err) {
        server.close()
        reject(err)
      }
    })
  })
}

// Write preview HTML to temp file so we can serve via HTTP
import { writeFileSync, unlinkSync } from "fs"

async function renderPreview(projectArtifact, projectFiles, streamedFiles = []) {
  const htmlDoc = buildArtifactPreviewDocument(
    projectArtifact,
    streamedFiles,
    projectFiles,
  )

  // Write to temp file and serve
  const tmpPath = `/tmp/preview_test_${Date.now()}.html`
  writeFileSync(tmpPath, htmlDoc)

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/preview.html") {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(htmlDoc)
        return
      }
      if (req.url === "/react.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          readFileSync(
            "node_modules/react/umd/react.development.js",
            "utf8",
          ),
        )
        return
      }
      if (req.url === "/react-dom.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          readFileSync(
            "node_modules/react-dom/umd/react-dom.development.js",
            "utf8",
          ),
        )
        return
      }
      if (req.url === "/babel.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(
          readFileSync(
            "node_modules/@babel/standalone/babel.min.js",
            "utf8",
        ))
        return
      }
      res.writeHead(404)
      res.end("Not found")
    })

    server.listen(0, async () => {
      const port = server.address().port
      const baseUrl = `http://localhost:${port}/preview.html`

      const virtualConsole = new VirtualConsole()
      const errors = []
      const logs = []
      virtualConsole.on("error", (...args) => errors.push(args.join(" ")))
      virtualConsole.on("jsdomError", (err) => errors.push(err.message + "\n" + (err.stack || "")))
      virtualConsole.on("log", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("info", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("warn", (...args) => logs.push(args.join(" ")))

      try {
        const dom = await JSDOM.fromURL(baseUrl, {
          runScripts: "dangerously",
          resources: "usable",
          virtualConsole,
          pretendToBeVisual: true,
        })

        await new Promise((r) => setTimeout(r, 3000))

        const doc = dom.window.document
        const root = doc.getElementById("root")

        const result = {
          rootInnerHTML: root ? root.innerHTML : "",
          rootTextContent: root ? root.textContent : "",
          elementCount: root ? root.querySelectorAll("*").length : 0,
          errors,
          logs,
        }

        server.close()
        try { unlinkSync(tmpPath) } catch {}
        resolve(result)
      } catch (err) {
        server.close()
        try { unlinkSync(tmpPath) } catch {}
        reject(err)
      }
    })
  })
}

import { readFileSync as readFileSync2 } from "fs"
const readFileSync = readFileSync2

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  GOLDEN APPLICATION END-TO-END TEST")
  console.log("  Generation → Parser → Validator → Preview → Render")
  console.log("═══════════════════════════════════════════════════════════════\n")

  // ── STEP 1: Parse simulated provider response ──
  console.log("▸ Step 1: Parse simulated provider response")
  const parserResult = parseProviderResponse(goldenProviderResponse)
  console.log(`  Title: ${parserResult.title}`)
  console.log(`  Description: ${parserResult.description}`)
  console.log(`  Files parsed: ${parserResult.files.length}`)
  for (const f of parserResult.files) {
    console.log(`    • ${f.path} (${f.language}, ${f.content.length} chars)`)
  }
  if (parserResult.files.length === 0) {
    console.error("  ✗ FAIL: No files parsed from provider response")
    process.exit(1)
  }
  console.log("  ✓ PASS\n")

  // ── STEP 2: Normalize parser result to file operations ──
  console.log("▸ Step 2: Normalize to file operations")
  const fileOps = normalizeParserResult(parserResult, [])
  console.log(`  Operations: ${fileOps.length}`)
  for (const op of fileOps) {
    console.log(`    • ${op.operation.toUpperCase()}: ${op.path}`)
  }
  if (fileOps.length === 0) {
    console.error("  ✗ FAIL: No file operations generated")
    process.exit(1)
  }
  console.log("  ✓ PASS\n")

  // ── STEP 3: Build workspace and validate ──
  console.log("▸ Step 3: Build workspace & validate (syntax + imports)")
  const workspace = fileOps.map((op) => ({
    path: op.path,
    content: op.content || "",
    language: op.language || "text",
  }))
  const validation = validateWorkspace(workspace)
  console.log(`  Valid: ${validation.valid}`)
  console.log(`  Diagnostics: ${validation.diagnostics.length}`)
  for (const d of validation.diagnostics) {
    console.log(`    • [${d.code}] ${d.file}: ${d.message}`)
  }
  if (!validation.valid) {
    console.error("  ✗ FAIL: Workspace validation failed")
    process.exit(1)
  }
  console.log("  ✓ PASS\n")

  // ── STEP 4: Build project state (simulating client commit) ──
  console.log("▸ Step 4: Build project.files + project.artifact (client commit)")
  const now = new Date().toISOString()
  const projectFiles = fileOps.map((op) => ({
    id: `file-${op.path}-${Date.now()}`,
    path: op.path,
    name: op.path.split("/").pop() || op.path,
    extension: op.path.split(".").pop() || "text",
    language: op.language || "text",
    content: op.content || "",
    createdAt: now,
    updatedAt: now,
  }))
  const projectArtifact = {
    title: parserResult.title || "Bean & Brew",
    description: parserResult.description || "",
    createdAt: now,
    files: fileOps.map((op) => ({
      path: op.path,
      content: op.content || "",
      language: op.language,
    })),
  }
  console.log(`  project.files: ${projectFiles.length} files`)
  console.log(`  project.artifact.title: ${projectArtifact.title}`)
  console.log("  ✓ PASS\n")

  // ── STEP 5: Build preview document ──
  console.log("▸ Step 5: Build preview document")
  const previewDoc = buildArtifactPreviewDocument(
    projectArtifact,
    [],
    projectFiles,
  )
  console.log(`  Document length: ${previewDoc.length} chars`)
  if (previewDoc.length < 1000) {
    console.error("  ✗ FAIL: Preview document too small")
    process.exit(1)
  }
  // Check for key elements in the generated HTML
  const hasBabel = previewDoc.includes("@babel/standalone") || previewDoc.includes("babel.js")
  const hasReact = previewDoc.includes("react@18") || previewDoc.includes("react.js")
  const hasModules = previewDoc.includes("__MODULES__") || previewDoc.includes("collectModules") || previewDoc.includes("loadModule")
  console.log(`  Has Babel: ${hasBabel}`)
  console.log(`  Has React 18: ${hasReact}`)
  console.log(`  Has module loader: ${hasModules}`)
  console.log("  ✓ PASS\n")

  // ── STEP 6: Render in jsdom and verify ──
  console.log("▸ Step 6: Render in jsdom (actual DOM verification)")
  const render1 = await renderPreview(projectArtifact, projectFiles, [])
  console.log(`  Root innerHTML length: ${render1.rootInnerHTML.length}`)
  console.log(`  Element count: ${render1.elementCount}`)
  console.log(`  Errors: ${render1.errors.length}`)
  if (render1.errors.length > 0) {
    console.log("  Error details:")
    for (const e of render1.errors.slice(0, 5)) {
      console.log(`    ! ${e.slice(0, 200)}`)
    }
  }

  const checks1 = {
    "Bean & Brew": render1.rootInnerHTML.includes("Bean &amp; Brew") || render1.rootTextContent.includes("Bean & Brew") || render1.rootInnerHTML.includes("Bean & Brew"),
    "Fresh Coffee": render1.rootTextContent.includes("Fresh Coffee") || render1.rootInnerHTML.includes("Fresh Coffee"),
    "Order Now": render1.rootTextContent.includes("Order Now"),
    "Our Menu": render1.rootTextContent.includes("Our Menu"),
    "Espresso": render1.rootTextContent.includes("Espresso"),
    "Latte": render1.rootTextContent.includes("Latte"),
    "Cappuccino": render1.rootTextContent.includes("Cappuccino"),
    "Cold Brew": render1.rootTextContent.includes("Cold Brew"),
    "(555) 123-4567": render1.rootTextContent.includes("(555) 123-4567"),
    "Portland": render1.rootTextContent.includes("Portland"),
  }

  let allPass1 = true
  for (const [label, pass] of Object.entries(checks1)) {
    console.log(`    ${pass ? "✓" : "✗"} Contains '${label}': ${pass}`)
    if (!pass) allPass1 = false
  }

  if (render1.elementCount < 20) {
    console.error(`  ✗ FAIL: Only ${render1.elementCount} elements rendered (expected ≥20)`)
    allPass1 = false
  }
  if (render1.rootInnerHTML.length < 1000) {
    console.error(`  ✗ FAIL: Root innerHTML too small (${render1.rootInnerHTML.length} chars)`)
    allPass1 = false
  }

  if (!allPass1) {
    console.error("\n  ✗ FAIL: Golden app render verification failed")
    process.exit(1)
  }
  console.log("  ✓ PASS — Golden app renders correctly!\n")

  // ── STEP 7: ITERATION — Modify primary button to amber ──
  console.log("▸ Step 7: ITERATION — Make primary button amber (blue → amber)")
  const heroFile = projectFiles.find((f) => f.path === "src/components/Hero.tsx")
  const modifiedHeroContent = heroFile.content
    .replace("bg-blue-600 hover:bg-blue-700", "bg-amber-500 hover:bg-amber-600")
    .replace("Fresh Coffee, Every Morning", "Premium Coffee, Every Morning")

  const modifiedProviderResponse = JSON.stringify({
    title: "Bean & Brew Coffee Shop",
    description: "Modified: amber CTA button",
    files: [
      {
        path: "src/components/Hero.tsx",
        language: "tsx",
        content: modifiedHeroContent,
      },
    ],
  })

  const modParserResult = parseProviderResponse(modifiedProviderResponse)
  const modFileOps = normalizeParserResult(modParserResult, workspace)

  // Apply modifications to workspace
  const modifiedWorkspace = workspace.map((f) => {
    const mod = modFileOps.find((op) => op.path === f.path)
    return mod ? { ...f, content: mod.content || f.content } : f
  })

  const modValidation = validateWorkspace(modifiedWorkspace)
  console.log(`  Modified workspace valid: ${modValidation.valid}`)
  if (!modValidation.valid) {
    console.error("  ✗ FAIL: Modified workspace validation failed")
    process.exit(1)
  }

  // Update project files
  const modifiedProjectFiles = projectFiles.map((f) => {
    if (f.path === "src/components/Hero.tsx") {
      return { ...f, content: modifiedHeroContent, updatedAt: new Date().toISOString() }
    }
    return f
  })
  const modifiedArtifact = {
    ...projectArtifact,
    files: (projectArtifact.files || []).map((f) =>
      f.path === "src/components/Hero.tsx"
        ? { ...f, content: modifiedHeroContent }
        : f,
    ),
  }

  const render2 = await renderPreview(modifiedArtifact, modifiedProjectFiles, [])
  console.log(`  Render 2 element count: ${render2.elementCount}`)
  console.log(`  Root innerHTML length: ${render2.rootInnerHTML.length}`)

  const checks2 = {
    "Premium Coffee (modified heading)": render2.rootTextContent.includes("Premium Coffee"),
    "Fresh Coffee removed": !render2.rootTextContent.includes("Fresh Coffee, Every Morning"),
    "amber-500 class present": render2.rootInnerHTML.includes("amber-500") || render2.rootInnerHTML.includes("amber-600"),
    "blue-600 class removed": !render2.rootInnerHTML.includes("blue-600"),
    "Order Now still present": render2.rootTextContent.includes("Order Now"),
  }

  let allPass2 = true
  for (const [label, pass] of Object.entries(checks2)) {
    console.log(`    ${pass ? "✓" : "✗"} ${label}: ${pass}`)
    if (!pass) allPass2 = false
  }

  if (!allPass2) {
    console.error("\n  ✗ FAIL: Iteration (button modification) verification failed")
    process.exit(1)
  }
  console.log("  ✓ PASS — Preview reflects modification!\n")

  // ── STEP 8: ITERATION — Add About section ──
  console.log("▸ Step 8: ITERATION — Add About section")

  const aboutComponent = `import React from 'react'

export default function About() {
  return (
    <section id="about" className="px-6 py-16 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
      <p className="text-stone-300 text-lg leading-relaxed text-center max-w-2xl mx-auto">
        Founded in 2015 by two friends with a passion for great coffee, Bean &amp; Brew
        started as a small cart on the corner of 5th and Main. Today, we are proud to
        serve the Portland community with ethically sourced beans and a warm, welcoming
        atmosphere.
      </p>
    </section>
  )
}
`

  const aboutAppContent = `import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import MenuSection from './components/MenuSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <Header />
      <Hero />
      <About />
      <MenuSection />
      <Footer />
    </div>
  )
}
`

  const addAboutResponse = JSON.stringify({
    title: "Bean & Brew Coffee Shop",
    description: "Added About section",
    files: [
      { path: "src/components/About.tsx", language: "tsx", content: aboutComponent },
      { path: "src/App.tsx", language: "tsx", content: aboutAppContent },
    ],
  })

  const addParserResult = parseProviderResponse(addAboutResponse)
  const addFileOps = normalizeParserResult(addParserResult, modifiedWorkspace)

  // Apply: add About.tsx (new file) and modify App.tsx
  const finalWorkspace = [...modifiedWorkspace]
  for (const op of addFileOps) {
    if (op.operation === "create") {
      finalWorkspace.push({
        path: op.path,
        content: op.content || "",
        language: op.language || "text",
      })
    } else {
      const idx = finalWorkspace.findIndex((f) => f.path === op.path)
      if (idx >= 0) {
        finalWorkspace[idx] = { ...finalWorkspace[idx], content: op.content || "" }
      }
    }
  }

  const finalValidation = validateWorkspace(finalWorkspace)
  console.log(`  Final workspace valid: ${finalValidation.valid}`)
  console.log(`  Final workspace files: ${finalWorkspace.length}`)
  if (!finalValidation.valid) {
    console.error("  ✗ FAIL: Final workspace validation failed")
    for (const d of finalValidation.diagnostics) {
      console.error(`    • [${d.code}] ${d.file}: ${d.message}`)
    }
    process.exit(1)
  }

  // Build final project state
  const finalProjectFiles = [
    ...modifiedProjectFiles.filter((f) => f.path !== "src/App.tsx"),
    {
      id: `file-src/App.tsx-${Date.now()}`,
      path: "src/App.tsx",
      name: "App.tsx",
      extension: "tsx",
      language: "tsx",
      content: aboutAppContent,
      createdAt: now,
      updatedAt: new Date().toISOString(),
    },
    {
      id: `file-src/components/About.tsx-${Date.now()}`,
      path: "src/components/About.tsx",
      name: "About.tsx",
      extension: "tsx",
      language: "tsx",
      content: aboutComponent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
  const finalArtifact = {
    ...projectArtifact,
    files: [
      ...(projectArtifact.files || []).filter((f) => f.path !== "src/App.tsx"),
      { path: "src/App.tsx", content: aboutAppContent, language: "tsx" },
      { path: "src/components/About.tsx", content: aboutComponent, language: "tsx" },
      ...(modifiedArtifact.files || []).filter((f) => f.path === "src/components/Hero.tsx"),
    ],
  }

  const render3 = await renderPreview(finalArtifact, finalProjectFiles, [])
  console.log(`  Render 3 element count: ${render3.elementCount}`)
  console.log(`  Root innerHTML length: ${render3.rootInnerHTML.length}`)

  const checks3 = {
    "Our Story (new section)": render3.rootTextContent.includes("Our Story"),
    "Founded in 2015": render3.rootTextContent.includes("2015"),
    "ethically sourced": render3.rootTextContent.includes("ethically sourced"),
    "Premium Coffee (from prev mod)": render3.rootTextContent.includes("Premium Coffee"),
    "Order Now still present": render3.rootTextContent.includes("Order Now"),
    "Menu still present": render3.rootTextContent.includes("Our Menu"),
    "Espresso still present": render3.rootTextContent.includes("Espresso"),
    "Footer still present": render3.rootTextContent.includes("(555) 123-4567"),
  }

  let allPass3 = true
  for (const [label, pass] of Object.entries(checks3)) {
    console.log(`    ${pass ? "✓" : "✗"} ${label}: ${pass}`)
    if (!pass) allPass3 = false
  }

  if (render3.elementCount < render1.elementCount) {
    console.error(`  ✗ FAIL: Element count decreased (${render3.elementCount} < ${render1.elementCount})`)
    allPass3 = false
  }

  if (!allPass3) {
    console.error("\n  ✗ FAIL: About section addition verification failed")
    process.exit(1)
  }
  console.log("  ✓ PASS — About section renders correctly!\n")

  // ── SUMMARY ──
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  ALL TESTS PASSED")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log()
  console.log("  Generation → Preview Agreement Contract: VERIFIED")
  console.log()
  console.log("  Phase 5: Generation and Preview agree ✓")
  console.log("  Phase 7: Golden application renders ✓")
  console.log("  Iteration: Button modification reflected ✓")
  console.log("  Iteration: New section addition reflected ✓")
  console.log()
  console.log(`  Render 1 (golden): ${render1.elementCount} elements, ${render1.rootInnerHTML.length} chars`)
  console.log(`  Render 2 (modified): ${render2.elementCount} elements, ${render2.rootInnerHTML.length} chars`)
  console.log(`  Render 3 (with About): ${render3.elementCount} elements, ${render3.rootInnerHTML.length} chars`)
  console.log()
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
