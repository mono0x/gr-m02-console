import type { SerialPortFactory, SerialPortLike } from "@/serial/types"

export interface MockSerialController {
  port: SerialPortLike
  readonly factory: SerialPortFactory
  receive(text: string): Promise<void>
  readonly transmissions: string[]
  closed: boolean
}

export function createMockSerial(): MockSerialController {
  let rxController: ReadableStreamDefaultController<Uint8Array> | null = null
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const transmissions: string[] = []
  const state = { closed: false, opened: false }

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      rxController = controller
    },
  })

  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      transmissions.push(decoder.decode(chunk))
    },
  })

  const port: SerialPortLike = {
    async open() {
      state.opened = true
    },
    async close() {
      state.closed = true
      try {
        rxController?.close()
      } catch {
        // ignore
      }
    },
    get readable() {
      return readable
    },
    get writable() {
      return writable
    },
  }

  return {
    port,
    factory: {
      isSupported: () => true,
      request: async () => port,
    },
    async receive(text: string) {
      if (!rxController) return
      rxController.enqueue(encoder.encode(text))
    },
    get transmissions() {
      return transmissions
    },
    get closed() {
      return state.closed
    },
  }
}
