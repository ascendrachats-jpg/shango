import { it, expect } from "vitest"
import {
  createVersionFromGeneration,
  restoreVersion,
  applyGenerationResultToProject,
  forkProjectFromVersion,
  forkProjectFromCurrentVersion,
  mergeVersionActionProject,
  applyVersionAction,
} from "../lib/versioning"
import { createGeneratedArtifact } from "../lib/generatedArtifact"
import {
  Project,
  ProjectArtifact,
  type ProjectArtifactFile,
  type ProjectVersion,
} from "../lib/store"
import { buildWorkspaceFile } from "../lib/workspace"

function makeEmptyProject(): Project {
  const now = new Date().toISOString()
  return {
    id: "test-proj",
    name: "Test",
    description: "",
    status: "DRAFT",
    lastEdited: now,
    updatedAt: now,
    createdAt: now,
    starred: false,
    blocks: [],
    messages: [],
    versions: [],
  }
}

it("derives a deterministic file set for a generated artifact", () => {
  const artifact = createGeneratedArtifact(
    "Build a landing page",
    "hello world",
  )
  const files = artifact.files ?? []

  expect(files.map((file) => file.path)).toEqual([
    "index.html",
    "src/App.tsx",
    "src/styles.css",
  ])
  expect(files[0]?.content).toContain("<!doctype html>")
  expect(files[1]?.content).toContain("export default function App")
  // When artifact.css is empty, the builder defaults to a Tailwind import
  expect(files[2]?.content).toContain("tailwindcss")
})

it("bootstraps Project.files from a generated artifact when no workspace exists", () => {
  const p = makeEmptyProject()
  const art: ProjectArtifact = {
    html: "<main>Demo</main>",
    css: "body{}",
    js: "",
    title: "Demo",
    description: "Demo desc",
    createdAt: new Date().toISOString(),
  }
  const result = {
    assistant: "Built the demo",
    raw: "Built the demo",
    provider: "test-provider",
    usedFallback: false,
    artifact: art,
  }

  const next = applyGenerationResultToProject(
    p,
    "build me",
    result,
    "2026-07-28T00:00:00.000Z",
    { addVersion: true },
  )

  expect(next).not.toBeNull()
  expect(next!.files?.map((file) => file.path)).toEqual([
    "index.html",
    "src/App.tsx",
    "src/styles.css",
  ])
  expect(next!.files?.[0]?.content).toContain("<!doctype html>")
})

it("derives artifact from Project.files after generation", () => {
  const now = new Date().toISOString()
  const workspaceFiles = [
    buildWorkspaceFile(
      "index.html",
      "<!doctype html><html><body><main>Workspace-backed content</main></body></html>",
      "html",
      now,
    ),
    buildWorkspaceFile(
      "src/App.tsx",
      "export default function App() { return <main>Workspace-backed content</main> }",
      "tsx",
      now,
    ),
    buildWorkspaceFile("src/styles.css", "body { color: red; }", "css", now),
  ]
  const project: Project = {
    ...makeEmptyProject(),
    files: workspaceFiles,
  }
  const result = {
    assistant: "Built the demo",
    raw: "Built the demo",
    provider: "test-provider",
    usedFallback: false,
    artifact: {
      html: "<main>Generated artifact content</main>",
      css: "body { color: blue; }",
      js: "",
      title: "Generated title",
      description: "Generated description",
      createdAt: now,
    },
  }

  const next = applyGenerationResultToProject(
    project,
    "build me",
    result,
    now,
    { addVersion: true },
  )

  expect(next).not.toBeNull()
  expect(next!.artifact?.html).toContain("Workspace-backed content")
  expect(next!.artifact?.css).toContain("red")
})

it("merges generated files into an existing workspace instead of replacing it", () => {
  const now = new Date().toISOString()
  const workspaceFiles = [
    buildWorkspaceFile(
      "index.html",
      "<!doctype html><html><body><main>Existing shell</main></body></html>",
      "html",
      now,
    ),
    buildWorkspaceFile(
      "src/App.tsx",
      "export default function App() { return <main>Existing shell</main> }",
      "tsx",
      now,
    ),
    buildWorkspaceFile("src/styles.css", "body { color: red; }", "css", now),
  ]
  const project: Project = {
    ...makeEmptyProject(),
    files: workspaceFiles,
  }
  const result = {
    assistant: "Updated the workspace",
    raw: "Updated the workspace",
    provider: "test-provider",
    usedFallback: false,
    artifact: {
      html: "<main>Generated artifact content</main>",
      css: "body { color: blue; }",
      js: "",
      title: "Updated workspace",
      description: "Updated workspace description",
      createdAt: now,
      files: [
        {
          path: "index.html",
          content:
            "<!doctype html><html><body><main>Updated shell</main></body></html>",
          language: "html" as ProjectArtifactFile["language"],
        },
        {
          path: "src/components/Widget.tsx",
          content: "export default function Widget() { return <div /> }",
          language: "tsx" as ProjectArtifactFile["language"],
        },
      ],
    },
  }

  const next = applyGenerationResultToProject(
    project,
    "update workspace",
    result,
    now,
    { addVersion: true },
  )

  expect(next).not.toBeNull()
  expect(
    next!.files?.find((file) => file.path === "index.html")?.content,
  ).toContain("Updated shell")
  expect(
    next!.files?.find((file) => file.path === "src/components/Widget.tsx")
      ?.content,
  ).toContain("Widget")
  expect(
    next!.files?.find((file) => file.path === "src/styles.css")?.content,
  ).toContain("red")
})

it("detects deleted files and preserves unrelated files during workspace merge", () => {
  const now = new Date().toISOString()
  const workspaceFiles = [
    buildWorkspaceFile(
      "index.html",
      "<!doctype html><html><body><main>Existing shell</main></body></html>",
      "html",
      now,
    ),
    buildWorkspaceFile(
      "src/App.tsx",
      "export default function App() { return <main>Existing shell</main> }",
      "tsx",
      now,
    ),
    buildWorkspaceFile("src/styles.css", "body { color: red; }", "css", now),
  ]
  const project: Project = {
    ...makeEmptyProject(),
    files: workspaceFiles,
  }
  const result = {
    assistant: "Pruned the styles file",
    raw: "Pruned the styles file",
    provider: "test-provider",
    usedFallback: false,
    artifact: {
      html: "<main>Updated shell</main>",
      css: "body { color: blue; }",
      js: "",
      title: "Updated workspace",
      description: "Updated workspace description",
      createdAt: now,
      files: [
        {
          path: "index.html",
          content:
            "<!doctype html><html><body><main>Updated shell</main></body></html>",
          language: "html" as ProjectArtifactFile["language"],
          operation: "modify",
        },
        {
          path: "src/styles.css",
          content: "",
          language: "css" as ProjectArtifactFile["language"],
          operation: "delete",
        },
      ],
    },
  }

  const next = applyGenerationResultToProject(
    project,
    "prune styles",
    result,
    now,
    { addVersion: true },
  )

  expect(next).not.toBeNull()
  expect(
    next!.files?.find((file) => file.path === "src/styles.css"),
  ).toBeUndefined()
  expect(
    next!.files?.find((file) => file.path === "src/App.tsx")?.content,
  ).toContain("Existing shell")
  expect(
    next!.files?.find((file) => file.path === "index.html")?.content,
  ).toContain("Updated shell")
})

it("applies explicit file diff operations from generation results to the workspace", () => {
  const now = new Date().toISOString()
  const workspaceFiles = [
    buildWorkspaceFile(
      "index.html",
      "<!doctype html><html><body><main>Existing shell</main></body></html>",
      "html",
      now,
    ),
    buildWorkspaceFile(
      "src/App.tsx",
      "export default function App() { return <main>Existing shell</main> }",
      "tsx",
      now,
    ),
    buildWorkspaceFile("src/styles.css", "body { color: red; }", "css", now),
  ]
  const project: Project = {
    ...makeEmptyProject(),
    files: workspaceFiles,
  }

  const next = applyGenerationResultToProject(
    project,
    "add dark mode",
    {
      assistant: "Updated the workspace for dark mode.",
      raw: "Updated the workspace for dark mode.",
      provider: "test-provider",
      usedFallback: false,
      artifact: {
        html: "<main>Dark mode ready</main>",
        css: ":root { color-scheme: dark; }",
        js: "",
        title: "Dark mode",
        description: "Dark mode ready",
        createdAt: now,
      },
      fileChanges: [
        {
          path: "src/styles.css",
          operation: "modify",
          content: ":root { color-scheme: dark; }",
          language: "css",
        },
        {
          path: "src/components/Button.tsx",
          operation: "create",
          content: "export default function Button() { return <button /> }",
          language: "tsx",
        },
        { path: "src/unused.ts", operation: "delete" },
      ],
    },
    now,
    { addVersion: false },
  )

  expect(next).not.toBeNull()
  expect(
    next!.files?.find((file) => file.path === "src/styles.css")?.content,
  ).toContain("color-scheme: dark")
  expect(
    next!.files?.find((file) => file.path === "src/components/Button.tsx")
      ?.content,
  ).toContain("button")
  expect(
    next!.files?.find((file) => file.path === "src/unused.ts"),
  ).toBeUndefined()
  expect(
    next!.files?.find((file) => file.path === "src/App.tsx")?.content,
  ).toContain("Existing shell")
})

it("creates first version on successful generation", () => {
  const p = makeEmptyProject()
  const art: ProjectArtifact = {
    html: "<div/>",
    css: "body{}",
    js: "",
    title: "T",
    description: "D",
    createdAt: new Date().toISOString(),
  }
  const res = createVersionFromGeneration(p, "build me", "assistant text", art)
  expect(res).not.toBeNull()
  const np = res!.project
  expect(np.versions.length).toBe(1)
  const v = np.versions[0]
  expect(v.number).toBe(1)
  expect(v.isCurrent).toBe(true)
  expect(v.assistantMessage).toBe("assistant text")
  expect(v.artifact).toBeDefined()
  expect(np.artifact).toBeDefined()
})

it("persists accepted generation provenance with the version snapshot", () => {
  const p = makeEmptyProject()
  const now = new Date().toISOString()
  const art: ProjectArtifact = {
    html: "<div/>",
    css: "body{}",
    js: "",
    title: "T",
    description: "D",
    createdAt: now,
  }
  const provenance = {
    id: "build-1",
    timestamp: now,
    provider: "test-provider",
    model: "default" as const,
    mode: "build" as const,
    prompt: "build me",
    operations: [{ path: "src/App.tsx", operation: "modify" as const }],
  }

  const result = createVersionFromGeneration(
    p,
    "build me",
    "assistant text",
    art,
    provenance,
  )

  expect(result?.version.provenance).toEqual(provenance)
  expect(result?.project.lastGeneration).toEqual(provenance)
})

it("records blocked workspace operations in generation provenance", () => {
  const now = new Date().toISOString()
  const project: Project = {
    ...makeEmptyProject(),
    files: [buildWorkspaceFile("src/App.tsx", "safe", "tsx", now)],
  }
  const result = applyGenerationResultToProject(
    project,
    "try unsafe write",
    {
      assistant: "Done",
      raw: "Done",
      provider: "test",
      usedFallback: false,
      artifact: {
        html: "<main/>",
        css: "",
        js: "",
        title: "T",
        description: "D",
        createdAt: now,
      },
      fileChanges: [
        { path: "../escape.ts", operation: "create", content: "unsafe" },
      ],
      provenance: {
        id: "build-unsafe",
        timestamp: now,
        provider: "test",
        mode: "build",
        prompt: "try unsafe write",
        operations: [{ path: "../escape.ts", operation: "create" }],
      },
    },
    now,
    { addVersion: true },
  )

  expect(result?.lastGeneration?.operations).toEqual([])
  expect(result?.lastGeneration?.rejectedOperations).toEqual([
    { path: "../escape.ts", reason: "invalid-path" },
  ])
})

it("keeps the workspace unchanged for plan-mode responses", () => {
  const now = new Date().toISOString()
  const project: Project = {
    ...makeEmptyProject(),
    files: [buildWorkspaceFile("src/App.tsx", "original", "tsx", now)],
  }
  const next = applyGenerationResultToProject(
    project,
    "plan a redesign",
    {
      assistant: "I would reorganize the navigation before changing code.",
      raw: "plan",
      provider: "test",
      usedFallback: false,
      artifact: {
        html: "<main>Changed</main>",
        css: "",
        js: "",
        title: "Changed",
        description: "Changed",
        createdAt: now,
      },
      fileChanges: [
        {
          path: "src/App.tsx",
          operation: "modify",
          content: "changed",
          language: "tsx",
        },
      ],
    },
    now,
    { addVersion: true, mode: "plan" },
  )

  expect(
    next?.files?.find((file) => file.path === "src/App.tsx")?.content,
  ).toBe("original")
  expect(next?.messages.at(-1)?.content).toContain("reorganize")
})

it("creates second version and preserves first", () => {
  const p = makeEmptyProject()
  const a1: ProjectArtifact = {
    html: "<a/>",
    css: "",
    js: "",
    title: "A1",
    description: "d1",
    createdAt: new Date().toISOString(),
  }
  const r1 = createVersionFromGeneration(p, "first", "assist1", a1)!
  const p1 = r1.project
  const a2: ProjectArtifact = {
    html: "<b/>",
    css: "",
    js: "",
    title: "A2",
    description: "d2",
    createdAt: new Date().toISOString(),
  }
  const r2 = createVersionFromGeneration(p1, "second", "assist2", a2)!
  const p2 = r2.project
  expect(p2.versions.length).toBe(2)
  expect(p2.versions[0].number).toBe(1)
  expect(p2.versions[1].number).toBe(2)
  expect(p2.versions[1].isCurrent).toBe(true)
  expect(p2.versions[0].isCurrent).toBe(false)
  expect(p2.versions[0].artifact!.html).toBe("<a/>")
})

it("does not create a version for missing artifact", () => {
  const p = makeEmptyProject()
  // @ts-ignore
  const res = createVersionFromGeneration(p, "no-art", "x", undefined)
  expect(res).toBeNull()
})

it("restores an artifact-only version by deriving workspace files for compatibility", () => {
  const now = new Date().toISOString()
  const version: ProjectVersion = {
    id: "artifact-only-version",
    number: 1,
    label: "Artifact-only snapshot",
    timestamp: now,
    prompt: "legacy version",
    isCurrent: true,
    createdAt: now,
    trigger: { type: "initial-generation", prompt: "legacy version" },
    artifact: {
      html: "<main>Legacy content</main>",
      css: "body { color: red; }",
      js: "",
      title: "Legacy title",
      description: "Legacy description",
      createdAt: now,
    },
  }
  const project: Project = {
    ...makeEmptyProject(),
    versions: [version],
  }

  const restored = restoreVersion(project, version.id)

  expect(restored).not.toBeNull()
  expect(
    restored!.files?.find((file) => file.path === "index.html")?.content,
  ).toContain("Legacy content")
  expect(
    restored!.files?.find((file) => file.path === "src/styles.css")?.content,
  ).toContain("color: red")
  expect(restored!.artifact?.title).toBe("Legacy title")
})

it("restoreVersion sets artifact and marks current without creating new versions", () => {
  const p = makeEmptyProject()
  const a1: ProjectArtifact = {
    html: "<a/>",
    css: "",
    js: "",
    title: "A1",
    description: "d1",
    createdAt: new Date().toISOString(),
  }
  const r1 = createVersionFromGeneration(p, "first", "assist1", a1)!
  const p1 = r1.project
  const a2: ProjectArtifact = {
    html: "<b/>",
    css: "",
    js: "",
    title: "A2",
    description: "d2",
    createdAt: new Date().toISOString(),
  }
  const r2 = createVersionFromGeneration(p1, "second", "assist2", a2)!
  const p2 = r2.project
  // restore v1
  const v1id = p2.versions[0].id
  const restored = restoreVersion(p2, v1id)
  expect(restored).not.toBeNull()
  const rp = restored!
  expect(rp.artifact!.html).toBe("<a/>")
  const cur = rp.versions.find((v) => v.isCurrent)
  expect(cur!.id).toBe(v1id)
  // ensure versions count unchanged
  expect(rp.versions.length).toBe(2)
})

it("applies a generation result to a project with a version and assistant message", () => {
  const p = makeEmptyProject()
  const result = {
    assistant: "Here is the updated experience.",
    raw: "Here is the updated experience.",
    provider: "test-provider",
    usedFallback: false,
    artifact: {
      html: "<main>Updated</main>",
      css: "body{}",
      js: "",
      title: "Updated title",
      description: "Updated description",
      createdAt: new Date().toISOString(),
    },
  }

  const next = applyGenerationResultToProject(
    p,
    "build me",
    result,
    "2026-07-28T00:00:00.000Z",
    { addVersion: true },
  )
  expect(next).not.toBeNull()
  expect(next!.messages).toHaveLength(1)
  expect(next!.messages[0]?.role).toBe("assistant")
  expect(next!.versions).toHaveLength(1)
  expect(next!.artifact?.title).toBe("Updated title")
})

it("reuses the existing initial version instead of creating a duplicate placeholder", () => {
  const now = new Date().toISOString()
  const project: Project = {
    id: "test-proj",
    name: "Test",
    description: "",
    status: "DRAFT",
    lastEdited: now,
    updatedAt: now,
    createdAt: now,
    starred: false,
    blocks: [],
    messages: [],
    versions: [
      {
        id: "v1",
        number: 1,
        label: "Initial draft",
        timestamp: now,
        prompt: "Build me a landing page",
        isCurrent: true,
        createdAt: now,
        trigger: {
          type: "initial-generation",
          prompt: "Build me a landing page",
        },
      },
    ],
  }

  const result = {
    assistant: "The first draft is ready.",
    raw: "The first draft is ready.",
    provider: "test-provider",
    usedFallback: false,
    artifact: {
      html: "<main>Ready</main>",
      css: "body{}",
      js: "",
      title: "Ready landing page",
      description: "A polished landing page",
      createdAt: now,
    },
  }

  const next = applyGenerationResultToProject(
    project,
    "Build me a landing page",
    result,
    now,
    { addVersion: true },
  )
  expect(next).not.toBeNull()
  expect(next!.versions).toHaveLength(1)
  expect(next!.versions[0]?.artifact?.title).toBe("Ready landing page")
  expect(next!.versions[0]?.assistantMessage).toBe("The first draft is ready.")
})

it("forks a project from an existing version by cloning the selected artifact", () => {
  const p = makeEmptyProject()
  const art: ProjectArtifact = {
    html: "<section>Original</section>",
    css: "body{}",
    js: "",
    title: "Original",
    description: "Original description",
    createdAt: new Date().toISOString(),
  }
  const res = createVersionFromGeneration(
    p,
    "first version",
    "assistant one",
    art,
  )
  const forked = forkProjectFromVersion(
    res!.project,
    res!.project.versions[0].id,
    "forked copy",
  )

  expect(forked).not.toBeNull()
  expect(forked!.id).not.toBe(res!.project.id)
  expect(forked!.name).toContain("forked copy")
  expect(forked!.artifact?.html).toBe("<section>Original</section>")
  expect(forked!.versions).toHaveLength(1)
  expect(forked!.versions[0].prompt).toBe("first version")
})

it("forks from the current version when no specific version id is provided", () => {
  const p = makeEmptyProject()
  const art: ProjectArtifact = {
    html: "<section>Current</section>",
    css: "body{}",
    js: "",
    title: "Current",
    description: "Current description",
    createdAt: new Date().toISOString(),
  }
  const res = createVersionFromGeneration(
    p,
    "first version",
    "assistant one",
    art,
  )
  const forked = forkProjectFromCurrentVersion(
    res!.project,
    "forked from current",
  )

  expect(forked).not.toBeNull()
  expect(forked!.name).toContain("forked from current")
  expect(forked!.artifact?.html).toBe("<section>Current</section>")
  expect(forked!.versions[0].isCurrent).toBe(true)
})

it("restores a prior version without changing the version count and marks it current", () => {
  const p = makeEmptyProject()
  const firstArtifact: ProjectArtifact = {
    html: "<main>one</main>",
    css: "body{}",
    js: "",
    title: "One",
    description: "One",
    createdAt: new Date().toISOString(),
  }
  const secondArtifact: ProjectArtifact = {
    html: "<main>two</main>",
    css: "body{}",
    js: "",
    title: "Two",
    description: "Two",
    createdAt: new Date().toISOString(),
  }
  const first = createVersionFromGeneration(
    p,
    "first",
    "assist one",
    firstArtifact,
  )!.project
  const second = createVersionFromGeneration(
    first,
    "second",
    "assist two",
    secondArtifact,
  )!.project

  const restored = restoreVersion(second, second.versions[0].id)

  expect(restored).not.toBeNull()
  expect(restored!.artifact?.html).toBe("<main>one</main>")
  expect(restored!.versions).toHaveLength(2)
  expect(restored!.versions.find((v) => v.isCurrent)?.id).toBe(
    second.versions[0].id,
  )
})

it("applies a restore or fork action through a shared helper", () => {
  const p = makeEmptyProject()
  const art: ProjectArtifact = {
    html: "<section>Original</section>",
    css: "body{}",
    js: "",
    title: "Original",
    description: "Original description",
    createdAt: new Date().toISOString(),
  }
  const res = createVersionFromGeneration(
    p,
    "first version",
    "assistant one",
    art,
  )
  const current = res!.project
  const restored = applyVersionAction(
    current,
    current.versions[0].id,
    "restore",
  )
  const forked = applyVersionAction(
    current,
    current.versions[0].id,
    "fork",
    "forked copy",
  )

  expect(restored).not.toBeNull()
  expect(restored!.kind).toBe("restore")
  expect(restored!.project.artifact?.html).toBe("<section>Original</section>")
  expect(restored!.project.versions.find((v) => v.isCurrent)?.id).toBe(
    current.versions[0].id,
  )

  expect(forked).not.toBeNull()
  expect(forked!.kind).toBe("fork")
  expect(forked!.project.id).not.toBe(current.id)
  expect(forked!.project.name).toContain("forked copy")
})

it("merges a remote version-action payload into the local project state", () => {
  const p = makeEmptyProject()
  const restored = mergeVersionActionProject(p, {
    id: p.id,
    name: "Remote restore",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "hello",
        timestamp: "2026-07-28T00:00:00.000Z",
      },
    ],
    versions: [
      {
        id: "v-restored",
        number: 1,
        label: "Restored",
        timestamp: "2026-07-28T00:00:00.000Z",
        prompt: "hello",
        isCurrent: true,
        createdAt: "2026-07-28T00:00:00.000Z",
        trigger: { type: "iteration", prompt: "hello" },
        artifact: {
          html: "<main>restored</main>",
          css: "body{}",
          js: "",
          title: "Restored",
          description: "Restored description",
          createdAt: "2026-07-28T00:00:00.000Z",
        },
      },
    ],
    artifact: {
      html: "<main>restored</main>",
      css: "body{}",
      js: "",
      title: "Restored",
      description: "Restored description",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    updatedAt: "2026-07-28T00:00:00.000Z",
    lastEdited: "2026-07-28T00:00:00.000Z",
  })

  expect(restored).not.toBeNull()
  expect(restored!.artifact?.html).toBe("<main>restored</main>")
  expect(restored!.messages).toHaveLength(1)
  expect(restored!.versions[0].isCurrent).toBe(true)
  expect(restored!.name).toBe("Remote restore")
})
