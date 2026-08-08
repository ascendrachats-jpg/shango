function ensureOverlay() {
  let el = document.getElementById(
    "shango-client-error-overlay",
  ) as HTMLDivElement | null
  if (el) return el
  el = document.createElement("div")
  el.id = "shango-client-error-overlay"
  Object.assign(el.style, {
    position: "fixed",
    top: "12px",
    left: "12px",
    right: "12px",
    zIndex: "99999",
    background:
      "linear-gradient(180deg, rgba(255,40,40,0.98), rgba(180,30,30,0.95))",
    color: "white",
    padding: "12px 14px",
    borderRadius: "8px",
    fontFamily: "sans-serif",
    fontSize: "13px",
    lineHeight: "1.3",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    maxHeight: "60vh",
    overflow: "auto",
    whiteSpace: "pre-wrap",
  })
  el.style.display = "none"
  document.body.appendChild(el)
  return el
}

function showError(message: string) {
  const el = ensureOverlay()
  el.textContent = message
  el.style.display = "block"
}

function hideError() {
  const el = document.getElementById("shango-client-error-overlay")
  if (el) el.style.display = "none"
}

window.addEventListener("error", (ev) => {
  try {
    const msg =
      ev.error && ev.error.stack
        ? ev.error.stack
        : ev.message || String(ev.error || ev)
    showError("Uncaught error:\n" + msg)
    // also log to console
    // eslint-disable-next-line no-console
    console.error(ev.error || ev.message || ev)
  } catch (e) {
    /* ignore */
  }
})

window.addEventListener("unhandledrejection", (ev) => {
  try {
    const reason =
      ev.reason && ev.reason.stack ? ev.reason.stack : String(ev.reason)
    showError("Unhandled promise rejection:\n" + reason)
    // eslint-disable-next-line no-console
    console.error("UnhandledRejection", ev.reason)
  } catch (e) {
    /* ignore */
  }
})

// Expose helpers for manual clearing in console
;(window as any).__shango_clear_error = hideError

// Clear overlay on hot reload or successful mount
setTimeout(() => hideError(), 2000)

export {}
