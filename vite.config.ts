import { defineConfig, type HtmlTagDescriptor, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { handleBuildRequest } from "./server/generationPipeline/routes.ts"
import {
  createAuthStore,
  parseSessionId,
  sessionCookieHeader,
  clearSessionCookieHeader,
} from "./server/auth.ts"
import { createDeploymentStore } from "./server/deployments.ts"
import { createProjectStore, type ProjectRecord } from "./server/projects.ts"
import {
  getRequestClientKey,
  SlidingWindowRateLimiter,
} from "./server/rateLimit.ts"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadSiteConfiguration() {
  const siteConfigPath = path.resolve(__dirname, ".figma/make/site.json")
  if (!existsSync(siteConfigPath)) return {}

  try {
    const raw = readFileSync(siteConfigPath, "utf8").trim()
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.warn(
      "[vite] Unable to parse .figma/make/site.json; using defaults.",
      error,
    )
    return {}
  }
}

const siteConfiguration = loadSiteConfiguration()

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === "development"

  return {
    base: process.env.FIGMA_PUBLIC_URL
      ? `${process.env.FIGMA_PUBLIC_URL}/`
      : "/",
    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      shangoGenerationApiPlugin(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: "/src/**/*.stories.{ts,tsx,js,jsx}" }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: false,
      watch: { ignored: ["**/.figma/**"] },
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: false,
    },
  }
})

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function shangoGenerationApiPlugin(): Plugin {
  const routePaths = ["/api/build", "/api/generate"]
  const projectStore = createProjectStore()
  const authStore = createAuthStore()
  const deploymentStore = createDeploymentStore()
  const generationLimiter = new SlidingWindowRateLimiter(12, 60_000)

  async function handleRequest(req: any, res: any) {
    const url = req.url ?? "/"
    const pathname = url.split("?")[0]

    if (req.method === "POST" && routePaths.includes(pathname)) {
      const rateLimit = generationLimiter.consume(getRequestClientKey(req))
      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(rateLimit.retryAfterMs / 1000),
        )
        res.writeHead(429, {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        })
        res.end(
          JSON.stringify({
            error: "Generation limit reached. Please retry shortly.",
            retryAfterMs: rateLimit.retryAfterMs,
          }),
        )
        return true
      }
      try {
        await handleBuildRequest(req, res)
        return true
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Generation failed."
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: message }))
        return true
      }
    }

    // ── Auth routes ────────────────────────────────────────────────────────

    if (pathname === "/api/auth/session" && req.method === "GET") {
      const sessionId = parseSessionId(
        req.headers?.cookie as string | undefined,
      )
      const result = authStore.getSession(sessionId)
      if (!result) {
        res.writeHead(401, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ user: null }))
        return true
      }
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ user: result.user }))
      return true
    }

    if (pathname === "/api/auth/signup" && req.method === "POST") {
      let body = ""
      req.setEncoding("utf8")
      req.on("data", (chunk: string) => {
        body += chunk
      })
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {}
          const result = await authStore.signUp({
            name: typeof parsed.name === "string" ? parsed.name : "",
            email: typeof parsed.email === "string" ? parsed.email : "",
            password:
              typeof parsed.password === "string" ? parsed.password : "",
          })
          if (!result.ok) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: result.error }))
            return
          }
          res.setHeader("Set-Cookie", sessionCookieHeader(result.sessionId))
          res.writeHead(201, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ user: result.user }))
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Invalid request payload." }))
        }
      })
      return true
    }

    if (pathname === "/api/auth/signin" && req.method === "POST") {
      let body = ""
      req.setEncoding("utf8")
      req.on("data", (chunk: string) => {
        body += chunk
      })
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {}
          const result = await authStore.signIn({
            email: typeof parsed.email === "string" ? parsed.email : "",
            password:
              typeof parsed.password === "string" ? parsed.password : "",
          })
          if (!result.ok) {
            res.writeHead(401, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: result.error }))
            return
          }
          res.setHeader("Set-Cookie", sessionCookieHeader(result.sessionId))
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ user: result.user }))
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Invalid request payload." }))
        }
      })
      return true
    }

    if (pathname === "/api/auth/signout" && req.method === "POST") {
      const sessionId = parseSessionId(
        req.headers?.cookie as string | undefined,
      )
      authStore.signOut(sessionId)
      res.setHeader("Set-Cookie", clearSessionCookieHeader())
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true }))
      return true
    }

    if (pathname === "/api/me" && req.method === "GET") {
      const user = authStore.getUserFromRequest(req)
      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Unauthenticated" }))
        return true
      }
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ user }))
      return true
    }

    if (pathname === "/api/deployments") {
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(deploymentStore.listDeployments()))
        return true
      }

      if (req.method === "POST") {
        let body = ""
        req.setEncoding("utf8")
        req.on("data", (chunk: string) => {
          body += chunk
        })
        req.on("end", () => {
          try {
            const parsed = body ? JSON.parse(body) : {}
            if (
              typeof parsed?.projectId !== "string" ||
              !parsed.projectId.trim() ||
              typeof parsed?.projectName !== "string" ||
              !parsed.projectName.trim() ||
              typeof parsed?.target !== "string" ||
              !parsed.target.trim() ||
              typeof parsed?.url !== "string" ||
              !parsed.url.trim() ||
              typeof parsed?.shortUrl !== "string" ||
              !parsed.shortUrl.trim()
            ) {
              res.writeHead(400, { "Content-Type": "application/json" })
              res.end(
                JSON.stringify({
                  error:
                    "A deployment preview requires project, target, and preview reference details.",
                }),
              )
              return
            }
            const record = deploymentStore.createDeployment({
              projectId: parsed.projectId,
              projectName: parsed.projectName,
              target: parsed.target,
              status:
                typeof parsed?.status === "string"
                  ? parsed.status
                  : "preparing",
              url: parsed.url,
              shortUrl: parsed.shortUrl,
              timestamp:
                typeof parsed?.timestamp === "string"
                  ? parsed.timestamp
                  : new Date().toISOString(),
              duration:
                typeof parsed?.duration === "number" ? parsed.duration : 0,
              triggeredBy:
                typeof parsed?.triggeredBy === "string"
                  ? parsed.triggeredBy
                  : "manual",
              version:
                typeof parsed?.version === "number"
                  ? parsed.version
                  : undefined,
              domains: Array.isArray(parsed?.domains) ? parsed.domains : [],
              envVars: Array.isArray(parsed?.envVars) ? parsed.envVars : [],
              buildLogs: Array.isArray(parsed?.buildLogs)
                ? parsed.buildLogs
                : [],
              isPreview: parsed?.isPreview === true,
            })
            res.writeHead(201, { "Content-Type": "application/json" })
            res.end(JSON.stringify(record))
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "Invalid deployment payload" }))
          }
        })
        return true
      }
    }

    if (pathname.startsWith("/api/projects")) {
      const projectId = pathname.split("/").filter(Boolean)[2]

      // Resolve the calling user — required for all project operations.
      const sessionUser = authStore.getUserFromRequest(req)
      const userId = sessionUser?.id ?? null

      if (req.method === "GET" && pathname === "/api/projects") {
        // Return only this user's projects; unauthenticated callers get an empty list.
        const list = userId ? projectStore.listProjects(userId) : []
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ projects: list }))
        return true
      }

      // All mutating routes require authentication.
      if (!userId) {
        res.writeHead(401, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Authentication required." }))
        return true
      }

      if (req.method === "POST" && pathname === "/api/projects") {
        let body = ""
        req.setEncoding("utf8")
        req.on("data", (chunk: string) => {
          body += chunk
        })
        req.on("end", () => {
          try {
            const parsed = body ? JSON.parse(body) : {}
            if (Array.isArray(parsed)) {
              const projects = projectStore.syncProjects(userId, parsed)
              res.writeHead(200, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ projects }))
              return
            }

            if (
              parsed &&
              typeof parsed === "object" &&
              Array.isArray((parsed as { projects?: unknown }).projects)
            ) {
              const projects = projectStore.syncProjects(
                userId,
                (parsed as { projects: Array<unknown> }).projects as Array<any>,
              )
              res.writeHead(200, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ projects }))
              return
            }

            const project = projectStore.upsertProject(userId, {
              id:
                typeof (parsed as { clientId?: unknown }).clientId ===
                  "string" && (parsed as { clientId?: string }).clientId?.trim()
                  ? (parsed as { clientId: string }).clientId
                  : undefined,
              prompt:
                typeof (parsed as { prompt?: unknown }).prompt === "string"
                  ? (parsed as { prompt: string }).prompt
                  : "Build a polished app",
              mode:
                (parsed as { mode?: string }).mode === "plan"
                  ? "plan"
                  : "build",
              model:
                typeof (parsed as { model?: unknown }).model === "string"
                  ? (parsed as { model: string }).model
                  : "default",
              name:
                typeof (parsed as { name?: unknown }).name === "string"
                  ? (parsed as { name: string }).name
                  : undefined,
              description:
                typeof (parsed as { description?: unknown }).description ===
                "string"
                  ? (parsed as { description: string }).description
                  : undefined,
              status:
                typeof (parsed as { status?: unknown }).status === "string"
                  ? (parsed as { status: ProjectRecord["status"] }).status
                  : undefined,
              lastEdited:
                typeof (parsed as { lastEdited?: unknown }).lastEdited ===
                "string"
                  ? (parsed as { lastEdited: string }).lastEdited
                  : undefined,
              updatedAt:
                typeof (parsed as { updatedAt?: unknown }).updatedAt ===
                "string"
                  ? (parsed as { updatedAt: string }).updatedAt
                  : undefined,
              createdAt:
                typeof (parsed as { createdAt?: unknown }).createdAt ===
                "string"
                  ? (parsed as { createdAt: string }).createdAt
                  : undefined,
              starred:
                typeof (parsed as { starred?: unknown }).starred === "boolean"
                  ? (parsed as { starred: boolean }).starred
                  : undefined,
              messages: Array.isArray(
                (parsed as { messages?: unknown }).messages,
              )
                ? (parsed as { messages: Array<unknown> })
                    .messages as Array<any>
                : undefined,
              versions: Array.isArray(
                (parsed as { versions?: unknown }).versions,
              )
                ? (parsed as { versions: Array<unknown> })
                    .versions as Array<any>
                : undefined,
              initialPrompt:
                typeof (parsed as { initialPrompt?: unknown }).initialPrompt ===
                "string"
                  ? (parsed as { initialPrompt: string }).initialPrompt
                  : undefined,
              artifact:
                typeof (parsed as { artifact?: unknown }).artifact ===
                  "object" &&
                (parsed as { artifact: ProjectRecord["artifact"] }).artifact !==
                  null
                  ? (parsed as { artifact: ProjectRecord["artifact"] }).artifact
                  : undefined,
              files: Array.isArray((parsed as { files?: unknown }).files)
                ? (parsed as { files: ProjectRecord["files"] }).files
                : undefined,
              providerDiagnostics:
                typeof (parsed as { providerDiagnostics?: unknown })
                  .providerDiagnostics === "string"
                  ? (parsed as { providerDiagnostics: string })
                      .providerDiagnostics
                  : undefined,
              lastGeneration:
                typeof (parsed as { lastGeneration?: unknown })
                  .lastGeneration === "object" &&
                (parsed as { lastGeneration?: unknown }).lastGeneration !== null
                  ? (parsed as {
                      lastGeneration: ProjectRecord["lastGeneration"]
                    }).lastGeneration
                  : undefined,
              template:
                typeof (parsed as { template?: unknown }).template ===
                  "object" &&
                (parsed as { template?: unknown }).template !== null
                  ? (parsed as { template: ProjectRecord["template"] }).template
                  : undefined,
            })
            res.writeHead(project ? 201 : 500, {
              "Content-Type": "application/json",
            })
            res.end(JSON.stringify({ project }))
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Project creation failed",
              }),
            )
          }
        })
        return true
      }

      if (
        req.method === "GET" &&
        pathname.startsWith("/api/projects/") &&
        pathname.split("/").length === 3
      ) {
        const project = projectStore.getProject(userId, projectId)
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Project not found" }))
          return true
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ project }))
        return true
      }

      if (
        req.method === "PATCH" &&
        pathname.startsWith("/api/projects/") &&
        pathname.split("/").length === 3
      ) {
        let body = ""
        req.setEncoding("utf8")
        req.on("data", (chunk: string) => {
          body += chunk
        })
        req.on("end", () => {
          try {
            const parsed = body ? JSON.parse(body) : {}
            const project = projectStore.updateProject(
              userId,
              projectId,
              parsed,
            )
            if (!project) {
              res.writeHead(404, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ error: "Project not found" }))
              return
            }
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ project }))
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Project update failed",
              }),
            )
          }
        })
        return true
      }

      if (
        req.method === "DELETE" &&
        pathname.startsWith("/api/projects/") &&
        pathname.split("/").length === 3
      ) {
        const deleted = projectStore.deleteProject(userId, projectId)
        res.writeHead(deleted ? 204 : 404, {
          "Content-Type": "application/json",
        })
        res.end(deleted ? "" : JSON.stringify({ error: "Project not found" }))
        return true
      }

      if (req.method === "POST" && pathname.endsWith("/duplicate")) {
        const dupProjectId = pathname.split("/").filter(Boolean)[2]
        const duplicated = projectStore.duplicateProject(userId, dupProjectId)
        if (!duplicated) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Project not found" }))
          return true
        }
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ project: duplicated }))
        return true
      }

      if (
        req.method === "POST" &&
        pathname.includes("/versions/") &&
        pathname.endsWith("/restore")
      ) {
        const versionId = pathname.split("/").filter(Boolean)[4]
        const restored = projectStore.restoreVersion(
          userId,
          projectId,
          versionId,
        )
        if (!restored) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Version not found" }))
          return true
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ project: restored }))
        return true
      }

      if (
        req.method === "POST" &&
        pathname.includes("/versions/") &&
        pathname.endsWith("/fork")
      ) {
        const versionId = pathname.split("/").filter(Boolean)[4]
        const forked = projectStore.forkVersion(userId, projectId, versionId)
        if (!forked) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Version not found" }))
          return true
        }
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ project: forked }))
        return true
      }
    }

    return false
  }

  return {
    name: "shango-generation-api",
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        Promise.resolve(handleRequest(req, res)).then((handled) => {
          if (handled) return
          next()
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        Promise.resolve(handleRequest(req, res)).then((handled) => {
          if (handled) return
          next()
        })
      })
    },
  }
}

function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, "") || ""
  }
  function escapeHtmlText(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }
  function replaceHtmlCommentSlot(
    html: string,
    slotName: string,
    content: string,
  ): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ""
  const favicon = config.icons?.icon ?? ""
  const socialImage = config.openGraph?.image ?? ""
  const language = sanitizeHtmlValue(config.language) || "en"
  const googleAnalyticsId = sanitizeHtmlValue(
    config.analytics?.googleAnalyticsId,
  )
  const headStart = config.customScripts?.headStart ?? ""
  const headEnd = config.customScripts?.headEnd ?? ""
  const bodyStart = config.customScripts?.bodyStart ?? ""
  const bodyEnd = config.customScripts?.bodyEnd ?? ""
  const robotsTxt =
    config.robots?.index === false ? "User-agent: *\nDisallow: /\n" : ""

  return {
    name: "figma-site-configuration",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split("?")[0] !== "/robots.txt")
          return next()

        res.setHeader("Content-Type", "text/plain; charset=utf-8")
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, "figma:lang", language)
        result = replaceHtmlCommentSlot(
          result,
          "figma:title",
          escapeHtmlText(title),
        )
        result = replaceHtmlCommentSlot(result, "figma:head-start", headStart)
        result = replaceHtmlCommentSlot(result, "figma:head-end", headEnd)
        result = replaceHtmlCommentSlot(result, "figma:body-start", bodyStart)
        result = replaceHtmlCommentSlot(result, "figma:body-end", bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({
            tag: "meta",
            attrs: { name: "description", content: description },
            injectTo: "head",
          })
        }
        if (config.robots?.index === false) {
          tags.push({
            tag: "meta",
            attrs: { name: "robots", content: "noindex, nofollow" },
            injectTo: "head",
          })
        }
        if (favicon) {
          tags.push({
            tag: "link",
            attrs: { rel: "icon", href: favicon },
            injectTo: "head",
          })
        }
        if (title) {
          tags.push({
            tag: "meta",
            attrs: { property: "og:title", content: title },
            injectTo: "head",
          })
        }
        if (description) {
          tags.push({
            tag: "meta",
            attrs: { property: "og:description", content: description },
            injectTo: "head",
          })
        }
        if (socialImage) {
          tags.push(
            {
              tag: "meta",
              attrs: { property: "og:image", content: socialImage },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { name: "twitter:card", content: "summary_large_image" },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { name: "twitter:image", content: socialImage },
              injectTo: "head",
            },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: "script",
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: "head",
            },
            {
              tag: "script",
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: "head",
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: "style",
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: "head",
            },
            {
              tag: "a",
              attrs: { class: "figma-bypass-link", href: "#root" },
              children: "Skip to content",
              injectTo: "body-prepend",
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: "figma-error-overlay-replay",
    apply: "serve",
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (
        ...args: any[]
      ) => void
      server.ws.send = (((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === "error") {
            lastError = (payload as object)
          } else if (type === "update" || type === "full-reload") {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send)

      server.ws.on("connection", (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: "figma-react-refresh-boundary-fallback",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: "full-reload", path: "*" })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes("/node_modules/"))
        return null

      const moduleId = id.split("?")[0] ?? id
      const hasRefreshBoundary = code.includes("registerExportsForReactRefresh")
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: {
  storiesGlob: string | string[]
}): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob)
    ? options.storiesGlob
    : [options.storiesGlob]
  const ROUTE = "/.figma/make/kit.html"
  const VIRTUAL_ID = "virtual:figma-stories"
  const RESOLVED_ID = "\0" + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: "figma-make-kit",
    apply: "serve",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ""
        if (url.split("?")[0] !== ROUTE) return next()

        try {
          res.setHeader("Content-Type", "text/html")
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}
