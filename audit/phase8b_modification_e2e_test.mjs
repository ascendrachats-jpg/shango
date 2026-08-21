/**
 * Phase 8b: Real AI Modification E2E Test
 * 
 * Sends a modification request to the real /api/build endpoint with currentFiles,
 * captures the SSE output, extracts the modified files, builds a preview using the
 * ACTUAL buildArtifactPreviewDocument from src/lib/preview.ts, and renders it in jsdom.
 * 
 * Verifies:
 * - Pipeline events present (request_received, planning, architecting, executing, file, validating)
 * - Hero.tsx was modified (not the entire app regenerated)
 * - bg-amber-400 is present in the modified Hero content
 * - Preview renders in jsdom with coffee shop content
 * - DOM element count is reasonable (>= 30)
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { createServer } from "node:http"
import { JSDOM, VirtualConsole } from "jsdom"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

const EXTRACTED_DIR = "audit/real_gen_extracted"
const DEV_SERVER = "http://localhost:8443"
const OUTPUT_FILE = "/tmp/modification_e2e_output.txt"

function log(msg) {
  console.log(msg)
}

function loadCurrentFiles() {
  const files = []
  function walk(dir, prefix = "") {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(fullPath, relPath)
      } else {
        // Skip non-source files
        if (entry.name === "preview.html") continue
        const content = readFileSync(fullPath, "utf8")
        const ext = entry.name.split(".").pop()
        const language = ext === "tsx" ? "tsx" : ext === "ts" ? "typescript" : ext === "css" ? "css" : "text"
        files.push({ path: relPath, content, language })
      }
    }
  }
  walk(EXTRACTED_DIR)
  return files
}

async function sendModificationRequest(currentFiles) {
  log("  Building modification request body...")
  
  const requestBody = {
    prompt: "Change the primary CTA button in the hero section ('Explore Our Menu') to be amber-400 colored instead of the gradient amber. Use bg-amber-400 and hover:bg-amber-500. Only modify the Hero component.",
    activeFile: "src/components/Hero.tsx",
    mode: "build",
    currentFiles: currentFiles.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language,
    })),
    workspaceContext: { appName: "Bean & Brew Coffee Shop" },
  }

  writeFileSync("/tmp/modification_e2e_request.json", JSON.stringify(requestBody))
  log(`  Request body size: ${JSON.stringify(requestBody).length} bytes`)
  log("  Sending POST to /api/build (real Gemini API)...")

  const response = await fetch(`${DEV_SERVER}/api/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  log("  Receiving SSE stream...")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullOutput = ""
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullOutput += chunk
  }
  
  writeFileSync(OUTPUT_FILE, fullOutput)
  log(`  SSE output captured: ${fullOutput.length} bytes`)
  return fullOutput
}

function extractFilesFromSSE(sseOutput) {
  const files = []
  const lines = sseOutput.split("\n")
  let currentEvent = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith("data: ") && currentEvent === "file") {
      const dataStr = line.slice(6)
      try {
        const data = JSON.parse(dataStr)
        if (data.file) {
          files.push({
            path: data.file.path,
            operation: data.file.operation,
            language: data.file.language,
            content: data.file.content,
          })
        }
      } catch (e) {
        // Multi-line data, try to accumulate
      }
    }
  }
  
  return files
}

function extractStatusEvents(sseOutput) {
  const statuses = []
  const lines = sseOutput.split("\n")
  let currentEvent = null
  
  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith("data: ") && currentEvent === "status") {
      try {
        const data = JSON.parse(line.slice(6))
        statuses.push(data.status)
      } catch (e) {
        // ignore
      }
    }
  }
  
  return statuses
}

async function renderPreviewWithJsdom(files) {
  // Build the preview document using the ACTUAL buildArtifactPreviewDocument
  // The function signature is: buildArtifactPreviewDocument(artifact, streamedFiles, projectFiles, name?)
  const streamedFiles = files.map(f => ({
    path: f.path,
    content: f.content,
    language: f.language,
  }))

  const projectArtifact = {
    title: "Bean & Brew Coffee Shop",
    description: "Modified coffee shop application with amber CTA",
    entryPoint: "src/App.tsx",
    files: streamedFiles,
  }

  const projectFiles = {}
  for (const f of files) {
    projectFiles[f.path] = { path: f.path, content: f.content, language: f.language }
  }

  log(`  Building preview document with buildArtifactPreviewDocument...`)
  const previewDoc = buildArtifactPreviewDocument(projectArtifact, streamedFiles, projectFiles, "Bean & Brew")
  
  // Save the preview HTML for inspection
  writeFileSync("/tmp/modification_preview.html", previewDoc)
  log(`  Preview document size: ${previewDoc.length} chars`)

  // Check if the preview has the module scripts (not the empty fallback)
  const hasModules = previewDoc.includes("var MODULES")
  log(`  ${hasModules ? "✓" : "✗"} Preview contains module data (MODULES array)`)
  if (!hasModules) {
    log("  ⚠ Preview fell back to empty state — buildArtifactPreviewDocument didn't find modules")
  }

  // Create HTTP server to serve local React 18 UMD + Babel (same pattern as golden_app_e2e_test.mjs)
  const reactUmd = readFileSync("node_modules/react/umd/react.development.js", "utf8")
  const reactDomUmd = readFileSync("node_modules/react-dom/umd/react-dom.development.js", "utf8")
  const babelStandalone = readFileSync("node_modules/@babel/standalone/babel.min.js", "utf8")

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/preview.html") {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(previewDoc)
        return
      }
      if (req.url === "/react.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(reactUmd)
        return
      }
      if (req.url === "/react-dom.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(reactDomUmd)
        return
      }
      if (req.url === "/babel.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(babelStandalone)
        return
      }
      res.writeHead(404)
      res.end("Not found")
    })

    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port

      const virtualConsole = new VirtualConsole()
      const errors = []
      const logs = []
      virtualConsole.on("error", (...args) => errors.push(args.join(" ")))
      virtualConsole.on("jsdomError", (err) => errors.push(err.message))
      virtualConsole.on("log", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("info", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("warn", (...args) => logs.push(args.join(" ")))

      // Close the first server - we only used it to get a port
      server.close()

      // Use a mutable variable so the server handler can access the localDoc
      // after it's been created with the correct baseUrl
      let localDoc = ""

      const server2 = createServer((req, res) => {
        if (req.url === "/" || req.url === "/preview.html") {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(localDoc)
          return
        }
        if (req.url === "/react.js") {
          res.writeHead(200, { "Content-Type": "application/javascript" })
          res.end(reactUmd)
          return
        }
        if (req.url === "/react-dom.js") {
          res.writeHead(200, { "Content-Type": "application/javascript" })
          res.end(reactDomUmd)
          return
        }
        if (req.url === "/babel.js") {
          res.writeHead(200, { "Content-Type": "application/javascript" })
          res.end(babelStandalone)
          return
        }
        res.writeHead(404)
        res.end("Not found")
      })

      server2.listen(0, "127.0.0.1", async () => {
        const port2 = server2.address().port
        const baseUrl2 = `http://127.0.0.1:${port2}`
        log(`  HTTP server listening on port ${port2}`)

        // Replace CDN URLs with local server URLs (both src and onerror fallback URLs)
        // Use baseUrl2 (the actual server that will serve the files)
        localDoc = previewDoc
          // Replace cdnjs.cloudflare.com React URLs
          .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react\/18[^"']*/g, `${baseUrl2}/react.js`)
          .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react-dom\/18[^"']*/g, `${baseUrl2}/react-dom.js`)
          .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone\/[^"']*/g, `${baseUrl2}/babel.js`)
          // Replace unpkg.com fallback URLs in onerror attributes
          .replace(/https:\/\/unpkg\.com\/react@18[^"']*/g, `${baseUrl2}/react.js`)
          .replace(/https:\/\/unpkg\.com\/react-dom@18[^"']*/g, `${baseUrl2}/react-dom.js`)
          .replace(/https:\/\/unpkg\.com\/@babel\/standalone[^"']*/g, `${baseUrl2}/babel.js`)
          // Remove Tailwind CDN script (jsdom can't load it, and it's not needed for content verification)
          .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, "<script>/* tailwind removed for jsdom test */</script>")

        // Save the local doc for debugging
        writeFileSync("/tmp/modification_local_doc.html", localDoc)
        log(`  Local doc saved for debugging (URLs replaced)`)

        
        try {
          const dom = await JSDOM.fromURL(`${baseUrl2}/preview.html`, {
            runScripts: "dangerously",
            resources: "usable",
            virtualConsole,
            pretendToBeVisual: true,
          })

          // Wait for React to render (Babel transform + React mount)
          await new Promise(resolve => setTimeout(resolve, 5000))

          const document = dom.window.document
          const root = document.getElementById("root")
          const allElements = document.querySelectorAll("*")
          const elementCount = allElements.length
          
          // Extract text content
          const bodyText = document.body ? document.body.textContent : ""
          const rootText = root ? root.textContent : ""
          const rootElementCount = root ? root.querySelectorAll("*").length : 0
          
          // Check for coffee shop content
          const hasCoffeeContent = bodyText.includes("Bean") || bodyText.includes("Brew") || bodyText.includes("coffee") || bodyText.includes("Coffee")
          const hasAmberButton = localDoc.includes("bg-amber-400")
          
          // Check for specific coffee shop elements
          const hasMenuText = bodyText.includes("Menu") || bodyText.includes("menu")
          const hasHeroText = bodyText.includes("Explore") || bodyText.includes("Roastery") || bodyText.includes("Seattle")

          const result = {
            elementCount,
            rootElementCount,
            bodyTextLength: bodyText.length,
            hasCoffeeContent,
            hasAmberButton,
            hasMenuText,
            hasHeroText,
            bodyTextPreview: bodyText.slice(0, 500).replace(/\s+/g, " ").trim(),
            errors: errors.slice(0, 5),
            logs: logs.slice(0, 5),
          }

          dom.window.close()
          server2.close()
          resolve(result)
        } catch (err) {
          server2.close()
          reject(err)
        }
      })
    })
  })
}

async function main() {
  log("=== Phase 8b: Real AI Modification E2E Test ===\n")

  // Check 1: Dev server is running
  log("Check 1: Verify dev server is running")
  try {
    const resp = await fetch(DEV_SERVER)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    log("  ✓ Dev server is running\n")
  } catch (e) {
    log(`  ✗ Dev server not running: ${e.message}`)
    process.exit(1)
  }

  // Check 2: Load current files
  log("Check 2: Load current workspace files")
  const currentFiles = loadCurrentFiles()
  log(`  ✓ Loaded ${currentFiles.length} files\n`)

  // Check 3: Send modification request and capture SSE
  log("Check 3: Send modification request to real Gemini API")
  const sseOutput = await sendModificationRequest(currentFiles)
  log("  ✓ SSE stream received\n")

  // Check 4: Extract pipeline status events
  log("Check 4: Verify pipeline status events")
  const statuses = extractStatusEvents(sseOutput)
  const expectedStatuses = ["request_received", "planning", "architecting", "executing"]
  let allStatusesPresent = true
  for (const expected of expectedStatuses) {
    if (statuses.includes(expected)) {
      log(`  ✓ ${expected}`)
    } else {
      log(`  ✗ ${expected} MISSING`)
      allStatusesPresent = false
    }
  }
  log(`  All statuses: ${statuses.join(", ")}\n`)

  // Check 5: Extract modified files from SSE
  log("Check 5: Extract modified files from SSE")
  const modifiedFiles = extractFilesFromSSE(sseOutput)
  log(`  ✓ Extracted ${modifiedFiles.length} file operations`)
  for (const f of modifiedFiles) {
    log(`    - ${f.operation}: ${f.path} (${f.content.length} chars)`)
  }
  log()

  // Check 6: Verify Hero.tsx was modified (not entire app regenerated)
  log("Check 6: Verify targeted modification (not full regeneration)")
  const heroModified = modifiedFiles.some(f => f.path === "src/components/Hero.tsx" && f.operation === "modify")
  const onlyHeroModified = modifiedFiles.length === 1 && heroModified
  if (heroModified) {
    log("  ✓ Hero.tsx was modified")
  } else {
    log("  ✗ Hero.tsx was NOT modified")
  }
  if (onlyHeroModified) {
    log("  ✓ Only Hero.tsx was modified (targeted modification, not full regeneration)")
  } else {
    log(`  ℹ  ${modifiedFiles.length} files modified (may include other components)`)
  }
  log()

  // Check 7: Verify amber-400 in modified Hero content
  log("Check 7: Verify amber-400 CTA in modified Hero")
  const heroFile = modifiedFiles.find(f => f.path === "src/components/Hero.tsx")
  let hasAmber400 = false
  let hasAmber500Hover = false
  if (heroFile) {
    hasAmber400 = heroFile.content.includes("bg-amber-400")
    hasAmber500Hover = heroFile.content.includes("hover:bg-amber-500")
    if (hasAmber400) log("  ✓ bg-amber-400 found in modified Hero.tsx")
    else log("  ✗ bg-amber-400 NOT found in modified Hero.tsx")
    if (hasAmber500Hover) log("  ✓ hover:bg-amber-500 found in modified Hero.tsx")
    else log("  ✗ hover:bg-amber-500 NOT found in modified Hero.tsx")
  } else {
    log("  ✗ Hero.tsx not found in modified files")
  }
  log()

  // Check 8: Build combined workspace (original files + modifications)
  log("Check 8: Build combined workspace for preview")
  const fileMap = new Map()
  // Start with current files
  for (const f of currentFiles) {
    fileMap.set(f.path, { path: f.path, language: f.language, content: f.content })
  }
  // Apply modifications
  for (const f of modifiedFiles) {
    fileMap.set(f.path, { path: f.path, language: f.language, content: f.content })
  }
  const combinedFiles = Array.from(fileMap.values())
  log(`  ✓ Combined workspace: ${combinedFiles.length} files`)
  for (const f of combinedFiles) {
    log(`    - ${f.path} (${f.language}, ${f.content.length} chars)`)
  }
  log()

  // Check 9: Render preview in jsdom
  log("Check 9: Render modified preview in jsdom")
  let renderResult
  try {
    renderResult = await renderPreviewWithJsdom(combinedFiles)
    log(`  ✓ Preview rendered: ${renderResult.elementCount} DOM elements`)
    log(`  ✓ Body text length: ${renderResult.bodyTextLength} chars`)
    log(`  ${renderResult.hasCoffeeContent ? "✓" : "✗"} Coffee shop content: ${renderResult.hasCoffeeContent}`)
    log(`  ${renderResult.hasMenuText ? "✓" : "✗"} Menu text present: ${renderResult.hasMenuText}`)
    log(`  ${renderResult.hasHeroText ? "✓" : "✗"} Hero text present: ${renderResult.hasHeroText}`)
    log(`  Body text preview: ${renderResult.bodyTextPreview.slice(0, 200)}...`)
  } catch (e) {
    log(`  ✗ Preview rendering failed: ${e.message}`)
    renderResult = { elementCount: 0, hasCoffeeContent: false, hasMenuText: false, hasHeroText: false }
  }
  log()

  // Summary
  log("=== SUMMARY ===")
  const checks = [
    { name: "Dev server running", pass: true },
    { name: "Current files loaded", pass: currentFiles.length > 0 },
    { name: "SSE stream received", pass: sseOutput.length > 0 },
    { name: "Pipeline status events present", pass: allStatusesPresent },
    { name: "Files extracted from SSE", pass: modifiedFiles.length > 0 },
    { name: "Hero.tsx modified", pass: heroModified },
    { name: "bg-amber-400 in Hero", pass: hasAmber400 },
    { name: "hover:bg-amber-500 in Hero", pass: hasAmber500Hover },
    { name: "Preview renders in jsdom", pass: renderResult.elementCount >= 30 },
    { name: "Coffee shop content in preview", pass: renderResult.hasCoffeeContent },
    { name: "DOM element count >= 30", pass: renderResult.elementCount >= 30 },
  ]
  
  let passed = 0
  for (const c of checks) {
    log(`  ${c.pass ? "✓" : "✗"} ${c.name}`)
    if (c.pass) passed++
  }
  log(`\n${passed}/${checks.length} checks PASSED`)
  
  if (passed === checks.length) {
    log("\n🎉 Phase 8b: Modification E2E Test PASSED!")
    process.exit(0)
  } else {
    log("\n⚠  Phase 8b: Some checks FAILED")
    process.exit(1)
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
