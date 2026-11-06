import { describe, expect, it, vi } from "vitest";
import type { AudioEvent } from "../infrastructure/tauri/audioPort";
import { createAudioInputStore } from "./audioInputStore";

describe("audioInputStore", () => {
  it("resets a persisted device id that is no longer available", async () => {
    const port = {
      listInputDevices: vi.fn(async () => [{ id: "default", name: "Default input", isDefault: true }]),
      startInput: vi.fn(async () => ({ sampleRate: 48_000, channels: 1 })),
      stopInput: vi.fn(async () => undefined),
      startRecording: vi.fn(async () => ({ sampleRate: 48_000 })),
      pauseRecording: vi.fn(async () => undefined),
      resumeRecording: vi.fn(async () => undefined),
      stopRecording: vi.fn(async () => ({ relativePath: "", durationMs: 0 })),
      probeRecording: vi.fn(async () => null),
      deleteRecordingFile: vi.fn(async () => undefined),
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
      startRecording: vi.fn(async () => ({ sampleRate: 48_000 })),
      pauseRecording: vi.fn(async () => undefined),
      resumeRecording: vi.fn(async () => undefined),
      stopRecording: vi.fn(async () => ({ relativePath: "", durationMs: 0 })),
      probeRecording: vi.fn(async () => null),
      deleteRecordingFile: vi.fn(async () => undefined),
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

  it("keeps a failed microphone start stable until an explicit retry", async () => {
    const port = {
      listInputDevices: vi.fn(async () => []),
      startInput: vi.fn(async () => { throw new Error("Device is busy"); }),
      stopInput: vi.fn(async () => undefined),
      startRecording: vi.fn(async () => ({ sampleRate: 48_000 })),
      pauseRecording: vi.fn(async () => undefined),
      resumeRecording: vi.fn(async () => undefined),
      stopRecording: vi.fn(async () => ({ relativePath: "", durationMs: 0 })),
      probeRecording: vi.fn(async () => null),
      deleteRecordingFile: vi.fn(async () => undefined),
    };
    const store = createAudioInputStore(port);

    await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
    expect(store.getState().error?.message).toBe("Device is busy");
    expect(port.startInput).toHaveBeenCalledTimes(1);

    await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
    expect(port.startInput).toHaveBeenCalledTimes(2);
    expect(store.getState().error?.message).toBe("Device is busy");
  });

  it("does not automatically reopen after the input stream reports an error", async () => {
    let send: ((event: AudioEvent) => void) | undefined;
    const port = {
      listInputDevices: vi.fn(async () => []),
      startInput: vi.fn(async (_id: string | null, onEvent: (event: AudioEvent) => void) => {
        send = onEvent;
        return { sampleRate: 48_000, channels: 1 };
      }),
      stopInput: vi.fn(async () => undefined),
      startRecording: vi.fn(async () => ({ sampleRate: 48_000 })),
      pauseRecording: vi.fn(async () => undefined),
      resumeRecording: vi.fn(async () => undefined),
      stopRecording: vi.fn(async () => ({ relativePath: "", durationMs: 0 })),
      probeRecording: vi.fn(async () => null),
      deleteRecordingFile: vi.fn(async () => undefined),
    };
    const store = createAudioInputStore(port);
    vi.useFakeTimers();
    try {
      await store.getState().acquire();
      send?.({ event: "error", data: { code: "AUDIO_INPUT", message: "Device is busy" } });
      expect(store.getState().error?.message).toBe("Device is busy");
      await vi.advanceTimersByTimeAsync(5000);
      expect(port.startInput).toHaveBeenCalledTimes(1);
      expect(store.getState().error?.message).toBe("Device is busy");
    } finally {
      vi.useRealTimers();
    }
  });
});
