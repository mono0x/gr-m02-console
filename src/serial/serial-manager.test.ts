import { describe, expect, it } from "vitest";
import { createMockSerial } from "@/test/mocks/mock-serial-port";
import { SerialManager } from "./serial-manager";

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

describe("SerialManager", () => {
  it("transitions states and emits incoming lines", async () => {
    const mock = createMockSerial();
    const manager = new SerialManager({ factory: mock.factory });
    const states: string[] = [];
    manager.onState((s) => states.push(s));

    const lines: { text: string; dir: string }[] = [];
    manager.onLine((event) => lines.push({ text: event.text, dir: event.dir }));

    await manager.connect(115200);
    expect(manager.state).toBe("connected");

    await mock.receive("$PAIR001,005,0*3E\r\n$GNGGA,a*70\r\n");
    await nextTick();

    expect(lines.map((l) => l.text)).toEqual(["$PAIR001,005,0*3E", "$GNGGA,a*70"]);
    expect(states).toEqual(["connecting", "connected"]);
  });

  it("writes a sentence ending with CRLF", async () => {
    const mock = createMockSerial();
    const manager = new SerialManager({ factory: mock.factory });
    await manager.connect(115200);
    await manager.write("$PAIR005*3F");
    expect(mock.transmissions[0]).toBe("$PAIR005*3F\r\n");
  });

  it("disconnect closes the port and stops emitting", async () => {
    const mock = createMockSerial();
    const manager = new SerialManager({ factory: mock.factory });
    await manager.connect(115200);
    await manager.disconnect();
    expect(mock.closed).toBe(true);
    expect(manager.state).toBe("disconnected");
  });
});
