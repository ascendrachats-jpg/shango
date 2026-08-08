export interface DiagnosticEntry {
  ts: string
  event: string
  details: Record<string, any>
}

const DIAG_KEY = "shango-diagnostics-v1"

function safeStringify(v: any) {
  try {
    return JSON.stringify(v)
  } catch (e) {
    return String(v)
  }
}

export function recordDiagnostic(entry: DiagnosticEntry) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.push(entry)
    // keep only last 50 entries
    const trimmed = arr.slice(-50)
    window.localStorage.setItem(DIAG_KEY, JSON.stringify(trimmed))
  } catch (error) {
    try {
      window.localStorage.setItem(
        DIAG_KEY,
        safeStringify({
          ts: new Date().toISOString(),
          event: "diagnostic-write-failed",
          details: { error: String(error) },
        }),
      )
    } catch (_) {
      /* ignore */
    }
  }
}

export function readDiagnostics(): DiagnosticEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

export function clearDiagnostics() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(DIAG_KEY)
  } catch (_) {}
}

export default { recordDiagnostic, readDiagnostics, clearDiagnostics }
