/**
 * Phase 8b Diagnostic: Test the structuredParser against a REAL Gemini modification response.
 * 
 * This script:
 * 1. Calls invokeProviderAdapter with a modification request (using real extracted files as currentFiles)
 * 2. Captures the RAW Gemini response
 * 3. Runs parseProviderResponse on the raw response
 * 4. Reports whether files were extracted correctly or if the entire JSON was placed as a single file
 */

import { invokeProviderAdapter } from "../server/generationPipeline/providerAdapter.ts"
import { parseProviderResponse } from "../server/generationPipeline/structuredParser.ts"
import { normalizeParserResult } from "../server/generationPipeline/operationNormalizer.ts"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const EXTRACTED_DIR = "audit/real_gen_extracted"

// Load the 10 extracted files from the initial generation
function loadCurrentFiles() {
  const files = []
  const allFiles = readdirSync(EXTRACTED_DIR)
  // Recursively find all files
  function walk(dir, prefix = "") {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(fullPath, relPath)
      } else {
        const content = readFileSync(fullPath, "utf8")
        const ext = entry.name.split(".").pop()
        const language = ext === "tsx" ? "tsx" : ext === "ts" ? "typescript" : ext === "css" ? "css" : "text"
        files.push({ path: relPath, content, language })
      }
    }
  }
  walk(EXTRACTED_DIR)
  return files
}

async function main() {
  console.log("=== Phase 8b Parser Diagnostic Test ===\n")
  
  const currentFiles = loadCurrentFiles()
  console.log(`Loaded ${currentFiles.length} current files:`)
  for (const f of currentFiles) {
    console.log(`  - ${f.path} (${f.language}, ${f.content.length} chars)`)
  }
  console.log()

  // Build a modification request
  const request = {
    prompt: "Change the primary CTA button in the hero section ('Explore Our Menu') to be amber-400 colored instead of the gradient amber. Use bg-amber-400 and hover:bg-amber-500. Only modify the Hero component file.",
    activeFile: "src/components/Hero.tsx",
    mode: "build",
    fileContext: {
      files: currentFiles.map(f => ({
        path: f.path,
        language: f.language,
        content: f.content,
      })),
    },
    currentFiles: currentFiles.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language,
    })),
    workspaceContext: { appName: "Bean & Brew Coffee Shop" },
  }

  console.log("Calling invokeProviderAdapter (real Gemini API)...\n")
  
  let providerResult
  try {
    providerResult = await invokeProviderAdapter(request)
  } catch (err) {
    console.error("Provider call failed:", err.message)
    process.exit(1)
  }

  console.log(`Provider: ${providerResult.provider}`)
  console.log(`Raw response length: ${providerResult.rawResponse.length} chars`)
  console.log()

  // Save the raw response for inspection
  writeFileSync("/tmp/gemini_modification_raw_response.txt", providerResult.rawResponse)
  console.log("Raw response saved to /tmp/gemini_modification_raw_response.txt")
  console.log()

  // Show first 500 chars of raw response
  console.log("=== Raw response first 500 chars ===")
  console.log(providerResult.rawResponse.slice(0, 500))
  console.log("...\n")

  // Now run the parser
  console.log("=== Running parseProviderResponse ===")
  const parserResult = parseProviderResponse(providerResult.rawResponse)
  console.log(`Parser extracted ${parserResult.files.length} files:`)
  for (const f of parserResult.files) {
    console.log(`  - ${f.path} (${f.language}, ${f.content.length} chars)`)
    // Show first 200 chars of content
    console.log(`    content preview: ${f.content.slice(0, 200).replace(/\n/g, "\\n")}`)
  }
  console.log()

  // Check if the parser failed (only 1 file with JSON content)
  if (parserResult.files.length === 1 && parserResult.files[0].path === "src/App.tsx") {
    const content = parserResult.files[0].content
    if (content.trim().startsWith("{") && content.includes('"files"')) {
      console.log("⚠️  PARSER BUG DETECTED: The entire JSON response was placed as a single file content!")
      console.log("   The parser failed to extract the files array from the JSON response.")
      console.log()
      
      // Try to manually parse the JSON to see if it's valid
      try {
        const manualParsed = JSON.parse(content)
        console.log("   Manual JSON.parse succeeded!")
        console.log(`   Manual parse found ${manualParsed.files?.length || 0} files in the array`)
      } catch (e) {
        console.log("   Manual JSON.parse also failed:", e.message)
        console.log("   This means the Gemini response JSON itself is malformed.")
      }
    }
  }

  // Run the normalizer
  console.log("\n=== Running normalizeParserResult ===")
  const operations = normalizeParserResult(parserResult, currentFiles)
  console.log(`Normalizer produced ${operations.length} operations:`)
  for (const op of operations) {
    console.log(`  - ${op.operation}: ${op.path} (${op.language}, ${op.content.length} chars)`)
  }

  console.log("\n=== Diagnostic Complete ===")
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
