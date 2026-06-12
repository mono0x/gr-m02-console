import { describe, expect, it } from "vitest"
import { parseDdmm, parseUtcDate, parseUtcTime } from "./coords"

describe("parseDdmm", () => {
  it("parses latitude with N", () => {
    expect(parseDdmm("2446.4134", "N")).toBeCloseTo(24 + 46.4134 / 60, 6)
  })
  it("negates latitude with S", () => {
    expect(parseDdmm("2446.4134", "S")).toBeCloseTo(-(24 + 46.4134 / 60), 6)
  })
  it("parses longitude with E (3-digit degrees)", () => {
    expect(parseDdmm("12100.4357", "E")).toBeCloseTo(121 + 0.4357 / 60, 6)
  })
  it("returns null for empty input", () => {
    expect(parseDdmm("", "N")).toBeNull()
    expect(parseDdmm("2446.4134", "")).toBeNull()
  })
})

describe("parseUtcTime", () => {
  it("formats hhmmss.sss", () => {
    expect(parseUtcTime("000122.000")).toBe("00:01:22.000")
    expect(parseUtcTime("235959")).toBe("23:59:59")
  })
  it("rejects garbage", () => {
    expect(parseUtcTime("12:34")).toBeNull()
    expect(parseUtcTime("")).toBeNull()
  })
})

describe("parseUtcDate", () => {
  it("formats ddmmyy with year window", () => {
    expect(parseUtcDate("021222")).toBe("2022-12-02")
    expect(parseUtcDate("010180")).toBe("1980-01-01")
  })
})
