import type { IncomingMessage, ServerResponse } from "http"
import type { BuildRequest, BuildResponse } from "./types.ts"
import { generateBuildResponse } from "./adapter.ts"

function parseRequestBody(req: IncomingMessage): Promise<BuildRequest> {
  return new Promise((resolve, reject) => {
    let body = ""
    req.setEncoding("utf8")
    req.on("data", (chunk: string) => {
      body += chunk
    })
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {}
        resolve(parsed as BuildRequest)
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })
}

export async function handleBuildRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const sendEvent = (event: string, data: unknown) => {
    if (res.writableEnded) return
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const buildRequest = await parseRequestBody(req)

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    })

    const response: BuildResponse = await generateBuildResponse(
      buildRequest,
      sendEvent,
    )

    sendEvent("done", {
      response: response.response,
      provider: response.provider,
      provenance: response.provenance,
      build: response.build,
    })
    res.end()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process build request."
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: message }))
    } else {
      sendEvent("status", { status: "build_failed", message })
      sendEvent("console", { level: "error", message: `⚠ Build failed: ${message}` })
      sendEvent("error", { error: { message } })
      res.end()
    }
  }
}
