// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { createPiece, updatePiece, getDeps } = vi.hoisted(() => ({
  createPiece: vi.fn(),
  updatePiece: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/repertoire", () => ({ createPiece, updatePiece }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { PieceFormDialog } from "./PieceFormDialog";

describe("PieceFormDialog", () => {
  afterEach(cleanup);
  beforeEach(() => {
    createPiece.mockReset();
    updatePiece.mockReset();
    getDeps.mockReset().mockResolvedValue({} as Deps);
  });

  it("creates a piece with the provided fields", async () => {
    const saved = { id: "piece-1", title: "Sonata", instrument: "violin" };
    createPiece.mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(<PieceFormDialog onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "Sonata" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Instrumento" }), {
      target: { value: "violin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar obra" }));
    await waitFor(() =>
      expect(createPiece).toHaveBeenCalledWith(expect.anything(), {
        title: "Sonata",
        composer: null,
        movement: null,
        instrument: "violin",
        notes: null,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(saved);
  });
});
