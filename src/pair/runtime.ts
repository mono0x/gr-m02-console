import { PAIR_CATALOG } from "@/pair/catalog";
import { PairError, type PairResponse } from "@/pair/types";
import { writeSerial } from "@/store/connection-store";
import { usePairStore } from "@/store/pair-store";
import { buildPairSentence } from "./encode";
import { PairQueue, type SendOptions } from "./queue";

export const pairQueue = new PairQueue({
  write: writeSerial,
  defaultAckTimeoutMs: 2000,
  followUpTimeoutMs: 1500,
  maxProcessingExtensions: 5,
});

let nextHistoryId = 1;

export interface SendCommandInput {
  cid: string;
  args?: string[];
  expectFollowUpCid?: string;
  ackTimeoutMs?: number;
  followUpTimeoutMs?: number;
}

export async function sendPairCommand(input: SendCommandInput): Promise<PairResponse> {
  const padded = input.cid.padStart(3, "0");
  const spec = PAIR_CATALOG[padded];
  const args = input.args ?? [];
  const sendOpts: SendOptions = {};
  const expect = input.expectFollowUpCid ?? spec?.followUpCid;
  if (expect) sendOpts.expectFollowUpCid = expect;
  const ackTimeoutMs = input.ackTimeoutMs ?? spec?.defaultTimeoutMs;
  if (ackTimeoutMs !== undefined) sendOpts.ackTimeoutMs = ackTimeoutMs;
  if (input.followUpTimeoutMs !== undefined) sendOpts.followUpTimeoutMs = input.followUpTimeoutMs;

  const id = nextHistoryId++;
  const sentAt = Date.now();
  const rawSent = buildPairSentence(padded, args);
  const store = usePairStore.getState();
  store.recordSent({
    id,
    cid: padded,
    name: spec?.name,
    rawSent,
    args,
    sentAt,
  });
  try {
    const response = await pairQueue.send(padded, args, sendOpts);
    usePairStore.getState().recordResolved(id, {
      ack: response.ack,
      ...(response.followUp ? { followUp: response.followUp } : {}),
      resolvedAt: Date.now(),
      durationMs: response.durationMs,
    });
    return response;
  } catch (err) {
    if (err instanceof PairError) {
      usePairStore.getState().recordRejected(id, { kind: err.kind, message: err.message }, Date.now());
    } else {
      const message = err instanceof Error ? err.message : String(err);
      usePairStore.getState().recordRejected(id, { kind: "failed", message }, Date.now());
    }
    throw err;
  }
}

