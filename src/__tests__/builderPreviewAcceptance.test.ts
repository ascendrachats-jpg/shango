/**
 * Builder → Generation → Workspace → Preview — End-to-End Acceptance Test
 *
 * This test exercises the REAL pipeline using realistic Gemini structured
 * JSON output (the same shape the model actually returns). It verifies the
 * fundamental contract:
 *
 *   prompt → generation (structured parse) → file operations →
 *   workspace merge → artifact derivation → preview document →
 *   iframe HTML contains the exact generated TSX modules
 *
 * No mocks of the pipeline itself. We only stub `URL.createObjectURL` (a
 * browser API unavailable in jsdom) and `fetch` (to avoid real network calls).
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  applyGenerationResultToProject,
  restoreVersion,
} from "../lib/versioning"
import { createArtifactPreviewUrl, buildArtifactPreviewDocument } from "../lib/preview"
import { parseProviderResponse } from "../../server/generationPipeline/structuredParser"
import { normalizeParserResult } from "../../server/generationPipeline/operationNormalizer"
import { validateWorkspace } from "../../server/generationPipeline/validator"
import type { Project, ProjectArtifact } from "../lib/store"
import type { GenerationResult } from "../lib/generation"

// ── Helpers ──────────────────────────────────────────────────────────────

function makeEmptyProject(id = "proj-coffee"): Project {
  return {
    id,
    name: "Coffee Shop",
    description: "A coffee shop landing page",
    status: "DRAFT",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    messages: [],
    versions: [],
    files: [],
    blocks: [],
  } as unknown as Project
}

/**
 * Realistic Gemini structured JSON response — the exact shape the
 * GODMODE_SYSTEM_PROMPT instructs the model to produce.
 */
function makeGeminiStructuredResponse(prompt: string): string {
  const files = [
    {
      path: "src/App.tsx",
      language: "tsx",
      content: `import React from 'react'
import { Coffee, Heart } from 'lucide-react'
import { Hero } from './components/Hero'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      <Hero />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
          <Coffee className="text-amber-700" /> ${prompt.slice(0, 30)}
        </h1>
        <p className="text-lg text-stone-600">
          Freshly roasted coffee, brewed with passion.
        </p>
      </main>
      <Footer />
    </div>
  )
}`,
    },
    {
      path: "src/components/Hero.tsx",
      language: "tsx",
      content: `import React from 'react'

export function Hero() {
  return (
    <section className="bg-amber-900 text-amber-50 py-20 text-center">
      <h2 className="text-5xl font-extrabold">Welcome to our Coffee Shop</h2>
      <p className="mt-4 text-xl">Premium beans, roasted daily</p>
    </section>
  )
}`,
    },
    {
      path: "src/components/Footer.tsx",
      language: "tsx",
      content: `import React from 'react'

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 py-8 text-center">
      <p>&copy; 2026 Coffee Shop. Made with care.</p>
    </footer>
  )
}`,
    },
    {
      path: "src/styles.css",
      language: "css",
      content: `@import "tailwindcss";
body { margin: 0; font-family: Inter, system-ui, sans-serif; }`,
    },
    {
      path: "index.html",
      language: "html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Coffee Shop</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    },
  ]

  return JSON.stringify({
    intent: "new_product",
    plan: "Build a coffee shop landing page with Hero, main content, and Footer components.",
    files,
    summary: "Created a multi-file React + Tailwind coffee shop landing page.",
  })
}

/**
 * Simulates the full server-side pipeline producing the SSE done payload,
 * then the client-side generateProjectResponse parsing it into a
 * GenerationResult.
 */
function simulateFullGeneration(
  project: Project,
  prompt: string,
): { result: GenerationResult; serverValidation: ReturnType<typeof validateWorkspace> } {
  // 1. Server-side: model returns structured JSON
  const rawResponse = makeGeminiStructuredResponse(prompt)

  // 2. Server-side: parse the structured response
  const parserResult = parseProviderResponse(rawResponse)

  // 3. Server-side: normalize to file operations
  const currentFiles = (project.files ?? []).map((f) => ({
    path: f.path,
    content: f.content,
    language: f.language,
  }))
  const fileOperations = normalizeParserResult(parserResult, currentFiles)

  // 4. Server-side: build workspace and validate
  const workspaceFiles = fileOperations.map((op) => ({
    path: op.path,
    content: op.content ?? "",
    language: op.language ?? "text",
  }))
  const serverValidation = validateWorkspace(workspaceFiles)

  // 5. Server-side: build the SSE done payload (as routes.ts does)
  const donePayload = {
    response: rawResponse,
    provider: "gemini",
    provenance: {
      id: "build-test-1",
      timestamp: new Date().toISOString(),
      provider: "gemini",
      model: "gemini-3.6-flash",
      mode: "build",
      prompt,
      operations: fileOperations.map((op) => ({ path: op.path, operation: op.operation })),
    },
    build: {
      files: fileOperations,
      entryPoint: parserResult.files[0]?.path,
    },
  }

  // 6. Client-side: the file SSE events would have been emitted during
  //    streaming. Build fileChanges from the same operations.
  const fileChanges = fileOperations.map((op) => ({
    path: op.path,
    operation: op.operation as "create" | "modify" | "delete",
    content: op.content,
    language: op.language,
  }))

  // 7. Client-side: extract artifact from the done payload's response text.
  //    This mirrors what generateProjectResponse does: it takes the raw
  //    responseText and runs extractArtifactPayload on it. For a structured
  //    JSON response, the artifact.files will be populated.
  //    We simulate the key parts of buildArtifactFromStructuredBuild since
  //    that's what processes the parsed JSON body's build.files.
  const parsedBody = donePayload
  const artifactFiles = (parsedBody.build.files ?? []).map((f) => ({
    path: f.path,
    language: (f.language ?? "text") as ProjectArtifact["files"] extends Array<infer U> ? U extends { language: infer L } ? L : never : never,
    content: f.content ?? "",
  }))

  const artifact: ProjectArtifact = {
    html: "",
    css: "",
    js: parserResult.files.find((f) => f.path === "src/App.tsx")?.content ?? "",
    title: "Coffee Shop",
    description: "A coffee shop landing page",
    createdAt: new Date().toISOString(),
    files: artifactFiles as ProjectArtifact["files"],
  }

  const result: GenerationResult = {
    assistant: "Created a multi-file React + Tailwind coffee shop landing page.",
    raw: rawResponse,
    provider: "gemini",
    usedFallback: false,
    artifact,
    fileChanges,
    provenance: donePayload.provenance as any,
  }

  return { result, serverValidation }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Builder → Preview end-to-end acceptance", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL: vi.fn((blob: Blob) => {
        // Return a fake blob URL but capture the content for inspection
        return `blob:fake-${blob.size}`
      }),
      revokeObjectURL: vi.fn(),
    })
  })

  it("Test 1: First build — prompt → generated files → workspace → preview contains real TSX", () => {
    const project = makeEmptyProject()
    const prompt = "Build a coffee shop landing page"

    const { result, serverValidation } = simulateFullGeneration(project, prompt)

    // Server-side validation must pass (real files, real import checking)
    expect(serverValidation.valid).toBe(true)

    // The generation result must carry the files
    expect(result.fileChanges?.length).toBeGreaterThanOrEqual(3)
    expect(result.artifact?.files?.length).toBeGreaterThanOrEqual(3)

    // Apply the generation result to the project (the commit step)
    const now = new Date().toISOString()
    const updatedProject = applyGenerationResultToProject(
      project,
      prompt,
      result,
      now,
      { addVersion: true, mode: "build" },
    )

    expect(updatedProject).not.toBeNull()
    expect(updatedProject!.files!.length).toBeGreaterThanOrEqual(3)

    // The workspace must contain src/App.tsx
    const appTsx = updatedProject!.files!.find((f) => f.path === "src/App.tsx")
    expect(appTsx).toBeDefined()
    expect(appTsx!.content).toContain("export default function App")
    expect(appTsx!.content).toContain("Coffee")

    // The workspace must contain the component files
    const hero = updatedProject!.files!.find((f) => f.path === "src/components/Hero.tsx")
    expect(hero).toBeDefined()
    expect(hero!.content).toContain("Welcome to our Coffee Shop")

    // ── THE CRITICAL PREVIEW CONTRACT ──
    // Build the preview document from the updated project's files + artifact.
    // This is exactly what PreviewPanel's ArtifactPreview does.
    const previewDoc = buildArtifactPreviewDocument(
      updatedProject!.artifact,
      [], // streamedFiles — NOT passed in BuilderScreen
      updatedProject!.files,
    )

    // The preview MUST embed the real generated modules
    expect(previewDoc).toContain("MODULES")
    expect(previewDoc).toContain("src/App.tsx")
    expect(previewDoc).toContain("src/components/Hero.tsx")
    expect(previewDoc).toContain("src/components/Footer.tsx")
    expect(previewDoc).toContain("export default function App")
    expect(previewDoc).toContain("Welcome to our Coffee Shop")
    expect(previewDoc).toContain("Made with care")

    // The preview must load the real Babel runtime (not a fake)
    expect(previewDoc).toContain("babel-standalone")
    expect(previewDoc).toContain("bootPreview")
    expect(previewDoc).toContain("loadModule")

    // The preview must NOT show the "Start building" empty placeholder
    expect(previewDoc).not.toContain("Start building")
    expect(previewDoc).not.toContain("Your generated app will appear here")
  })

  it("Test 2: Visual change iteration — modifies existing app, preserves other files", () => {
    // Start from the coffee shop project (simulate after first build)
    const project = makeEmptyProject()
    const firstResult = simulateFullGeneration(project, "Build a coffee shop landing page")
    const projectV1 = applyGenerationResultToProject(
      project,
      "Build a coffee shop landing page",
      firstResult.result,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // Now iterate: change the button to amber
    const iterationResponse = JSON.stringify({
      intent: "visual_change",
      plan: "Change the hero CTA to amber.",
      files: [
        {
          path: "src/components/Hero.tsx",
          language: "tsx",
          content: `import React from 'react'

export function Hero() {
  return (
    <section className="bg-amber-900 text-amber-50 py-20 text-center">
      <h2 className="text-5xl font-extrabold">Welcome to our Coffee Shop</h2>
      <p className="mt-4 text-xl">Premium beans, roasted daily</p>
      <button className="mt-6 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold">
        Order Now
      </button>
    </section>
  )
}`,
        },
      ],
      summary: "Changed hero CTA button to amber.",
    })

    const parserResult = parseProviderResponse(iterationResponse)
    const currentFiles = (projectV1.files ?? []).map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }))
    const fileOps = normalizeParserResult(parserResult, currentFiles)

    const iterationArtifact: ProjectArtifact = {
      ...firstResult.result.artifact,
      files: fileOps.map((op) => ({
        path: op.path,
        language: op.language as any,
        content: op.content ?? "",
      })),
      createdAt: new Date().toISOString(),
    }

    const iterationResult: GenerationResult = {
      assistant: "Changed hero CTA button to amber.",
      raw: iterationResponse,
      provider: "gemini",
      usedFallback: false,
      artifact: iterationArtifact,
      fileChanges: fileOps.map((op) => ({
        path: op.path,
        operation: op.operation as any,
        content: op.content,
        language: op.language,
      })),
    }

    const projectV2 = applyGenerationResultToProject(
      projectV1,
      "Change the hero CTA button to amber",
      iterationResult,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // The Hero must be updated
    const heroV2 = projectV2.files!.find((f) => f.path === "src/components/Hero.tsx")
    expect(heroV2!.content).toContain("Order Now")
    expect(heroV2!.content).toContain("bg-amber-500")

    // App.tsx and Footer.tsx must be PRESERVED (not reset)
    const appV2 = projectV2.files!.find((f) => f.path === "src/App.tsx")
    expect(appV2).toBeDefined()
    expect(appV2!.content).toContain("export default function App")

    const footerV2 = projectV2.files!.find((f) => f.path === "src/components/Footer.tsx")
    expect(footerV2).toBeDefined()
    expect(footerV2!.content).toContain("Made with care")

    // A new version must have been created
    expect(projectV2.versions.length).toBe(2)

    // Preview must reflect the updated Hero
    const previewDoc = buildArtifactPreviewDocument(
      projectV2.artifact,
      [],
      projectV2.files,
    )
    expect(previewDoc).toContain("Order Now")
    expect(previewDoc).toContain("bg-amber-500")
    // And still contain the preserved files
    expect(previewDoc).toContain("export default function App")
  })

  it("Test 3: Feature addition — adds testimonials without resetting workspace", () => {
    const project = makeEmptyProject()
    const firstResult = simulateFullGeneration(project, "Build a coffee shop")
    const projectV1 = applyGenerationResultToProject(
      project,
      "Build a coffee shop",
      firstResult.result,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // Add a testimonials component
    const featureResponse = JSON.stringify({
      intent: "feature_request",
      plan: "Add a testimonials section.",
      files: [
        {
          path: "src/components/Testimonials.tsx",
          language: "tsx",
          content: `import React from 'react'

export function Testimonials() {
  return (
    <section className="py-12 bg-stone-100">
      <h3 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h3>
      <div className="max-w-2xl mx-auto px-6">
        <blockquote className="text-lg italic text-stone-700">
          "Best coffee in town!" — Sarah
        </blockquote>
      </div>
    </section>
  )
}`,
        },
        {
          path: "src/App.tsx",
          language: "tsx",
          content: `import React from 'react'
import { Coffee } from 'lucide-react'
import { Hero } from './components/Hero'
import { Footer } from './components/Footer'
import { Testimonials } from './components/Testimonials'

export default function App() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      <Hero />
      <Testimonials />
      <Footer />
    </div>
  )
}`,
        },
      ],
      summary: "Added testimonials section.",
    })

    const parserResult = parseProviderResponse(featureResponse)
    const currentFiles = (projectV1.files ?? []).map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }))
    const fileOps = normalizeParserResult(parserResult, currentFiles)

    const featureArtifact: ProjectArtifact = {
      ...firstResult.result.artifact,
      files: fileOps.map((op) => ({
        path: op.path,
        language: op.language as any,
        content: op.content ?? "",
      })),
      createdAt: new Date().toISOString(),
    }

    const featureResult: GenerationResult = {
      assistant: "Added testimonials section.",
      raw: featureResponse,
      provider: "gemini",
      usedFallback: false,
      artifact: featureArtifact,
      fileChanges: fileOps.map((op) => ({
        path: op.path,
        operation: op.operation as any,
        content: op.content,
        language: op.language,
      })),
    }

    const projectV2 = applyGenerationResultToProject(
      projectV1,
      "Add a testimonials section",
      featureResult,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // Testimonials must be added
    const testimonials = projectV2.files!.find((f) => f.path === "src/components/Testimonials.tsx")
    expect(testimonials).toBeDefined()
    expect(testimonials!.content).toContain("What Our Customers Say")

    // App.tsx must import Testimonials
    const appV2 = projectV2.files!.find((f) => f.path === "src/App.tsx")
    expect(appV2!.content).toContain("Testimonials")

    // Hero and Footer preserved
    expect(projectV2.files!.find((f) => f.path === "src/components/Hero.tsx")).toBeDefined()
    expect(projectV2.files!.find((f) => f.path === "src/components/Footer.tsx")).toBeDefined()

    // Preview must show the new component
    const previewDoc = buildArtifactPreviewDocument(projectV2.artifact, [], projectV2.files)
    expect(previewDoc).toContain("What Our Customers Say")
    expect(previewDoc).toContain("Testimonials")
  })

  it("Test 4: Undo — restore previous version reverts the workspace", () => {
    const project = makeEmptyProject()
    const firstResult = simulateFullGeneration(project, "Build a coffee shop")
    const projectV1 = applyGenerationResultToProject(
      project,
      "Build a coffee shop",
      firstResult.result,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // V2: add testimonials
    const v2Response = JSON.stringify({
      intent: "feature_request",
      files: [
        {
          path: "src/components/Testimonials.tsx",
          language: "tsx",
          content: `import React from 'react'\nexport function Testimonials() { return <section>Testimonials here</section> }`,
        },
      ],
      summary: "Added testimonials.",
    })
    const v2Parser = parseProviderResponse(v2Response)
    const v2Ops = normalizeParserResult(
      v2Parser,
      (projectV1.files ?? []).map((f) => ({ path: f.path, content: f.content, language: f.language })),
    )
    const v2Result: GenerationResult = {
      assistant: "Added testimonials.",
      raw: v2Response,
      provider: "gemini",
      usedFallback: false,
      artifact: {
        ...firstResult.result.artifact,
        files: v2Ops.map((op) => ({ path: op.path, language: op.language as any, content: op.content ?? "" })),
      },
      fileChanges: v2Ops.map((op) => ({ path: op.path, operation: op.operation as any, content: op.content, language: op.language })),
    }
    const projectV2 = applyGenerationResultToProject(
      projectV1,
      "Add testimonials",
      v2Result,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    expect(projectV2.files!.find((f) => f.path === "src/components/Testimonials.tsx")).toBeDefined()

    // Undo: restore V1
    const v1Version = projectV2.versions.find((v) => v.number === 1)!
    const restored = restoreVersion(projectV2, v1Version.id)

    expect(restored).not.toBeNull()
    // Testimonials should be gone after restore
    expect(restored!.files!.find((f) => f.path === "src/components/Testimonials.tsx")).toBeUndefined()
    // Original files preserved
    expect(restored!.files!.find((f) => f.path === "src/App.tsx")).toBeDefined()
  })

  it("Test 5: Preview embeds modules from project.files when streamedFiles is empty", () => {
    // This tests the EXACT scenario in BuilderScreen: PreviewPanel receives
    // project but NOT streamedFiles. The preview must still work from
    // project.files (post-commitGeneration).
    const project = makeEmptyProject()
    const { result } = simulateFullGeneration(project, "Build a coffee shop")
    const updated = applyGenerationResultToProject(
      project,
      "Build a coffee shop",
      result,
      new Date().toISOString(),
      { addVersion: true, mode: "build" },
    )!

    // Simulate PreviewPanel: createArtifactPreviewUrl with empty streamedFiles
    const url = createArtifactPreviewUrl(
      updated.artifact,
      updated.name,
      [], // streamedFiles NOT passed (as in BuilderScreen line 1996)
      updated.files,
    )

    expect(url).toMatch(/^blob:/)
  })

  it("Test 6: Long conversation — 5 iterations preserve and accumulate workspace", () => {
    let project = makeEmptyProject()
    const prompts = [
      "Build a coffee shop landing page",
      "Add a menu section",
      "Change the color scheme to blue",
      "Add a contact form",
      "Add an about section",
    ]

    const addedPaths = new Set<string>(["src/App.tsx", "src/components/Hero.tsx", "src/components/Footer.tsx"])

    for (const prompt of prompts) {
      // Each iteration adds/updates a component
      const componentName = prompt.includes("menu") ? "Menu"
        : prompt.includes("contact") ? "ContactForm"
        : prompt.includes("about") ? "About"
        : null

      const isInitialBuild = project.versions.length === 0 && !componentName
      const files = isInitialBuild
        ? [
            {
              path: "src/App.tsx",
              language: "tsx",
              content: `import React from 'react'\nimport { Hero } from './components/Hero'\nimport { Footer } from './components/Footer'\nexport default function App() { return <div><Hero /><Footer /></div> }`,
            },
            {
              path: "src/components/Hero.tsx",
              language: "tsx",
              content: `import React from 'react'\nexport function Hero() { return <section className="bg-amber-900">Hero</section> }`,
            },
            {
              path: "src/components/Footer.tsx",
              language: "tsx",
              content: `import React from 'react'\nexport function Footer() { return <footer>Made with care</footer> }`,
            },
          ]
        : componentName
        ? [
            {
              path: `src/components/${componentName}.tsx`,
              language: "tsx",
              content: `import React from 'react'\nexport function ${componentName}() { return <section>${componentName} section</section> }`,
            },
            {
              path: "src/App.tsx",
              language: "tsx",
              content: `import React from 'react'\nimport { Hero } from './components/Hero'\nimport { Footer } from './components/Footer'\n${String(componentName) !== "Hero" && String(componentName) !== "Footer" ? `import { ${componentName} } from './components/${componentName}'\n` : ""}export default function App() { return <div><Hero />${componentName && String(componentName) !== "Hero" ? `<${componentName} />` : ""}<Footer /></div> }`,
            },
          ]
        : [
            {
              path: "src/components/Hero.tsx",
              language: "tsx",
              content: `import React from 'react'\nexport function Hero() { return <section className="${prompt.includes("blue") ? "bg-blue-900" : "bg-amber-900"}">Hero</section> }`,
            },
          ]

      const response = JSON.stringify({
        intent: "feature_request",
        files,
        summary: prompt,
      })
      const parserResult = parseProviderResponse(response)
      const currentFiles = (project.files ?? []).map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language,
      }))
      const fileOps = normalizeParserResult(parserResult, currentFiles)

      if (componentName) addedPaths.add(`src/components/${componentName}.tsx`)

      const result: GenerationResult = {
        assistant: prompt,
        raw: response,
        provider: "gemini",
        usedFallback: false,
        artifact: {
          html: "",
          css: "",
          js: "",
          title: "Coffee Shop",
          description: "",
          createdAt: new Date().toISOString(),
          files: fileOps.map((op) => ({ path: op.path, language: op.language as any, content: op.content ?? "" })),
        },
        fileChanges: fileOps.map((op) => ({
          path: op.path,
          operation: op.operation as any,
          content: op.content,
          language: op.language,
        })),
      }

      project = applyGenerationResultToProject(
        project,
        prompt,
        result,
        new Date().toISOString(),
        { addVersion: true, mode: "build" },
      )!
    }

    // After 5 iterations, versions should accumulate
    expect(project.versions.length).toBe(5)

    // All accumulated components should still be present
    for (const path of addedPaths) {
      expect(project.files!.find((f) => f.path === path), `Expected ${path} to be present`).toBeDefined()
    }

    // Preview must embed all modules
    const previewDoc = buildArtifactPreviewDocument(project.artifact, [], project.files)
    for (const path of addedPaths) {
      if (path.endsWith(".tsx")) {
        expect(previewDoc, `Expected preview to contain ${path}`).toContain(path)
      }
    }
  })
})
