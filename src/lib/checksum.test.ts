import { describe, expect, it } from "vitest"
import { attachChecksum, computeChecksum, verifyChecksum } from "./checksum"

describe("computeChecksum", () => {
  it("computes XOR for PAIR command body", () => {
    expect(computeChecksum("PAIR005")).toBe("3F")
    expect(computeChecksum("PAIR001,005,0")).toBe("3E")
    expect(computeChecksum("PAIR513")).toBe("3D")
    expect(computeChecksum("PAIR050,3000")).toBe("10")
  })

  it("computes XOR for NMEA sentences from the manual", () => {
    expect(computeChecksum("GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,")).toBe("70")
    expect(computeChecksum("GNGLL,2446.4134,N,12100.4357,E,000122.000,A,D")).toBe("42")
  })
})

describe("verifyChecksum", () => {
  it("accepts valid sentences", () => {
    expect(verifyChecksum("$PAIR001,005,0*3E")).toBe(true)
    expect(verifyChecksum("$GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,*70")).toBe(
      true,
    )
  })

  it("rejects malformed inputs", () => {
    expect(verifyChecksum("PAIR001,005,0*3E")).toBe(false)
    expect(verifyChecksum("$PAIR001,005,0")).toBe(false)
    expect(verifyChecksum("$PAIR001,005,0*FF")).toBe(false)
    expect(verifyChecksum("")).toBe(false)
  })

  it("is case insensitive on hex digits", () => {
    expect(verifyChecksum("$PAIR005*3f")).toBe(true)
  })
})

describe("attachChecksum", () => {
  it("produces a sentence starting with $ and ending with *XX", () => {
    expect(attachChecksum("PAIR050,3000")).toBe("$PAIR050,3000*10")
  })
})
