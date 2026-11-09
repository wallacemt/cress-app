// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IDockviewPanelProps } from "dockview-react";
import { ScorePanel } from "./ScorePanel";

vi.mock("../../../app/container", () => ({ container: { getDeps: vi.fn(() => new Promise(() => {})) } }));
vi.mock("../../../application/scores", () => ({ getScore: vi.fn(), setScoreLastPage: vi.fn() }));
vi.mock("../../pdf/PdfCanvas", () => ({ PdfCanvas: () => <canvas aria-label="mock pdf" /> }));
vi.mock("@tauri-apps/api/path", () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: vi.fn() }));

const props = { api: { id: "score:test-id" } } as unknown as IDockviewPanelProps;

describe("ScorePanel", () => {
  afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });
  it("exposes page navigation and zoom controls", () => {
    render(<ScorePanel {...props} />);
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Página/ })).toBeTruthy();
  });
  it("does not intercept page shortcuts while focus is in an input", () => {
    render(<ScorePanel {...props} />);
    const input = screen.getByRole("textbox", { name: "Ir para página" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect((input as HTMLInputElement).value).toBe("1");
    expect((screen.getByRole("textbox", { name: "Ir para página" }) as HTMLInputElement).value).toBe("1");
  });
});
