/**
 * Phase 8c: Real AI Addition E2E Test
 * 
 * Sends an addition request to the real /api/build endpoint with currentFiles,
 * asking to ADD an "About" section to the coffee shop app. Captures SSE output,
 * extracts modified/created files, builds preview, and renders in jsdom.
 * 
 * Verifies:
 * - Pipeline events present
 * - About section content added (either new file or modified existing file)
 * - Preview renders in jsdom with About section content
 * - DOM element count is reasonable (>= 30)
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createServer } from "node:http"
import { JSDOM, VirtualConsole } from "jsdom"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

const EXTRACTED_DIR = "audit/real_gen_extracted"
const DEV_SERVER = "http://localhost:8443"

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

async function sendAdditionRequest(currentFiles) {
  log("  Building addition request body...")
  
  const requestBody = {
    prompt: "Add an 'About Us' section to the coffee shop app between the Hero and Menu sections. It should include the story of Bean & Brew, our mission, and some statistics (years in business, cups served, etc). Create a new About.tsx component and integrate it into App.tsx.",
    activeFile: "src/App.tsx",
    mode: "build",
    currentFiles: currentFiles.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language,
    })),
    workspaceContext: { appName: "Bean & Brew Coffee Shop" },
  }

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
  
  writeFileSync("/tmp/addition_e2e_output.txt", fullOutput)
  log(`  SSE output captured: ${fullOutput.length} bytes`)
  return fullOutput
}

function extractFilesFromSSE(sseOutput) {
  const files = []
  const lines = sseOutput.split("\n")
  let currentEvent = null
  
  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith("data: ") && currentEvent === "file") {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.file) {
          files.push({
            path: data.file.path,
            operation: data.file.operation,
            language: data.file.language,
            content: data.file.content,
          })
        }
      } catch (e) {}
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
      } catch (e) {}
    }
  }
  return statuses
}

async function renderPreviewWithJsdom(files) {
  const streamedFiles = files.map(f => ({
    path: f.path,
    content: f.content,
    language: f.language,
  }))

  const projectArtifact = {
    title: "Bean & Brew Coffee Shop",
    description: "Coffee shop with About section added",
    entryPoint: "src/App.tsx",
    files: streamedFiles,
  }

  const projectFiles = {}
  for (const f of files) {
    projectFiles[f.path] = { path: f.path, content: f.content, language: f.language }
  }

  log(`  Building preview document with buildArtifactPreviewDocument...`)
  const previewDoc = buildArtifactPreviewDocument(projectArtifact, streamedFiles, projectFiles, "Bean & Brew")
  writeFileSync("/tmp/addition_preview.html", previewDoc)
  log(`  Preview document size: ${previewDoc.length} chars`)

  const hasModules = previewDoc.includes("var MODULES")
  log(`  ${hasModules ? "✓" : "✗"} Preview contains module data (MODULES array)`)

  const reactUmd = readFileSync("node_modules/react/umd/react.development.js", "utf8")
  const reactDomUmd = readFileSync("node_modules/react-dom/umd/react-dom.development.js", "utf8")
  const babelStandalone = readFileSync("node_modules/@babel/standalone/babel.min.js", "utf8")

  let localDoc = ""

  const server = createServer((req, res) => {
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

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port
      const baseUrl = `http://127.0.0.1:${port}`
      log(`  HTTP server listening on port ${port}`)

      localDoc = previewDoc
        .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react\/18[^"']*/g, `${baseUrl}/react.js`)
        .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react-dom\/18[^"']*/g, `${baseUrl}/react-dom.js`)
        .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone\/[^"']*/g, `${baseUrl}/babel.js`)
        .replace(/https:\/\/unpkg\.com\/react@18[^"']*/g, `${baseUrl}/react.js`)
        .replace(/https:\/\/unpkg\.com\/react-dom@18[^"']*/g, `${baseUrl}/react-dom.js`)
        .replace(/https:\/\/unpkg\.com\/@babel\/standalone[^"']*/g, `${baseUrl}/babel.js`)
        .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, "<script>/* tailwind removed */</script>")

      writeFileSync("/tmp/addition_local_doc.html", localDoc)

      const virtualConsole = new VirtualConsole()
      const errors = []
      const logs = []
      virtualConsole.on("error", (...args) => errors.push(args.join(" ")))
      virtualConsole.on("jsdomError", (err) => errors.push(err.message))
      virtualConsole.on("log", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("info", (...args) => logs.push(args.join(" ")))
      virtualConsole.on("warn", (...args) => logs.push(args.join(" ")))

      try {
        const dom = await JSDOM.fromURL(`${baseUrl}/preview.html`, {
          runScripts: "dangerously",
          resources: "usable",
          virtualConsole,
          pretendToBeVisual: true,
        })

        await new Promise(resolve => setTimeout(resolve, 5000))

        const document = dom.window.document
        const root = document.getElementById("root")
        const allElements = document.querySelectorAll("*")
        const elementCount = allElements.length
        const bodyText = document.body ? document.body.textContent : ""
        
        // Check for About section content
        const hasAboutText = bodyText.toLowerCase().includes("about") || bodyText.includes("Our Story") || bodyText.includes("our story") || bodyText.includes("mission")
        const hasCoffeeContent = bodyText.includes("Bean") || bodyText.includes("Brew") || bodyText.includes("coffee") || bodyText.includes("Coffee")
        const hasStats = bodyText.includes("years") || bodyText.includes("cups") || bodyText.includes("served") || bodyText.includes("Years") || bodyText.includes("Cups")

        const result = {
          elementCount,
          bodyTextLength: bodyText.length,
          hasAboutText,
          hasCoffeeContent,
          hasStats,
          bodyTextPreview: bodyText.slice(0, 500).replace(/\s+/g, " ").trim(),
          errors: errors.slice(0, 5),
        }

        dom.window.close()
        server.close()
        resolve(result)
      } catch (err) {
        server.close()
        reject(err)
      }
    })
  })
}

async function main() {
  log("=== Phase 8c: Real AI Addition E2E Test ===\n")

  log("Check 1: Verify dev server is running")
  try {
    const resp = await fetch(DEV_SERVER)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    log("  ✓ Dev server is running\n")
  } catch (e) {
    log(`  ✗ Dev server not running: ${e.message}`)
    process.exit(1)
  }

  log("Check 2: Load current workspace files")
  const currentFiles = loadCurrentFiles()
  log(`  ✓ Loaded ${currentFiles.length} files\n`)

  log("Check 3: Send addition request to real Gemini API")
  const sseOutput = await sendAdditionRequest(currentFiles)
  log("  ✓ SSE stream received\n")

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
  const hasValidationPassed = statuses.includes("validation_passed") || statuses.includes("repair_completed")
  const hasBuildCompleted = statuses.includes("build_completed")
  log(`  ${hasValidationPassed ? "✓" : "✗"} validation_passed or repair_completed`)
  log(`  ${hasBuildCompleted ? "✓" : "✗"} build_completed`)
  log(`  All statuses: ${statuses.join(", ")}\n`)

  log("Check 5: Extract file operations from SSE")
  const fileOps = extractFilesFromSSE(sseOutput)
  log(`  ✓ Extracted ${fileOps.length} file operations`)
  for (const f of fileOps) {
    log(`    - ${f.operation}: ${f.path} (${f.content.length} chars)`)
  }
  log()

  log("Check 6: Verify About section addition")
  const aboutFileCreated = fileOps.some(f => f.path.toLowerCase().includes("about") && f.operation === "create")
  const aboutFileModified = fileOps.some(f => f.path.toLowerCase().includes("about") && f.operation === "modify")
  const appModified = fileOps.some(f => f.path === "src/App.tsx" && f.operation === "modify")
  
  // Check if any file contains About content
  let aboutContentFound = false
  for (const f of fileOps) {
    if (f.content.toLowerCase().includes("about") || f.content.includes("Our Story") || f.content.includes("mission")) {
      aboutContentFound = true
      log(`  ✓ About-related content found in ${f.path}`)
      break
    }
  }
  if (!aboutContentFound) {
    log("  ⚠ No About-related content found in modified files")
  }
  if (aboutFileCreated) log("  ✓ New About component file was created")
  if (aboutFileModified) log("  ✓ About component file was modified")
  if (appModified) log("  ✓ App.tsx was modified (likely to include About section)")
  log()

  log("Check 7: Build combined workspace for preview")
  const fileMap = new Map()
  for (const f of currentFiles) {
    fileMap.set(f.path, { path: f.path, language: f.language, content: f.content })
  }
  for (const f of fileOps) {
    fileMap.set(f.path, { path: f.path, language: f.language, content: f.content })
  }
  const combinedFiles = Array.from(fileMap.values())
  log(`  ✓ Combined workspace: ${combinedFiles.length} files\n`)

  log("Check 8: Render updated preview in jsdom")
  let renderResult
  try {
    renderResult = await renderPreviewWithJsdom(combinedFiles)
    log(`  ✓ Preview rendered: ${renderResult.elementCount} DOM elements`)
    log(`  ✓ Body text length: ${renderResult.bodyTextLength} chars`)
    log(`  ${renderResult.hasCoffeeContent ? "✓" : "✗"} Coffee shop content: ${renderResult.hasCoffeeContent}`)
    log(`  ${renderResult.hasAboutText ? "✓" : "✗"} About section content: ${renderResult.hasAboutText}`)
    log(`  ${renderResult.hasStats ? "✓" : "✗"} Statistics content: ${renderResult.hasStats}`)
    log(`  Body text preview: ${renderResult.bodyTextPreview.slice(0, 300)}...`)
    if (renderResult.errors.length > 0) {
      log(`  Console errors: ${renderResult.errors.slice(0, 3).join("; ")}`)
    }
  } catch (e) {
    log(`  ✗ Preview rendering failed: ${e.message}`)
    renderResult = { elementCount: 0, hasCoffeeContent: false, hasAboutText: false, hasStats: false }
  }
  log()

  log("=== SUMMARY ===")
  const checks = [
    { name: "Dev server running", pass: true },
    { name: "Current files loaded", pass: currentFiles.length > 0 },
    { name: "SSE stream received", pass: sseOutput.length > 0 },
    { name: "Pipeline status events present", pass: allStatusesPresent },
    { name: "Validation/build completed", pass: hasValidationPassed && hasBuildCompleted },
    { name: "File operations extracted", pass: fileOps.length > 0 },
    { name: "About content in files", pass: aboutContentFound },
    { name: "Preview renders in jsdom", pass: renderResult.elementCount >= 30 },
    { name: "Coffee shop content in preview", pass: renderResult.hasCoffeeContent },
    { name: "About section in preview", pass: renderResult.hasAboutText },
    { name: "DOM element count >= 30", pass: renderResult.elementCount >= 30 },
  ]
  
  let passed = 0
  for (const c of checks) {
    log(`  ${c.pass ? "✓" : "✗"} ${c.name}`)
    if (c.pass) passed++
  }
  log(`\n${passed}/${checks.length} checks PASSED`)
  
  if (passed === checks.length) {
    log("\n🎉 Phase 8c: Addition E2E Test PASSED!")
    process.exit(0)
  } else {
    log("\n⚠  Phase 8c: Some checks FAILED")
    process.exit(1)
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
