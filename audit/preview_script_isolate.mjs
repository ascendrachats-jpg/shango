import { JSDOM, VirtualConsole } from "jsdom"
import { readFileSync } from "fs"
import { createServer } from "http"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

const sampleFiles = [
  {
    path: "src/App.tsx",
    content: `import React from 'react'
export default function App() {
  return <div><h1>Hello</h1></div>
}`,
  },
]

const artifact = {
  title: "Test", description: "Test",
  html: "", css: "", js: "", files: [],
  createdAt: new Date().toISOString(),
}

const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])

// Extract the inline script content
const scriptMatch = html.match(/<script>\n\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n\s*<\/script>/)
if (!scriptMatch) {
  console.log("Could not find inline script")
  process.exit(1)
}

const inlineScript = scriptMatch[0]
  .replace(/<script>/, "")
  .replace(/<\/script>/, "")

console.log("Inline script length:", inlineScript.length)
console.log("First 200 chars:", inlineScript.substring(0, 200))
console.log("\n--- Looking for syntax issues ---")

// The issue might be with the MODULES JSON or the entry point JSON
// Let's check the MODULES variable
const modulesMatch = inlineScript.match(/var MODULES = (\[[\s\S]*?\]);/)
if (modulesMatch) {
  try {
    const parsed = JSON.parse(modulesMatch[1])
    console.log("MODULES parsed OK, count:", parsed.length)
    parsed.forEach(m => console.log("  path:", m.path, "content length:", m.content?.length))
  } catch (e) {
    console.log("MODULES JSON parse error:", e.message)
  }
}

// Check the entry point
const entryMatch = inlineScript.match(/var entry = (.*?);/)
if (entryMatch) {
  console.log("Entry point:", entryMatch[1])
}

// Now let's try running the inline script in a jsdom that already has React/ReactDOM/Babel
const reactCode = readFileSync(new URL("../node_modules/react/umd/react.development.js", import.meta.url), "utf-8")
const reactDomCode = readFileSync(new URL("../node_modules/react-dom/umd/react-dom.development.js", import.meta.url), "utf-8")
const babelCode = readFileSync(new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url), "utf-8")

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  const url = req.url || ""
  if (url === "/react.js") { res.setHeader("Content-Type", "application/javascript"); res.end(reactCode) }
  else if (url === "/react-dom.js") { res.setHeader("Content-Type", "application/javascript"); res.end(reactDomCode) }
  else if (url === "/babel.js") { res.setHeader("Content-Type", "application/javascript"); res.end(babelCode) }
  else { res.statusCode = 404; res.end() }
})

await new Promise(r => server.listen(9877, r))

// Build a minimal HTML with the scripts loaded from server, then the inline script
const testHtml = `<!doctype html>
<html><head><title>Test</title></head>
<body>
<div id="root">
  <div id="shango-loading">Loading...</div>
</div>
<div id="shango-error-overlay" style="display:none"><pre id="shango-error-stack"></pre></div>
<script src="http://localhost:9877/react.js"></script>
<script src="http://localhost:9877/react-dom.js"></script>
<script src="http://localhost:9877/babel.js"></script>
${inlineScript}
</body></html>`

const errors = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => errors.push("[jsdomError] " + e.message))
vc.on("error", (...args) => errors.push("[error] " + args.map(String).join(" ")))
vc.on("log", (...args) => console.log("[log]", ...args))
vc.on("warn", (...args) => console.log("[warn]", ...args))

const dom = new JSDOM(testHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "http://localhost:9877/",
})

await new Promise(r => setTimeout(r, 6000))

console.log("\n=== Errors ===")
errors.forEach(e => console.log(e))

const root = dom.window.document.getElementById("root")
console.log("\n=== Result ===")
console.log("Root innerHTML:", root?.innerHTML?.substring(0, 300))
console.log("Contains 'Hello':", root?.innerHTML?.includes("Hello"))

const errorOverlay = dom.window.document.getElementById("shango-error-overlay")
if (errorOverlay) {
  const display = dom.window.getComputedStyle(errorOverlay).display
  console.log("Error overlay display:", display)
  if (display === "block") {
    const stack = dom.window.document.getElementById("shango-error-stack")
    console.log("Error:", stack?.textContent?.substring(0, 500))
  }
}

dom.window.close()
server.close()
