// Preview Runtime jsdom Test — Actually render the preview HTML in jsdom
// with real React/ReactDOM and a Babel polyfill to see if it boots.

import { JSDOM } from "jsdom"
import { readFileSync } from "fs"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

// Sample multi-file coffee shop app
const sampleFiles = [
  {
    path: "src/components/Header.tsx",
    content: `import React from 'react'
import { Coffee } from 'lucide-react'

export default function Header() {
  return (
    <header className="px-6 py-4 border-b border-stone-700">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Coffee /> Bean &amp; Brew
      </h1>
    </header>
  )
}`,
  },
  {
    path: "src/components/MenuSection.tsx",
    content: `import React from 'react'
import { Coffee } from 'lucide-react'

const menuItems = [
  { name: 'Espresso', price: '$3.50' },
  { name: 'Latte', price: '$4.50' },
  { name: 'Cappuccino', price: '$4.00' },
]

export default function MenuSection() {
  return (
    <section className="px-6 py-16 bg-stone-800">
      <h3 className="text-3xl font-bold mb-8 text-center">Our Menu</h3>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item, i) => (
          <div key={i} className="bg-stone-700 rounded-xl p-6">
            <Coffee className="w-8 h-8 mb-3 text-amber-500" />
            <h4 className="text-xl font-semibold mb-2">{item.name}</h4>
            <p className="text-stone-300">{item.price}</p>
          </div>
        ))}
      </div>
    </section>
  )
}`,
  },
  {
    path: "src/App.tsx",
    content: `import React from 'react'
import { Phone } from 'lucide-react'
import Header from './components/Header'
import MenuSection from './components/MenuSection'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-900 text-white">
      <Header />
      <section className="px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-4">Fresh Coffee, Every Morning</h2>
        <p className="text-stone-300 text-lg mb-8">Handcrafted coffee made with love</p>
        <button className="bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded-lg font-semibold">
          Order Now
        </button>
      </section>
      <MenuSection />
      <footer className="px-6 py-8 border-t border-stone-700 text-center">
        <p className="flex items-center justify-center gap-2 text-stone-400">
          <Phone /> (555) 123-4567
        </p>
      </footer>
    </div>
  )
}`,
  },
]

const artifact = {
  title: "Coffee Shop Landing Page",
  description: "A coffee shop landing page with hero, menu, and contact",
  html: "",
  css: "",
  js: "",
  files: [],
  createdAt: new Date().toISOString(),
}

// Build the preview document
const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])

// Now we need to replace the CDN script tags with local React/ReactDOM/Babel
// We'll use the project's installed React 19 and provide a Babel shim using esbuild

// Load React and ReactDOM from node_modules
const reactPath = new URL("../node_modules/react/umd/react.development.js", import.meta.url)
const reactDomPath = new URL("../node_modules/react-dom/umd/react-dom.development.js", import.meta.url)

const reactCode = readFileSync(reactPath, "utf-8")
const reactDomCode = readFileSync(reactDomPath, "utf-8")

// Create a Babel shim that uses esbuild for transformation
// The preview runtime calls Babel.transform(code, { presets, filename })
const babelShim = `
var Babel = {
  transform: function(code, options) {
    // We can't use esbuild in the browser, so we need a different approach.
    // For jsdom testing, we'll use a simple regex-based TSX-to-JS transformer.
    // This simulates what Babel would do.
    return { code: code };
  }
};
`

// Actually, we need real Babel transformation. Let's use @babel/standalone from npm
// But first check if it's available
let babelCode = ""
try {
  const babelPath = new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url)
  babelCode = readFileSync(babelPath, "utf-8")
  console.log("Loaded @babel/standalone from npm")
} catch {
  console.log("@babel/standalone not found, installing...")
}

if (!babelCode) {
  // Install it
  const { execSync } = await import("child_process")
  execSync("npm install --save-dev @babel/standalone", { cwd: process.cwd(), stdio: "pipe" })
  const babelPath = new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url)
  babelCode = readFileSync(babelPath, "utf-8")
  console.log("Installed and loaded @babel/standalone")
}

// Replace CDN script tags with our local versions
let modifiedHtml = html
  // Remove the CDN React scripts
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react[^"]*"[^>]*><\/script>/g, "")
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react-dom[^"]*"[^>]*><\/script>/g, "")
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*babel[^"]*"[^>]*><\/script>/g, "")
  .replace(/<script[^>]*src="https:\/\/unpkg[^"]*"[^>]*onerror[^>]*><\/script>/g, "")
  // Remove tailwind CDN (not needed for jsdom test)
  .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/g, "")

// Inject our local scripts before the inline script
const injectPoint = modifiedHtml.indexOf("(function() {")
modifiedHtml = modifiedHtml.slice(0, injectPoint) +
  `<script>\n${reactCode}\n</script>\n` +
  `<script>\n${reactDomCode}\n</script>\n` +
  `<script>\n${babelCode}\n</script>\n` +
  modifiedHtml.slice(injectPoint)

console.log("=== Setting up jsdom ===")
console.log("HTML length:", modifiedHtml.length)

// Create jsdom instance with script execution enabled
const dom = new JSDOM(modifiedHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: new (await import("jsdom")).VirtualConsole()
    .on("jsdomError", (e) => {
      console.log("[jsdom error]", e.message)
    })
    .on("error", (...args) => {
      console.log("[console.error]", ...args)
    })
    .on("log", (...args) => {
      console.log("[console.log]", ...args)
    })
    .on("warn", (...args) => {
      console.log("[console.warn]", ...args)
    }),
})

// Wait for scripts to execute
await new Promise(resolve => setTimeout(resolve, 3000))

const rootEl = dom.window.document.getElementById("root")
console.log("\n=== Results ===")
console.log("Root innerHTML length:", rootEl?.innerHTML?.length || 0)
console.log("Root has children:", rootEl?.children?.length || 0)

// Check for error overlay
const errorOverlay = dom.window.document.getElementById("shango-error-overlay")
if (errorOverlay) {
  const styleAttr = errorOverlay.getAttribute('style') || ''
  const computedDisplay = dom.window.getComputedStyle(errorOverlay).display
  console.log("Error overlay computed display:", computedDisplay)
  if (computedDisplay === 'block') {
    const stack = dom.window.document.getElementById("shango-error-stack")
    console.log("ERROR OVERLAY ACTIVE:", stack?.textContent?.substring(0, 500))
  }
}

// Check if React rendered anything
const rootContent = rootEl?.innerHTML || ""
console.log("\nRoot content preview:", rootContent.substring(0, 500))
console.log("\nContains 'Bean':", rootContent.includes("Bean"))
console.log("Contains 'Coffee':", rootContent.includes("Coffee"))
console.log("Contains 'Fresh Coffee':", rootContent.includes("Fresh Coffee"))
console.log("Contains 'Order Now':", rootContent.includes("Order Now"))
console.log("Contains 'Our Menu':", rootContent.includes("Our Menu"))
console.log("Contains 'Espresso':", rootContent.includes("Espresso"))
console.log("Contains '(555)':", rootContent.includes("(555)"))

// Check for runtime events (postMessage)
// We can't easily intercept postMessage in jsdom, but we can check the rendering

dom.window.close()
console.log("\n=== Test Complete ===")
