import { readFileSync } from "node:fs"
import { jsonrepair } from "jsonrepair"

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

const content = firstFileContent
console.log("Content length:", content.length)

try {
  const repaired = jsonrepair(content)
  console.log("jsonrepair SUCCEEDED! Repaired length:", repaired.length)
  
  const parsed = JSON.parse(repaired)
  console.log("JSON.parse of repaired SUCCEEDED!")
  console.log("Keys:", Object.keys(parsed))
  
  if (parsed.files) {
    console.log("Number of files:", parsed.files.length)
    for (const f of parsed.files) {
      console.log(`  - ${f.path} (${f.content.length} chars)`)
    }
    
    const aboutFile = parsed.files.find(f => f.path.toLowerCase().includes("about"))
    if (aboutFile) {
      console.log("\n✓ About component found:", aboutFile.path)
    }
    
    const appFile = parsed.files.find(f => f.path === "src/App.tsx")
    if (appFile) {
      console.log("✓ App.tsx found, has About import:", appFile.content.includes("About"))
    }
  }
} catch (e) {
  console.log("jsonrepair FAILED:", e.message)
}
