export interface RateLimitDecision {
  allowed: boolean
  retryAfterMs: number
  remaining: number
}

/**
 * Process-local protection for expensive generation requests. Production
 * deployment should replace this with a shared, provider-aware limiter.
 */
export class SlidingWindowRateLimiter {
  private readonly requests = new Map<string, number[]>()

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()): RateLimitDecision {
    const threshold = now - this.windowMs
    const recent = (this.requests.get(key) ?? []).filter(
      (timestamp) => timestamp > threshold,
    )

    if (recent.length >= this.maxRequests) {
      this.requests.set(key, recent)
      return {
        allowed: false,
        retryAfterMs: Math.max(0, recent[0]! + this.windowMs - now),
        remaining: 0,
      }
    }

    recent.push(now)
    this.requests.set(key, recent)
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: this.maxRequests - recent.length,
    }
  }
}

export function getRequestClientKey(request: {
  socket?: { remoteAddress?: string | undefined }
}): string {
  const address = request.socket?.remoteAddress?.trim()
  return address?.replace(/^::ffff:/, "") || "unknown-client"
}
