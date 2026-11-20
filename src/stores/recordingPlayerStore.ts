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
  failed: boolean;
  // Rota de onde o play() foi disparado — a página que já mostra o player completo (forma de
  // onda, busca por trecho). A barra global só deve aparecer fora dessa rota (ver RecordingPlayerBar).
  originPath: string | null;
  // Resolve o arquivo e marca a gravação como atual, sem iniciar a reprodução
  // (usado ao arrastar na forma de onda de um take ainda não tocado).
  load(recording: PlayableRecording, originPath?: string): Promise<void>;
  play(recording: PlayableRecording, originPath?: string): Promise<void>;
  toggle(recording: PlayableRecording, originPath?: string): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  close(): void;
}

export type UseRecordingPlayerStore = ReturnType<typeof createRecordingPlayerStore>;

// ponytail: fallback mínimo pra evitar `ReferenceError: Audio is not defined` quando este
// módulo é importado fora de um ambiente de browser/webview (ex. testes em ambiente node puro
// que importam o catálogo de painéis, sem precisar de jsdom só por essa cadeia de import).
function createFallbackAudio(): HTMLAudioElement {
  return {
    paused: true,
    src: "",
    currentTime: 0,
    addEventListener() {},
    removeEventListener() {},
    play: async () => {},
    pause() {},
  } as unknown as HTMLAudioElement;
}

export function createRecordingPlayerStore(audio: HTMLAudioElement = typeof Audio !== "undefined" ? new Audio() : createFallbackAudio()) {
  let resolvedId: string | null = null;
  const store = create<RecordingPlayerState>((set, get) => {
    audio.addEventListener("timeupdate", () => set({ currentTime: audio.currentTime }));
    audio.addEventListener("play", () => set({ playing: true }));
    audio.addEventListener("pause", () => set({ playing: false }));
    audio.addEventListener("ended", () => set({ playing: false, currentTime: 0 }));
    audio.addEventListener("error", () => set({ failed: true, playing: false }));
    return {
      currentId: null,
      currentTitle: "",
      playing: false,
      currentTime: 0,
      duration: 0,
      failed: false,
      originPath: null,
      load: async (recording, originPath) => {
        if (resolvedId !== recording.id) {
          const root = await appDataDir();
          const absolutePath = await join(root, "recordings", recording.relativePath);
          audio.src = convertFileSrc(absolutePath);
          resolvedId = recording.id;
        }
        set({ currentId: recording.id, currentTitle: recording.title, duration: (recording.durationMs ?? 0) / 1000, failed: false, originPath: originPath ?? get().originPath });
      },
      play: async (recording, originPath) => {
        await get().load(recording, originPath);
        await audio.play();
      },
      toggle: async (recording, originPath) => {
        if (get().currentId === recording.id && !audio.paused) { audio.pause(); return; }
        await get().play(recording, originPath);
      },
      pause: () => audio.pause(),
      seek: (seconds) => { audio.currentTime = seconds; set({ currentTime: seconds }); },
      close: () => { audio.pause(); set({ currentId: null, currentTitle: "", playing: false, currentTime: 0, duration: 0, failed: false, originPath: null }); },
    };
  });
  return store;
}

// Instância única fora do React: sobrevive à navegação entre páginas (reprodução em segundo plano).
export const useRecordingPlayerStore = createRecordingPlayerStore();
