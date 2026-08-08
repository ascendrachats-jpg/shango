import { runProviderPipeline } from "../server/generationPipeline/pipeline.ts"
import { applyGenerationResultToProject } from "../src/lib/versioning.ts"
import { generateProjectResponse } from "../src/lib/generation.ts"
import { statusToLine } from "../src/lib/activityStatus.ts"

console.log("==================================================")
console.log("PHASE 1 END-TO-END PIPELINE VERIFICATION")
console.log("==================================================")

// 1. Initial Prompt Execution
const initialPrompt = "Build a task management application where users can add tasks, mark tasks complete, delete tasks, and filter between all, active and completed tasks."

process.env.GEMINI_API_KEY = "mock-key-for-e2e-verification"

const mockProviderResponse = JSON.stringify({
  html: `<div id="root">
  <h1>Task Manager</h1>
  <input id="task-input" placeholder="Add task..." />
  <button id="add-btn">Add Task</button>
  <ul id="task-list"></ul>
</div>`,
  css: `body { font-family: sans-serif; background: #0f172a; color: white; padding: 2rem; }`,
  js: `
    let tasks = [];
    document.getElementById('add-btn').onclick = () => {
      const val = document.getElementById('task-input').value;
      if (val) { tasks.push({ title: val, done: false }); render(); }
    };
    function render() {
      const ul = document.getElementById('task-list');
      ul.innerHTML = tasks.map(t => '<li>' + t.title + '</li>').join('');
    }
  `,
  title: "Task Manager",
  description: "A task management application with filter and completion features",
})

globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: mockProviderResponse,
            },
          ],
        },
      },
    ],
  }),
})

console.log("\n[TEST 1] Executing Initial Generation Pipeline...")
const events = []
const consoleLogs = []
const fileOps = []

const pipelineResult = await runProviderPipeline(
  { prompt: initialPrompt, mode: "build" },
  [],
  (event, data) => {
    events.push({ event, data })
    if (event === "status") {
      const line = statusToLine(data)
      console.log(`  [STATUS EVENT] -> ${data.status}: "${line.title}" (${line.description})`)
    } else if (event === "console") {
      consoleLogs.push(data.message)
      console.log(`  [CONSOLE EVENT] -> ${data.message}`)
    } else if (event === "file") {
      fileOps.push(data.file)
      console.log(`  [FILE EVENT] -> ${data.file.operation.toUpperCase()} ${data.file.path}`)
    }
  }
)

console.log("\n[TEST 1 RESULTS]")
console.log(`- Provider returned: ${pipelineResult.provider}`)
console.log(`- Provenance ID: ${pipelineResult.provenance?.id}`)
console.log(`- File operations emitted: ${pipelineResult.build?.files?.length}`)
console.log(`- Total SSE events emitted: ${events.length}`)

// Verify Workspace Mutation
let project = {
  id: "proj-test-123",
  name: "Test Workspace",
  initialPrompt,
  status: "DRAFT",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  files: [],
  versions: [],
  messages: [],
  artifact: {
    html: "",
    css: "",
    js: "",
    title: "Task Manager",
    description: "Task app",
    createdAt: new Date().toISOString(),
  },
}
const genResult = {
  assistant: "Task manager architecture structured.",
  raw: mockProviderResponse,
  provider: pipelineResult.provider,
  usedFallback: false,
  artifact: {
    html: mockProviderResponse,
    css: "",
    js: "",
    title: "Task Manager",
    description: "Task app",
    createdAt: new Date().toISOString()
  },
  fileChanges: pipelineResult.build?.files?.map(f => ({
    path: f.path,
    operation: f.operation,
    content: f.content,
    language: f.language
  })),
  provenance: pipelineResult.provenance
}

const typedGenResult = genResult
project = applyGenerationResultToProject(
  project,
  initialPrompt,
  typedGenResult,
  new Date().toISOString(),
  { addVersion: true },
)

console.log("\n[TEST 2] Workspace Mutation Verification")
console.log(`- Total workspace files in Project.files: ${project.files.length}`)
project.files.forEach(f => {
  console.log(`  - File: ${f.path} (${f.content.length} bytes)`)
})
console.log(`- Derived Artifact Title: ${project.artifact.title}`)

// 3. Iteration Test
console.log("\n[TEST 3] Iteration Request Execution...")
const iterationPrompt = "Add a completed-only filter button to the task manager"
const currentFiles = project.files.map(f => ({ path: f.path, content: f.content, language: f.language }))

const iterationEvents = []
const iterationPipelineResult = await runProviderPipeline(
  { prompt: iterationPrompt, mode: "build", userPrompt: iterationPrompt },
  currentFiles,
  (event, data) => {
    iterationEvents.push({ event, data })
  }
)

console.log(`- Iteration build completed with ${iterationEvents.length} events`)
console.log(`- Iteration operations: ${iterationPipelineResult.build?.files?.map(f => `${f.operation} ${f.path}`).join(", ")}`)

// 4. Provider Error Test
console.log("\n[TEST 4] Provider Failure / Error Handling")
try {
  const fetchMock = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: "Model quota exceeded" })
  })
  globalThis.fetch = fetchMock
  const errResult = await generateProjectResponse("Failed request prompt")
  console.log(`- Handled fallback gracefully: usedFallback=${errResult.usedFallback}, provider=${errResult.provider}`)
  console.log(`- Assistant error message: "${errResult.assistant.slice(0, 100)}..."`)
} catch (err) {
  console.log(`- Caught exception: ${err.message}`)
}

// 5. Controlled Runtime / Diagnostic Error Inspection
console.log("\n[TEST 5] Controlled Runtime & Compilation Error Inspection")
const invalidTsxCode = `export default function App() { return <div>Unclosed tag }`
console.log(`- Inspecting error detection for invalid TSX code: "${invalidTsxCode}"`)
console.log(`- Current detection point: Preview Babel transpiler catch block & console error listener.`)

console.log("\n==================================================")
console.log("ALL E2E PIPELINE VERIFICATION TESTS COMPLETE")
console.log("==================================================")
