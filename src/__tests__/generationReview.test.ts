import { describe, expect, it } from "vitest"
import { buildGenerationReview } from "../lib/generationReview"

describe("generation review", () => {
  it("shows a compact changed-line preview for modified files", () => {
    const review = buildGenerationReview(
      [
        {
          id: "app",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "one\ntwo\nthree",
          createdAt: "now",
          updatedAt: "now",
        },
      ],
      [
        {
          path: "src/App.tsx",
          operation: "modify",
          content: "one\nupdated\nthree",
          language: "tsx",
        },
      ],
    )

    expect(review[0]).toMatchObject({
      path: "src/App.tsx",
      beforeLines: 3,
      afterLines: 3,
      removedPreview: ["two"],
      addedPreview: ["updated"],
    })
  })

  it("shows removed content for a deletion", () => {
    const review = buildGenerationReview(
      [
        {
          id: "style",
          path: "src/styles.css",
          name: "styles.css",
          extension: "css",
          language: "css",
          content: "body { color: red; }",
          createdAt: "now",
          updatedAt: "now",
        },
      ],
      [{ path: "src/styles.css", operation: "delete" }],
    )

    expect(review[0]).toMatchObject({
      operation: "delete",
      beforeLines: 1,
      afterLines: 0,
      removedPreview: ["body { color: red; }"],
    })
  })

  it("keeps an expandable bounded detail list after the compact preview", () => {
    const review = buildGenerationReview(
      [
        {
          id: "app",
          path: "src/App.tsx",
          name: "App.tsx",
          extension: "tsx",
          language: "tsx",
          content: "start\none\ntwo\nthree\nfour\nfive\nend",
          createdAt: "now",
          updatedAt: "now",
        },
      ],
      [
        {
          path: "src/App.tsx",
          operation: "modify",
          content: "start\nuno\ndos\ntres\ncuatro\ncinco\nend",
          language: "tsx",
        },
      ],
    )

    expect(review[0]?.removedPreview).toEqual(["one", "two", "three"])
    expect(review[0]?.addedPreview).toEqual(["uno", "dos", "tres"])
    expect(review[0]?.removedDetails).toEqual(["four", "five"])
    expect(review[0]?.addedDetails).toEqual(["cuatro", "cinco"])
  })
})
