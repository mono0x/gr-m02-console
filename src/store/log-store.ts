import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { LineDirection } from "@/serial/types"

export interface LogLine {
  ts: number
  text: string
  dir: LineDirection
  seq: number
}

const DEFAULT_CAPACITY = 5000

interface LogStore {
  lines: LogLine[]
  capacity: number
  paused: boolean
  push: (text: string, dir: LineDirection, ts?: number) => void
  clear: () => void
  setPaused: (paused: boolean) => void
  setCapacity: (capacity: number) => void
}

let nextSeq = 0

export const useLogStore = create<LogStore>()(
  subscribeWithSelector((set, get) => ({
    lines: [],
    capacity: DEFAULT_CAPACITY,
    paused: false,
    push: (text, dir, ts = Date.now()) => {
      if (get().paused) return
      const cap = get().capacity
      const next = get().lines.slice()
      next.push({ ts, text, dir, seq: nextSeq++ })
      if (next.length > cap) {
        next.splice(0, next.length - cap)
      }
      set({ lines: next })
    },
    clear: () => set({ lines: [] }),
    setPaused: (paused) => set({ paused }),
    setCapacity: (capacity) => {
      const lines = get().lines
      const trimmed = lines.length > capacity ? lines.slice(lines.length - capacity) : lines
      set({ capacity, lines: trimmed })
    },
  })),
)
