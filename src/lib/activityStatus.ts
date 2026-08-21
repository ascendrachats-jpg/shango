/**
 * ActivityStatus — the 8-state model for conversation activity.
 *
 * Every state reflects a real event from the generation pipeline.
 * No fake typing, no fake thinking, no arbitrary timers, no simulated AI activity.
 * The conversation area is driven entirely by what actually happens.
 *
 * States:
 *   idle        — nothing is happening; ready for the next request
 *   understanding — a request was sent; Shango is interpreting it
 *   building    — file operations are being applied to the workspace
 *   validating  — the workspace is being checked (TypeScript, entry points, imports)
 *   repairing   — validation failed and a repair attempt is in progress
 *   ready       — the build completed successfully; Preview reflects reality
 *   failed      — the build could not complete; the user can retry
 *   stopped     — the user cancelled the build
 */

export type ActivityStateKey =
  | "idle"
  | "understanding"
  | "building"
  | "validating"
  | "repairing"
  | "ready"
  | "failed"
  | "stopped"

export interface ActivityStatus {
  status: ActivityStateKey
  /** Optional factual details (e.g. the file path being changed). */
  details?: {
    filesChanged?: number
    path?: string
  }
  /** Optional factual message override — no marketing language. */
  message?: string
}

export const initialActivityStatus: ActivityStatus = {
  status: "idle",
}

/**
 * Map a raw pipeline status string (emitted by server/generationPipeline/pipeline.ts)
 * to one of the 8 ActivityStateKey values. This is the single source of truth
 * that connects real backend events to the conversation UI.
 */
export function pipelineStatusToState(raw: string): ActivityStateKey {
  switch (raw) {
    case "request_received":
    case "planning":
    case "architecting":
      return "understanding"
    case "executing":
    case "file_created":
    case "file_updated":
    case "file_deleted":
      return "building"
    case "validating":
    case "validation_passed":
      return "validating"
    case "validation_failed":
    case "repair_started":
    case "repair_completed":
      return "repairing"
    case "build_completed":
      return "ready"
    case "build_failed":
    case "repair_failed":
      return "failed"
    default:
      // Unknown status strings default to understanding (safest active state).
      return "understanding"
  }
}

/**
 * Produce a quiet, factual human-readable line for the current activity state.
 * No exclamation marks, no marketing language, no lifecycle jargon.
 */
export function statusToLine(
  s: ActivityStatus,
): { title: string; description?: string; color?: string } {
  if (s.message) {
    return { title: s.message }
  }

  switch (s.status) {
    case "idle":
      return { title: "Ready" }
    case "understanding":
      return { title: "Understanding your request" }
    case "building":
      return {
        title: s.details?.path ? `Writing ${s.details.path}` : "Writing files",
      }
    case "validating":
      return { title: "Checking your app" }
    case "repairing":
      return { title: "Fixing an issue" }
    case "ready":
      return { title: "Your app is ready in Preview" }
    case "failed":
      return { title: "The build could not finish. You can retry." }
    case "stopped":
      return { title: "Stopped" }
    default:
      return { title: "Ready" }
  }
}
