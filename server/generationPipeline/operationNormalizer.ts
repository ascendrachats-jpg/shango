import type { BuildFileOperation, BuildResponse } from "./types.ts"
import type { ParserResult } from "./structuredParser.ts"

export function normalizeParserResult(
  parserResult: ParserResult,
  currentFiles: Array<{ path: string; content: string; language: string }> = [],
): BuildFileOperation[] {
  const existingFileMap = new Map(currentFiles.map((file) => [file.path, file]))
  const operations: BuildFileOperation[] = []

  for (const generatedFile of parserResult.files) {
    const existing = existingFileMap.get(generatedFile.path)
    if (!existing) {
      operations.push({
        path: generatedFile.path,
        operation: "create",
        language: generatedFile.language,
        content: generatedFile.content,
      })
      continue
    }

    if (
      existing.language !== generatedFile.language ||
      existing.content !== generatedFile.content
    ) {
      operations.push({
        path: generatedFile.path,
        operation: "modify",
        language: generatedFile.language,
        content: generatedFile.content,
      })
    }
  }

  return operations
}

export function buildPipelineResponse(
  providerAdapterResult: {
    provider: string
    rawResponse: string
    metadata?: Record<string, unknown>
  },
  parserResult: ParserResult,
  fileOperations: BuildFileOperation[],
): BuildResponse {
  return {
    response: providerAdapterResult.rawResponse,
    provider: providerAdapterResult.provider,
    message: {
      role: "assistant",
      content: stripProviderMetadata(providerAdapterResult.rawResponse),
    },
    build: {
      files: fileOperations,
      entryPoint: parserResult.files[0]?.path,
    },
    diagnostics: parserResult.diagnostics,
  }
}

function stripProviderMetadata(rawResponse: string): string {
  return rawResponse.trim()
}
