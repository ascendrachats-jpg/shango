import { describe, expect, it } from "vitest"
import {
  createGeneratedArtifact,
  createArtifactFromHtmlResponse,
} from "../lib/generatedArtifact"

describe("generatedArtifact helpers", () => {
  it("creates a generated artifact from a prompt and fallback content", () => {
    const artifact = createGeneratedArtifact(
      "Launch a campaign",
      "We could not reach the model",
    )
    expect(artifact.title).toContain("Launch a campaign")
    expect(artifact.description).toContain("We could not reach the model")
    // The React app source lives in the files array (rendered by the
    // Babel transpiler in the preview iframe), not in the html field.
    expect(artifact.files).toBeDefined()
    expect(artifact.files?.length).toBeGreaterThanOrEqual(3)
    const appTsx = artifact.files?.find((f) => f.path === "src/App.tsx")
    expect(appTsx).toBeDefined()
    expect(appTsx?.content).toContain("export default function App")
    expect(appTsx?.content).toContain("Launch a campaign")
  })

  it("extracts html, css, and js from an html response", () => {
    const artifact = createArtifactFromHtmlResponse(
      "Welcome page",
      "<html><body><h1>Welcome</h1></body></html>",
    )
    expect(artifact).not.toBeNull()
    expect(artifact?.html).toContain("<h1>Welcome</h1>")
    expect(artifact?.title).toBe("Welcome")
  })
})
