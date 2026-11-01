// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TunerPanel } from "./TunerPanel";

const mockState = {
  pitch: { hz: 440, clarity: 0.95 }, error: null, level: { rms: 0.01, peak: 0.02 }, running: true, devices: [] as unknown[], deviceId: null,
  acquire: vi.fn(async () => {}), release: vi.fn(async () => {}),
  loadDevices: vi.fn(async () => {}), setDevice: vi.fn(async () => {}),
};
vi.mock("../../../stores/audioInputStore", () => ({
  useAudioInputStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}));

describe("TunerPanel", () => {
  afterEach(cleanup);
  it("shows detected pitch, tuning meter, and device selection", async () => {
    render(<TunerPanel />);
    await waitFor(() => expect(screen.getByText("440.0 Hz")).toBeTruthy());
    expect(screen.getAllByText("A4").length).toBeGreaterThan(0);
    expect(screen.getByText("440.0 Hz")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByLabelText("Entrada de áudio")).toBeTruthy();
  });
  it("exposes the editable A4 reference setting", () => {
    render(<TunerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Configurações/ }));
    expect(screen.getByRole("slider", { name: "Frequência de referência A4" })).toBeTruthy();
  });
  it("shows the silent input hint after five seconds and hides it when signal returns", async () => {
    vi.useFakeTimers();
    try {
      mockState.level = { rms: 0, peak: 0 };
      render(<TunerPanel />);
      await vi.advanceTimersByTimeAsync(5000);
      expect(screen.getByText(/Permitir que apps da área de trabalho acessem o microfone/)).toBeTruthy();
      mockState.level = { rms: 0.01, peak: 0.02 };
      cleanup();
      render(<TunerPanel />);
      expect(screen.queryByText(/Permitir que apps da área de trabalho acessem o microfone/)).toBeNull();
    } finally {
      vi.useRealTimers();
      mockState.level = { rms: 0.01, peak: 0.02 };
    }
  });
});
