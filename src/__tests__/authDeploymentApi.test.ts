import { describe, expect, it, beforeEach } from "vitest"
import {
  createAuthStore,
  resetAuthStore,
  parseSessionId,
} from "../../server/auth"
import { createDeploymentStore } from "../../server/deployments"

beforeEach(() => {
  resetAuthStore()
})

describe("auth store", () => {
  it("signs up a new user and resolves the session from a cookie header", async () => {
    const store = createAuthStore()
    const result = await store.signUp({
      name: "Builder",
      email: "builder@shango.app",
      password: "secret123",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { sessionId, user } = result
    expect(parseSessionId(`shango_session=${sessionId}`)).toBe(sessionId)
    const resolved = store.getUserFromRequest({
      headers: { cookie: `shango_session=${sessionId}` },
    })
    expect(resolved?.email).toBe("builder@shango.app")
    expect(resolved?.name).toBe("Builder")
    expect(resolved?.id).toBe(user.id)
  })

  it("rejects sign-up when the email is already registered", async () => {
    const store = createAuthStore()
    await store.signUp({
      name: "Builder",
      email: "dup@shango.app",
      password: "secret123",
    })
    const second = await store.signUp({
      name: "Builder 2",
      email: "dup@shango.app",
      password: "secret456",
    })
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.error).toMatch(/already exists/i)
  })

  it("rejects sign-up when password is shorter than 8 characters", async () => {
    const store = createAuthStore()
    const result = await store.signUp({
      name: "Builder",
      email: "short@shango.app",
      password: "abc",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/8 characters/i)
  })

  it("signs in with correct credentials", async () => {
    const store = createAuthStore()
    await store.signUp({
      name: "Builder",
      email: "signin@shango.app",
      password: "correct123",
    })
    const result = await store.signIn({
      email: "signin@shango.app",
      password: "correct123",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.user.email).toBe("signin@shango.app")
    expect(result.sessionId).toBeTruthy()
  })

  it("rejects sign-in with wrong password", async () => {
    const store = createAuthStore()
    await store.signUp({
      name: "Builder",
      email: "wrong@shango.app",
      password: "correct123",
    })
    const result = await store.signIn({
      email: "wrong@shango.app",
      password: "wrongpass",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/incorrect password/i)
  })

  it("rejects sign-in for unknown email", async () => {
    const store = createAuthStore()
    const result = await store.signIn({
      email: "ghost@shango.app",
      password: "pass1234",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/no account/i)
  })

  it("removes the session on sign-out", async () => {
    const store = createAuthStore()
    const result = await store.signUp({
      name: "Builder",
      email: "signout@shango.app",
      password: "secret123",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    store.signOut(result.sessionId)
    expect(store.getSession(result.sessionId)).toBeNull()
  })

  it("getSession returns null for an unknown session id", () => {
    const store = createAuthStore()
    expect(store.getSession("nonexistent-id")).toBeNull()
  })
})

describe("deployment store", () => {
  it("stores new deployment records and returns them in reverse chronological order", () => {
    const store = createDeploymentStore()
    const first = store.createDeployment({
      projectId: "proj-1",
      projectName: "Launchpad",
      target: "vercel",
      status: "live",
      url: "https://launchpad.example.com",
      shortUrl: "launchpad.example.com",
      timestamp: "2024-01-01T00:00:00.000Z",
      duration: 12,
      triggeredBy: "manual",
      version: 1,
      domains: [],
      envVars: [],
      buildLogs: ["first"],
    })
    const second = store.createDeployment({
      projectId: "proj-1",
      projectName: "Launchpad",
      target: "vercel",
      status: "live",
      url: "https://launchpad-2.example.com",
      shortUrl: "launchpad-2.example.com",
      timestamp: "2024-01-02T00:00:00.000Z",
      duration: 14,
      triggeredBy: "manual",
      version: 2,
      domains: [],
      envVars: [],
      buildLogs: ["second"],
    })

    const list = store.listDeployments()

    expect(first.id).toBeDefined()
    expect(second.id).toBeDefined()
    expect(list[0].id).toBe(second.id)
    expect(list[0].buildLogs[0]).toBe("second")
  })

  it("retains a pending local preview without upgrading it to a live release", () => {
    const store = createDeploymentStore()
    const preview = store.createDeployment({
      projectId: "proj-preview",
      projectName: "Preview only",
      target: "vercel",
      status: "preparing",
      url: "https://preview.vercel.app",
      shortUrl: "preview.vercel.app",
      timestamp: "2024-01-03T00:00:00.000Z",
      duration: 0,
      triggeredBy: "manual",
      domains: [
        {
          domain: "preview.vercel.app",
          status: "pending",
          sslStatus: "pending",
          isPrimary: true,
        },
      ],
      envVars: [],
      buildLogs: ["[preview] recorded"],
      isPreview: true,
    })

    expect(preview.status).toBe("preparing")
    expect(preview.isPreview).toBe(true)
    expect(preview.domains[0].status).toBe("pending")
  })
})
