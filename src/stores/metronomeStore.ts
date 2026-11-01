import { create } from "zustand";
import { changeBpm, validateBpm } from "../domain/bpm";
import { SUBDIVISIONS, tapTempo, type MetronomeConfig } from "../domain/metronome";
import { start, stop, updateConfig, onBeat } from "../features/metronome/engine";

interface MetronomeState {
  config: MetronomeConfig;
  running: boolean;
  beat: number;
  timerSeconds: number | null;
  timerRemaining: number;
  audioSuspended: boolean;
  setConfig(config: MetronomeConfig): void;
  setBpm(bpm: number): void;
  stepBpm(delta: 1 | -1 | 5 | -5): void;
  tap(): void;
  setTimerSeconds(seconds: number | null): void;
  toggle(): Promise<void>;
  stop(): void;
}
let taps: number[] = [];
let tapReset: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;
let timerInterval: ReturnType<typeof setInterval> | undefined;
export const useMetronomeStore = create<MetronomeState>((set, get) => ({
  config: { bpm: 92, beatsPerBar: 4, accentBeats: [0], subdivision: "1" },
  running: false,
  beat: -1,
  timerSeconds: null,
  timerRemaining: 0,
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
  setTimerSeconds: (seconds) => {
    clearInterval(timerInterval);
    timerInterval = undefined;
    set({ timerSeconds: seconds, timerRemaining: seconds ?? 0 });
  },
  toggle: async () => {
    if (get().running) { get().stop(); return; }
    try {
      unsubscribe?.();
      unsubscribe = onBeat(({ beat }) => set({ beat }));
      await start(get().config);
      set({ running: true, audioSuspended: false });
      const seconds = get().timerSeconds;
      if (seconds != null && seconds > 0) {
        set({ timerRemaining: seconds });
        timerInterval = setInterval(() => {
          const remaining = get().timerRemaining - 1;
          if (remaining <= 0) get().stop();
          else set({ timerRemaining: remaining });
        }, 1000);
      }
    } catch (error) {
      unsubscribe?.(); unsubscribe = undefined;
      throw error;
    }
  },
  stop: () => { clearInterval(timerInterval); timerInterval = undefined; stop(); unsubscribe?.(); unsubscribe = undefined; set({ running: false, beat: -1 }); },
}));
export { SUBDIVISIONS };
