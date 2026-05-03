import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { PairAckCode } from "@/nmea/types"
import type { PairErrorKind } from "@/pair/types"

const HISTORY_CAP = 500

export interface PairHistoryItem {
  id: number
  cid: string
  name?: string
  rawSent: string
  args: string[]
  sentAt: number
  resolvedAt?: number
  durationMs?: number
  ack?: { result: PairAckCode; raw: string }
  followUp?: { cid: string; fields: string[]; raw: string }
  error?: { kind: PairErrorKind; message: string }
}

interface PairStore {
  history: PairHistoryItem[]
  pending: number
  recordSent: (item: PairHistoryItem) => void
  recordResolved: (id: number, patch: Partial<PairHistoryItem>) => void
  recordRejected: (id: number, error: { kind: PairErrorKind; message: string }, resolvedAt: number) => void
  clearHistory: () => void
  setPending: (n: number) => void
}

export const usePairStore = create<PairStore>()(
  subscribeWithSelector((set, get) => ({
    history: [],
    pending: 0,
    recordSent: (item) => {
      const next = [item, ...get().history]
      if (next.length > HISTORY_CAP) next.length = HISTORY_CAP
      set({ history: next, pending: get().pending + 1 })
    },
    recordResolved: (id, patch) => {
      set((state) => ({
        history: state.history.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        pending: Math.max(0, state.pending - 1),
      }))
    },
    recordRejected: (id, error, resolvedAt) => {
      set((state) => ({
        history: state.history.map((h) => (h.id === id ? { ...h, error, resolvedAt } : h)),
        pending: Math.max(0, state.pending - 1),
      }))
    },
    clearHistory: () => set({ history: [] }),
    setPending: (n) => set({ pending: n }),
  })),
)
