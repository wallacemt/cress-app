// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecordingPlayerStore } from "../stores/recordingPlayerStore";
import { RecordingPlayerBar } from "./RecordingPlayerBar";

vi.mock("@tauri-apps/api/path", () => ({ appDataDir: vi.fn(async () => "/data"), join: vi.fn(async (...parts: string[]) => parts.join("/")) }));
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: vi.fn((path: string) => `asset://${path}`) }));

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

function renderAt(path: string, store: ReturnType<typeof createRecordingPlayerStore>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RecordingPlayerBar store={store} />
    </MemoryRouter>,
  );
}

describe("RecordingPlayerBar", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("stays hidden until something is loaded into the player", () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    renderAt("/", store);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("stays hidden while still on the page that started the playback", async () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    await act(async () => {
      await store.getState().play({ id: "take-1", relativePath: "a.wav", title: "Take 1", durationMs: 12_000 }, "/sessions/session-1");
    });
    renderAt("/sessions/session-1", store);
    expect(screen.queryByText("Take 1")).toBeNull();
  });

  it("shows the current recording title and controls once the user navigates to another page", async () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    await act(async () => {
      await store.getState().play({ id: "take-1", relativePath: "a.wav", title: "Take 1", durationMs: 12_000 }, "/sessions/session-1");
    });
    renderAt("/", store);
    expect(screen.getByText("Take 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
  });

  it("close button hides the bar again", async () => {
    const store = createRecordingPlayerStore(makeFakeAudio());
    await act(async () => {
      await store.getState().play({ id: "take-1", relativePath: "a.wav", title: "Take 1", durationMs: 12_000 }, "/sessions/session-1");
    });
    const { rerender } = renderAt("/", store);
    act(() => { store.getState().close(); });
    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <RecordingPlayerBar store={store} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Take 1")).toBeNull();
  });
});
