export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export const SUPPORTED_BAUD_RATES = [4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600] as const;
export type BaudRate = (typeof SUPPORTED_BAUD_RATES)[number];
export const DEFAULT_BAUD_RATE: BaudRate = 115200;

export interface SerialPortLike {
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
}

export interface SerialPortFactory {
  request(): Promise<SerialPortLike>;
  isSupported(): boolean;
}

export type LineDirection = "rx" | "tx";

export interface LineEvent {
  text: string;
  ts: number;
  dir: LineDirection;
}
