/**
 * Test the tolerant JSON parser against the real malformed Gemini response
 * from Phase 8c. The response had:
 * - 69 raw newlines inside JSON string values
 * - Unescaped double quotes inside string values (JSX attributes)
 * Standard JSON.parse fails; the tolerant parser should succeed.
 */
import { readFileSync } from "node:fs"
import { parseProviderResponse } from "../server/generationPipeline/structuredParser.ts"

const sse = readFileSync("/tmp/addition_e2e_output.txt", "utf8")
const lines = sse.split("\n")
let currentEvent = null
let firstFileContent = null

for (const line of lines) {
  if (line.startsWith("event: ")) {
    currentEvent = line.slice(7).trim()
  } else if (line.startsWith("data: ") && currentEvent === "file") {
    try {
      const data = JSON.parse(line.slice(6))
      if (data.file && !firstFileContent) {
        firstFileContent = data.file.content
        break
      }
    } catch (e) {}
  }
}

if (!firstFileContent) {
  console.log("✗ Could not extract file content from SSE")
  process.exit(1)
}

console.log(`Input: ${firstFileContent.length} chars of malformed JSON\n`)

// Try standard JSON.parse first
try {
  JSON.parse(firstFileContent)
  console.log("✗ Standard JSON.parse should have failed but succeeded")
} catch (e) {
  console.log(`✓ Standard JSON.parse fails as expected: ${e.message.slice(0, 80)}`)
}

// Now try the structured parser (which includes the tolerant fallback)
const result = parseProviderResponse(firstFileContent)

console.log(`\nParser result:`)
console.log(`  Title: ${result.title || "(none)"}`)
console.log(`  Intent: ${result.intent?.slice(0, 80) || "(none)"}`)
console.log(`  Files: ${result.files.length}`)

for (const f of result.files) {
  console.log(`    - ${f.path} (${f.language}) — ${f.content.length} chars`)
}

// Verify About.tsx was extracted
const aboutFile = result.files.find(f => f.path.toLowerCase().includes("about"))
if (aboutFile) {
  console.log(`\n✓ About component extracted: ${aboutFile.path}`)
  console.log(`  Content starts: ${aboutFile.content.slice(0, 100)}`)
} else {
  console.log(`\n✗ About component NOT found in parsed files`)
}

// Verify App.tsx was properly extracted (not the entire JSON blob)
const appFile = result.files.find(f => f.path === "src/App.tsx")
if (appFile) {
  const isRealTsx = appFile.content.includes("import React") || appFile.content.includes("export default")
  const hasAboutImport = appFile.content.includes("About")
  console.log(`\n✓ App.tsx extracted (${appFile.content.length} chars)`)
  console.log(`  Is real TSX: ${isRealTsx}`)
  console.log(`  Has About import: ${hasAboutImport}`)
  if (!isRealTsx) {
    console.log(`  ✗ App.tsx content is NOT valid TSX!`)
    console.log(`  First 200 chars: ${appFile.content.slice(0, 200)}`)
  }
} else {
  console.log(`\n✗ App.tsx NOT found`)
}

// Summary
const allValid = result.files.every(f => 
  f.content.length < 20000 && // not the entire JSON blob
  (f.content.includes("import") || f.content.includes("export") || f.content.includes("const") || f.path.endsWith(".ts"))
)

console.log(`\n=== SUMMARY ===`)
console.log(`Files extracted: ${result.files.length}`)
console.log(`About.tsx present: ${!!aboutFile}`)
console.log(`App.tsx is real TSX: ${appFile ? (appFile.content.includes("import React") || appFile.content.includes("export default")) : false}`)
console.log(`All files are valid code (not JSON blobs): ${allValid}`)

if (result.files.length >= 10 && aboutFile && appFile && allValid) {
  console.log(`\n🎉 Tolerant parser PASSES! All files correctly extracted from malformed JSON.`)
  process.exit(0)
} else {
  console.log(`\n⚠ Tolerant parser has issues.`)
  process.exit(1)
}
