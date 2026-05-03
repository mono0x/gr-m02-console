import { create } from "zustand"
import { browserSerialFactory } from "@/serial/web-serial"
import { SerialManager } from "@/serial/serial-manager"
import { DEFAULT_BAUD_RATE, type ConnectionState, type LineEvent } from "@/serial/types"

export const serialManager = new SerialManager({ factory: browserSerialFactory })

interface ConnectionStore {
  state: ConnectionState
  baudRate: number
  error: string | null
  isSupported: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  setBaudRate: (rate: number) => Promise<void>
}

export const useConnectionStore = create<ConnectionStore>((set, get) => {
  serialManager.onState((state, error) => {
    set({ state, error: error ?? null })
  })
  return {
    state: serialManager.state,
    baudRate: DEFAULT_BAUD_RATE,
    error: null,
    isSupported: serialManager.isSupported(),
    connect: async () => {
      const { baudRate } = get()
      await serialManager.connect(baudRate)
    },
    disconnect: async () => {
      await serialManager.disconnect()
    },
    setBaudRate: async (rate: number) => {
      set({ baudRate: rate })
      if (serialManager.state === "connected") {
        await serialManager.setBaudRate(rate)
      }
    },
  }
})

export function subscribeSerialLine(handler: (event: LineEvent) => void): () => void {
  return serialManager.onLine(handler)
}

export function writeSerial(line: string): Promise<void> {
  return serialManager.write(line)
}
