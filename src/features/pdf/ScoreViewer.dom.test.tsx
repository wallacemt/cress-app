// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreViewer } from "./ScoreViewer";

const { getDeps, getScore, setScoreLastPage, convertFileSrc, join } = vi.hoisted(() => ({
  getDeps: vi.fn(() => new Promise(() => {})),
  getScore: vi.fn(),
  setScoreLastPage: vi.fn(),
  convertFileSrc: vi.fn(),
  join: vi.fn(),
}));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
vi.mock("../../application/scores", () => ({ getScore, setScoreLastPage }));
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc }));
vi.mock("@tauri-apps/api/path", () => ({ join }));
vi.mock("./PdfCanvas", () => ({ PdfCanvas: () => <canvas aria-label="mock pdf" /> }));

describe("ScoreViewer", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("keeps keyboard navigation scoped to its focused root", () => {
    render(<><ScoreViewer scoreId="score-1" /><button>Outside</button></>);
    const outside = screen.getByRole("button", { name: "Outside" });
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    outside.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
