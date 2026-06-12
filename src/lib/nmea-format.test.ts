import { describe, expect, it } from "vitest"
import { knotsToMps } from "./nmea-format"

describe("knotsToMps", () => {
  it("converts knots to m/s", () => {
    expect(knotsToMps(1)).toBeCloseTo(0.5144444, 5)
  })
  it("passes through null", () => {
    expect(knotsToMps(null)).toBeNull()
  })
})
