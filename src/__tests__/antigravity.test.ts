import { describe, it, expect } from "vitest"
import {
  normalizeProviderOperations,
  buildAntigravityMerge,
  recordMergeProvenance,
  legacyFileChangesToOperations,
  type BuildFileOperation,
} from "../lib/antigravity"
import { type ProjectFile, type ProjectArtifact } from "../lib/store"

describe("Antigravity System", () => {
  const timestamp = new Date().toISOString()

  describe("normalizeProviderOperations", () => {
    it("creates operations for new files in artifact", () => {
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          {
            path: "src/App.tsx",
            content: "export default function App() {}",
            language: "tsx",
          },
        ],
      }

      const ops = normalizeProviderOperations(artifact, undefined)

      expect(ops).toHaveLength(1)
      expect(ops[0]).toEqual({
        type: "create",
        path: "src/App.tsx",
        content: "export default function App() {}",
        language: "tsx",
      })
    })

    it("creates modify operations for changed files", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "old content",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          { path: "src/App.tsx", content: "new content", language: "tsx" },
        ],
      }

      const ops = normalizeProviderOperations(artifact, currentFiles)

      expect(ops).toHaveLength(1)
      expect(ops[0]).toEqual({
        type: "modify",
        path: "src/App.tsx",
        content: "new content",
        language: "tsx",
      })
    })

    it("skips operations for files with identical content", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "same content",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          { path: "src/App.tsx", content: "same content", language: "tsx" },
        ],
      }

      const ops = normalizeProviderOperations(artifact, currentFiles)

      expect(ops).toHaveLength(0)
    })

    it("preserves files not in artifact (only explicit operations)", () => {
      const timestamp = new Date().toISOString()
      const currentFiles: ProjectFile[] = [
        {
          id: "file-1",
          path: "src/old.tsx",
          name: "old.tsx",
          extension: "tsx",
          language: "typescript",
          content: "old content",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [],
      }

      const ops = normalizeProviderOperations(artifact, currentFiles)

      // Should have no operations - artifact is empty so no changes
      expect(ops).toHaveLength(0)
    })

    it("rejects invalid paths", () => {
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          { path: "/absolute/path.tsx", content: "test", language: "tsx" },
          { path: "..\\..\\escape.tsx", content: "test", language: "tsx" },
          { path: "valid/path.tsx", content: "test", language: "tsx" },
        ],
      }

      const ops = normalizeProviderOperations(artifact, undefined)

      expect(ops).toHaveLength(1)
      expect(ops[0].path).toBe("valid/path.tsx")
    })

    it("rejects protected files", () => {
      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          { path: "package.json", content: '{"name":"app"}', language: "json" },
          {
            path: "src/App.tsx",
            content: "export default App",
            language: "tsx",
          },
        ],
      }

      const ops = normalizeProviderOperations(artifact, undefined)

      expect(ops).toHaveLength(1)
      expect(ops[0].path).toBe("src/App.tsx")
    })
  })

  describe("buildAntigravityMerge", () => {
    it("applies create operations", () => {
      const ops: BuildFileOperation[] = [
        {
          type: "create",
          path: "src/App.tsx",
          content: "export default App",
          language: "tsx",
        },
      ]

      const result = buildAntigravityMerge(undefined, ops, timestamp)

      expect(result.files).toHaveLength(1)
      expect(result.files[0]).toMatchObject({
        path: "src/App.tsx",
        content: "export default App",
        language: "tsx",
        kind: "file",
        userModified: false,
      })
      expect(result.operations).toHaveLength(1)
      expect(result.rejected).toHaveLength(0)
    })

    it("applies modify operations", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "old content",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const ops: BuildFileOperation[] = [
        {
          type: "modify",
          path: "src/App.tsx",
          content: "new content",
          language: "tsx",
        },
      ]

      const result = buildAntigravityMerge(currentFiles, ops, timestamp)

      expect(result.files).toHaveLength(1)
      expect(result.files[0].content).toBe("new content")
      expect(result.operations).toHaveLength(1)
    })

    it("applies delete operations", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/old.tsx",
          name: "old.tsx",
          extension: "tsx",
          language: "tsx",
          content: "old",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const ops: BuildFileOperation[] = [
        { type: "delete", path: "src/old.tsx" },
      ]

      const result = buildAntigravityMerge(currentFiles, ops, timestamp)

      expect(result.files).toHaveLength(0)
      expect(result.operations).toHaveLength(1)
    })

    it("rejects invalid paths", () => {
      const ops: BuildFileOperation[] = [
        {
          type: "create",
          path: "/invalid.tsx",
          content: "test",
          language: "tsx",
        },
        { type: "create", path: "valid.tsx", content: "test", language: "tsx" },
      ]

      const result = buildAntigravityMerge(undefined, ops, timestamp)

      expect(result.files).toHaveLength(1)
      expect(result.rejected).toHaveLength(1)
      expect(result.rejected[0].reason).toBe("invalid-path")
    })

    it("rejects operations on protected files", () => {
      const ops: BuildFileOperation[] = [
        {
          type: "create",
          path: "package.json",
          content: "{}",
          language: "json",
        },
        {
          type: "modify",
          path: ".env",
          content: "KEY=value",
          language: "text",
        },
        { type: "delete", path: "tsconfig.json" },
      ]

      const result = buildAntigravityMerge(undefined, ops, timestamp)

      expect(result.files).toHaveLength(0)
      expect(result.rejected).toHaveLength(3)
      expect(result.rejected.every((r) => r.reason === "protected-file")).toBe(
        true,
      )
    })

    it("handles path normalization (backslashes to forward slashes)", () => {
      const ops: BuildFileOperation[] = [
        {
          type: "create",
          path: "src\\components\\App.tsx",
          content: "test",
          language: "tsx",
        },
      ]

      const result = buildAntigravityMerge(undefined, ops, timestamp)

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe("src/components/App.tsx")
    })

    it("maintains file metadata through operations", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "old",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          userModified: true,
        },
      ]
      const ops: BuildFileOperation[] = [
        {
          type: "modify",
          path: "src/App.tsx",
          content: "new",
          language: "tsx",
        },
      ]

      const result = buildAntigravityMerge(currentFiles, ops, timestamp)

      expect(result.files[0]).toMatchObject({
        createdAt: "2024-01-01T00:00:00Z", // Original creation time preserved
        userModified: true, // Original user modification flag preserved
        updatedAt: timestamp, // Updated to merge timestamp
      })
    })

    it("handles deterministic path deduplication", () => {
      const ops: BuildFileOperation[] = [
        { type: "create", path: "file.tsx", content: "v1", language: "tsx" },
        { type: "modify", path: "file.tsx", content: "v2", language: "tsx" },
        { type: "modify", path: "file.tsx", content: "v3", language: "tsx" },
      ]

      const result = buildAntigravityMerge(undefined, ops, timestamp)

      expect(result.files).toHaveLength(1)
      expect(result.files[0].content).toBe("v3") // Latest content wins
      expect(result.operations).toHaveLength(3) // All operations recorded
    })
  })

  describe("recordMergeProvenance", () => {
    it("captures operation metadata", () => {
      const mergeResult = buildAntigravityMerge(
        undefined,
        [
          {
            type: "create",
            path: "src/App.tsx",
            content: "test",
            language: "tsx",
          },
          { type: "delete", path: "old.tsx" },
        ],
        timestamp,
      )

      const provenance = recordMergeProvenance(
        mergeResult,
        "Create a React app",
        "vercel-ai",
        "gpt-4",
        "build",
      )

      expect(provenance).toMatchObject({
        timestamp,
        provider: "vercel-ai",
        model: "gpt-4",
        mode: "build",
        prompt: "Create a React app",
      })
      expect(provenance.operations).toHaveLength(2)
      expect(provenance.operations[0]).toEqual({
        path: "src/App.tsx",
        operation: "create",
      })
      expect(provenance.operations[1]).toEqual({
        path: "old.tsx",
        operation: "delete",
      })
    })

    it("captures rejected operations", () => {
      const mergeResult = buildAntigravityMerge(
        undefined,
        [
          {
            type: "create",
            path: "/invalid.tsx",
            content: "test",
            language: "tsx",
          },
          {
            type: "create",
            path: "package.json",
            content: "{}",
            language: "json",
          },
        ],
        timestamp,
      )

      const provenance = recordMergeProvenance(
        mergeResult,
        "Test",
        "test-provider",
        undefined,
        "plan",
      )

      expect(provenance.rejectedOperations).toHaveLength(2)
      expect(provenance.rejectedOperations?.[0]).toMatchObject({
        reason: "invalid-path",
      })
      expect(provenance.rejectedOperations?.[1]).toMatchObject({
        reason: "protected-file",
      })
    })

    it("generates unique IDs for each provenance record", () => {
      const mergeResult = buildAntigravityMerge(undefined, [], timestamp)
      const prov1 = recordMergeProvenance(
        mergeResult,
        "Test",
        "provider",
        undefined,
        "plan",
      )
      const prov2 = recordMergeProvenance(
        mergeResult,
        "Test",
        "provider",
        undefined,
        "plan",
      )

      expect(prov1.id).not.toBe(prov2.id)
    })
  })

  describe("legacyFileChangesToOperations", () => {
    it("converts legacy create operations", () => {
      const fileChanges = [
        {
          path: "src/App.tsx",
          operation: "create" as const,
          content: "test",
          language: "tsx",
        },
      ]

      const ops = legacyFileChangesToOperations(fileChanges)

      expect(ops).toHaveLength(1)
      expect(ops[0]).toEqual({
        type: "create",
        path: "src/App.tsx",
        content: "test",
        language: "tsx",
      })
    })

    it("converts legacy delete operations", () => {
      const fileChanges = [{ path: "old.tsx", operation: "delete" as const }]

      const ops = legacyFileChangesToOperations(fileChanges)

      expect(ops).toHaveLength(1)
      expect(ops[0]).toEqual({ type: "delete", path: "old.tsx" })
    })

    it("filters invalid and protected paths", () => {
      const fileChanges = [
        {
          path: "/invalid.tsx",
          operation: "create" as const,
          content: "test",
          language: "tsx",
        },
        {
          path: "package.json",
          operation: "create" as const,
          content: "{}",
          language: "json",
        },
        {
          path: "valid.tsx",
          operation: "create" as const,
          content: "test",
          language: "tsx",
        },
      ]

      const ops = legacyFileChangesToOperations(fileChanges)

      expect(ops).toHaveLength(1)
      expect(ops[0].path).toBe("valid.tsx")
    })

    it("uses latest operation for duplicate paths", () => {
      const fileChanges = [
        {
          path: "file.tsx",
          operation: "create" as const,
          content: "v1",
          language: "tsx",
        },
        {
          path: "file.tsx",
          operation: "modify" as const,
          content: "v2",
          language: "tsx",
        },
      ]

      const ops = legacyFileChangesToOperations(fileChanges)

      expect(ops).toHaveLength(1)
      expect(ops[0]).toMatchObject({ type: "modify", content: "v2" })
    })

    it("handles missing fileChanges gracefully", () => {
      const ops = legacyFileChangesToOperations(undefined)

      expect(ops).toHaveLength(0)
    })
  })

  describe("Integration - Full merge workflow", () => {
    it("processes provider artifact through normalization to merge", () => {
      const currentFiles: ProjectFile[] = [
        {
          id: "f1",
          path: "src/old.tsx",
          name: "old.tsx",
          extension: "tsx",
          language: "tsx",
          content: "old code",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]

      const artifact: ProjectArtifact = {
        html: "",
        css: "",
        js: "",
        title: "Test",
        description: "Test",
        createdAt: timestamp,
        files: [
          { path: "src/App.tsx", content: "new code", language: "tsx" },
          { path: "src/main.tsx", content: "entry", language: "tsx" },
        ],
      }

      // Step 1: Normalize artifact to operations
      const operations = normalizeProviderOperations(artifact, currentFiles)
      expect(operations).toHaveLength(2) // 2 creates (old.tsx is preserved, not deleted)

      // Step 2: Apply via merge engine
      const result = buildAntigravityMerge(currentFiles, operations, timestamp)
      expect(result.files).toHaveLength(3) // old.tsx + App.tsx + main.tsx (all preserved/created)
      expect(result.rejected).toHaveLength(0)

      // Step 3: Record provenance
      const provenance = recordMergeProvenance(
        result,
        "Update app structure",
        "test-provider",
        "test-model",
        "build",
      )

      expect(provenance.operations).toHaveLength(2)
      expect(provenance.rejectedOperations).toBeUndefined()
    })
  })
})
