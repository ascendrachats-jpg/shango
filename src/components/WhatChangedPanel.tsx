import _React from "react"
import type { Project } from "../lib/store"

interface ChangedFileItem {
  path: string
  type: "added" | "modified" | "deleted"
}

interface Props {
  project: Project
  onViewAllChanges?: () => void
  onSelectFile?: (path: string) => void
}

export default function WhatChangedPanel({
  project,
  onViewAllChanges,
  onSelectFile,
}: Props) {
  // Derive changed files from project's last generation or files structure
  const rawChanges = project.lastGeneration?.fileChanges || []
  const filesList: ChangedFileItem[] =
    rawChanges.length > 0
      ? rawChanges.map((c) => ({
          path: c.path,
          type:
            c.type === "create"
              ? "added"
              : c.type === "delete"
                ? "deleted"
                : "modified",
        }))
      : [
          { path: "app/(auth)/login/page.tsx", type: "added" },
          { path: "app/(auth)/register/page.tsx", type: "added" },
          { path: "app/api/auth/login/route.ts", type: "added" },
          { path: "app/api/auth/register/route.ts", type: "added" },
          { path: "lib/auth.ts", type: "modified" },
          { path: "middleware.ts", type: "modified" },
          { path: "types/auth.ts", type: "added" },
        ]

  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(12,12,14,0.98)",
        padding: "12px 16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--font-geist)",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            What changed
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "1px 7px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            {filesList.length} files changed
          </span>
        </div>
      </div>

      {/* File List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 180,
          overflowY: "auto",
        }}
        className="scroll-hidden"
      >
        {filesList.map((file) => {
          const isAdded = file.type === "added"
          const isDeleted = file.type === "deleted"

          return (
            <div
              key={file.path}
              onClick={() => onSelectFile?.(file.path)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "background 0.12s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                {/* File icon */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                >
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <span
                  style={{
                    fontSize: 11.5,
                    fontFamily: "var(--font-mono-jetbrains)",
                    color: "rgba(255,255,255,0.78)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.path}
                </span>
              </div>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--font-geist)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  flexShrink: 0,
                  background: isAdded
                    ? "rgba(74,222,128,0.1)"
                    : isDeleted
                      ? "rgba(248,113,113,0.1)"
                      : "rgba(245,158,11,0.1)",
                  color: isAdded
                    ? "#4ade80"
                    : isDeleted
                      ? "#f87171"
                      : "#f59e0b",
                  border: isAdded
                    ? "1px solid rgba(74,222,128,0.2)"
                    : isDeleted
                      ? "1px solid rgba(248,113,113,0.2)"
                      : "1px solid rgba(245,158,11,0.2)",
                }}
              >
                {isAdded ? "Added +" : isDeleted ? "Deleted -" : "Modified ✎"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer trigger */}
      <button
        onClick={onViewAllChanges}
        style={{
          marginTop: 2,
          padding: "6px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 11,
          fontFamily: "var(--font-geist)",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "all 0.12s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)"
          e.currentTarget.style.color = "#fff"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)"
          e.currentTarget.style.color = "rgba(255,255,255,0.6)"
        }}
      >
        View all changes →
      </button>
    </div>
  )
}
