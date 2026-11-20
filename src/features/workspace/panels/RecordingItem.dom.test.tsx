// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../../application/deps";
import type { RecordingRow } from "../../../infrastructure/db/rows";
import { createRecordingPlayerStore } from "../../../stores/recordingPlayerStore";

vi.mock("@tauri-apps/api/path", () => ({ appDataDir: vi.fn(async () => "/data"), join: vi.fn(async (...parts: string[]) => parts.join("/")) }));
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: vi.fn((path: string) => `asset://${path}`) }));
vi.mock("../../../application/recordings", () => ({ deleteRecording: vi.fn(), renameRecording: vi.fn(), setRecordingNotes: vi.fn() }));

const { useRecordingPlayerStore } = vi.hoisted(() => ({ useRecordingPlayerStore: vi.fn() }));
vi.mock("../../../stores/recordingPlayerStore", async () => {
  const actual = await vi.importActual<typeof import("../../../stores/recordingPlayerStore")>("../../../stores/recordingPlayerStore");
  return { ...actual, useRecordingPlayerStore };
});
import { RecordingItem } from "./RecordingItem";

function makeFakeAudio() {
  const listeners: Record<string, Array<() => void>> = {};
  let paused = true;
  return {
    get paused() { return paused; },
    src: "",
    currentTime: 0,
    play: async () => { paused = false; listeners.play?.forEach((fn) => fn()); },
    pause: () => { paused = true; listeners.pause?.forEach((fn) => fn()); },
    addEventListener: (event: string, fn: () => void) => { (listeners[event] ??= []).push(fn); },
  } as unknown as HTMLAudioElement;
}

const take: RecordingRow = {
  id: "take-1",
  session_id: "session-1",
  title: "Take 1",
  relative_path: "2026/01/take-1.wav",
  duration_ms: 1000,
  bpm: null,
  notes: "Atenção ao vibrato no compasso 12",
  status: "COMPLETE",
  format: "wav",
  sample_rate: 44100,
  created_at: Date.now(),
} as RecordingRow;

function renderAt(path: string, store: ReturnType<typeof createRecordingPlayerStore>) {
  useRecordingPlayerStore.mockImplementation((selector: (s: ReturnType<typeof store.getState>) => unknown) => store(selector));
  Object.assign(useRecordingPlayerStore, { getState: store.getState });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RecordingItem take={take} deps={{} as Deps} onChange={() => {}} onError={() => {}} />
    </MemoryRouter>,
  );
}

describe("RecordingItem", () => {
  afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });

  it("shows the note content in a highlighted preview without entering edit mode", () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    renderAt("/sessions/session-1", store);
    expect(screen.getByText("Atenção ao vibrato no compasso 12")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("plays through the global player store, tagging the current page as the origin", async () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    renderAt("/sessions/session-1", store);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Ouvir/ })); });

    expect(store.getState().currentId).toBe("take-1");
    expect(store.getState().originPath).toBe("/sessions/session-1");
    expect(await screen.findByRole("button", { name: /Pausar/ })).toBeTruthy();
  });
});
