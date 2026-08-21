import { JSDOM, VirtualConsole } from "jsdom"
import { readFileSync } from "fs"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

// Simple single-file app
const sampleFiles = [
  {
    path: "src/App.tsx",
    content: `import React from 'react'

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#333' }}>Bean & Brew Coffee</h1>
      <p style={{ color: '#666' }}>Fresh coffee every morning</p>
      <button style={{ background: '#d97706', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
  html: "",
  css: "",
  js: "",
  files: [],
  createdAt: new Date().toISOString(),
}

const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])

// Load React 18 UMD, ReactDOM 18 UMD, Babel standalone
const reactCode = readFileSync(new URL("../node_modules/react/umd/react.development.js", import.meta.url), "utf-8")
const reactDomCode = readFileSync(new URL("../node_modules/react-dom/umd/react-dom.development.js", import.meta.url), "utf-8")
const babelCode = readFileSync(new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url), "utf-8")

// Replace CDN scripts with local versions
let modifiedHtml = html
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*"[^>]*><\/script>/g, "")
  .replace(/<script[^>]*src="https:\/\/unpkg[^"]*"[^>]*onerror[^>]*><\/script>/g, "")
  .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/g, "")

// Find the inline script start
const inlineStart = modifiedHtml.indexOf("    <script>\n      (function() {")
if (inlineStart === -1) {
  console.log("ERROR: Could not find inline script")
  process.exit(1)
}

// Inject local scripts BEFORE the inline preview script
modifiedHtml = modifiedHtml.slice(0, inlineStart) +
  `    <script>\n${reactCode}\n</script>\n` +
  `    <script>\n${reactDomCode}\n</script>\n` +
  `    <script>\n${babelCode}\n</script>\n` +
  modifiedHtml.slice(inlineStart)

console.log("HTML length:", modifiedHtml.length)

// Track all errors
const errors = []
const logs = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => {
  errors.push("[jsdomError] " + e.message + (e.stack ? "\n" + e.stack.substring(0, 300) : ""))
})
vc.on("error", (...args) => {
  errors.push("[console.error] " + args.map(String).join(" "))
})
vc.on("log", (...args) => {
  logs.push("[console.log] " + args.map(String).join(" "))
})
vc.on("warn", (...args) => {
  logs.push("[console.warn] " + args.map(String).join(" "))
})
vc.on("info", (...args) => {
  logs.push("[console.info] " + args.map(String).join(" "))
})

const dom = new JSDOM(modifiedHtml, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
})

// Wait for the interval-based boot (50ms * up to 80 attempts = 4s max)
await new Promise(r => setTimeout(r, 6000))

console.log("\n=== Errors captured ===")
errors.forEach(e => console.log(e))
console.log("\n=== Logs captured ===")
logs.forEach(l => console.log(l))

const root = dom.window.document.getElementById("root")
const loading = dom.window.document.getElementById("shango-loading")
const errorOverlay = dom.window.document.getElementById("shango-error-overlay")
const errorStack = dom.window.document.getElementById("shango-error-stack")

console.log("\n=== DOM State ===")
console.log("Root children:", root?.children?.length || 0)
console.log("Root innerHTML length:", root?.innerHTML?.length || 0)
console.log("Loading visible:", loading?.style?.display !== "none" ? "YES" : "NO")
console.log("Error overlay display:", errorOverlay ? dom.window.getComputedStyle(errorOverlay).display : "N/A")

if (errorStack?.textContent) {
  console.log("Error stack:", errorStack.textContent.substring(0, 500))
}

const rootContent = root?.innerHTML || ""
console.log("\n=== Rendered content ===")
console.log("Contains 'Bean':", rootContent.includes("Bean"))
console.log("Contains 'Order Now':", rootContent.includes("Order Now"))
console.log("Contains 'Fresh coffee':", rootContent.includes("Fresh coffee"))
console.log("Content preview:", rootContent.substring(0, 300))

// Check what React rendered
const allElements = root?.querySelectorAll("*") || []
console.log("Total rendered elements:", allElements.length)

dom.window.close()
