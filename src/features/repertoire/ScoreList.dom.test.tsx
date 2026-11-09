// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { listScores, renameScore } = vi.hoisted(() => ({
  listScores: vi.fn(),
  renameScore: vi.fn(),
}));
vi.mock("../../application/scores", () => ({
  listScores,
  renameScore,
  attachScoreFile: vi.fn(),
  deleteScore: vi.fn(),
  reorderScore: vi.fn(),
}));
vi.mock("../../app/container", () => ({ container: { getDeps: vi.fn().mockResolvedValue({} as Deps) } }));
import { ScoreList } from "./ScoreList";

const score = { id: "score-1", repertoire_item_id: "piece-1", label: "Violino I", relative_path: "a.pdf", sha256: "x", original_name: "a.pdf", original_path: null, size_bytes: 1, sort_order: 0, last_page: 1, created_at: 0 };

describe("ScoreList", () => {
  afterEach(cleanup);
  beforeEach(() => {
    listScores.mockReset().mockResolvedValue([score]);
    renameScore.mockReset().mockResolvedValue(undefined);
  });

  it("renames inline without a browser prompt", async () => {
    render(<ScoreList pieceId="piece-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Renomear" }));
    const input = screen.getByRole("textbox", { name: "Renomear Violino I" });
    fireEvent.change(input, { target: { value: "Violino II" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await vi.waitFor(() =>
      expect(renameScore).toHaveBeenCalledWith(expect.anything(), { id: "score-1", label: "Violino II" }),
    );
  });

  it("discards the edit on Escape without renaming", async () => {
    render(<ScoreList pieceId="piece-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Renomear" }));
    const input = screen.getByRole("textbox", { name: "Renomear Violino I" });
    fireEvent.change(input, { target: { value: "Algo diferente" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Renomear Violino I" })).toBeNull();
    expect(renameScore).not.toHaveBeenCalled();
  });
});
