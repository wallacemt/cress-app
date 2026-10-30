import { create } from "zustand";
import { changeBpm, validateBpm } from "../domain/bpm";
import { SUBDIVISIONS, tapTempo, type MetronomeConfig } from "../domain/metronome";
import { start, stop, updateConfig, onBeat } from "../features/metronome/engine";

interface MetronomeState {
  config: MetronomeConfig;
  running: boolean;
  beat: number;
  audioSuspended: boolean;
  setConfig(config: MetronomeConfig): void;
  setBpm(bpm: number): void;
  stepBpm(delta: 1 | -1 | 5 | -5): void;
  tap(): void;
  toggle(): Promise<void>;
  stop(): void;
}
let taps: number[] = [];
let tapReset: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;
export const useMetronomeStore = create<MetronomeState>((set, get) => ({
  config: { bpm: 92, beatsPerBar: 4, accentBeats: [0], subdivision: "1" },
  running: false,
  beat: -1,
  audioSuspended: false,
  setConfig: (config) => { set({ config }); updateConfig(config); },
  setBpm: (bpm) => get().setConfig({ ...get().config, bpm: validateBpm(bpm) }),
  stepBpm: (delta) => get().setBpm(changeBpm(get().config.bpm, delta)),
  tap: () => {
    taps = [...taps, Date.now()].filter((time) => Date.now() - time <= 2000).slice(-5);
    const bpm = tapTempo(taps);
    if (bpm >= 20 && bpm <= 300) get().setBpm(bpm);
    clearTimeout(tapReset);
    tapReset = setTimeout(() => { taps = []; }, 2000);
  },
  toggle: async () => {
    if (get().running) { get().stop(); return; }
    try {
      unsubscribe?.();
      unsubscribe = onBeat(({ beat }) => set({ beat }));
      await start(get().config);
      set({ running: true, audioSuspended: false });
    } catch (error) {
      unsubscribe?.(); unsubscribe = undefined;
      throw error;
    }
  },
  stop: () => { stop(); unsubscribe?.(); unsubscribe = undefined; set({ running: false, beat: -1 }); },
}));
export { SUBDIVISIONS };
