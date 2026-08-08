import { describe, expect, it } from "vitest"
import {
  getRequestClientKey,
  SlidingWindowRateLimiter,
} from "../../server/rateLimit"

describe("generation rate limit", () => {
  it("limits requests per client within a sliding window and resets after it", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000)

    expect(limiter.consume("client-a", 100).allowed).toBe(true)
    expect(limiter.consume("client-a", 200).allowed).toBe(true)
    expect(limiter.consume("client-a", 300)).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterMs: 800,
    })
    expect(limiter.consume("client-a", 1_101)).toMatchObject({
      allowed: true,
      remaining: 0,
    })
  })

  it("keeps client identities separate and normalizes IPv4-mapped addresses", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000)
    expect(limiter.consume("client-a", 0).allowed).toBe(true)
    expect(limiter.consume("client-b", 0).allowed).toBe(true)
    expect(
      getRequestClientKey({ socket: { remoteAddress: "::ffff:127.0.0.1" } }),
    ).toBe("127.0.0.1")
  })
})
