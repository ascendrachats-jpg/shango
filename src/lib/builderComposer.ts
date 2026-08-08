import type { Project } from "../lib/store"

export function deriveComposerValue(
  project: Project | undefined,
  currentValue: string,
): string {
  if (currentValue.trim()) return currentValue

  const latestUserMessage = [...(project?.messages ?? [])]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.trim(),
    )

  return (
    latestUserMessage?.content?.trim() || project?.initialPrompt?.trim() || ""
  )
}
