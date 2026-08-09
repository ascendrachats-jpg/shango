import { JSDOM, VirtualConsole } from "jsdom"
import { readFileSync } from "fs"
import { createServer } from "http"
import { extname } from "path"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

const sampleFiles = [
  {
    path: "src/App.tsx",
    content: `import React from 'react'

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#333' }}>Bean & Brew Coffee</h1>
      <p style={{ color: '#666' }}>Fresh coffee every morning</p>
      <button style={{ background: '#d97706', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
        Order Now
      </button>
    </div>
  )
}`,
  },
]

const artifact = {
  title: "Coffee Shop",
  description: "Coffee shop landing page",
  html: "", css: "", js: "", files: [],
  createdAt: new Date().toISOString(),
}

const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])

// Start a local HTTP server to serve the JS files
const reactCode = readFileSync(new URL("../node_modules/react/umd/react.development.js", import.meta.url), "utf-8")
const reactDomCode = readFileSync(new URL("../node_modules/react-dom/umd/react-dom.development.js", import.meta.url), "utf-8")
const babelCode = readFileSync(new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url), "utf-8")

const server = createServer((req, res) => {
  const url = req.url || "/"
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (url === "/react.js") {
    res.setHeader("Content-Type", "application/javascript")
    res.end(reactCode)
  } else if (url === "/react-dom.js") {
    res.setHeader("Content-Type", "application/javascript")
    res.end(reactDomCode)
  } else if (url === "/babel.js") {
    res.setHeader("Content-Type", "application/javascript")
    res.end(babelCode)
  } else {
    res.statusCode = 404
    res.end("Not found")
  }
})

await new Promise((resolve) => server.listen(9876, resolve))
console.log("Test server on :9876")

// Replace CDN URLs with local server URLs
let modifiedHtml = html
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react\/18[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9876/react.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react-dom\/18[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9876/react-dom.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*babel[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9876/babel.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/, "")

console.log("HTML length:", modifiedHtml.length)

const errors = []
const logs = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => {
  errors.push("[jsdomError] " + e.message + (e.detail ? "\n  detail: " + JSON.stringify(e.detail).substring(0, 200) : ""))
})
vc.on("error", (...args) => {
  errors.push("[console.error] " + args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0, 200) : String(a)).join(" "))
})
vc.on("log", (...args) => { logs.push("[log] " + args.map(String).join(" ")) })
vc.on("warn", (...args) => { logs.push("[warn] " + args.map(String).join(" ")) })
vc.on("info", (...args) => { logs.push("[info] " + args.map(String).join(" ")) })

const dom = new JSDOM(modifiedHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "http://localhost:9876/",
})

// Wait for scripts to load and boot (the preview checks every 50ms, up to 80 attempts = 4s)
await new Promise(r => setTimeout(r, 8000))

console.log("\n=== Errors ===")
errors.forEach(e => console.log(e))
console.log("\n=== Logs ===")
logs.forEach(l => console.log(l))

console.log("\n=== Globals ===")
console.log("React defined:", typeof dom.window.React)
console.log("ReactDOM defined:", typeof dom.window.ReactDOM)
console.log("Babel defined:", typeof dom.window.Babel)

const root = dom.window.document.getElementById("root")
const loading = dom.window.document.getElementById("shango-loading")
const errorOverlay = dom.window.document.getElementById("shango-error-overlay")
const errorStack = dom.window.document.getElementById("shango-error-stack")

console.log("\n=== DOM State ===")
console.log("Root innerHTML length:", root?.innerHTML?.length || 0)
console.log("Loading display:", loading?.style?.display)
if (errorOverlay) {
  console.log("Error overlay display:", dom.window.getComputedStyle(errorOverlay).display)
  if (errorStack?.textContent) {
    console.log("Error stack:", errorStack.textContent.substring(0, 800))
  }
}

const rootContent = root?.innerHTML || ""
console.log("\nContains 'Bean':", rootContent.includes("Bean"))
console.log("Contains 'Order Now':", rootContent.includes("Order Now"))
console.log("Content preview:", rootContent.substring(0, 500))

dom.window.close()
server.close()
