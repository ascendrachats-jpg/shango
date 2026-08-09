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

// Extract the inline script content (without tags)
const scriptMatch = html.match(/<script>\n\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n\s*<\/script>/)
const scriptWithTag = scriptMatch[0]
const scriptContent = scriptWithTag.replace(/^<script>/, "").replace(/<\/script>$/, "").trim()

// Write it to a file so we can check it
import { writeFileSync } from "fs"
writeFileSync("audit/extracted_preview_script.js", scriptContent)
console.log("Script extracted, length:", scriptContent.length)

// Try to parse it with Node's vm module
import { Script } from "vm"
try {
  new Script(scriptContent)
  console.log("Node vm.parse: SUCCESS - no syntax errors")
} catch (e) {
  console.log("Node vm.parse: SYNTAX ERROR:", e.message)
  if (e.stack) {
    // Find the line number
    const lineMatch = e.stack.match(/:(\d+)/)
    if (lineMatch) {
      const lineNum = parseInt(lineMatch[1])
      const lines = scriptContent.split("\n")
      console.log("Error at line", lineNum)
      for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
        console.log(`  ${i + 1}: ${lines[i]}`)
      }
    }
  }
}

// Also try with acorn for better error messages
try {
  const acorn = await import("acorn")
  acorn.parse(scriptContent, { ecmaVersion: 2022 })
  console.log("Acorn parse: SUCCESS")
} catch (e) {
  console.log("Acorn parse: ERROR:", e.message)
  if (e.pos !== undefined) {
    const lines = scriptContent.substring(0, e.pos).split("\n")
    console.log("Error at line", lines.length, "column", lines[lines.length - 1].length + 1)
    console.log("Context:", scriptContent.substring(Math.max(0, e.pos - 50), e.pos + 50))
  }
}
