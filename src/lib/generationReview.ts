import type { ProjectFile } from "./store"
import type { GenerationFileChange } from "./generation"

export interface GenerationReviewChange {
  path: string
  operation: GenerationFileChange["operation"]
  beforeLines: number
  afterLines: number
  removedPreview: string[]
  addedPreview: string[]
  removedDetails: string[]
  addedDetails: string[]
  removedHiddenCount: number
  addedHiddenCount: number
}

function toLines(content: string | undefined): string[] {
  return content ? content.split(/\r?\n/) : []
}

function changedLines(
  before: string[],
  after: string[],
): {
  removed: string[]
  added: string[]
  removedDetails: string[]
  addedDetails: string[]
  removedHiddenCount: number
  addedHiddenCount: number
} {
  let prefix = 0
  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  )
    prefix += 1

  let suffix = 0
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  )
    suffix += 1

  const removed = before.slice(prefix, before.length - suffix)
  const added = after.slice(prefix, after.length - suffix)
  const maxDetails = 80
  return {
    removed: removed.slice(0, 3),
    added: added.slice(0, 3),
    removedDetails: removed.slice(3, maxDetails),
    addedDetails: added.slice(3, maxDetails),
    removedHiddenCount: Math.max(0, removed.length - maxDetails),
    addedHiddenCount: Math.max(0, added.length - maxDetails),
  }
}

export function buildGenerationReview(
  files: ProjectFile[] | undefined,
  changes: GenerationFileChange[] | undefined,
): GenerationReviewChange[] {
  const currentFiles = new Map(
    (files ?? []).map((file) => [file.path, file.content]),
  )
  return (changes ?? []).map((change) => {
    const before = toLines(currentFiles.get(change.path))
    const after = toLines(
      change.operation === "delete"
        ? ""
        : (change.content ?? currentFiles.get(change.path)),
    )
    const preview = changedLines(before, after)
    return {
      path: change.path,
      operation: change.operation,
      beforeLines: before.length,
      afterLines: after.length,
      removedPreview: preview.removed,
      addedPreview: preview.added,
      removedDetails: preview.removedDetails,
      addedDetails: preview.addedDetails,
      removedHiddenCount: preview.removedHiddenCount,
      addedHiddenCount: preview.addedHiddenCount,
    }
  })
}
