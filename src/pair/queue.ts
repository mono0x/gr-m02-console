import type { ParsedPair, ParsedPairAck } from "@/nmea/types";
import { buildPairSentence } from "./encode";
import { type PairErrorKind, PairError, type PairFollowUp, type PairResponse } from "./types";

export interface PairQueueOptions {
  write(line: string): Promise<void>;
  defaultAckTimeoutMs?: number;
  followUpTimeoutMs?: number;
  maxProcessingExtensions?: number;
  now?: () => number;
}

export interface SendOptions {
  expectFollowUpCid?: string;
  ackTimeoutMs?: number;
  followUpTimeoutMs?: number;
}

interface QueueEntry {
  id: number;
  cid: string;
  raw: string;
  args: string[];
  expectFollowUpCid?: string;
  ackTimeoutMs: number;
  followUpTimeoutMs: number;
  resolve: (resp: PairResponse) => void;
  reject: (err: PairError) => void;
  sentAt: number;
  ackTimer?: ReturnType<typeof setTimeout>;
  followUpTimer?: ReturnType<typeof setTimeout>;
  ack?: { result: number; raw: string };
  followUp?: PairFollowUp;
  processingExtensions: number;
}

export class PairQueue {
  private write: (line: string) => Promise<void>;
  private defaultAckTimeoutMs: number;
  private followUpTimeoutMs: number;
  private maxProcessingExtensions: number;
  private now: () => number;

  private waiting: QueueEntry[] = [];
  private inFlight: QueueEntry | null = null;
  private nextId = 1;

  constructor(opts: PairQueueOptions) {
    this.write = opts.write;
    this.defaultAckTimeoutMs = opts.defaultAckTimeoutMs ?? 2000;
    this.followUpTimeoutMs = opts.followUpTimeoutMs ?? 1000;
    this.maxProcessingExtensions = opts.maxProcessingExtensions ?? 5;
    this.now = opts.now ?? Date.now;
  }

  send(cid: string, args: string[] = [], opts: SendOptions = {}): Promise<PairResponse> {
    return new Promise<PairResponse>((resolve, reject) => {
      const padded = cid.padStart(3, "0");
      const raw = buildPairSentence(padded, args);
      const entry: QueueEntry = {
        id: this.nextId++,
        cid: padded,
        raw,
        args,
        ackTimeoutMs: opts.ackTimeoutMs ?? this.defaultAckTimeoutMs,
        followUpTimeoutMs: opts.followUpTimeoutMs ?? this.followUpTimeoutMs,
        resolve,
        reject,
        sentAt: 0,
        processingExtensions: 0,
        ...(opts.expectFollowUpCid ? { expectFollowUpCid: opts.expectFollowUpCid.padStart(3, "0") } : {}),
      };
      this.waiting.push(entry);
      void this.flushNext();
    });
  }

  ingestAck(parsed: ParsedPairAck): boolean {
    const entry = this.inFlight;
    if (!entry || entry.cid !== parsed.cid) return false;
    if (parsed.result === 1) {
      entry.processingExtensions += 1;
      if (entry.processingExtensions > this.maxProcessingExtensions) {
        this.failInFlight("timeout", "Processing did not complete in time");
        return true;
      }
      this.armAckTimer(entry);
      return true;
    }
    if (parsed.result === 0) {
      entry.ack = { result: parsed.result, raw: parsed.raw };
      this.clearAckTimer(entry);
      if (entry.expectFollowUpCid && !entry.followUp) {
        this.armFollowUpTimer(entry);
        return true;
      }
      this.resolveInFlight();
      return true;
    }
    const kind = ackErrorKind(parsed.result);
    this.failInFlight(kind, `PAIR result ${parsed.result}`);
    return true;
  }

  ingestPair(parsed: ParsedPair): boolean {
    const entry = this.inFlight;
    if (!entry) return false;
    if (entry.expectFollowUpCid !== parsed.cid) return false;
    entry.followUp = { cid: parsed.cid, fields: parsed.fields, raw: parsed.raw };
    this.clearFollowUpTimer(entry);
    if (entry.ack) this.resolveInFlight();
    return true;
  }

  cancelAll(reason = "Connection closed"): void {
    const entries = [...this.waiting];
    this.waiting = [];
    for (const e of entries) {
      e.reject(new PairError("cancelled", reason, e.cid));
    }
    if (this.inFlight) {
      const f = this.inFlight;
      this.inFlight = null;
      this.clearAckTimer(f);
      this.clearFollowUpTimer(f);
      f.reject(new PairError("cancelled", reason, f.cid));
    }
  }

  get pending(): { id: number; cid: string; sentAt: number }[] {
    const list: { id: number; cid: string; sentAt: number }[] = [];
    if (this.inFlight) list.push({ id: this.inFlight.id, cid: this.inFlight.cid, sentAt: this.inFlight.sentAt });
    for (const e of this.waiting) list.push({ id: e.id, cid: e.cid, sentAt: e.sentAt });
    return list;
  }

  private async flushNext(): Promise<void> {
    if (this.inFlight) return;
    const next = this.waiting.shift();
    if (!next) return;
    this.inFlight = next;
    next.sentAt = this.now();
    this.armAckTimer(next);
    try {
      await this.write(next.raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.failInFlight("not-connected", message);
    }
  }

  private armAckTimer(entry: QueueEntry): void {
    this.clearAckTimer(entry);
    entry.ackTimer = setTimeout(() => {
      this.failInFlight("timeout", "No PAIR001 ack received");
    }, entry.ackTimeoutMs);
  }

  private armFollowUpTimer(entry: QueueEntry): void {
    this.clearFollowUpTimer(entry);
    entry.followUpTimer = setTimeout(() => {
      this.failInFlight("follow-up-timeout", "No follow-up sentence received");
    }, entry.followUpTimeoutMs);
  }

  private clearAckTimer(entry: QueueEntry): void {
    if (entry.ackTimer !== undefined) {
      clearTimeout(entry.ackTimer);
      entry.ackTimer = undefined as unknown as ReturnType<typeof setTimeout>;
    }
  }

  private clearFollowUpTimer(entry: QueueEntry): void {
    if (entry.followUpTimer !== undefined) {
      clearTimeout(entry.followUpTimer);
      entry.followUpTimer = undefined as unknown as ReturnType<typeof setTimeout>;
    }
  }

  private resolveInFlight(): void {
    const entry = this.inFlight;
    if (!entry || !entry.ack) return;
    this.inFlight = null;
    this.clearAckTimer(entry);
    this.clearFollowUpTimer(entry);
    const response: PairResponse = {
      cid: entry.cid,
      ack: { result: entry.ack.result as 0 | 1 | 2 | 3 | 4 | 5, raw: entry.ack.raw },
      durationMs: this.now() - entry.sentAt,
      ...(entry.followUp ? { followUp: entry.followUp } : {}),
    };
    entry.resolve(response);
    void this.flushNext();
  }

  private failInFlight(kind: PairErrorKind, message: string): void {
    const entry = this.inFlight;
    if (!entry) return;
    this.inFlight = null;
    this.clearAckTimer(entry);
    this.clearFollowUpTimer(entry);
    entry.reject(new PairError(kind, message, entry.cid));
    void this.flushNext();
  }
}

function ackErrorKind(result: number): PairErrorKind {
  switch (result) {
    case 2:
      return "failed";
    case 3:
      return "unsupported";
    case 4:
      return "param-error";
    case 5:
      return "busy";
    default:
      return "failed";
  }
}
