import { describe, expect, it, vi } from "vitest";
import type { AudioEvent } from "../infrastructure/tauri/audioPort";
import { createAudioInputStore } from "./audioInputStore";

describe("audioInputStore", () => {
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
