import type { ExecutionBlock, ExecutionFileOp } from "./conversation.ts"

export function updateExecutionBlockWithSSEEvent(
  block: ExecutionBlock,
  eventType: string,
  data: any,
): ExecutionBlock {
  const updated: ExecutionBlock = { ...block }

  if (eventType === "status" && data?.status) {
    const status = data.status
    if (status === "request_received") {
      updated.statusText = "Understanding your request..."
    } else if (status === "planning" || status === "architecting") {
      updated.statusText = "Working through the build..."
    } else if (status === "executing") {
      updated.statusText = "Building the workspace..."
    } else if (status === "validating") {
      updated.statusText = "Checking workspace code..."
      updated.validationStatus = "validating"
    } else if (status === "validation_passed") {
      updated.statusText = "Code validation passed"
      updated.validationStatus = "passed"
    } else if (status === "validation_failed") {
      updated.statusText = "Checking a workspace issue..."
      updated.validationStatus = "failed"
    } else if (status === "repair_started") {
      updated.repairAttempts = (data.attempt as number) ?? (updated.repairAttempts ?? 0) + 1
      updated.statusText = `Fixing code in workspace...`
    } else if (status === "repair_completed") {
      updated.statusText = "Fixed code issue"
      updated.validationStatus = "passed"
    } else if (status === "build_completed") {
      const count = updated.files.length
      updated.statusText = count > 0 ? `${count} file(s) created and ready in Preview` : "App is ready in Preview"
      updated.completed = true
    } else if (status === "build_failed") {
      updated.statusText = "Unable to complete repair automatically"
      updated.completed = true
      updated.validationStatus = "failed"
    }
  } else if (eventType === "file" && data?.file) {
    const fileOp: ExecutionFileOp = {
      path: data.file.path,
      operation: data.file.operation ?? "create",
    }
    const exists = updated.files.some((f) => f.path === fileOp.path)
    if (!exists) {
      updated.files = [...updated.files, fileOp]
    } else {
      updated.files = updated.files.map((f) => (f.path === fileOp.path ? fileOp : f))
    }
  }

  return updated
}
