import { JSDOM, VirtualConsole, ResourceLoader } from "jsdom"
import { readFileSync } from "fs"
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

// Replace CDN URLs with local file:// URLs
const reactUrl = "file://" + new URL("../node_modules/react/umd/react.development.js", import.meta.url).pathname
const reactDomUrl = "file://" + new URL("../node_modules/react-dom/umd/react-dom.development.js", import.meta.url).pathname
const babelUrl = "file://" + new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url).pathname

let modifiedHtml = html
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react\/18[^"]*"[^>]*><\/script>/, `<script src="${reactUrl}"></script>`)
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react-dom\/18[^"]*"[^>]*><\/script>/, `<script src="${reactDomUrl}"></script>`)
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*babel[^"]*"[^>]*><\/script>/, `<script src="${babelUrl}"></script>`)
  .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/, "")

console.log("React URL:", reactUrl)
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
  resources: new ResourceLoader({
    // Allow loading local files
    strictSSL: false,
  }),
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "file:///",
})

// Wait for scripts to load and boot
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
    console.log("Error stack:", errorStack.textContent.substring(0, 500))
  }
}

const rootContent = root?.innerHTML || ""
console.log("\nContains 'Bean':", rootContent.includes("Bean"))
console.log("Contains 'Order Now':", rootContent.includes("Order Now"))
console.log("Content preview:", rootContent.substring(0, 300))

dom.window.close()
