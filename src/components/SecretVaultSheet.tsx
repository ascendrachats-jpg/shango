import { useState, useEffect } from "react"
import {
  X,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  } from "lucide-react"
import { useApp } from "../store/AppContext"
import type { Project } from "../lib/store"

interface Props {
  open: boolean
  onClose: () => void
  project: Project
}

interface SecretEntry {
  key: string
  value: string
  isMasked: boolean
  updatedAt: string
}

const COMMON_PRESETS = [
  { key: "GEMINI_API_KEY", placeholder: "AI Studio Gemini API key" },
  { key: "DATABASE_URL", placeholder: "postgresql://user:pass@host:5432/db" },
  { key: "STRIPE_SECRET_KEY", placeholder: "sk_test_51..." },
  { key: "FIREBASE_API_KEY", placeholder: "AIzaSy..." },
  { key: "GITHUB_TOKEN", placeholder: "ghp_..." },
]

export default function SecretVaultSheet({ open, onClose, project }: Props) {
  const { updateWorkspaceFile, addToast } = useApp()

  // Parse existing .env or project files for initial keys
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    if (!open) return

    // Find .env file in project
    const envFile = project.files?.find(
      (f) => f.path === ".env" || f.name === ".env",
    )
    const initialSecrets: SecretEntry[] = []

    if (envFile && envFile.content) {
      const lines = envFile.content.split("\n")
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const eqIdx = trimmed.indexOf("=")
          const k = trimmed.slice(0, eqIdx).trim()
          const v = trimmed
            .slice(eqIdx + 1)
            .trim()
            .replace(/^["']|["']$/g, "")
          if (k) {
            initialSecrets.push({
              key: k,
              value: v,
              isMasked: true,
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
            })
          }
        }
      }
    }

    // Default fallback secrets if none exist yet
    if (initialSecrets.length === 0) {
      initialSecrets.push(
        {
          key: "GEMINI_API_KEY",
          value: "AIzaSy_SHANGO_PROD_PROXY_KEY",
          isMasked: true,
          updatedAt: "Just now",
        },
        {
          key: "NODE_ENV",
          value: "development",
          isMasked: false,
          updatedAt: "System",
        },
      )
    }

    setSecrets(initialSecrets)
  }, [open, project])

  if (!open) return null

  // Sync back to .env file in workspace
  const syncToEnvFile = (updatedSecrets: SecretEntry[]) => {
    const envContent = updatedSecrets
      .map((s) => `${s.key}=${s.value}`)
      .join("\n")
    updateWorkspaceFile(".env", envContent)
  }

  const handleAddSecret = () => {
    const k = newKey
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
    if (!k) {
      addToast("Secret key cannot be empty", "error")
      return
    }
    if (secrets.some((s) => s.key === k)) {
      addToast(`Secret key ${k} already exists`, "error")
      return
    }

    const next = [
      ...secrets,
      {
        key: k,
        value: newValue,
        isMasked: true,
        updatedAt: "Just now",
      },
    ]
    setSecrets(next)
    syncToEnvFile(next)
    setNewKey("")
    setNewValue("")
    addToast(`Added secret ${k}`, "success")
  }

  const handleDeleteSecret = (keyToDelete: string) => {
    const next = secrets.filter((s) => s.key !== keyToDelete)
    setSecrets(next)
    syncToEnvFile(next)
    addToast(`Removed secret ${keyToDelete}`, "default")
  }

  const handleToggleMask = (keyToToggle: string) => {
    setSecrets((prev) =>
      prev.map((s) =>
        s.key === keyToToggle ? { ...s, isMasked: !s.isMasked } : s,
      ),
    )
  }

  const handleCopySecret = (s: SecretEntry) => {
    navigator.clipboard.writeText(s.value)
    setCopiedKey(s.key)
    addToast(`Copied ${s.key} to clipboard`, "success")
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const _handleStartEdit = (s: SecretEntry) => {
    setEditingKey(s.key)
    setEditValue(s.value)
  }

  const handleSaveEdit = (key: string) => {
    const next = secrets.map((s) =>
      s.key === key ? { ...s, value: editValue, updatedAt: "Just now" } : s,
    )
    setSecrets(next)
    syncToEnvFile(next)
    setEditingKey(null)
    addToast(`Updated ${key}`, "success")
  }

  const handleAddPreset = (presetKey: string) => {
    if (secrets.some((s) => s.key === presetKey)) {
      addToast(`${presetKey} is already in secret vault`, "default")
      return
    }
    setNewKey(presetKey)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 580,
          maxWidth: "100%",
          maxHeight: "90vh",
          background: "#0d0d10",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "shango-panel-enter 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar header */}
        <div
          style={{
            height: 56,
            padding: "0 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(234, 179, 8, 0.12)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#eab308",
              }}
            >
              <Lock size={16} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#f3f4f6",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Secret Vault & Environment Variables
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Encrypted `.env` injection for project APIs & services
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"
              e.currentTarget.style.color = "#fff"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Security Info Banner */}
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(34, 197, 94, 0.06)",
            borderBottom: "1px solid rgba(34, 197, 94, 0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11.5,
            color: "#4ade80",
            fontFamily: "var(--font-geist)",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Server Proxy Active:</strong> Secrets are masked client-side
            and automatically injected into backend proxy requests (`/api/*`).
          </span>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
          className="scroll-hidden"
        >
          {/* Quick presets */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.08em",
                marginBottom: 8,
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              RECOMMENDED PRESETS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COMMON_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleAddPreset(p.key)}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono-jetbrains)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"
                    e.currentTarget.style.color = "#fff"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)"
                  }}
                >
                  + {p.key}
                </button>
              ))}
            </div>
          </div>

          {/* Add Secret Form */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#e5e7eb",
                fontFamily: "var(--font-geist)",
              }}
            >
              Add New Environment Secret
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="VARIABLE_NAME (e.g. STRIPE_KEY)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                style={{
                  flex: "1 1 200px",
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 7,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: "var(--font-mono-jetbrains)",
                  outline: "none",
                }}
              />
              <input
                type="password"
                placeholder="Secret value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                style={{
                  flex: "1 1 200px",
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 7,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: "var(--font-mono-jetbrains)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAddSecret}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 7,
                  background: "#22c55e",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.15s",
                }}
              >
                <Plus size={14} /> Add Key
              </button>
            </div>
          </div>

          {/* Secrets List */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.08em",
                marginBottom: 10,
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              ACTIVE SECRETS ({secrets.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {secrets.map((s) => (
                <div
                  key={s.key}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#60a5fa",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {s.key}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.25)",
                          fontFamily: "var(--font-mono-jetbrains)",
                        }}
                      >
                        {s.updatedAt}
                      </span>
                    </div>

                    {editingKey === s.key ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            flex: 1,
                            height: 28,
                            padding: "0 8px",
                            borderRadius: 5,
                            background: "#000",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            fontSize: 11,
                            fontFamily: "var(--font-mono-jetbrains)",
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(s.key)}
                          style={{
                            padding: "0 10px",
                            borderRadius: 5,
                            background: "#22c55e",
                            color: "#000",
                            fontSize: 11,
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.6)",
                          fontFamily: "var(--font-mono-jetbrains)",
                          marginTop: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.isMasked ? "••••••••••••••••••••••••" : s.value}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      onClick={() => handleToggleMask(s.key)}
                      title={s.isMasked ? "Show value" : "Hide value"}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.4)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#fff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
                      }
                    >
                      {s.isMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    <button
                      onClick={() => handleCopySecret(s)}
                      title="Copy secret"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color:
                          copiedKey === s.key
                            ? "#4ade80"
                            : "rgba(255,255,255,0.4)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {copiedKey === s.key ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteSecret(s.key)}
                      title="Delete secret"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "rgba(239, 68, 68, 0.6)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#ef4444")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(239, 68, 68, 0.6)")
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.02)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            Syncs with workspace `.env` file
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
