// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createRecordingPlayerStore } from "./recordingPlayerStore";

vi.mock("@tauri-apps/api/path", () => ({ appDataDir: vi.fn(async () => "/data"), join: vi.fn(async (...parts: string[]) => parts.join("/")) }));
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: vi.fn((path: string) => `asset://${path}`) }));

function makeFakeAudio() {
  const listeners: Record<string, Array<() => void>> = {};
  let paused = true;
  return {
    get paused() { return paused; },
    src: "",
    play: vi.fn(async () => { paused = false; listeners.play?.forEach((fn) => fn()); }),
    pause: vi.fn(() => { paused = true; listeners.pause?.forEach((fn) => fn()); }),
    addEventListener: (event: string, fn: () => void) => { (listeners[event] ??= []).push(fn); },
  } as unknown as HTMLAudioElement;
}

describe("recordingPlayerStore", () => {
  it("resolves the file path once per recording and plays it", async () => {
    const audio = makeFakeAudio();
    const store = createRecordingPlayerStore(audio);
    const recording = { id: "take-1", relativePath: "2026/01/take-1.wav", title: "Take 1", durationMs: 2000 };

    await store.getState().play(recording);

    expect(audio.src).toBe("asset:///data/recordings/2026/01/take-1.wav");
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(store.getState().currentId).toBe("take-1");
    expect(store.getState().playing).toBe(true);
  });

  it("toggle pauses the currently playing recording instead of restarting it", async () => {
    const audio = makeFakeAudio();
    const store = createRecordingPlayerStore(audio);
    const recording = { id: "take-1", relativePath: "2026/01/take-1.wav", title: "Take 1", durationMs: 2000 };

    await store.getState().toggle(recording);
    expect(store.getState().playing).toBe(true);
    await store.getState().toggle(recording);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(store.getState().playing).toBe(false);
  });

  it("switching to a different recording resolves a new path", async () => {
    const audio = makeFakeAudio();
    const store = createRecordingPlayerStore(audio);
    await store.getState().play({ id: "take-1", relativePath: "a.wav", title: "A", durationMs: 1000 });
    await store.getState().play({ id: "take-2", relativePath: "b.wav", title: "B", durationMs: 1000 });
    expect(audio.src).toBe("asset:///data/recordings/b.wav");
    expect(store.getState().currentId).toBe("take-2");
  });
});
