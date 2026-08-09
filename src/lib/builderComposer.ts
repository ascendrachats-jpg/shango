import type { Project } from "../lib/store"
import { getLastUserPromptFromBlocks } from "./conversationHelpers"

/**
 * Derives the composer input value for a project. If the user has already
 * typed something, keep it. Otherwise try to recover the most recent user
 * prompt from the conversation blocks (the single source of truth), falling
 * back to the project's initial prompt.
 */
export function deriveComposerValue(
  project: Project | undefined,
  currentValue: string,
): string {
  if (currentValue.trim()) return currentValue

  const lastUserPrompt = getLastUserPromptFromBlocks(project?.blocks ?? [])
  return lastUserPrompt || project?.initialPrompt?.trim() || ""
}
