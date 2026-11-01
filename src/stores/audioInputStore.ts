import { create, type StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import * as audioPort from "../infrastructure/tauri/audioPort";
import type { AudioEvent, InputDevice } from "../infrastructure/tauri/audioPort";

interface AudioInputState {
  level: { rms: number; peak: number };
  pitch: { hz: number; clarity: number } | null;
  deviceId: string | null;
  devices: InputDevice[];
  running: boolean;
  error: { code: string; message: string } | null;
  acquire(): Promise<void>;
  release(): Promise<void>;
  setDevice(deviceId: string | null): Promise<void>;
  loadDevices(): Promise<void>;
}

export function createAudioInputStore(port: typeof audioPort = audioPort, persistDevice = false) {
  let references = 0;
  let generation = 0;
  const initializer: StateCreator<AudioInputState> = (set, get) => ({
    level: { rms: 0, peak: 0 }, pitch: null, deviceId: null, devices: [], running: false, error: null,
    acquire: async () => {
      if (references > 0 && get().error) {
        await restart(get().deviceId);
        return;
      }
      references += 1;
      if (references === 1) {
        try { await start(get().deviceId); }
        catch (error) { references -= 1; throw error; }
      }
    },
    release: async () => {
      if (references === 0) return;
      references -= 1;
      if (references === 0) { generation += 1; await port.stopInput(); set({ running: false, level: { rms: 0, peak: 0 }, pitch: null, error: null }); }
    },
    setDevice: async (deviceId) => {
      if (deviceId === get().deviceId) return;
      set({ deviceId, error: null });
      if (references > 0) {
        const requestedGeneration = ++generation;
        await port.stopInput();
        if (requestedGeneration !== generation) return;
        store.setState({ running: false, pitch: null });
        autoRetryUsed = false;
        await start(deviceId);
      }
    },
    loadDevices: async () => {
      const devices = await port.listInputDevices();
      set({ devices });
      const { deviceId } = get();
      if (deviceId !== null && !devices.some((device) => device.id === deviceId)) set({ deviceId: null });
    },
  });
  const store = persistDevice
    ? create<AudioInputState>()(persist(initializer, { name: "cress-audio-input-preferences", partialize: ({ deviceId }) => ({ deviceId }) }))
    : create<AudioInputState>(initializer);
  let autoRetryUsed = false;
  const start = async (deviceId: string | null) => {
    const current = ++generation;
    await port.startInput(deviceId, (event: AudioEvent) => {
      if (current !== generation) return;
      if (event.event === "error") {
        store.setState({ error: event.data, running: false, pitch: null });
        if (!autoRetryUsed) {
          autoRetryUsed = true;
          generation += 1;
          const retryGeneration = generation;
          void port.stopInput().catch(() => {});
          setTimeout(() => {
            if (references > 0 && generation === retryGeneration) void start(deviceId).catch((error: unknown) => store.setState({ error: toAudioError(error) }));
          }, 500);
        }
        return;
      }
      store.setState({ level: { rms: event.data.rms, peak: event.data.peak }, pitch: event.data.pitch });
    });
    if (current === generation) store.setState({ running: true, error: null });
    else if (references === 0) await port.stopInput();
  };

  const restart = async (deviceId: string | null) => {
    generation += 1;
    await port.stopInput();
    store.setState({ running: false, pitch: null });
    autoRetryUsed = false;
    try { await start(deviceId); }
    catch (error) { store.setState({ error: toAudioError(error), running: false }); throw error; }
  };

  function toAudioError(error: unknown) {
    return { code: "AUDIO_INPUT", message: error instanceof Error ? error.message : String(error) };
  }

  return store;
}

export const useAudioInputStore = createAudioInputStore(audioPort, true);
