import type { PairAckCode } from "@/nmea/types"

export type PairCategory = "Restart" | "Position" | "NMEA" | "GNSS" | "DGPS" | "Storage" | "Port" | "Custom"

export type ArgKind =
  | { type: "int"; min?: number; max?: number; step?: number; unit?: string; default?: number }
  | { type: "float"; min?: number; max?: number; step?: number; unit?: string; default?: number }
  | { type: "enum"; options: { value: string; label: string }[]; default?: string }
  | { type: "flags"; bits: { value: string; label: string }[] }
  | { type: "string"; pattern?: RegExp; placeholder?: string }

export interface PairCommandSpec {
  cid: string
  name: string
  category: PairCategory
  description: string
  args: { name: string; kind: ArgKind; help?: string }[]
  resultKind: "ack-only" | "ack-and-followup"
  followUpCid?: string
  parseFollowUp?: (fields: string[]) => Record<string, unknown>
  defaultTimeoutMs?: number
  destructive?: boolean
}

export interface PairFollowUp {
  cid: string
  fields: string[]
  raw: string
}

export interface PairResponse {
  cid: string
  ack: { result: PairAckCode; raw: string }
  followUp?: PairFollowUp
  durationMs: number
}

export type PairErrorKind =
  | "timeout"
  | "follow-up-timeout"
  | "busy"
  | "unsupported"
  | "param-error"
  | "failed"
  | "not-connected"
  | "cancelled"

export class PairError extends Error {
  constructor(
    public readonly kind: PairErrorKind,
    message: string,
    public readonly cid: string,
  ) {
    super(message)
    this.name = "PairError"
  }
}

export function formatPairError(err: unknown): string {
  if (err instanceof PairError) return `${err.kind}: ${err.message}`
  if (err instanceof Error) return err.message
  return String(err)
}
