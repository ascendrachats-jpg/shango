import type { ConversationBlock } from "./conversation"

/**
 * Returns the user prompt that should be retried when the last block is an
 * error block. Walks backwards from the error to find the most
 * recent preceding user dialogue block (or idea block).
 */
export function getRetryPromptFromBlocks(
  blocks: ConversationBlock[],
): string | null {
  if (blocks.length === 0) return null
  const last = blocks[blocks.length - 1]
  if (last.type !== "error") return null
  for (let i = blocks.length - 2; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "dialogue.user" || block.type === "idea") {
      return block.content
    }
  }
  return null
}

/**
 * Returns the content of the most recent user dialogue or idea block,
 * used by the Cmd+R "regenerate last request" shortcut and by the
 * composer pre-fill logic.
 */
export function getLastUserPromptFromBlocks(
  blocks: ConversationBlock[],
): string | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "dialogue.user" || block.type === "idea") {
      return block.content
    }
  }
  return null
}
