import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NoteNaming = "letter" | "solfege";
export interface RecentNote { midi: number; at: number; inTune: boolean }
interface TunerState {
  a4: number;
  noteNaming: NoteNaming;
  display: "needle";
  recent: RecentNote[];
  setA4(a4: number): void;
  setNoteNaming(naming: NoteNaming): void;
  addRecent(midi: number, inTune?: boolean): void;
}

export const useTunerStore = create<TunerState>()(persist((set) => ({
  a4: 440,
  noteNaming: "letter",
  display: "needle",
  recent: [],
  setA4: (a4) => { if (Number.isFinite(a4) && a4 >= 415 && a4 <= 466) set({ a4 }); },
  setNoteNaming: (noteNaming) => set({ noteNaming }),
  addRecent: (midi, inTune = false) => set((state) => state.recent[state.recent.length - 1]?.midi === midi
    ? state
    : { recent: [...state.recent, { midi, at: Date.now(), inTune }].slice(-12) }),
}), { name: "cress-tuner-preferences", partialize: ({ a4, noteNaming }) => ({ a4, noteNaming }) }));
