import { describe, expect, it } from "vitest";
import { decodeGGA, decodeGLL, decodeGSA, decodeGSV, decodeRMC, decodeVTG, parseSentence } from "./parser";

describe("parseSentence", () => {
  it("parses an NMEA sentence (GGA)", () => {
    const result = parseSentence("$GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,*70");
    expect(result.kind).toBe("nmea");
    if (result.kind !== "nmea") return;
    expect(result.talker).toBe("GN");
    expect(result.type).toBe("GGA");
    expect(result.fields[0]).toBe("000122.000");
  });

  it("parses a PAIR ack", () => {
    const result = parseSentence("$PAIR001,005,0*3E");
    expect(result.kind).toBe("pair-ack");
    if (result.kind !== "pair-ack") return;
    expect(result.cid).toBe("005");
    expect(result.result).toBe(0);
  });

  it("parses a PAIR follow-up", () => {
    const result = parseSentence("$PAIR051,3000*11");
    expect(result.kind).toBe("pair");
    if (result.kind !== "pair") return;
    expect(result.cid).toBe("051");
    expect(result.fields).toEqual(["3000"]);
  });

  it("flags checksum mismatch as unknown", () => {
    const result = parseSentence("$PAIR001,005,0*FF");
    expect(result.kind).toBe("unknown");
    if (result.kind !== "unknown") return;
    expect(result.reason).toBe("checksum-mismatch");
  });

  it("flags missing $ as unknown", () => {
    const result = parseSentence("PAIR001,005,0*3E");
    expect(result.kind).toBe("unknown");
  });

  it("trims surrounding whitespace and CRLF", () => {
    const result = parseSentence("\r\n$PAIR001,005,0*3E\r\n");
    expect(result.kind).toBe("pair-ack");
  });
});

describe("decodeGGA", () => {
  it("decodes the manual sample", () => {
    const parsed = parseSentence("$GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,*70");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeGGA(parsed.fields);
    expect(data.utc).toBe("00:01:22.000");
    expect(data.lat).toBeCloseTo(24 + 46.4134 / 60, 6);
    expect(data.lon).toBeCloseTo(121 + 0.4357 / 60, 6);
    expect(data.fixQuality).toBe(2);
    expect(data.satsUsed).toBe(46);
    expect(data.hdop).toBeCloseTo(0.41, 6);
    expect(data.altitude).toBe(124.5);
    expect(data.geoidSep).toBe(15.0);
  });
});

describe("decodeRMC", () => {
  it("decodes the manual sample", () => {
    const parsed = parseSentence("$GNRMC,000123.000,A,2446.4134,N,12100.4357,E,0.04,0.00,230722,,,D,V*0C");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeRMC(parsed.fields);
    expect(data.status).toBe("A");
    expect(data.utc).toBe("00:01:23.000");
    expect(data.date).toBe("2022-07-23");
    expect(data.speedKnots).toBe(0.04);
    expect(data.modeIndicator).toBe("D");
  });
});

describe("decodeVTG", () => {
  it("decodes the manual sample", () => {
    const parsed = parseSentence("$GNVTG,0.00,T,,M,0.04,N,0.07,K,D*25");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeVTG(parsed.fields);
    expect(data.courseTrue).toBe(0);
    expect(data.speedKnots).toBe(0.04);
    expect(data.speedKmh).toBe(0.07);
    expect(data.modeIndicator).toBe("D");
  });
});

describe("decodeGSA", () => {
  it("decodes the manual sample", () => {
    const parsed = parseSentence(
      "$GNGSA,A,3,195,194,14,199,01,03,196,17,30,07,21,06,0.64,0.41,0.49,1*05",
    );
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeGSA(parsed.fields);
    expect(data.mode1).toBe("A");
    expect(data.fixType).toBe(3);
    expect(data.satsUsed).toEqual(["195", "194", "14", "199", "01", "03", "196", "17", "30", "07", "21", "06"]);
    expect(data.pdop).toBe(0.64);
    expect(data.hdop).toBe(0.41);
    expect(data.vdop).toBe(0.49);
    expect(data.systemId).toBe(1);
  });
});

describe("decodeGSV", () => {
  it("decodes a GSV with 4 satellites and signal id", () => {
    const parsed = parseSentence("$GPGSV,4,1,15,195,69,033,44,194,64,140,44,14,62,330,43,199,60,166,38,1*57");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeGSV(parsed.fields);
    expect(data.totalMessages).toBe(4);
    expect(data.messageNumber).toBe(1);
    expect(data.satsInView).toBe(15);
    expect(data.satellites).toHaveLength(4);
    expect(data.satellites[0]).toEqual({ prn: "195", elevation: 69, azimuth: 33, snr: 44 });
    expect(data.signalId).toBe("1");
  });

  it("handles a partial last GSV row", () => {
    const parsed = parseSentence("$GPGSV,4,4,16,29,18,045,37,04,17,321,36,18,02,104,20,08,01,203,30,1*64");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeGSV(parsed.fields);
    expect(data.satellites).toHaveLength(4);
  });
});

describe("decodeGLL", () => {
  it("decodes the manual sample", () => {
    const parsed = parseSentence("$GNGLL,2446.4134,N,12100.4357,E,000122.000,A,D*42");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    const data = decodeGLL(parsed.fields);
    expect(data.status).toBe("A");
    expect(data.utc).toBe("00:01:22.000");
    expect(data.modeIndicator).toBe("D");
  });
});
