/**
 * usageMeter.ts — Local usage metering for generation credits.
 *
 * Tracks how many generations have been consumed in the current billing period
 * (calendar month). State is persisted to localStorage and resets automatically
 * when the month rolls over.
 *
 * This is a local preview implementation. It never contacts a billing provider.
 * When a real billing service is connected it should replace this module's
 * storage and read path while keeping the same public interface.
 */

const STORAGE_KEY = "shango_usage_meter"

export interface UsagePeriod {
  /** ISO date string for the first day of this period (YYYY-MM-DD). */
  periodStart: string
  /** ISO date string for the first day of the next period (YYYY-MM-DD). */
  periodEnd: string
  /** Number of generation credits consumed this period. */
  used: number
  /** Generation credit limit for this period based on the plan. */
  limit: number
}

export type UsagePlan = "free" | "pro"

const PLAN_LIMITS: Record<UsagePlan, number> = {
  free: 50,
  pro: 500,
}

/** Return YYYY-MM-DD for the first day of the month containing `date`. */
function periodStartForDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

/** Return YYYY-MM-DD for the first day of the month after `date`. */
function periodEndForDate(date: Date): string {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`
}

/** Return a fresh UsagePeriod for the month containing `now`. */
function freshPeriod(now: Date, plan: UsagePlan): UsagePeriod {
  return {
    periodStart: periodStartForDate(now),
    periodEnd: periodEndForDate(now),
    used: 0,
    limit: PLAN_LIMITS[plan],
  }
}

interface PersistedMeter {
  periodStart: string
  used: number
  limit: number
}

function loadPersisted(): PersistedMeter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.periodStart === "string" &&
      typeof parsed.used === "number" &&
      typeof parsed.limit === "number"
    ) {
      return parsed as PersistedMeter
    }
    return null
  } catch {
    return null
  }
}

function savePersisted(period: UsagePeriod): void {
  try {
    const data: PersistedMeter = {
      periodStart: period.periodStart,
      used: period.used,
      limit: period.limit,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable — silent; meter still works in-memory
  }
}

/**
 * Read current usage state for the given plan.
 *
 * If the persisted period belongs to a previous month the meter resets
 * automatically and saves the fresh state.
 */
export function readUsagePeriod(
  plan: UsagePlan,
  now: Date = new Date(),
): UsagePeriod {
  const currentStart = periodStartForDate(now)
  const persisted = loadPersisted()

  if (persisted && persisted.periodStart === currentStart) {
    // Stored period matches current month; honour it but recompute limit
    // in case the plan changed since the last save.
    const limit = PLAN_LIMITS[plan]
    return {
      periodStart: currentStart,
      periodEnd: periodEndForDate(now),
      used: persisted.used,
      limit,
    }
  }

  // Stale or absent — start fresh.
  const period = freshPeriod(now, plan)
  savePersisted(period)
  return period
}

/**
 * Record one generation credit consumed.
 *
 * Returns the updated UsagePeriod. Calling code should treat the return value
 * as the new canonical state; it is also persisted to localStorage.
 */
export function recordGeneration(
  plan: UsagePlan,
  now: Date = new Date(),
): UsagePeriod {
  const current = readUsagePeriod(plan, now)
  const next: UsagePeriod = { ...current, used: current.used + 1 }
  savePersisted(next)
  return next
}

/**
 * True when the builder has consumed all available credits for the period.
 */
export function isOverLimit(period: UsagePeriod): boolean {
  return period.used >= period.limit
}

/**
 * Fraction consumed (0–1). Useful for progress bars.
 */
export function usageFraction(period: UsagePeriod): number {
  if (period.limit <= 0) return 0
  return Math.min(period.used / period.limit, 1)
}

/**
 * Human-readable reset date, e.g. "September 1".
 */
export function resetLabel(period: UsagePeriod): string {
  const d = new Date(period.periodEnd + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

/** Reset the persisted meter (used by tests and account deletion). */
export function clearUsageMeter(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}
