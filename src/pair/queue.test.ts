import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSentence } from "@/nmea/parser";
import type { ParsedPair, ParsedPairAck } from "@/nmea/types";
import { PairQueue } from "./queue";
import { PairError } from "./types";

function ack(line: string): ParsedPairAck {
  const parsed = parseSentence(line);
  if (parsed.kind !== "pair-ack") throw new Error(`expected pair-ack: ${parsed.kind}`);
  return parsed;
}

function pair(line: string): ParsedPair {
  const parsed = parseSentence(line);
  if (parsed.kind !== "pair") throw new Error(`expected pair: ${parsed.kind}`);
  return parsed;
}

interface Harness {
  queue: PairQueue;
  transmissions: string[];
  writeResolve: (() => void) | null;
}

function setup(): Harness {
  const transmissions: string[] = [];
  const harness: Harness = { queue: null as unknown as PairQueue, transmissions, writeResolve: null };
  harness.queue = new PairQueue({
    write: async (line) => {
      transmissions.push(line);
    },
    defaultAckTimeoutMs: 200,
    followUpTimeoutMs: 100,
    maxProcessingExtensions: 3,
  });
  return harness;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PairQueue", () => {
  it("resolves on PAIR001 success when no follow-up is expected", async () => {
    const h = setup();
    const promise = h.queue.send("005");
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transmissions).toEqual(["$PAIR005*3F"]);
    h.queue.ingestAck(ack("$PAIR001,005,0*3E"));
    const response = await promise;
    expect(response.cid).toBe("005");
    expect(response.ack.result).toBe(0);
    expect(response.followUp).toBeUndefined();
  });

  it("collects follow-up sentence when expected", async () => {
    const h = setup();
    const promise = h.queue.send("051", [], { expectFollowUpCid: "051" });
    await vi.advanceTimersByTimeAsync(0);
    h.queue.ingestAck(ack("$PAIR001,051,0*3F"));
    h.queue.ingestPair(pair("$PAIR051,3000*11"));
    const response = await promise;
    expect(response.followUp?.fields).toEqual(["3000"]);
  });

  it("collects follow-up arriving before ack", async () => {
    const h = setup();
    const promise = h.queue.send("051", [], { expectFollowUpCid: "051" });
    await vi.advanceTimersByTimeAsync(0);
    h.queue.ingestPair(pair("$PAIR051,3000*11"));
    h.queue.ingestAck(ack("$PAIR001,051,0*3F"));
    const response = await promise;
    expect(response.followUp?.fields).toEqual(["3000"]);
  });

  it("rejects on ack timeout", async () => {
    const h = setup();
    const promise = h.queue.send("005");
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(250);
    await expect(promise).rejects.toMatchObject({ kind: "timeout" } as PairError);
  });

  it("rejects on follow-up timeout when ack ok but follow-up missing", async () => {
    const h = setup();
    const promise = h.queue.send("051", [], { expectFollowUpCid: "051" });
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    h.queue.ingestAck(ack("$PAIR001,051,0*3F"));
    await vi.advanceTimersByTimeAsync(150);
    await expect(promise).rejects.toMatchObject({ kind: "follow-up-timeout" });
  });

  it("extends timeout while result=1 (processing) is reported", async () => {
    const h = setup();
    const promise = h.queue.send("005");
    await vi.advanceTimersByTimeAsync(0);
    // Just before timeout, processing arrives → extends
    await vi.advanceTimersByTimeAsync(150);
    h.queue.ingestAck(ack("$PAIR001,005,1*3F"));
    await vi.advanceTimersByTimeAsync(150);
    h.queue.ingestAck(ack("$PAIR001,005,0*3E"));
    const r = await promise;
    expect(r.ack.result).toBe(0);
  });

  it("rejects busy(5) and unsupported(3)", async () => {
    const h = setup();
    const p1 = h.queue.send("005");
    await vi.advanceTimersByTimeAsync(0);
    h.queue.ingestAck(ack("$PAIR001,005,5*3B"));
    await expect(p1).rejects.toMatchObject({ kind: "busy" });

    const p2 = h.queue.send("005");
    await vi.advanceTimersByTimeAsync(0);
    h.queue.ingestAck(ack("$PAIR001,005,3*3D"));
    await expect(p2).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("serializes consecutive sends in FIFO order", async () => {
    const h = setup();
    const a = h.queue.send("005");
    const b = h.queue.send("004");
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transmissions).toEqual(["$PAIR005*3F"]);
    h.queue.ingestAck(ack("$PAIR001,005,0*3E"));
    await a;
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transmissions).toEqual(["$PAIR005*3F", "$PAIR004*3E"]);
    h.queue.ingestAck(ack("$PAIR001,004,0*3F"));
    await b;
  });

  it("cancelAll rejects all queued and in-flight", async () => {
    const h = setup();
    const p1 = h.queue.send("005");
    const p2 = h.queue.send("004");
    await vi.advanceTimersByTimeAsync(0);
    h.queue.cancelAll("disconnected");
    await expect(p1).rejects.toMatchObject({ kind: "cancelled" });
    await expect(p2).rejects.toMatchObject({ kind: "cancelled" });
  });

  it("ignores foreign acks not matching in-flight CID", async () => {
    const h = setup();
    const promise = h.queue.send("005");
    await vi.advanceTimersByTimeAsync(0);
    expect(h.queue.ingestAck(ack("$PAIR001,051,0*3F"))).toBe(false);
    h.queue.ingestAck(ack("$PAIR001,005,0*3E"));
    await promise;
  });
});
