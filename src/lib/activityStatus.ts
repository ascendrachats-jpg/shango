export type ActivityStateKey =
  | "awaiting_direction"
  | "request_sent"
  | "request_received"
  | "understanding"
  | "planning"
  | "architecting"
  | "preparing"
  | "executing"
  | "file_created"
  | "file_updated"
  | "file_deleted"
  | "validation_started"
  | "validation_failed"
  | "runtime_error"
  | "repair_started"
  | "repair_completed"
  | "preview_updated"
  | "build_completed"
  | "build_failed"
  | "cancelled"
  | "assistant_composing"
  | "applying_workspace_changes"
  | "workspace_updated"
  | "ready_for_refinement"
  | "generation_stopped"
  | "generation_failed"

export interface ActivityStatus {
  status: ActivityStateKey
  // optional factual details, e.g. number of files changed
  details?: {
    filesChanged?: number
    path?: string
  }
  // optional human-friendly message override
  message?: string
}

export const initialActivityStatus: ActivityStatus = {
  status: "awaiting_direction",
}

export function statusToLine(
  s: ActivityStatus,
): { title: string; description?: string; color?: string } {
  if (s.message) {
    return {
      title: s.message,
    }
  }

  switch (s.status) {
    case "awaiting_direction":
      return {
        title: "Ready",
      }
    case "request_sent":
    case "request_received":
      return {
        title: "Understanding your request...",
      }
    case "understanding":
      return {
        title: "Understanding your request...",
      }
    case "planning":
      return {
        title: "Working out the best way to build this...",
      }
    case "architecting":
      return {
        title: "Working out the best way to build this...",
      }
    case "preparing":
      return {
        title: "Getting things ready...",
      }
    case "executing":
    case "assistant_composing":
      return {
        title: "Writing your application...",
      }
    case "file_created":
      return {
        title: s.details?.path ? `Created ${s.details.path}` : "Writing your application...",
      }
    case "file_updated":
    case "applying_workspace_changes":
      return {
        title: s.details?.path ? `Updated ${s.details.path}` : "Applying changes...",
      }
    case "file_deleted":
      return {
        title: s.details?.path ? `Removed ${s.details.path}` : "Applying changes...",
      }
    case "validation_started":
      return {
        title: "Making sure your app is ready to run...",
      }
    case "validation_failed":
      return {
        title: "I found an issue and I'm fixing it...",
      }
    case "runtime_error":
      return {
        title: "I found an issue and I'm fixing it...",
      }
    case "repair_started":
      return {
        title: "I found an issue and I'm fixing it...",
      }
    case "repair_completed":
      return {
        title: "Fixed. Checking your app is ready...",
      }
    case "preview_updated":
      return {
        title: "Your app is ready in Preview.",
      }
    case "build_completed":
    case "workspace_updated":
      return {
        title: "Your app is ready in Preview.",
      }
    case "ready_for_refinement":
      return {
        title: "Your app is ready in Preview.",
      }
    case "cancelled":
    case "generation_stopped":
      return {
        title: "Stopped.",
      }
    case "build_failed":
    case "generation_failed":
      return {
        title: "I couldn't finish that build. You can try again.",
      }
    default:
      return { title: "Ready" }
  }
}

