import { attachChecksum } from "@/lib/checksum";

export function buildPairSentence(cid: string, args: readonly string[] = []): string {
  const padded = cid.padStart(3, "0");
  const body = args.length > 0 ? `PAIR${padded},${args.join(",")}` : `PAIR${padded}`;
  return attachChecksum(body);
}
