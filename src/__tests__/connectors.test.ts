import { describe, expect, it } from "vitest"
import { DEFAULT_CONNECTED_CONNECTOR_IDS } from "../lib/connectors"

describe("connector defaults", () => {
  it("does not imply an external connector is authorised in a new workspace", () => {
    expect(DEFAULT_CONNECTED_CONNECTOR_IDS).toEqual([])
  })
})
