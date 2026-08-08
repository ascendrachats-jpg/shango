import { readdir, readFile } from "node:fs/promises"
import { gzipSync } from "node:zlib"
import { join } from "node:path"

const assetsDirectory = join(process.cwd(), "dist", "assets")
const budgets = [
  {
    label: "application entry",
    prefix: "index-",
    suffix: ".js",
    maxGzipBytes: 80 * 1024,
  },
  {
    label: "Builder route",
    prefix: "BuilderScreen-",
    suffix: ".js",
    maxGzipBytes: 50 * 1024,
  },
  {
    label: "Home route",
    prefix: "HomePage-",
    suffix: ".js",
    maxGzipBytes: 15 * 1024,
  },
  {
    label: "application styles",
    prefix: "index-",
    suffix: ".css",
    maxGzipBytes: 12 * 1024,
  },
]

const files = await readdir(assetsDirectory)
let failed = false

for (const budget of budgets) {
  const file = files.find(
    (name) => name.startsWith(budget.prefix) && name.endsWith(budget.suffix),
  )
  if (!file) {
    console.error(`Missing ${budget.label} bundle in ${assetsDirectory}`)
    failed = true
    continue
  }

  const gzipBytes = gzipSync(
    await readFile(join(assetsDirectory, file)),
  ).byteLength
  const withinBudget = gzipBytes <= budget.maxGzipBytes
  const size = `${(gzipBytes / 1024).toFixed(1)} KiB`
  const limit = `${(budget.maxGzipBytes / 1024).toFixed(0)} KiB`
  console.log(
    `${
      withinBudget ? "PASS" : "FAIL"
    } ${budget.label}: ${size} / ${limit} gzip`,
  )
  if (!withinBudget) failed = true
}

if (failed) process.exitCode = 1
