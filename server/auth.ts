/**
 * server/auth.ts — In-process auth store for the Vite dev server.
 *
 * Provides real email+password sign-up and sign-in backed by an in-memory
 * user registry and session map. Passwords are hashed with Node's built-in
 * `crypto.scrypt`. Sessions are identified by a random UUID stored in an
 * HttpOnly cookie.
 *
 * This store is intentionally in-process: it resets on server restart. It is
 * the correct foundation for this environment (Vite dev / Figma Make preview)
 * where a live database is not yet connected. When a real database is wired
 * the public interface (`signUp`, `signIn`, `getSession`, `signOut`) stays
 * identical — only the storage layer changes.
 */

import { randomUUID, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar?: string
  plan: "free" | "pro"
}

export interface AuthSession {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

export interface SignInInput {
  email: string
  password: string
}

export type AuthResult = { ok: true; user: AuthUser; sessionId: string } | {
  ok: false
  error: string
}

// ── Password helpers ──────────────────────────────────────────────────────────

const SALT_LEN = 16
const KEY_LEN = 32

async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID().replace(/-/g, "").slice(0, SALT_LEN)
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer
  return `${salt}:${derived.toString("hex")}`
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hex] = stored.split(":")
  if (!salt || !hex) return false
  try {
    const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer
    const stored_buf = Buffer.from(hex, "hex")
    if (derived.length !== stored_buf.length) return false
    return timingSafeEqual(derived, stored_buf)
  } catch {
    return false
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface StoredUser {
  user: AuthUser
  passwordHash: string
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

class AuthStore {
  private users = new Map<string, StoredUser>() // keyed by normalised email
  private sessions = new Map<string, AuthSession>() // keyed by session id

  // ── Registration ────────────────────────────────────────────────────────

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()
    const password = input.password

    if (!email || !name)
      return { ok: false, error: "Name and email are required." }
    if (password.length < 8)
      return { ok: false, error: "Password must be at least 8 characters." }
    if (this.users.has(email))
      return { ok: false, error: "An account with that email already exists." }

    const passwordHash = await hashPassword(password)
    const user: AuthUser = {
      id: randomUUID(),
      name,
      email,
      avatar: "",
      plan: "free",
    }
    this.users.set(email, { user, passwordHash })

    const sessionId = this.createSession(user.id)
    return { ok: true, user, sessionId }
  }

  // ── Sign-in ─────────────────────────────────────────────────────────────

  async signIn(input: SignInInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const record = this.users.get(email)
    if (!record) return { ok: false, error: "No account found for that email." }

    const valid = await verifyPassword(input.password, record.passwordHash)
    if (!valid) return { ok: false, error: "Incorrect password." }

    const sessionId = this.createSession(record.user.id)
    return { ok: true, user: record.user, sessionId }
  }

  // ── Session management ───────────────────────────────────────────────────

  private createSession(userId: string): string {
    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    return sessionId
  }

  getSession(sessionId: string | null | undefined): {
    session: AuthSession
    user: AuthUser
  } | null {
    if (!sessionId) return null
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId)
      return null
    }
    // Look up the user by id across all stored users
    const record = [...this.users.values()].find(
      (r) => r.user.id === session.userId,
    )
    if (!record) return null
    return { session, user: record.user }
  }

  getUserFromRequest(req: {
    headers?: Record<string, string | undefined>
  }): AuthUser | null {
    const sessionId = parseSessionId(req.headers?.cookie)
    return this.getSession(sessionId)?.user ?? null
  }

  signOut(sessionId: string | null | undefined): void {
    if (sessionId) this.sessions.delete(sessionId)
  }

  // ── Plan management (called by setPlan in AppContext via API) ────────────

  setPlan(userId: string, plan: "free" | "pro"): boolean {
    const record = [...this.users.values()].find((r) => r.user.id === userId)
    if (!record) return false
    record.user = { ...record.user, plan }
    // Update the map entry in place
    this.users.set(record.user.email, record)
    return true
  }
}

// ── Cookie helper ──────────────────────────────────────────────────────────────

export function parseSessionId(cookieHeader?: string): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("shango_session="))
  return match
    ? decodeURIComponent(match.slice("shango_session=".length))
    : null
}

export function sessionCookieHeader(
  sessionId: string,
  maxAgeSeconds = SESSION_TTL_MS / 1000,
): string {
  return `shango_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export function clearSessionCookieHeader(): string {
  return `shango_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let store: AuthStore | null = null

export function createAuthStore(): AuthStore {
  if (!store) store = new AuthStore()
  return store
}

/** Reset the singleton — used by tests only. */
export function resetAuthStore(): void {
  store = null
}
