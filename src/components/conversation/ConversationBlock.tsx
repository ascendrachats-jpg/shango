import _React from "react"
import type { ConversationBlock as Block } from "../../lib/conversation"
import { IdeaBlock } from "./IdeaBlock"
import { UnknownBlock } from "./UnknownBlock"
import { UserDialogueBlock } from "./UserDialogueBlock"
import { ShangoDialogueBlock } from "./ShangoDialogueBlock"

interface Props {
  block: Block
}

/**
 * `ConversationBlock` is a router component.
 * It takes a generic `block` object and renders the specific
 * component based on the block's `type`.
 * This is the core of the new modular conversation system.
 */
export function ConversationBlock({ block }: Props) {
  switch (block.type) {
    case "idea":
      return <IdeaBlock block={block} />

    case "dialogue.user":
      return <UserDialogueBlock block={block} />
    
    case "dialogue.shango":
      return <ShangoDialogueBlock block={block} />

    // TODO: Implement other block types here as they are created.
    // case "understanding":
    //   return <UnderstandingBlock block={block} />

    default:
      // This fallback is critical for development.
      return <UnknownBlock type={(block as any).type} />
  }
}
