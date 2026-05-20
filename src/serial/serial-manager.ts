import type { ConnectionState, LineDirection, LineEvent, SerialPortFactory, SerialPortLike } from "./types"

const LINE_SPLIT = /\r\n|\n|\r/

export type SerialManagerListener = (event: LineEvent) => void
export type StateListener = (state: ConnectionState, error?: string | null) => void

export interface SerialManagerOptions {
  factory: SerialPortFactory
}

export class SerialManager {
  private factory: SerialPortFactory
  private port: SerialPortLike | null = null
  private currentBaud: number | null = null
  private readerLoop: Promise<void> | null = null
  private readAbort: AbortController | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private encoder = new TextEncoder()
  private lineListeners = new Set<SerialManagerListener>()
  private stateListeners = new Set<StateListener>()
  private currentState: ConnectionState = "disconnected"
  private currentError: string | null = null

  constructor(opts: SerialManagerOptions) {
    this.factory = opts.factory
  }

  get state(): ConnectionState {
    return this.currentState
  }

  get error(): string | null {
    return this.currentError
  }

  get baudRate(): number | null {
    return this.currentBaud
  }

  isSupported(): boolean {
    return this.factory.isSupported()
  }

  onLine(handler: SerialManagerListener): () => void {
    this.lineListeners.add(handler)
    return () => this.lineListeners.delete(handler)
  }

  onState(handler: StateListener): () => void {
    this.stateListeners.add(handler)
    return () => this.stateListeners.delete(handler)
  }

  async connect(baudRate: number): Promise<void> {
    if (this.currentState === "connecting" || this.currentState === "connected") {
      throw new Error("Already connected or connecting")
    }
    this.setState("connecting", null)
    try {
      const port = await this.factory.request()
      await port.open({ baudRate })
      this.port = port
      this.currentBaud = baudRate
      this.startReadLoop()
      this.attachWriter()
      this.setState("connected", null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.setState("error", message)
      await this.cleanupPort()
      throw err
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentState === "disconnected") return
    await this.cleanupPort()
    this.setState("disconnected", null)
  }

  async setBaudRate(baudRate: number): Promise<void> {
    if (this.currentState !== "connected") {
      this.currentBaud = baudRate
      return
    }
    await this.cleanupPort()
    this.setState("connecting", null)
    try {
      const port = await this.factory.request()
      await port.open({ baudRate })
      this.port = port
      this.currentBaud = baudRate
      this.startReadLoop()
      this.attachWriter()
      this.setState("connected", null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.setState("error", message)
      await this.cleanupPort()
      throw err
    }
  }

  async write(line: string): Promise<void> {
    if (!this.writer) throw new Error("Not connected")
    const text = line.endsWith("\r\n") ? line : `${line}\r\n`
    await this.writer.write(this.encoder.encode(text))
    this.emitLine({ text: text.replace(/\r?\n$/, ""), ts: Date.now(), dir: "tx" })
  }

  private setState(state: ConnectionState, error: string | null): void {
    this.currentState = state
    this.currentError = error
    for (const l of this.stateListeners) l(state, error)
  }

  private emitLine(event: LineEvent): void {
    for (const l of this.lineListeners) l(event)
  }

  private attachWriter(): void {
    if (!this.port?.writable) return
    this.writer = this.port.writable.getWriter()
  }

  private startReadLoop(): void {
    const port = this.port
    if (!port?.readable) return
    const abort = new AbortController()
    this.readAbort = abort
    const reader = port.readable.getReader()
    abort.signal.addEventListener("abort", () => {
      reader.cancel().catch(() => {})
    })
    const decoder = new TextDecoder("utf-8", { fatal: false })
    let buffer = ""
    this.readerLoop = (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split(LINE_SPLIT)
          buffer = parts.pop() ?? ""
          if (parts.length === 0) continue
          const ts = Date.now()
          for (const line of parts) {
            if (line.length > 0) this.emitLine({ text: line, ts, dir: "rx" })
          }
        }
        const tail = buffer + decoder.decode()
        if (tail.length > 0) this.emitLine({ text: tail, ts: Date.now(), dir: "rx" })
      } catch (err) {
        if (!abort.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err)
          this.setState("error", message)
        }
      } finally {
        try {
          reader.releaseLock()
        } catch {}
      }
    })()
  }

  private async cleanupPort(): Promise<void> {
    if (this.readAbort) {
      this.readAbort.abort()
      this.readAbort = null
    }
    if (this.writer) {
      try {
        await this.writer.close()
      } catch {
        // ignore close errors during teardown
      }
      try {
        this.writer.releaseLock()
      } catch {
        // ignore
      }
      this.writer = null
    }
    if (this.readerLoop) {
      try {
        await this.readerLoop
      } catch {
        // ignore
      }
      this.readerLoop = null
    }
    if (this.port) {
      try {
        await this.port.close()
      } catch {
        // ignore
      }
      this.port = null
    }
  }
}

export type { LineDirection, LineEvent }
