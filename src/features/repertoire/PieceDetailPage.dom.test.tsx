// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const {
  archivePiece,
  deletePiece,
  listPieces,
  unarchivePiece,
  listGoals,
  getDeps,
} = vi.hoisted(() => ({
  archivePiece: vi.fn(),
  deletePiece: vi.fn(),
  listPieces: vi.fn(),
  unarchivePiece: vi.fn(),
  listGoals: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/repertoire", () => ({
  archivePiece,
  deletePiece,
  listPieces,
  unarchivePiece,
}));
vi.mock("../../application/goals", () => ({ listGoals }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { PieceDetailPage } from "./PieceDetailPage";

const deps = {} as Deps;
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/repertoire/piece-1"]}>
      <Routes>
        <Route path="/repertoire/:pieceId" element={<PieceDetailPage />} />
        <Route path="/repertoire" element={<p>Repertório</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
describe("PieceDetailPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    getDeps.mockReset().mockResolvedValue(deps);
    listPieces
      .mockReset()
      .mockResolvedValue([{ id: "piece-1", title: "Sonata", composer: "Ana" }]);
    listGoals.mockReset().mockResolvedValue([]);
    archivePiece.mockReset().mockResolvedValue(undefined);
    unarchivePiece.mockReset().mockResolvedValue(undefined);
    deletePiece.mockReset().mockResolvedValue(undefined);
  });

  it("shows a clear error and keeps the piece when it has sessions", async () => {
    deletePiece.mockRejectedValue(
      Object.assign(new Error("Piece has sessions"), {
        code: "PIECE_HAS_SESSIONS",
      }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Esta obra tem sessões registradas",
    );
    expect(deletePiece).toHaveBeenCalledWith(deps, { id: "piece-1" });
    expect(screen.getByRole("heading", { name: "Sonata" })).toBeTruthy();
  });

  it("deletes a piece without sessions and navigates back", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    await waitFor(() =>
      expect(deletePiece).toHaveBeenCalledWith(deps, { id: "piece-1" }),
    );
    expect(await screen.findByText("Repertório")).toBeTruthy();
  });
});
