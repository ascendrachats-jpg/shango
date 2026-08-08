import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import {
  readUsagePeriod,
  recordGeneration,
  isOverLimit,
  usageFraction,
  resetLabel,
  clearUsageMeter,
} from "../lib/usageMeter"

// Minimal localStorage mock shared across tests
function makeLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k])
    },
  }
}

describe("usageMeter", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeLocalStorageMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── readUsagePeriod ──────────────────────────────────────────────────────

  describe("readUsagePeriod", () => {
    it("returns a fresh period with 0 used when nothing is persisted", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      const period = readUsagePeriod("free", now)
      expect(period.used).toBe(0)
      expect(period.limit).toBe(50)
      expect(period.periodStart).toBe("2026-08-01")
      expect(period.periodEnd).toBe("2026-09-01")
    })

    it("applies the correct limit for the pro plan", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      const period = readUsagePeriod("pro", now)
      expect(period.limit).toBe(500)
    })

    it("persists the fresh period so a second read returns the same data", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      readUsagePeriod("free", now)
      const second = readUsagePeriod("free", now)
      expect(second.used).toBe(0)
      expect(second.periodStart).toBe("2026-08-01")
    })

    it("resets when the stored period belongs to a prior month", () => {
      const july = new Date("2026-07-15T00:00:00Z")
      // Write a July period with some usage
      const julyPeriod = readUsagePeriod("free", july)
      // Simulate usage
      recordGeneration("free", july)
      recordGeneration("free", july)

      // Now read as August — should get a fresh period
      const august = new Date("2026-08-03T12:00:00Z")
      const period = readUsagePeriod("free", august)
      expect(period.used).toBe(0)
      expect(period.periodStart).toBe("2026-08-01")
      // Silence TS "used but never read" warning
      void julyPeriod
    })

    it("honours persisted usage when the period matches the current month", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      recordGeneration("free", now)
      recordGeneration("free", now)
      const period = readUsagePeriod("free", now)
      expect(period.used).toBe(2)
    })

    it("recomputes the limit from the plan even when the stored limit differs", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      // Seed as free
      readUsagePeriod("free", now)
      // Read as pro — limit must update
      const period = readUsagePeriod("pro", now)
      expect(period.limit).toBe(500)
    })
  })

  // ── recordGeneration ─────────────────────────────────────────────────────

  describe("recordGeneration", () => {
    it("increments used by 1 on each call", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      const p1 = recordGeneration("free", now)
      expect(p1.used).toBe(1)
      const p2 = recordGeneration("free", now)
      expect(p2.used).toBe(2)
    })

    it("persists the incremented count", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      recordGeneration("free", now)
      recordGeneration("free", now)
      const period = readUsagePeriod("free", now)
      expect(period.used).toBe(2)
    })

    it("continues incrementing beyond the limit (clamping is UI concern)", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      for (let i = 0; i < 52; i++) recordGeneration("free", now)
      const period = readUsagePeriod("free", now)
      expect(period.used).toBe(52)
    })
  })

  // ── isOverLimit ──────────────────────────────────────────────────────────

  describe("isOverLimit", () => {
    it("returns false when used < limit", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      const period = readUsagePeriod("free", now)
      expect(isOverLimit(period)).toBe(false)
    })

    it("returns true when used equals limit", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      let period = readUsagePeriod("free", now)
      for (let i = 0; i < 50; i++) period = recordGeneration("free", now)
      expect(isOverLimit(period)).toBe(true)
    })

    it("returns true when used exceeds limit", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      let period = readUsagePeriod("free", now)
      for (let i = 0; i < 55; i++) period = recordGeneration("free", now)
      expect(isOverLimit(period)).toBe(true)
    })
  })

  // ── usageFraction ────────────────────────────────────────────────────────

  describe("usageFraction", () => {
    it("returns 0 for a fresh period", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      const period = readUsagePeriod("free", now)
      expect(usageFraction(period)).toBe(0)
    })

    it("returns 0.5 when half the limit is consumed", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      let period = readUsagePeriod("free", now)
      for (let i = 0; i < 25; i++) period = recordGeneration("free", now)
      expect(usageFraction(period)).toBeCloseTo(0.5)
    })

    it("clamps to 1 when over limit", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      let period = readUsagePeriod("free", now)
      for (let i = 0; i < 60; i++) period = recordGeneration("free", now)
      expect(usageFraction(period)).toBe(1)
    })

    it("returns 0 when limit is 0 (guard against division by zero)", () => {
      expect(
        usageFraction({ periodStart: "", periodEnd: "", used: 10, limit: 0 }),
      ).toBe(0)
    })
  })

  // ── resetLabel ───────────────────────────────────────────────────────────

  describe("resetLabel", () => {
    it("returns the human-readable first day of the next month", () => {
      const period = readUsagePeriod("free", new Date("2026-08-03T12:00:00Z"))
      // periodEnd is 2026-09-01 → "September 1"
      expect(resetLabel(period)).toBe("September 1")
    })

    it("handles December → January roll-over", () => {
      const period = readUsagePeriod("free", new Date("2026-12-15T12:00:00Z"))
      expect(resetLabel(period)).toBe("January 1")
    })
  })

  // ── clearUsageMeter ──────────────────────────────────────────────────────

  describe("clearUsageMeter", () => {
    it("causes the next read to return a fresh period", () => {
      const now = new Date("2026-08-03T12:00:00Z")
      recordGeneration("free", now)
      recordGeneration("free", now)
      clearUsageMeter()
      const period = readUsagePeriod("free", now)
      expect(period.used).toBe(0)
    })
  })
})
