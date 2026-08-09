(function() {
        "use strict";

        var MODULES = [{"path":"src/App.tsx","content":"import React from 'react'\nexport default function App() {\n  return <div><h1>Hello</h1></div>\n}","language":"tsx"}];
        var moduleMap = {};
        var moduleCache = {};

        for (var i = 0; i < MODULES.length; i++) {
          var m = MODULES[i];
          moduleMap[m.path] = m;
          if (!m.path.startsWith("/")) moduleMap["/" + m.path] = m;
          if (m.path.startsWith("src/")) moduleMap[m.path.replace(/^src\//, "")] = m;
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
          return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
        }

        function resolveImport(specifier, basePath) {
          if (specifier.startsWith("@/")) {
            return normalisePath(specifier.replace(/^@\//, "src/"));
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
          var noExt = resolved.replace(/\.(tsx|ts|jsx|js)$/, "");
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
            stackEl.textContent = (file ? file + "\n\n" : "") + (message || "Preview Error") + "\n\n" + (stack || "");
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

            var entry = "src/App.tsx";
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