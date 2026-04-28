import { describe, expect, it } from "vitest";
import { verifyChecksum } from "@/lib/checksum";
import { buildPairSentence } from "./encode";

describe("buildPairSentence", () => {
  it("pads cid to 3 digits", () => {
    expect(buildPairSentence("5")).toBe("$PAIR005*3F");
  });
  it("appends arguments", () => {
    expect(buildPairSentence("050", ["3000"])).toBe("$PAIR050,3000*10");
    expect(buildPairSentence("864", ["0", "0", "115200"])).toBe("$PAIR864,0,0,115200*1B");
  });
  it("produces checksums verified by verifyChecksum", () => {
    const sentence = buildPairSentence("066", ["1", "1", "1", "1", "1", "0"]);
    expect(verifyChecksum(sentence)).toBe(true);
  });
});
