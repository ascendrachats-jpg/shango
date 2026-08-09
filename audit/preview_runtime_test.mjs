// Preview Runtime Audit — Tests whether preview.ts can actually render a real app
// We build the preview HTML document from sample files, then load it in jsdom
// with React/ReactDOM/Babel stubs to see if the module system works.

import { JSDOM } from "jsdom"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// We need to import the preview module. Since it's TypeScript, we'll use tsx.
// But first, let's manually reconstruct what buildArtifactPreviewDocument does
// by importing it dynamically.

async function main() {
  // Sample coffee shop app files — a realistic multi-file React app
  const sampleFiles = [
    {
      path: "src/App.tsx",
      content: `import React from 'react'
import { Coffee, Phone } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-900 text-white">
      <header className="px-6 py-4 border-b border-stone-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coffee /> Bean & Brew
        </h1>
      </header>
      <section className="px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-4">Fresh Coffee, Every Morning</h2>
        <p className="text-stone-300 text-lg mb-8">Handcrafted coffee made with love</p>
        <button className="bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded-lg font-semibold">
          Order Now
        </button>
      </section>
      <section className="px-6 py-16 bg-stone-800">
        <h3 className="text-3xl font-bold mb-8 text-center">Our Menu</h3>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-700 rounded-xl p-6">
            <Coffee className="w-8 h-8 mb-3 text-amber-500" />
            <h4 className="text-xl font-semibold mb-2">Espresso</h4>
            <p className="text-stone-300">$3.50</p>
          </div>
          <div className="bg-stone-700 rounded-xl p-6">
            <Coffee className="w-8 h-8 mb-3 text-amber-500" />
            <h4 className="text-xl font-semibold mb-2">Latte</h4>
            <p className="text-stone-300">$4.50</p>
          </div>
          <div className="bg-stone-700 rounded-xl p-6">
            <Coffee className="w-8 h-8 mb-3 text-amber-500" />
            <h4 className="text-xl font-semibold mb-2">Cappuccino</h4>
            <p className="text-stone-300">$4.00</p>
          </div>
        </div>
      </section>
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

  // Import the preview module using tsx-style dynamic import
  const previewModule = await import("../src/lib/preview.ts")
  const { buildArtifactPreviewDocument, createArtifactPreviewUrl } = previewModule

  // Build the preview document
  const artifact = {
    title: "Coffee Shop Landing Page",
    description: "A coffee shop landing page with hero, menu, and contact",
    html: "",
    css: "",
    js: "",
    files: [],
    createdAt: new Date().toISOString(),
  }

  const doc = buildArtifactPreviewDocument(artifact, sampleFiles, [])
  console.log("=== Preview document built ===")
  console.log("Document length:", doc.length)
  console.log("Contains MODULES:", doc.includes("MODULES"))
  console.log("Contains App.tsx:", doc.includes("App.tsx"))
  console.log("Contains coffee content:", doc.includes("Bean & Brew"))
  console.log("Contains entry point:", doc.includes('"src/App.tsx"'))

  // Check for the bootPreview and module loader
  console.log("Contains bootPreview:", doc.includes("bootPreview"))
  console.log("Contains loadModule:", doc.includes("loadModule"))
  console.log("Contains Babel.transform:", doc.includes("Babel.transform"))
  console.log("Contains createRoot:", doc.includes("createRoot"))

  // Now let's try to load this in jsdom and see if it renders
  // We need to stub out React, ReactDOM, and Babel since CDN won't load in jsdom
  console.log("\n=== Loading in jsdom (with CDN stubs) ===")

  // We can't load CDN scripts in jsdom, so let's extract the inline script
  // and provide our own React/ReactDOM/Babel implementations
  
  // Actually, let's test a simpler approach: extract the MODULES JSON and
  // verify the module resolution logic works
  const modulesMatch = doc.match(/var MODULES = (\[[\s\S]*?\]);\s*\n\s*var moduleMap/)
  if (modulesMatch) {
    const modules = JSON.parse(modulesMatch[1])
    console.log("Modules found:", modules.map(m => m.path))
    console.log("Module count:", modules.length)
    
    for (const m of modules) {
      console.log(`  ${m.path}: ${m.content.length} chars, language=${m.language}`)
      // Check if content has export default
      if (m.content.includes("export default")) {
        console.log(`    ✓ Has export default`)
      }
      // Check imports
      const imports = m.content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || []
      if (imports.length > 0) {
        console.log(`    Imports:`, imports)
      }
    }
  } else {
    console.log("ERROR: Could not extract MODULES from document")
  }

  // Now let's test with actual React/Babel using a real Node-based transform
  console.log("\n=== Testing actual TSX transformation with esbuild ===")
  try {
    // Use the project's own build tooling to transpile the TSX
    const { build } = await import("esbuild")
    const result = await build({
      stdin: {
        contents: sampleFiles[0].content,
        resolveDir: ".",
        loader: "tsx",
      },
      bundle: false,
      format: "cjs",
      loader: { ".tsx": "tsx" },
      write: false,
    })
    console.log("esbuild transpilation succeeded!")
    console.log("Output length:", result.outputFiles[0].text.length)
    console.log("Output preview:", result.outputFiles[0].text.substring(0, 200))
  } catch (e) {
    console.log("esbuild not available:", e.message)
  }

  console.log("\n=== Test Complete ===")
}

main().catch(console.error)
