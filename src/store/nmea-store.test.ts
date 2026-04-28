import { afterEach, describe, expect, it } from "vitest";
import { decodeGGA, decodeRMC, parseSentence } from "@/nmea/parser";
import { useNmeaStore } from "./nmea-store";

afterEach(() => {
  useNmeaStore.getState().reset();
});

describe("nmeaStore", () => {
  it("ingestGGA updates position and fix", () => {
    const parsed = parseSentence("$GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,*70");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    useNmeaStore.getState().ingestGGA(decodeGGA(parsed.fields), 1000);
    const state = useNmeaStore.getState();
    expect(state.position.lat).toBeCloseTo(24 + 46.4134 / 60, 6);
    expect(state.fix.satsUsed).toBe(46);
    expect(state.fix.fixQuality).toBe(2);
  });

  it("ingestRMC fills date and motion", () => {
    const parsed = parseSentence("$GNRMC,000123.000,A,2446.4134,N,12100.4357,E,0.04,0.00,230722,,,D,V*0C");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    useNmeaStore.getState().ingestRMC(decodeRMC(parsed.fields), 1000);
    const state = useNmeaStore.getState();
    expect(state.time.date).toBe("2022-07-23");
    expect(state.fix.status).toBe("A");
    expect(state.motion.speedKnots).toBe(0.04);
  });

  it("does not change reference when fields are equal", () => {
    const parsed = parseSentence("$GNGGA,000122.000,2446.4134,N,12100.4357,E,2,46,0.41,124.5,M,15.0,M,,*70");
    if (parsed.kind !== "nmea") throw new Error("expected nmea");
    useNmeaStore.getState().ingestGGA(decodeGGA(parsed.fields), 1000);
    const fixRef = useNmeaStore.getState().fix;
    useNmeaStore.getState().ingestGGA(decodeGGA(parsed.fields), 1000);
    expect(useNmeaStore.getState().fix).toBe(fixRef);
  });
});
