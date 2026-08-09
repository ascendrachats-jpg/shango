import { JSDOM } from "jsdom"
import { readFileSync } from "fs"

// Load Babel in a jsdom context
const babelCode = readFileSync(new URL("../node_modules/@babel/standalone/babel.min.js", import.meta.url), "utf-8")

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
  runScripts: "dangerously",
})

// Inject Babel
const script = dom.window.document.createElement("script")
script.textContent = babelCode
dom.window.document.body.appendChild(script)

const Babel = dom.window.Babel
console.log("Babel loaded:", typeof Babel)
console.log("Babel.transform:", typeof Babel?.transform)

const testCode = `import React from 'react'
import { Coffee } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-900">
      <h1>Hello World</h1>
      <Coffee size={24} />
    </div>
  )
}`

console.log("\n=== Test 1: react + typescript + env (as in preview.ts) ===")
try {
  const result1 = Babel.transform(testCode, {
    presets: ["react", "typescript", ["env", { modules: "commonjs" }]],
    filename: "src/App.tsx",
  })
  console.log("SUCCESS! Output length:", result1.code.length)
  console.log("First 200 chars:", result1.code.substring(0, 200))
} catch (e) {
  console.log("FAILED:", e.message)
  console.log("Stack:", e.stack?.substring(0, 500))
}

console.log("\n=== Test 2: typescript + react (no env) ===")
try {
  const result2 = Babel.transform(testCode, {
    presets: ["typescript", "react"],
    filename: "src/App.tsx",
  })
  console.log("SUCCESS! Output length:", result2.code.length)
  console.log("First 200 chars:", result2.code.substring(0, 200))
} catch (e) {
  console.log("FAILED:", e.message)
}

console.log("\n=== Test 3: env + react + typescript ===")
try {
  const result3 = Babel.transform(testCode, {
    presets: [["env", { modules: "commonjs" }], "react", "typescript"],
    filename: "src/App.tsx",
  })
  console.log("SUCCESS! Output length:", result3.code.length)
  console.log("First 200 chars:", result3.code.substring(0, 200))
} catch (e) {
  console.log("FAILED:", e.message)
}

console.log("\n=== Available presets ===")
console.log("Available presets:", Object.keys(Babel.availablePresets || {}))

dom.window.close()
