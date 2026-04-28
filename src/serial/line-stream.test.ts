import { describe, expect, it } from "vitest";
import { createLineStream } from "./line-stream";

async function runThrough(chunks: string[]): Promise<string[]> {
  const lineStream = createLineStream();
  const writer = lineStream.writable.getWriter();
  const reader = lineStream.readable.getReader();
  const collected: string[] = [];
  const consume = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      collected.push(value);
    }
  })();
  for (const c of chunks) await writer.write(c);
  await writer.close();
  await consume;
  return collected;
}

describe("createLineStream", () => {
  it("splits on CRLF", async () => {
    const lines = await runThrough(["$PAIR001,005,0*3E\r\n$GNGGA,...,*70\r\n"]);
    expect(lines).toEqual(["$PAIR001,005,0*3E", "$GNGGA,...,*70"]);
  });

  it("joins fragments across chunks", async () => {
    const lines = await runThrough(["$PAIR0", "01,005,0*3E\r\n$GNGG", "A,a*70\r\n"]);
    expect(lines).toEqual(["$PAIR001,005,0*3E", "$GNGGA,a*70"]);
  });

  it("flushes a trailing line without terminator", async () => {
    const lines = await runThrough(["A\r\nB"]);
    expect(lines).toEqual(["A", "B"]);
  });

  it("handles bare LF and CR", async () => {
    const lines = await runThrough(["a\nb\rc\r\nd"]);
    expect(lines).toEqual(["a", "b", "c", "d"]);
  });

  it("skips empty lines", async () => {
    const lines = await runThrough(["a\r\n\r\nb\r\n"]);
    expect(lines).toEqual(["a", "b"]);
  });
});
