import { JSDOM, VirtualConsole } from "jsdom"
import { readFileSync } from "fs"
import { createServer } from "http"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

const sampleFiles = [
  {
    path: "src/App.tsx",
    content: `import React from 'react'
export default function App() {
  return <div><h1>Hello World</h1></div>
}`,
  },
]

const artifact = {
  title: "Test", description: "Test",
  html: "", css: "", js: "", files: [],
  createdAt: new Date().toISOString(),
}

const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])
const scriptMatch = html.match(/<script>\n\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n\s*<\/script>/)
let inlineScript = scriptMatch[0]
// Keep the <script> tags!
console.log("Script starts with:", inlineScript.substring(0, 30))
console.log("Script ends with:", inlineScript.substring(inlineScript.length - 30))

// Inject debug logging
inlineScript = inlineScript.replace(
  "var checkInterval = setInterval(function() {",
  `var _dbg = { attempts: 0 };
   window.__shangoDebug = _dbg;
   var checkInterval = setInterval(function() {
   _dbg.attempts++;
   if (_dbg.attempts <= 3 || _dbg.attempts % 20 === 0) {
     console.log("[DBG] a=" + _dbg.attempts + " B=" + (typeof Babel) + " R=" + (typeof React) + " RD=" + (typeof ReactDOM));
   }`
).replace(
  "function bootPreview() {",
  `function bootPreview() {
   console.log("[DBG] bootPreview!");`
).replace(
  "var exports = loadModule(entry);",
  `console.log("[DBG] loadModule:", entry);
   var exports = loadModule(entry);
   console.log("[DBG] loaded, default:", typeof exports.default);`
)

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

await new Promise(r => server.listen(9879, r))

const testHtml = `<!doctype html>
<html><head><title>Test</title></head>
<body>
<div id="root"><div id="shango-loading">Loading...</div></div>
<div id="shango-error-overlay" style="display:none"><pre id="shango-error-stack"></pre></div>
<script src="http://localhost:9879/react.js"></script>
<script src="http://localhost:9879/react-dom.js"></script>
<script src="http://localhost:9879/babel.js"></script>
${inlineScript}
</body></html>`

console.log("Test HTML length:", testHtml.length)
console.log("Contains script tag:", testHtml.includes("<script>"))

const errors = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => errors.push("[jsdomError] " + e.message))
vc.on("error", (...args) => errors.push("[error] " + args.map(String).join(" ")))
vc.on("log", (...args) => console.log(...args))
vc.on("warn", (...args) => console.log("[warn]", ...args))

const dom = new JSDOM(testHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "http://localhost:9879/",
})

await new Promise(r => setTimeout(r, 6000))

console.log("\n=== Errors ===")
errors.forEach(e => console.log(e))

console.log("\n=== Debug ===")
const dbg = dom.window.__shangoDebug
console.log("Debug object:", dbg)
if (dbg) console.log("Attempts:", dbg.attempts)

console.log("\n=== Globals ===")
console.log("React:", typeof dom.window.React)
console.log("ReactDOM:", typeof dom.window.ReactDOM)
console.log("Babel:", typeof dom.window.Babel)

const root = dom.window.document.getElementById("root")
console.log("\nRoot:", root?.innerHTML?.substring(0, 300))
console.log("Contains Hello:", root?.innerHTML?.includes("Hello"))

dom.window.close()
server.close()
