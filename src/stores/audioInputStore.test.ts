import { describe, expect, it, vi } from "vitest";
import type { AudioEvent } from "../infrastructure/tauri/audioPort";
import { createAudioInputStore } from "./audioInputStore";

describe("audioInputStore", () => {
  it("resets a persisted device id that is no longer available", async () => {
    const port = {
      listInputDevices: vi.fn(async () => [{ id: "default", name: "Default input", isDefault: true }]),
      startInput: vi.fn(async () => ({ sampleRate: 48_000, channels: 1 })),
      stopInput: vi.fn(async () => undefined),
    };
    const store = createAudioInputStore(port);
    store.setState({ deviceId: "disconnected-usb" });

    await store.getState().loadDevices();

    expect(store.getState().devices).toEqual([{ id: "default", name: "Default input", isDefault: true }]);
    expect(store.getState().deviceId).toBeNull();
  });

  it("starts and stops once across multiple acquisitions and forwards frames", async () => {
    let send: ((event: AudioEvent) => void) | undefined;
    const port = {
      listInputDevices: vi.fn(async () => []),
      startInput: vi.fn(async (_id: string | null, onEvent: (event: AudioEvent) => void) => {
        send = onEvent;
        return { sampleRate: 48_000, channels: 1 };
      }),
      stopInput: vi.fn(async () => undefined),
    };
    const store = createAudioInputStore(port);

    await store.getState().acquire();
    await store.getState().acquire();
    expect(port.startInput).toHaveBeenCalledTimes(1);
    send?.({ event: "frame", data: { rms: 0.2, peak: 0.5, pitch: { hz: 440, clarity: 0.9 }, recordedMs: null } });
    expect(store.getState().level).toEqual({ rms: 0.2, peak: 0.5 });
    expect(store.getState().pitch).toEqual({ hz: 440, clarity: 0.9 });

    await store.getState().release();
    expect(port.stopInput).not.toHaveBeenCalled();
    await store.getState().release();
    expect(port.stopInput).toHaveBeenCalledTimes(1);
    expect(store.getState().running).toBe(false);
  });
});
