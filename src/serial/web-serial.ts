import type { SerialPortFactory, SerialPortLike } from "./types"

export const browserSerialFactory: SerialPortFactory = {
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator
  },
  async request(): Promise<SerialPortLike> {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial API is not available in this browser.")
    }
    const port = await navigator.serial.requestPort()
    return {
      open: (opts) => port.open(opts),
      close: () => port.close(),
      get readable() {
        return port.readable
      },
      get writable() {
        return port.writable
      },
    }
  },
}
