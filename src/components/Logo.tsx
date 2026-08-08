interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showWordmark?: boolean
  className?: string
}

const sizes = {
  sm: { mark: 20, text: 13 },
  md: { mark: 28, text: 16 },
  lg: { mark: 40, text: 22 },
  xl: { mark: 64, text: 36 },
}

export default function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: LogoProps) {
  const { mark, text } = sizes[size]

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg width={mark} height={mark} viewBox="0 0 40 40" fill="none">
        <path
          d="M24 4L8 22H20L16 36L32 18H20L24 4Z"
          fill="white"
          opacity="0.95"
        />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontSize: text,
            fontFamily: "var(--font-geist)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "white",
          }}
        >
          SHANGO
        </span>
      )}
    </div>
  )
}
