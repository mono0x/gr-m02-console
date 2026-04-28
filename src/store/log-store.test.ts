import { afterEach, describe, expect, it } from "vitest";
import { useLogStore } from "./log-store";

afterEach(() => {
  useLogStore.setState({ lines: [], capacity: 5000, paused: false });
});

describe("logStore", () => {
  it("appends rx and tx lines", () => {
    useLogStore.getState().push("a", "rx");
    useLogStore.getState().push("b", "tx");
    expect(useLogStore.getState().lines.map((l) => l.text)).toEqual(["a", "b"]);
  });

  it("evicts oldest when over capacity", () => {
    useLogStore.getState().setCapacity(3);
    for (const t of ["a", "b", "c", "d"]) useLogStore.getState().push(t, "rx");
    expect(useLogStore.getState().lines.map((l) => l.text)).toEqual(["b", "c", "d"]);
  });

  it("ignores pushes while paused", () => {
    useLogStore.getState().setPaused(true);
    useLogStore.getState().push("ignored", "rx");
    expect(useLogStore.getState().lines).toHaveLength(0);
    useLogStore.getState().setPaused(false);
    useLogStore.getState().push("kept", "rx");
    expect(useLogStore.getState().lines).toHaveLength(1);
  });

  it("clear empties the buffer", () => {
    useLogStore.getState().push("a", "rx");
    useLogStore.getState().clear();
    expect(useLogStore.getState().lines).toHaveLength(0);
  });
});
