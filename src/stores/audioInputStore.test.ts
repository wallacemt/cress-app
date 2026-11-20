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
    vi.useFakeTimers();
    const store = createAudioInputStore(port);
    try {
      await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
      expect(store.getState().error?.message).toBe("Device is busy");
      expect(port.startInput).toHaveBeenCalledTimes(1);

      await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
      expect(port.startInput).toHaveBeenCalledTimes(2);
      expect(store.getState().error?.message).toBe("Device is busy");
    } finally {
      vi.useRealTimers();
    }
  });

  it("counts a second caller's acquire() while the first is in error, instead of dropping its reference (#106)", async () => {
    let callCount = 0;
    const port = {
      listInputDevices: vi.fn(async () => []),
      startInput: vi.fn(async () => {
        callCount += 1;
        if (callCount === 1) throw new Error("Device is busy");
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

    // Painel A monta primeiro e falha ao abrir o microfone (dispositivo ocupado).
    await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
    // Painel B monta em seguida, com o store ainda em erro; o restart() interno desta
    // chamada já sucede (2ª chamada ao startInput), então acquire() de B não rejeita.
    await store.getState().acquire();
    expect(store.getState().running).toBe(true);
    // restart() de B já chama stopInput() defensivamente antes de reabrir — isola essa
    // contagem da asserção real, que é sobre o que acontece a partir daqui.
    const stopCallsAfterBAcquired = port.stopInput.mock.calls.length;

    // A desmonta: como B também está contando como referência, o stream não pode cair.
    await store.getState().release();
    expect(port.stopInput.mock.calls.length).toBe(stopCallsAfterBAcquired);

    // Só quando B também desmonta é que o stream realmente para.
    await store.getState().release();
    expect(port.stopInput.mock.calls.length).toBe(stopCallsAfterBAcquired + 1);
  });

  it("ignores a malformed channel message instead of crashing on event.event (#106)", async () => {
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

    expect(() => send?.(undefined as unknown as AudioEvent)).not.toThrow();
    expect(store.getState().error).toBeNull();
  });

  it("automatically retries reopening the microphone after the input stream reports an error", async () => {
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
    vi.useFakeTimers();
    const store = createAudioInputStore(port);
    try {
      await store.getState().acquire();
      send?.({ event: "error", data: { code: "AUDIO_INPUT", message: "Device is busy" } });
      expect(store.getState().error?.message).toBe("Device is busy");
      expect(store.getState().running).toBe(false);

      await vi.advanceTimersByTimeAsync(600);

      expect(port.startInput).toHaveBeenCalledTimes(2);
      expect(store.getState().error).toBeNull();
      expect(store.getState().running).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up retrying after releasing the microphone (panel closed) and after exhausting the retry budget", async () => {
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
    vi.useFakeTimers();
    const store = createAudioInputStore(port);
    try {
      await store.getState().acquire();
      send?.({ event: "error", data: { code: "AUDIO_INPUT", message: "Device is busy" } });
      await store.getState().release();

      await vi.advanceTimersByTimeAsync(60_000);

      expect(port.startInput).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops retrying after exhausting the retry budget when the device stays unavailable", async () => {
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
    vi.useFakeTimers();
    const store = createAudioInputStore(port);
    try {
      await expect(store.getState().acquire()).rejects.toThrow("Device is busy");
      await vi.advanceTimersByTimeAsync(60_000);

      // 1 tentativa inicial + no máximo 5 retries automáticos = 6 chamadas, nunca em loop infinito.
      expect(port.startInput).toHaveBeenCalledTimes(6);
      expect(store.getState().error?.message).toBe("Device is busy");
    } finally {
      vi.useRealTimers();
    }
  });
});
