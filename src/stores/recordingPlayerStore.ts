import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

export interface PlayableRecording {
  id: string;
  relativePath: string;
  title: string;
  durationMs: number | null;
}

interface RecordingPlayerState {
  currentId: string | null;
  currentTitle: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  play(recording: PlayableRecording): Promise<void>;
  toggle(recording: PlayableRecording): Promise<void>;
  pause(): void;
}

export function createRecordingPlayerStore(audio: HTMLAudioElement = new Audio()) {
  let resolvedId: string | null = null;
  const store = create<RecordingPlayerState>((set, get) => {
    audio.addEventListener("timeupdate", () => set({ currentTime: audio.currentTime }));
    audio.addEventListener("play", () => set({ playing: true }));
    audio.addEventListener("pause", () => set({ playing: false }));
    audio.addEventListener("ended", () => set({ playing: false, currentTime: 0 }));
    return {
      currentId: null,
      currentTitle: "",
      playing: false,
      currentTime: 0,
      duration: 0,
      play: async (recording) => {
        if (resolvedId !== recording.id) {
          const root = await appDataDir();
          const absolutePath = await join(root, "recordings", recording.relativePath);
          audio.src = convertFileSrc(absolutePath);
          resolvedId = recording.id;
        }
        set({ currentId: recording.id, currentTitle: recording.title, duration: (recording.durationMs ?? 0) / 1000 });
        await audio.play();
      },
      toggle: async (recording) => {
        if (get().currentId === recording.id && !audio.paused) { audio.pause(); return; }
        await get().play(recording);
      },
      pause: () => audio.pause(),
    };
  });
  return store;
}

// Instância única fora do React: sobrevive à navegação entre páginas (reprodução em segundo plano).
export const useRecordingPlayerStore = createRecordingPlayerStore();
