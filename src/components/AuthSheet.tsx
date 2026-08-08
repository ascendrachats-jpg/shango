import { useEffect, useRef, useState } from "react"
import { useApp, type User } from "../store/AppContext"
import { savePersistedUser } from "../lib/persistence"
import { XIcon, ZapIcon } from "./icons"

import { auth } from "../lib/firebase/config"
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = "signin" | "signup"

function _applyServerUser(raw: Record<string, unknown>): User {
  return {
    name: typeof raw.name === "string" ? raw.name : "Builder",
    email: typeof raw.email === "string" ? raw.email : "",
    avatar: typeof raw.avatar === "string" ? raw.avatar : "",
    plan: raw.plan === "pro" ? "pro" : "free",
  }
}

export default function AuthSheet({ open, onClose }: Props) {
  const {
    setCurrentUser,
    projects,
    addToast,
    addNotification,
    loadServerProjects,
  } = useApp()
  const [tab, setTab] = useState<Tab>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Reset form state when the sheet opens
  useEffect(() => {
    if (!open) return
    setFieldError(null)
    setLoading(false)
    setTimeout(() => firstFieldRef.current?.focus(), 60)
  }, [open, tab])

  // Escape dismissal
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  // ── Helpers ──────────────────────────────────────────────────────────────

  function validateSignIn(): string | null {
    if (!email.trim()) return "Email is required."
    if (!password) return "Password is required."
    return null
  }

  function validateSignUp(): string | null {
    if (!name.trim()) return "Name is required."
    if (!email.trim()) return "Email is required."
    if (password.length < 8) return "Password must be at least 8 characters."
    return null
  }

  function onSuccess(user: User) {
    setCurrentUser(user)
    savePersistedUser(user)
    addToast(`Welcome, ${user.name}`, "success")
    if (projects.length > 0) {
      addNotification(
        `${projects.length} project${
          projects.length > 1 ? "s are" : " is"
        } available in your workspace.`,
      )
    }
    // Fetch this user's server-side projects and merge into local state.
    void loadServerProjects()
    onClose()
  }

  // ── Sign-in ───────────────────────────────────────────────────────────────

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    const err = validateSignIn()
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError(null)
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      )

      const realUser = {
        name: result.user.displayName || email.trim().split("@")[0],
        email: result.user.email || email.trim(),
        avatar:
          result.user.photoURL ||
          "https://lh3.googleusercontent.com/a/default-user",
        plan: "pro" as const,
      }
      onSuccess(realUser)
    } catch (err: any) {
      setFieldError(err.message || "Sign-in failed.")
    } finally {
      setLoading(false)
    }
  }

  // ── Sign-up ───────────────────────────────────────────────────────────────

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    const err = validateSignUp()
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError(null)
    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      )

      const realUser = {
        name: name.trim(),
        email: result.user.email || email.trim(),
        avatar: "https://lh3.googleusercontent.com/a/default-user",
        plan: "pro" as const,
      }
      onSuccess(realUser)
    } catch (err: any) {
      setFieldError(err.message || "Sign-up failed.")
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input style ────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-geist)",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 13,
    width: "100%",
    outline: "none",
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl w-full overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        style={{
          maxWidth: 400,
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          animation: "shango-panel-enter 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <ZapIcon
              size={20}
              className="mb-3"
              style={{ color: "var(--text-primary)" }}
            />
            <h2
              id="auth-sheet-title"
              className="text-lg font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
                letterSpacing: "-0.01em",
              }}
            >
              {tab === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p
              className="text-sm mt-1"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                lineHeight: 1.55,
              }}
            >
              {tab === "signin"
                ? "Sign in to access your projects."
                : "Your work lives here. Build something meaningful."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md"
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          className="flex mx-6 mb-4 rounded-lg overflow-hidden"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
          }}
          role="tablist"
        >
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t)
                setFieldError(null)
              }}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                fontFamily: "var(--font-geist)",
                background: tab === t ? "var(--surface-4)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                borderRadius: 6,
                margin: 2,
              }}
            >
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={tab === "signin" ? handleSignIn : handleSignUp}
          className="px-6 pb-6 flex flex-col gap-3"
          noValidate
        >
          {tab === "signup" && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs mb-1.5"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                Name
              </label>
              <input
                ref={tab === "signup" ? firstFieldRef : undefined}
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs mb-1.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Email
            </label>
            <input
              ref={tab === "signin" ? firstFieldRef : undefined}
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs mb-1.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Password
              {tab === "signup" && (
                <span
                  style={{
                    marginLeft: 4,
                    color: "var(--text-disabled)",
                    fontSize: 10,
                  }}
                >
                  (min 8 characters)
                </span>
              )}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                tab === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* Field error */}
          {fieldError && (
            <p
              role="alert"
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "#fca5a5",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.18)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {fieldError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
            style={{
              background: loading ? "rgba(255,255,255,0.5)" : "white",
              color: "#0a0a0a",
              fontFamily: "var(--font-geist)",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? tab === "signin"
                ? "Signing in…"
                : "Creating account…"
              : tab === "signin"
                ? "Sign in"
                : "Create account"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div
              style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}
            />
            <span
              className="text-xs"
              style={{
                color: "var(--text-disabled)",
                fontFamily: "var(--font-geist)",
              }}
            >
              social login
            </span>
            <div
              style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}
            />
          </div>

          {/* OAuth Social Logins */}
          <div className="flex flex-col gap-2">
            {(["GitHub", "Google"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={async () => {
                  setLoading(true)
                  addToast(`Connecting to ${provider}...`, "default")

                  try {
                    const authProvider =
                      provider === "Google"
                        ? new GoogleAuthProvider()
                        : new GithubAuthProvider()
                    const result = await signInWithPopup(auth, authProvider)

                    const realUser = {
                      name: result.user.displayName || "Developer",
                      email: result.user.email || "user@example.com",
                      avatar:
                        result.user.photoURL || "https://github.com/github.png",
                      plan: "pro" as const,
                    }
                    onSuccess(realUser)
                  } catch (err: any) {
                    addToast(
                      `Failed to sign in with ${provider}: ${err.message}`,
                      "error",
                    )
                  } finally {
                    setLoading(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm transition-all hover:bg-white/10"
                style={{
                  background: "var(--surface-1)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-geist)",
                  cursor: "pointer",
                }}
              >
                {provider === "GitHub" ? (
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                ) : (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                Continue with {provider}
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    fontFamily: "var(--font-mono-jetbrains)",
                  }}
                >
                  OAUTH
                </span>
              </button>
            ))}
          </div>

          <p
            className="text-center text-xs mt-1"
            style={{
              color: "var(--text-disabled)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.5,
            }}
          >
            By continuing you agree to our{" "}
            <span
              style={{
                textDecoration: "underline",
                cursor: "pointer",
                opacity: 0.8,
              }}
            >
              Terms
            </span>{" "}
            and{" "}
            <span
              style={{
                textDecoration: "underline",
                cursor: "pointer",
                opacity: 0.8,
              }}
            >
              Privacy Policy
            </span>
            .
          </p>
        </form>
      </div>
    </div>
  )
}
