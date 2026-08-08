import { useEffect } from "react"
import { useApp } from "../store/AppContext"
import { XIcon } from "./icons"

const SHORTCUTS = {
  Navigation: [
    { action: "Command palette", keys: ["⌘", "K"] },
    { action: "Go home", keys: ["⌘", "H"] },
    { action: "Go to projects", keys: ["⌘", "P"] },
    { action: "New project", keys: ["⌘", "N"] },
    { action: "Settings", keys: ["⌘", ","] },
    { action: "Keyboard shortcuts", keys: ["⌘", "/"] },
  ],
  Builder: [
    { action: "Toggle sidebar", keys: ["⌘", "B"] },
    { action: "Toggle conversation", keys: ["⌘", "P"] },
    { action: "Fullscreen preview", keys: ["⌘", "⇧", "F"] },
    { action: "Version history", keys: ["⌘", "Y"] },
    { action: "Deploy", keys: ["⌘", "D"] },
    { action: "Share", keys: ["⌘", "S"] },
  ],
  Conversation: [
    { action: "Submit message", keys: ["↵"] },
    { action: "New line", keys: ["⇧", "↵"] },
    { action: "Regenerate last", keys: ["⌘", "R"] },
    { action: "Stop generation", keys: ["Esc"] },
  ],
  Preview: [
    { action: "Desktop view", keys: ["⌘", "1"] },
    { action: "Tablet view", keys: ["⌘", "2"] },
    { action: "Mobile view", keys: ["⌘", "3"] },
    { action: "Toggle code view", keys: ["⌘", "`"] },
    { action: "Refresh", keys: ["⌘", "R"] },
  ],
  System: [
    { action: "Close / dismiss", keys: ["Esc"] },
    { action: "Select", keys: ["↵"] },
    { action: "Navigate up", keys: ["↑"] },
    { action: "Navigate down", keys: ["↓"] },
  ],
}

export default function KeyboardShortcutOverlay() {
  const { shortcutOverlayOpen, setShortcutOverlayOpen } = useApp()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        setShortcutOverlayOpen((v) => !v)
      }
      if (e.key === "Escape" && shortcutOverlayOpen)
        setShortcutOverlayOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcutOverlayOpen, setShortcutOverlayOpen])

  if (!shortcutOverlayOpen) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-8"
      onClick={() => setShortcutOverlayOpen(false)}
      style={{
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 860,
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          animation: "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Keyboard shortcuts
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Press ⌘/ to toggle this overlay
            </p>
          </div>
          <button
            onClick={() => setShortcutOverlayOpen(false)}
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon size={14} />
          </button>
        </div>
        <div
          className="grid grid-cols-3 gap-0 p-6"
          style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
        >
          {Object.entries(SHORTCUTS).map(([category, shortcuts]) => (
            <div key={category} className="px-4 py-2">
              <h3
                className="text-xs font-medium mb-3"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                }}
              >
                {category.toUpperCase()}
              </h3>
              <div className="flex flex-col gap-2">
                {shortcuts.map((s) => (
                  <div
                    key={s.action}
                    className="flex items-center justify-between gap-4"
                  >
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-geist)",
                      }}
                    >
                      {s.action}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--surface-4)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono-jetbrains)",
                            minWidth: 22,
                            textAlign: "center",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  )
}
