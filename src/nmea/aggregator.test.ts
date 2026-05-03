import { describe, expect, it } from "vitest"
import { attachChecksum } from "@/lib/checksum"
import { GsvAggregator } from "./aggregator"
import { decodeGSV, parseSentence } from "./parser"

function gsv(body: string): string {
  return attachChecksum(body)
}

const lines = [
  "$GPGSV,4,1,15,22,68,140,46,194,68,042,46,26,67,332,47,199,60,166,40,1*6C",
  "$GPGSV,4,2,15,16,53,258,45,31,49,043,46,196,39,177,41,41,38,241,42,1*5C",
  "$GPGSV,4,3,15,32,33,146,45,195,30,143,41,27,25,187,39,03,21,278,37,1*56",
  "$GPGSV,4,4,15,29,20,047,39,04,15,321,35,18,01,107,,1*58",
]

function ingest(agg: GsvAggregator, line: string) {
  const parsed = parseSentence(line)
  if (parsed.kind !== "nmea") throw new Error("expected nmea")
  return agg.ingest(parsed.talker, decodeGSV(parsed.fields))
}

describe("GsvAggregator", () => {
  it("emits null until the final message arrives", () => {
    const agg = new GsvAggregator()
    expect(ingest(agg, lines[0]!)).toBeNull()
    expect(ingest(agg, lines[1]!)).toBeNull()
    expect(ingest(agg, lines[2]!)).toBeNull()
    const result = ingest(agg, lines[3]!)
    expect(result).not.toBeNull()
    expect(result?.talker).toBe("GP")
    expect(result?.satellites.length).toBe(15)
    expect(result?.satsInView).toBe(15)
  })

  it("resets when a new messageNumber=1 arrives mid-session", () => {
    const agg = new GsvAggregator()
    ingest(agg, lines[0]!)
    ingest(agg, lines[1]!)
    // Restart from msg 1
    ingest(agg, lines[0]!)
    ingest(agg, lines[1]!)
    ingest(agg, lines[2]!)
    expect(ingest(agg, lines[3]!)).not.toBeNull()
  })

  it("keeps independent state per talker", () => {
    const agg = new GsvAggregator()
    expect(ingest(agg, gsv("GPGSV,1,1,01,12,30,090,40,1"))).not.toBeNull()
    expect(ingest(agg, gsv("GLGSV,1,1,01,77,39,313,27,1"))).not.toBeNull()
  })

  it("keeps independent state per signal id within the same talker", () => {
    const agg = new GsvAggregator()
    // Start L1 (signalId=1) cycle of 2 messages, do not finish
    expect(ingest(agg, gsv("GPGSV,2,1,15,22,68,140,46,194,68,042,46,1"))).toBeNull()
    // L5Q (signalId=8) single-message cycle should NOT reset the L1 session
    const l5 = ingest(agg, gsv("GPGSV,1,1,02,194,68,042,42,03,21,278,30,8"))
    expect(l5?.signalId).toBe("8")
    expect(l5?.satellites.length).toBe(2)
    // Finish L1 cycle — should still complete with 4 satellites
    const l1 = ingest(agg, gsv("GPGSV,2,2,15,26,67,332,47,199,60,166,40,1"))
    expect(l1?.signalId).toBe("1")
    expect(l1?.satellites.length).toBe(4)
  })
})
