import { generateProjectResponse } from "./src/lib/generation.ts"

const stream = [
  "event: delta",
  'data: {"content":"Hello from the stream"}',
  "",
  "event: console",
  'data: {"level":"info","message":"Starting build"}',
  "",
  "event: done",
  'data: {"response":"{\\"html\\":\\"<div>page</div>\\",\\"css\\":\\"body{margin:0}\\",\\"js\\":\\"\\",\\"title\\":\\"Streamed\\",\\"description\\":\\"Updated\\"}"}',
  "",
].join("\n")

const fetchMock = async () => ({
  ok: true,
  headers: new Headers({ "content-type": "text/event-stream" }),
  text: async () => stream,
})

globalThis.fetch = fetchMock
const result = await generateProjectResponse("Stream the build")
console.log(
  JSON.stringify(
    {
      title: result.artifact?.title,
      usedFallback: result.usedFallback,
      assistant: result.assistant,
      raw: result.raw,
    },
    null,
    2,
  ),
)
