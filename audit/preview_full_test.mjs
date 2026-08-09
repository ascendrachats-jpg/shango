import { JSDOM, VirtualConsole } from "jsdom"
import { readFileSync } from "fs"
import { createServer } from "http"
import { buildArtifactPreviewDocument } from "../src/lib/preview.ts"

// Multi-file coffee shop app with imports
const sampleFiles = [
  {
    path: "src/components/Header.tsx",
    content: `import React from 'react'
import { Coffee } from 'lucide-react'

export default function Header() {
  return (
    <header className="px-6 py-4 border-b border-stone-700">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Coffee /> Bean & Brew
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
  html: "", css: "", js: "", files: [],
  createdAt: new Date().toISOString(),
}

const html = buildArtifactPreviewDocument(artifact, sampleFiles, [])
const scriptMatch = html.match(/<script>\n\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n\s*<\/script>/)
const inlineScript = scriptMatch[0] // Keep script tags

// Load CDN replacement scripts
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

await new Promise(r => server.listen(9880, r))

// Replace CDN URLs
let modifiedHtml = html
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react\/18[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9880/react.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*react-dom\/18[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9880/react-dom.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*babel[^"]*"[^>]*><\/script>/, '<script src="http://localhost:9880/babel.js"></script>')
  .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/, "")

const errors = []
const logs = []
const vc = new VirtualConsole()
vc.on("jsdomError", (e) => errors.push("[jsdomError] " + e.message))
vc.on("error", (...args) => errors.push("[error] " + args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0, 200) : String(a)).join(" ")))
vc.on("log", (...args) => logs.push("[log] " + args.map(String).join(" ")))
vc.on("warn", (...args) => logs.push("[warn] " + args.map(String).join(" ")))

const dom = new JSDOM(modifiedHtml, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "http://localhost:9880/",
})

await new Promise(r => setTimeout(r, 8000))

console.log("=== Errors ===")
errors.forEach(e => console.log(e))
console.log("\n=== Logs ===")
logs.forEach(l => console.log(l))

const root = dom.window.document.getElementById("root")
const rootContent = root?.innerHTML || ""

console.log("\n=== Render Check ===")
console.log("Root innerHTML length:", rootContent.length)
console.log("Contains 'Bean & Brew':", rootContent.includes("Bean"))
console.log("Contains 'Fresh Coffee':", rootContent.includes("Fresh Coffee"))
console.log("Contains 'Order Now':", rootContent.includes("Order Now"))
console.log("Contains 'Our Menu':", rootContent.includes("Our Menu"))
console.log("Contains 'Espresso':", rootContent.includes("Espresso"))
console.log("Contains 'Latte':", rootContent.includes("Latte"))
console.log("Contains 'Cappuccino':", rootContent.includes("Cappuccino"))
console.log("Contains '(555) 123-4567':", rootContent.includes("(555)"))
console.log("Contains 'Header component':", rootContent.includes("header"))
console.log("Contains 'MenuSection items':", rootContent.includes("menu"))

// Count rendered elements
const allElements = root?.querySelectorAll("*") || []
console.log("\nTotal rendered elements:", allElements.length)

// Check loading state
const loading = dom.window.document.getElementById("shango-loading")
console.log("Loading still visible:", loading?.style?.display !== "none" && loading?.style?.display !== undefined)

dom.window.close()
server.close()
console.log("\n=== Test Complete ===")
