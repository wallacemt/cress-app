// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TunerPanel } from "./TunerPanel";

const mockState: {
  pitch: { hz: number; clarity: number } | null;
  error: { code: string; message: string } | null;
  level: { rms: number; peak: number };
  running: boolean;
  devices: unknown[];
  deviceId: string | null;
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  loadDevices: ReturnType<typeof vi.fn>;
  setDevice: ReturnType<typeof vi.fn>;
} = {
  pitch: { hz: 440, clarity: 0.95 }, error: null, level: { rms: 0.01, peak: 0.02 }, running: true, devices: [] as unknown[], deviceId: null,
  acquire: vi.fn(async () => {}), release: vi.fn(async () => {}),
  loadDevices: vi.fn(async () => {}), setDevice: vi.fn(async () => {}),
};
vi.mock("../../../stores/audioInputStore", () => ({
  useAudioInputStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}));

describe("TunerPanel", () => {
  afterEach(() => {
    cleanup();
    mockState.error = null;
    mockState.level = { rms: 0.01, peak: 0.02 };
  });
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
  it("does not show the Windows microphone permission hint for silent input", async () => {
    vi.useFakeTimers();
    try {
      mockState.level = { rms: 0, peak: 0 };
      render(<TunerPanel />);
      await vi.advanceTimersByTimeAsync(5000);
      expect(screen.queryByText(/Permitir que apps da área de trabalho acessem o microfone/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("shows the Windows microphone permission hint when audio input errors", () => {
    mockState.error = { code: "AUDIO_INPUT", message: "Permission denied" };
    render(<TunerPanel />);
    expect(screen.getByText(/Permitir que apps da área de trabalho acessem o microfone/)).toBeTruthy();
  });
});
