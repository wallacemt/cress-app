// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), updateConfig: vi.fn(), onBeat: vi.fn(() => () => {}) }));
vi.mock("../../metronome/engine", () => engine);
vi.mock("../../../app/container", () => ({ container: { getDeps: vi.fn().mockResolvedValue({ db: {} }) } }));
vi.mock("../../../application/metronome", () => ({ loadMetronomeConfig: vi.fn().mockResolvedValue({ bpm: 92, beatsPerBar: 4, accentBeats: [0], subdivision: "1" }), saveMetronomeConfig: vi.fn().mockResolvedValue(undefined) }));
import { MetronomePanel } from "./MetronomePanel";
import { useMetronomeStore } from "../../../stores/metronomeStore";

describe("MetronomePanel", () => {
  afterEach(cleanup);
  beforeEach(() => {
    engine.start.mockReset().mockResolvedValue(undefined);
    engine.stop.mockReset();
    engine.updateConfig.mockReset();
    useMetronomeStore.setState({ config: { bpm: 92, beatsPerBar: 4, accentBeats: [0], subdivision: "1" }, running: false, beat: -1, audioSuspended: false });
  });
  it("renders BPM, edits it, and starts and stops the engine", async () => {
    render(<MetronomePanel api={{} as never} containerApi={{} as never} params={{}} />);
    expect(screen.getByRole("button", { name: /BPM 92/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /BPM 92/ }));
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    fireEvent.change(input, { target: { value: "120" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useMetronomeStore.getState().config.bpm).toBe(120);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar metrônomo" }));
    await vi.waitFor(() => expect(engine.start).toHaveBeenCalledWith(expect.objectContaining({ bpm: 120 })));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Parar metrônomo" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Parar metrônomo" }));
    expect(engine.stop).toHaveBeenCalledOnce();
  });

  it("applies the timer as soon as it is typed, without needing blur", () => {
    render(<MetronomePanel api={{} as never} containerApi={{} as never} params={{}} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Habilitar timer" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Minutos do timer" }), { target: { value: "5" } });
    expect(useMetronomeStore.getState().timerSeconds).toBe(300);
  });

  it("applies compact layout from the observed panel width", () => {
    let resize: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe() {}
      disconnect() { disconnect(); }
      unobserve() {}
    });

    const { container } = render(<MetronomePanel api={{} as never} containerApi={{} as never} params={{}} />);
    const panel = container.querySelector(".cress-metronome-panel")!;
    act(() => resize?.([{ contentRect: { width: 360, height: 600 } } as ResizeObserverEntry], {} as ResizeObserver));
    expect(panel.classList.contains("cress-layout-quad")).toBe(true);
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
