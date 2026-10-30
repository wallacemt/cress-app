// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TunerPanel } from "./TunerPanel";

const mockState = {
  pitch: { hz: 440, clarity: 0.95 }, devices: [] as unknown[], deviceId: null,
  acquire: vi.fn(async () => {}), release: vi.fn(async () => {}),
  loadDevices: vi.fn(async () => {}), setDevice: vi.fn(async () => {}),
};
vi.mock("../../../stores/audioInputStore", () => ({
  useAudioInputStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}));

describe("TunerPanel", () => {
  afterEach(cleanup);
  it("shows detected pitch, tuning meter, and device selection", () => {
    render(<TunerPanel />);
    expect(screen.getAllByText("A4").length).toBeGreaterThan(0);
    expect(screen.getByText("440.0 Hz")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByLabelText("Entrada de áudio")).toBeTruthy();
  });
});
