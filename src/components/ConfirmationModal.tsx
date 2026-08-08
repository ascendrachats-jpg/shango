import { XIcon } from "./icons"
import type { ReactNode } from "react"
import { useEffect } from "react"

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  details?: ReactNode
}

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  details,
}: Props) {
  useEffect(() => {
    if (!open) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", dismissOnEscape)
    return () => window.removeEventListener("keydown", dismissOnEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-message"
        className="relative rounded-xl overflow-hidden w-full"
        style={{
          maxWidth: 360,
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            id="confirmation-modal-title"
            className="text-sm font-semibold"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close confirmation"
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon size={13} />
          </button>
        </div>
        <div className="p-5">
          <p
            id="confirmation-modal-message"
            className="text-sm leading-relaxed"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
              marginBottom: details ? 12 : 20,
            }}
          >
            {message}
          </p>
          {details}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface-3)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist)",
                border: "1px solid var(--border-default)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: destructive ? "rgba(255,60,60,0.15)" : "white",
                color: destructive ? "rgba(255,120,120,0.9)" : "#0a0a0a",
                border: destructive ? "1px solid rgba(255,60,60,0.3)" : "none",
                fontFamily: "var(--font-geist)",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
