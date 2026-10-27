import { create } from "zustand";
import * as audioPort from "../infrastructure/tauri/audioPort";
import type { AudioEvent, InputDevice } from "../infrastructure/tauri/audioPort";

interface AudioInputState {
  level: { rms: number; peak: number };
  pitch: { hz: number; clarity: number } | null;
  deviceId: string | null;
  devices: InputDevice[];
  running: boolean;
  acquire(): Promise<void>;
  release(): Promise<void>;
  setDevice(deviceId: string | null): Promise<void>;
  loadDevices(): Promise<void>;
}

export function createAudioInputStore(port: typeof audioPort = audioPort) {
  let references = 0;
  let generation = 0;
  const store = create<AudioInputState>((set, get) => ({
    level: { rms: 0, peak: 0 }, pitch: null, deviceId: null, devices: [], running: false,
    acquire: async () => {
      references += 1;
      if (references === 1) {
        try { await start(get().deviceId); }
        catch (error) { references -= 1; throw error; }
      }
    },
    release: async () => {
      if (references === 0) return;
      references -= 1;
      if (references === 0) { generation += 1; await port.stopInput(); set({ running: false, level: { rms: 0, peak: 0 }, pitch: null }); }
    },
    setDevice: async (deviceId) => {
      if (deviceId === get().deviceId) return;
      set({ deviceId });
      if (references > 0) {
        generation += 1;
        await port.stopInput();
        set({ running: false });
        await start(deviceId);
      }
    },
    loadDevices: async () => set({ devices: await port.listInputDevices() }),
  }));
  const start = async (deviceId: string | null) => {
    const current = ++generation;
    await port.startInput(deviceId, (event: AudioEvent) => {
      if (current !== generation || event.event !== "frame") return;
      store.setState({ level: { rms: event.data.rms, peak: event.data.peak }, pitch: event.data.pitch });
    });
    if (current === generation) store.setState({ running: true });
  };

  return store;
}

export const useAudioInputStore = createAudioInputStore();
