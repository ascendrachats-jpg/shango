import { useEffect, useRef } from "react"

export interface MenuItem {
  label: string
  icon?: React.ReactNode
  action: () => void
  destructive?: boolean
  separator?: boolean
}

interface Props {
  items: MenuItem[]
  x: number
  y: number
  onClose: () => void
}

export default function ContextMenu({ items, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [onClose])

  const adjustedX = Math.min(x, window.innerWidth - 180)
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16)

  return (
    <div
      ref={ref}
      className="fixed z-[500] rounded-xl overflow-hidden py-1"
      style={{
        left: adjustedX,
        top: adjustedY,
        background: "var(--surface-3)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 160,
        animation: "contextMenuIn 0.1s ease",
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={i}
            className="my-1"
            style={{ height: 1, background: "var(--border-subtle)" }}
          />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.action()
              onClose()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors text-xs hover:bg-white/5"
            style={{
              color: item.destructive
                ? "rgba(255,100,100,0.9)"
                : "var(--text-secondary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>
  )
}
