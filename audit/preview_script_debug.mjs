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
const inlineScript = scriptMatch[0].replace(/<script>/, "").replace(/<\/script>/, "")

// Inject debug logging into the setInterval check
const debugScript = inlineScript.replace(
  "var checkInterval = setInterval(function() {",
  `var _dbg = { attempts: 0, babel: false, react: false, reactDom: false };
   window.__shangoDebug = _dbg;
   var checkInterval = setInterval(function() {
   _dbg.attempts++;
   _dbg.babel = typeof Babel !== "undefined";
   _dbg.react = typeof React !== "undefined";
   _dbg.reactDom = typeof ReactDOM !== "undefined";
   if (_dbg.attempts <= 5 || _dbg.attempts % 20 === 0) {
     console.log("[DEBUG] attempt=" + _dbg.attempts + " babel=" + _dbg.babel + " react=" + _dbg.react + " reactDom=" + _dbg.reactDom);
   }`
)

// Also add logging to bootPreview
const debugScript2 = debugScript.replace(
  "function bootPreview() {",
  `function bootPreview() {
   console.log("[DEBUG] bootPreview called!");`
).replace(
  "var exports = loadModule(entry);",
  `console.log("[DEBUG] loading entry module:", entry);
   var exports = loadModule(entry);
   console.log("[DEBUG] module loaded, exports keys:", Object.keys(exports));
   console.log("[DEBUG] default export type:", typeof exports.default);`
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

await new Promise(r => server.listen(9878, r))

const testHtml = `<!doctype html>
<html><head><title>Test</title></head>
<body>
<div id="root"><div id="shango-loading">Loading...</div></div>
<div id="shango-error-overlay" style="display:none"><pre id="shango-error-stack"></pre></div>
<script src="http://localhost:9878/react.js"></script>
<script src="http://localhost:9878/react-dom.js"></script>
<script src="http://localhost:9878/babel.js"></script>
${debugScript2}
</body></html>`

const errors = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => errors.push("[jsdomError] " + e.message))
vc.on("error", (...args) => errors.push("[error] " + args.map(String).join(" ")))
vc.on("log", (...args) => console.log(...args))
vc.on("warn", (...args) => console.log("[warn]", ...args))
vc.on("info", (...args) => console.log("[info]", ...args))

const dom = new JSDOM(testHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "http://localhost:9878/",
})

await new Promise(r => setTimeout(r, 6000))

console.log("\n=== Errors ===")
errors.forEach(e => console.log(e))

console.log("\n=== Debug state ===")
const dbg = dom.window.__shangoDebug
if (dbg) {
  console.log("Final attempts:", dbg.attempts)
  console.log("Babel loaded:", dbg.babel)
  console.log("React loaded:", dbg.react)
  console.log("ReactDOM loaded:", dbg.reactDom)
}

const root = dom.window.document.getElementById("root")
console.log("\nRoot innerHTML:", root?.innerHTML?.substring(0, 300))
console.log("Contains 'Hello':", root?.innerHTML?.includes("Hello"))

dom.window.close()
server.close()
