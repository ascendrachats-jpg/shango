import { readFileSync } from "node:fs"

// Directly test the tolerant parser functions
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

// Test what JSON.parse does
try {
  JSON.parse(firstFileContent)
  console.log("JSON.parse succeeded (unexpected)")
} catch (e) {
  console.log("JSON.parse failed:", e.message.slice(0, 80))
}

// Test what extractBalancedJson would do
// It tries to find balanced braces and then JSON.parse
const start = firstFileContent.indexOf("{")
let depth = 0
let inString = false
let escape = false
let balancedEnd = -1
for (let i = start; i < firstFileContent.length; i++) {
  const ch = firstFileContent[i]
  if (escape) { escape = false; continue }
  if (ch === "\\") { escape = true; continue }
  if (ch === '"') { inString = !inString; continue }
  if (inString) continue
  if (ch === "{") depth++
  else if (ch === "}") { depth--; if (depth === 0) { balancedEnd = i; break } }
}
console.log("Balanced brace end:", balancedEnd, "out of", firstFileContent.length)
if (balancedEnd > 0) {
  const candidate = firstFileContent.slice(start, balancedEnd + 1)
  console.log("Candidate length:", candidate.length)
  try {
    JSON.parse(candidate)
    console.log("Balanced JSON.parse succeeded")
  } catch (e) {
    console.log("Balanced JSON.parse failed:", e.message.slice(0, 80))
  }
}

// Now test the tolerant parser directly
// We need to import the internal functions, but they're not exported
// So let's copy the tolerant parser logic here and test it

function tolerantJsonParse(source) {
  try {
    const result = parseTolerantValue(source, 0)
    if (result && typeof result.value === "object" && !Array.isArray(result.value)) {
      return result.value
    }
  } catch (e) {
    console.log("tolerantJsonParse error:", e.message)
  }
  return null
}

function parseTolerantValue(source, start) {
  let pos = skipWhitespace(source, start)
  const ch = source[pos]
  if (ch === "{") return parseTolerantObject(source, pos)
  if (ch === "[") return parseTolerantArray(source, pos)
  if (ch === '"') return parseTolerantString(source, pos)
  if (ch === "t" || ch === "f") return parseTolerantBoolean(source, pos)
  if (ch === "n") return parseTolerantNull(source, pos)
  if (ch === "-" || (ch >= "0" && ch <= "9")) return parseTolerantNumber(source, pos)
  throw new Error(`Unexpected character "${ch}" at position ${pos}`)
}

function skipWhitespace(source, pos) {
  while (pos < source.length && /\s/.test(source[pos])) pos++
  return pos
}

function parseTolerantObject(source, start) {
  let pos = start + 1
  const obj = {}
  while (pos < source.length) {
    pos = skipWhitespace(source, pos)
    if (source[pos] === "}") return { value: obj, pos: pos + 1 }
    if (source[pos] === ",") { pos++; continue }
    if (source[pos] !== '"') throw new Error(`Expected key at position ${pos}`)
    const keyResult = parseTolerantString(source, pos)
    const key = keyResult.value
    pos = keyResult.pos
    pos = skipWhitespace(source, pos)
    if (source[pos] !== ":") throw new Error(`Expected ':' at position ${pos}`)
    pos++
    const valueResult = parseTolerantValue(source, pos)
    obj[key] = valueResult.value
    pos = valueResult.pos
  }
  throw new Error("Unterminated object")
}

function parseTolerantArray(source, start) {
  let pos = start + 1
  const arr = []
  while (pos < source.length) {
    pos = skipWhitespace(source, pos)
    if (source[pos] === "]") return { value: arr, pos: pos + 1 }
    if (source[pos] === ",") { pos++; continue }
    const valueResult = parseTolerantValue(source, pos)
    arr.push(valueResult.value)
    pos = valueResult.pos
  }
  throw new Error("Unterminated array")
}

function parseTolerantString(source, start) {
  let pos = start + 1
  let value = ""
  while (pos < source.length) {
    const ch = source[pos]
    if (ch === "\\") {
      const next = source[pos + 1]
      if (next === "n") value += "\n"
      else if (next === "r") value += "\r"
      else if (next === "t") value += "\t"
      else if (next === '"') value += '"'
      else if (next === "\\") value += "\\"
      else if (next === "/") value += "/"
      else if (next === "b") value += "\b"
      else if (next === "f") value += "\f"
      else if (next === "u") {
        const hex = source.slice(pos + 2, pos + 6)
        value += String.fromCharCode(parseInt(hex, 16))
        pos += 6
        continue
      } else value += next
      pos += 2
      continue
    }
    if (ch === '"') {
      let lookAhead = pos + 1
      while (lookAhead < source.length && /\s/.test(source[lookAhead])) lookAhead++
      if (source[lookAhead] === "," || source[lookAhead] === "}" || source[lookAhead] === "]") {
        return { value, pos: pos + 1 }
      }
      value += '"'
      pos++
      continue
    }
    value += ch
    pos++
  }
  throw new Error("Unterminated string")
}

function parseTolerantNumber(source, start) {
  let pos = start
  if (source[pos] === "-") pos++
  while (pos < source.length && /[0-9.eE+\-]/.test(source[pos])) pos++
  return { value: parseFloat(source.slice(start, pos)), pos }
}

function parseTolerantBoolean(source, start) {
  if (source.startsWith("true", start)) return { value: true, pos: start + 4 }
  if (source.startsWith("false", start)) return { value: false, pos: start + 5 }
  throw new Error(`Invalid boolean at position ${start}`)
}

function parseTolerantNull(source, start) {
  if (source.startsWith("null", start)) return { value: null, pos: start + 4 }
  throw new Error(`Invalid null at position ${start}`)
}

// Test directly
const result = tolerantJsonParse(firstFileContent)
if (result) {
  console.log("\nTolerant parser SUCCEEDED!")
  console.log("Keys:", Object.keys(result))
  if (result.files) {
    console.log("Files:", result.files.length)
    for (const f of result.files) {
      console.log(`  - ${f.path} (${f.content.length} chars)`)
    }
  }
} else {
  console.log("\nTolerant parser returned null")
}
