import type { Project, ProjectArtifact, ProjectFile } from "./store"

export interface InspectorFile {
  path: string
  kind: "tsx" | "css" | "html"
  content: string
}

export interface StreamedFileSnapshot {
  path: string
  content?: string
  language?: string
}

interface PreviewModule {
  path: string
  content: string
  language: string
}

function normalisePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "")
}

function resolveImport(specifier: string, basePath: string): string {
  if (specifier.startsWith("@/")) {
    return normalisePath(specifier.replace(/^@\//, "src/"))
  }

  if (
    !specifier.startsWith("./") &&
    !specifier.startsWith("../") &&
    !specifier.startsWith("/")
  ) {
    return specifier
  }

  const base = normalisePath(basePath)
  const baseDir = base.includes("/") ? base.substring(0, base.lastIndexOf("/")) : ""

  const parts = baseDir ? baseDir.split("/") : []
  for (const seg of specifier.split("/")) {
    if (seg === "." || seg === "") continue
    if (seg === "..") {
      parts.pop()
      continue
    }
    parts.push(seg)
  }
  return parts.join("/")
}

function findModule(
  modules: Map<string, PreviewModule>,
  resolved: string,
): PreviewModule | undefined {
  if (modules.has(resolved)) return modules.get(resolved)

  const extensions = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"]
  for (const ext of extensions) {
    if (modules.has(resolved + ext)) return modules.get(resolved + ext)
  }

  const withoutExt = resolved.replace(/\.(tsx|ts|jsx|js)$/, "")
  if (modules.has(withoutExt)) return modules.get(withoutExt)
  for (const ext of extensions) {
    if (modules.has(withoutExt + ext)) return modules.get(withoutExt + ext)
  }

  return undefined
}

function collectModules(
  artifact?: ProjectArtifact,
  streamedFiles: StreamedFileSnapshot[] = [],
  projectFiles?: ProjectFile[],
): Map<string, PreviewModule> {
  const modules = new Map<string, PreviewModule>()

  // 1. From streamed files (live generation)
  for (const sf of streamedFiles) {
    if (!sf.path || !sf.content) continue
    const ext = sf.path.split(".").pop()?.toLowerCase() || ""
    if (["tsx", "ts", "jsx", "js"].includes(ext)) {
      const key = normalisePath(sf.path)
      modules.set(key, { path: key, content: sf.content, language: ext })
    }
  }

  // 2. From projectFiles (workspace state)
  if (Array.isArray(projectFiles)) {
    for (const f of projectFiles) {
      if (!f.path || !f.content) continue
      const ext = f.path.split(".").pop()?.toLowerCase() || f.language || ""
      if (["tsx", "ts", "jsx", "js"].includes(ext)) {
        const key = normalisePath(f.path)
        if (!modules.has(key)) {
          modules.set(key, { path: key, content: f.content, language: ext })
        }
      }
    }
  }

  // 3. From artifact.files
  if (Array.isArray(artifact?.files)) {
    for (const f of artifact.files) {
      if (!f.path || !f.content) continue
      const ext = f.path.split(".").pop()?.toLowerCase() || f.language || ""
      if (["tsx", "ts", "jsx", "js"].includes(ext)) {
        const key = normalisePath(f.path)
        if (!modules.has(key)) {
          modules.set(key, { path: key, content: f.content, language: ext })
        }
      }
    }
  }

  // 4. Fallback: if artifact.js contains TSX
  if (modules.size === 0 && artifact?.js && artifact.js.trim()) {
    const js = artifact.js.trim()
    if (
      js.includes("export default") ||
      js.includes("import React") ||
      js.includes("function App")
    ) {
      modules.set("src/App.tsx", {
        path: "src/App.tsx",
        content: js,
        language: "tsx",
      })
    }
  }

  return modules
}

function collectCss(
  artifact?: ProjectArtifact,
  streamedFiles: StreamedFileSnapshot[] = [],
  projectFiles?: ProjectFile[],
): string {
  const streamedCss = streamedFiles
    .filter((f) => f.path?.endsWith(".css") && f.content && !f.path.includes("node_modules"))
    .map((f) => f.content!)
    .join("\n")
  if (streamedCss) return streamedCss

  if (Array.isArray(projectFiles)) {
    const fileCss = projectFiles
      .filter((f) => f.path?.endsWith(".css") && f.content)
      .map((f) => f.content!)
      .join("\n")
    if (fileCss) return fileCss
  }

  if (Array.isArray(artifact?.files)) {
    const fileCss = artifact.files
      .filter((f) => f.path?.endsWith(".css") && f.content)
      .map((f) => f.content!)
      .join("\n")
    if (fileCss) return fileCss
  }

  return artifact?.css?.trim() || ""
}

function findEntryPoint(modules: Map<string, PreviewModule>): string | null {
  if (modules.has("src/App.tsx")) return "src/App.tsx"
  if (modules.has("src/App.jsx")) return "src/App.jsx"
  if (modules.has("src/App.js")) return "src/App.js"
  if (modules.has("App.tsx")) return "App.tsx"
  if (modules.has("src/index.tsx")) return "src/index.tsx"
  if (modules.has("src/main.tsx")) return "src/main.tsx"

  for (const [key, mod] of modules) {
    if (
      mod.content.includes("export default") &&
      (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js"))
    ) {
      if (
        mod.content.includes("function App") ||
        mod.content.includes("const App") ||
        mod.content.match(/export\s+default\s+function/)
      ) {
        return key
      }
    }
  }

  for (const [key, mod] of modules) {
    if (
      mod.content.includes("export default") &&
      (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js"))
    ) {
      return key
    }
  }

  return null
}

export function buildArtifactPreviewDocument(
  artifact?: ProjectArtifact,
  streamedFiles: StreamedFileSnapshot[] = [],
  projectFiles?: ProjectFile[],
): string {
  const safeTitle = artifact?.title?.trim() || "Shango Preview"
  const safeDescription = artifact?.description?.trim() || "Generated preview"

  const modules = collectModules(artifact, streamedFiles, projectFiles)
  const css = collectCss(artifact, streamedFiles, projectFiles)
  const entryPoint = findEntryPoint(modules)

  if (modules.size === 0 || !entryPoint) {
    const fallbackHtml =
      artifact?.html?.trim() ||
      streamedFiles.find((f) => f.path === "index.html")?.content?.trim() ||
      "<div style='padding:2rem;color:#94a3b8;font-family:Inter,system-ui,sans-serif;text-align:center'><h2 style='color:#f8fafc'>Start building</h2><p>Your generated app will appear here.</p></div>"
    const fallbackCss =
      css ||
      "body { margin: 0; padding: 2rem; font-family: Inter, system-ui, sans-serif; background: #090a0f; color: #f8fafc; }"

    const fallbackJs = artifact?.js?.trim() || ""
    const jsScript = fallbackJs
      ? `\n    <script>\n      try {\n${fallbackJs}\n      } catch (e) { console.error("[Shango Preview]", e); }\n    </script>`
      : ""

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(safeTitle)}</title>
    <meta name="description" content="${escapeHtml(safeDescription)}" />
    <style>
      html, body { margin: 0; padding: 0; min-height: 100vh; overflow-x: hidden; }
      body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #090a0f; color: #f8fafc; }
      * { box-sizing: border-box; }
      ${escapeForStyle(fallbackCss)}
    </style>
  </head>
  <body>
    <div id="root">${fallbackHtml}</div>${jsScript}
  </body>
</html>`
  }

  const modulesJson = JSON.stringify(
    Array.from(modules.entries()).map(([key, mod]) => ({
      path: key,
      content: mod.content,
      language: mod.language,
    })),
  )

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(safeTitle)}</title>
    <meta name="description" content="${escapeHtml(safeDescription)}" />
    <style>
      html, body { margin: 0; padding: 0; min-height: 100vh; overflow-x: hidden; }
      body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090a0f; color: #f8fafc; }
      * { box-sizing: border-box; }
      ${escapeForStyle(css)}
      #shango-error-overlay {
        display: none; position: fixed; inset: 0; z-index: 99999;
        background: #0f1117; color: #fca5a5; padding: 24px; overflow: auto;
        font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13px; line-height: 1.6;
      }
      #shango-error-overlay .err-header { color: #ef4444; font-size: 15px; font-weight: 700; margin-bottom: 12px; }
      #shango-error-overlay pre { color: #cbd5e1; white-space: pre-wrap; word-break: break-all; margin: 0; }
      #shango-loading {
        display: flex; align-items: center; justify-content: center;
        height: 100vh; color: #94a3b8; font-size: 14px; gap: 12px;
        font-family: Inter, system-ui, sans-serif;
      }
      #shango-loading .spinner {
        width: 22px; height: 22px; border: 2.5px solid rgba(99,102,241,0.2);
        border-top-color: #6366f1; border-radius: 50%;
        animation: shango-spin 0.7s linear infinite;
      }
      @keyframes shango-spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div id="root">
      <div id="shango-loading">
        <div class="spinner"></div>
        <span>Building preview runtime…</span>
      </div>
    </div>
    <div id="shango-error-overlay">
      <div class="err-header">⚠ Preview Runtime Error</div>
      <pre id="shango-error-stack"></pre>
    </div>

    <!-- CDNs with automatic fallbacks -->
    <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/react@18.3.1/umd/react.production.min.js'"></script>
    <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/@babel/standalone@7.26.9/babel.min.js'"></script>
    <script src="https://cdn.tailwindcss.com"></script>

    <script>
      (function() {
        "use strict";

        var MODULES = ${modulesJson};
        var moduleMap = {};
        var moduleCache = {};

        for (var i = 0; i < MODULES.length; i++) {
          var m = MODULES[i];
          moduleMap[m.path] = m;
          if (!m.path.startsWith("/")) moduleMap["/" + m.path] = m;
          if (m.path.startsWith("src/")) moduleMap[m.path.replace(/^src\\//, "")] = m;
        }

        function createIconComponent(name) {
          return function Icon(props) {
            props = props || {};
            var size = props.size || props.height || 18;
            var color = props.color || "currentColor";
            var className = props.className || "";
            return React.createElement("svg", {
              width: size,
              height: size,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: color,
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              className: className,
              style: props.style,
              "aria-label": name,
            },
              React.createElement("circle", { cx: 12, cy: 12, r: 9, strokeOpacity: 0.35 }),
              React.createElement("path", { d: "M9 12l2 2 4-4" })
            );
          };
        }

        var lucideReactProxy = new Proxy({}, {
          get: function(target, prop) {
            if (prop === "__esModule") return true;
            if (prop === "default") return lucideReactProxy;
            if (typeof prop === "symbol") return undefined;
            return createIconComponent(String(prop));
          }
        });

        function createUniversalPkgProxy(pkgName) {
          var stubComponent = function(props) {
            props = props || {};
            if (props.children) {
              return React.createElement("div", { className: props.className, style: props.style }, props.children);
            }
            return React.createElement("span", {
              style: { padding: "2px 6px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", fontSize: "11px", color: "#94a3b8" },
              title: "Package: " + pkgName
            }, pkgName);
          };
          stubComponent.__esModule = true;
          stubComponent.default = stubComponent;
          return new Proxy(stubComponent, {
            get: function(target, prop) {
              if (prop === "__esModule") return true;
              if (prop === "default") return stubComponent;
              if (typeof prop === "string" && (prop.startsWith("use") || prop.startsWith("create"))) {
                return function() { return {}; };
              }
              return stubComponent;
            }
          });
        }

        function normalisePath(p) {
          return p.replace(/\\\\/g, "/").replace(/^\\.\\//, "").replace(/^\\/+/, "");
        }

        function resolveImport(specifier, basePath) {
          if (specifier.startsWith("@/")) {
            return normalisePath(specifier.replace(/^@\\//, "src/"));
          }
          if (specifier === "react" || specifier === "react-dom" ||
              specifier.startsWith("react/") || specifier === "lucide-react") {
            return specifier;
          }
          if (!specifier.startsWith("./") && !specifier.startsWith("../") && !specifier.startsWith("/")) {
            return specifier;
          }
          var base = normalisePath(basePath);
          var baseDir = base.indexOf("/") >= 0 ? base.substring(0, base.lastIndexOf("/")) : "";
          var parts = baseDir ? baseDir.split("/") : [];
          var segs = specifier.split("/");
          for (var si = 0; si < segs.length; si++) {
            if (segs[si] === "." || segs[si] === "") continue;
            if (segs[si] === "..") { parts.pop(); continue; }
            parts.push(segs[si]);
          }
          return parts.join("/");
        }

        function findModule(resolved) {
          if (moduleMap[resolved]) return moduleMap[resolved];
          var exts = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
          for (var ei = 0; ei < exts.length; ei++) {
            if (moduleMap[resolved + exts[ei]]) return moduleMap[resolved + exts[ei]];
          }
          var noExt = resolved.replace(/\\.(tsx|ts|jsx|js)$/, "");
          if (moduleMap[noExt]) return moduleMap[noExt];
          for (var ei2 = 0; ei2 < exts.length; ei2++) {
            if (moduleMap[noExt + exts[ei2]]) return moduleMap[noExt + exts[ei2]];
          }
          return null;
        }

        function loadModule(modulePath) {
          if (moduleCache[modulePath]) return moduleCache[modulePath].exports;

          var mod = findModule(modulePath);
          if (!mod) {
            throw new Error("Module not found: " + modulePath);
          }

          var moduleObj = { exports: {} };
          moduleCache[modulePath] = moduleObj;

          var presets = ["react", "typescript", ["env", { modules: "commonjs" }]];
          var transformed;
          try {
            transformed = Babel.transform(mod.content, {
              presets: presets,
              filename: mod.path,
            }).code;
          } catch (e) {
            throw new Error("Babel transform failed for " + mod.path + ": " + e.message);
          }

          function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          }
          function _interopRequireWildcard(obj) {
            if (obj && obj.__esModule) return obj;
            var newObj = {};
            if (obj != null) {
              for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  newObj[key] = obj[key];
                }
              }
            }
            newObj.default = obj;
            return newObj;
          }

          function localRequire(specifier) {
            if (specifier === "react") {
              var reactEs = { __esModule: true, default: React };
              for (var k in React) {
                if (Object.prototype.hasOwnProperty.call(React, k)) reactEs[k] = React[k];
              }
              return reactEs;
            }
            if (specifier === "react-dom" || specifier === "react-dom/client") {
              var reactDomEs = { __esModule: true, default: ReactDOM };
              for (var dk in ReactDOM) {
                if (Object.prototype.hasOwnProperty.call(ReactDOM, dk)) reactDomEs[dk] = ReactDOM[dk];
              }
              return reactDomEs;
            }
            if (specifier.startsWith("react/")) {
              return {
                __esModule: true,
                jsx: React.createElement,
                jsxs: React.createElement,
                Fragment: React.Fragment,
                default: React,
              };
            }
            if (specifier === "lucide-react") {
              return lucideReactProxy;
            }
            if (specifier === "clsx" || specifier === "tailwind-merge") {
              var classFn = function() {
                var args = Array.prototype.slice.call(arguments);
                return args.filter(Boolean).join(" ");
              };
              return { __esModule: true, default: classFn, clsx: classFn, twMerge: classFn };
            }

            var resolved = resolveImport(specifier, mod.path);
            var localMod = findModule(resolved);
            if (localMod) {
              return loadModule(resolved);
            }

            return createUniversalPkgProxy(specifier);
          }

          var moduleFunc = new Function(
            "require", "module", "exports", "React", "ReactDOM",
            "lucideReact", "_interopRequireDefault", "_interopRequireWildcard",
            transformed
          );

          moduleFunc(
            localRequire, moduleObj, moduleObj.exports,
            React, ReactDOM, lucideReactProxy,
            _interopRequireDefault, _interopRequireWildcard
          );

          return moduleObj.exports;
        }

        function hideLoading() {
          var loading = document.getElementById("shango-loading");
          if (loading) loading.style.display = "none";
        }

        function sendRuntimeEvent(event) {
          try {
            window.parent.postMessage({
              type: "SHANGO_RUNTIME_EVENT",
              event: event,
            }, "*");
          } catch (e) {}
        }

        function showError(message, stack, file, line, col) {
          hideLoading();
          var overlay = document.getElementById("shango-error-overlay");
          var stackEl = document.getElementById("shango-error-stack");
          if (overlay && stackEl) {
            stackEl.textContent = (file ? file + "\\n\\n" : "") + (message || "Preview Error") + "\\n\\n" + (stack || "");
            overlay.style.display = "block";
          }
          sendRuntimeEvent({
            type: "runtime_error",
            timestamp: new Date().toISOString(),
            message: String(message || "Preview runtime error"),
            stack: String(stack || ""),
            file: file || "preview-runtime",
            line: line,
            column: col,
            severity: "error",
          });
        }

        window.addEventListener("error", function(e) {
          showError(e.message, e.error && e.error.stack, e.filename, e.lineno, e.colno);
        });

        window.addEventListener("unhandledrejection", function(e) {
          var reason = e.reason;
          var msg = reason && reason.message ? reason.message : String(reason);
          showError("Unhandled Rejection: " + msg, reason && reason.stack);
        });

        function bootPreview() {
          try {
            if (typeof React === "undefined") throw new Error("React CDN failed to load");
            if (typeof ReactDOM === "undefined") throw new Error("ReactDOM CDN failed to load");
            if (typeof Babel === "undefined") throw new Error("Babel CDN failed to load");

            var entry = ${JSON.stringify(entryPoint)};
            var exports = loadModule(entry);
            var App = exports.default || exports;

            if (!App) {
              throw new Error("Entry module " + entry + " has no default export");
            }

            hideLoading();
            var root = document.getElementById("root");
            ReactDOM.createRoot(root).render(React.createElement(App));

            sendRuntimeEvent({
              type: "runtime_ready",
              timestamp: new Date().toISOString(),
              message: "Preview application mounted successfully",
            });
          } catch (err) {
            showError(err.message, err.stack);
          }
        }

        var attempts = 0;
        var checkInterval = setInterval(function() {
          attempts++;
          if (typeof Babel !== "undefined" && typeof React !== "undefined" && typeof ReactDOM !== "undefined") {
            clearInterval(checkInterval);
            bootPreview();
          } else if (attempts > 80) {
            clearInterval(checkInterval);
            showError("Preview dependencies failed to load from CDN. Check your network connection.");
          }
        }, 50);

      })();
    </script>
  </body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeForStyle(css: string): string {
  return css.replace(/<\/style>/gi, "<\\/style>")
}

export function createArtifactPreviewUrl(
  artifact: ProjectArtifact | undefined,
  projectName: string,
  streamedFiles: StreamedFileSnapshot[] = [],
  projectFiles?: ProjectFile[],
): string {
  const resolvedArtifact = artifact ?? {
    html: "<div style='padding:2rem;color:#94a3b8;font-family:Inter,system-ui,sans-serif;text-align:center'><h2 style='color:#f8fafc'>Start building</h2><p>Your generated app will appear here.</p></div>",
    css: "body { margin: 0; padding: 2rem; font-family: Inter, system-ui, sans-serif; }",
    js: "",
    title: projectName || "Shango Preview",
    description: "Generated app preview",
    createdAt: new Date().toISOString(),
  }
  const document = buildArtifactPreviewDocument(resolvedArtifact, streamedFiles, projectFiles)

  const blob = new Blob([document], { type: "text/html;charset=utf-8" })
  return URL.createObjectURL(blob)
}

export function buildPreviewDocument(
  project: Project | undefined,
  streamedFiles: StreamedFileSnapshot[] = [],
): string {
  const fileMap = new Map<string, string>()

  if (Array.isArray(project?.files) && project.files.length > 0) {
    for (const f of project.files) {
      if (f.path && typeof f.content === "string") {
        fileMap.set(f.path, f.content)
      }
    }
  } else if (
    Array.isArray(project?.artifact?.files) &&
    project.artifact.files.length > 0
  ) {
    for (const f of project.artifact.files) {
      if (f.path && typeof f.content === "string") {
        fileMap.set(f.path, f.content)
      }
    }
  }

  for (const sf of streamedFiles) {
    if (sf.path && typeof sf.content === "string") {
      fileMap.set(sf.path, sf.content)
    }
  }

  let indexHtml = fileMap.get("index.html") || ""
  if (!indexHtml) {
    indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>`
  }
  return indexHtml
}

export function buildInspectorFilesFromProject(
  project: Project | undefined,
  streamedFiles: StreamedFileSnapshot[] = [],
): InspectorFile[] {
  const workspaceFiles = Array.isArray(project?.files)
    ? project.files
        .map(normalizeProjectFile)
        .filter((file): file is InspectorFile => file !== null)
    : []
  if (workspaceFiles.length > 0) {
    return workspaceFiles
  }

  return buildInspectorFilesFromArtifact(
    project?.artifact,
    project?.name ?? "Shango Preview",
    streamedFiles,
  )
}

export function buildInspectorFilesFromArtifact(
  artifact: ProjectArtifact | undefined,
  projectName: string,
  streamedFiles: StreamedFileSnapshot[] = [],
): InspectorFile[] {
  const safeHtml =
    artifact?.html?.trim() ||
    "<main><h1>Start building</h1><p>Your generated app will appear here.</p></main>"
  const safeCss = artifact?.css?.trim() || ":root { color-scheme: light; }"
  const title = artifact?.title?.trim() || projectName || "Shango Preview"
  const fileMap = new Map(streamedFiles.map((file) => [file.path, file]))

  if (Array.isArray(artifact?.files) && artifact.files.length > 0) {
    return artifact.files.map((f) => ({
      path: f.path,
      kind: f.path.endsWith(".css")
        ? "css"
        : f.path.endsWith(".html")
          ? "html"
          : "tsx",
      content: f.content ?? "",
    }))
  }

  const appContent =
    fileMap.get("src/App.tsx")?.content ??
    `import React from 'react'

export default function App() {
  return (
    <main>
      <h1>${title}</h1>
      <p>${artifact?.description?.trim() || "Generated from the current artifact."}</p>
    </main>
  )
}`

  const cssContent = fileMap.get("src/styles.css")?.content ?? safeCss

  return [
    {
      path: "src/App.tsx",
      kind: "tsx",
      content: appContent,
    },
    {
      path: "src/styles.css",
      kind: "css",
      content: cssContent,
    },
    {
      path: "index.html",
      kind: "html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root">${safeHtml}</div>
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>`,
    },
  ]
}

function normalizeProjectFile(file: ProjectFile): InspectorFile | null {
  const path = file.path?.trim()
  if (!path) return null

  const kind = path.endsWith(".css")
    ? "css"
    : path.endsWith(".html")
      ? "html"
      : "tsx"
  return {
    path,
    kind,
    content: file.content ?? "",
  }
}
