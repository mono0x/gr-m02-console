import type { SerialPortFactory, SerialPortLike } from "./types";

export const browserSerialFactory: SerialPortFactory = {
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  },
  async request(): Promise<SerialPortLike> {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial API is not available in this browser.");
    }
    const port = await navigator.serial.requestPort();
    return port as unknown as SerialPortLike;
  },
};
