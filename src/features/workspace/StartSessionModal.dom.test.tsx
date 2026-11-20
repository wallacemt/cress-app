// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { listPieces, listSessions, listGoals, startSession, getDeps } = vi.hoisted(() => ({
  listPieces: vi.fn(),
  listSessions: vi.fn(),
  listGoals: vi.fn(),
  startSession: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/repertoire", () => ({ listPieces }));
vi.mock("../../application/sessions", () => ({ listSessions, startSession }));
vi.mock("../../application/goals", () => ({ listGoals, createGoal: vi.fn() }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { StartSessionModal } from "./StartSessionModal";

const deps = {} as Deps;
function renderModal() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<StartSessionModal onClose={() => {}} />} />
        <Route path="/practice/:sessionId" element={<p>Sessão criada</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StartSessionModal", () => {
  afterEach(cleanup);
  beforeEach(() => {
    getDeps.mockReset().mockResolvedValue(deps);
    listSessions.mockReset().mockResolvedValue([]);
    listPieces.mockReset().mockResolvedValue([{ id: "piece-1", title: "Sonata", composer: "Beethoven", archived: false }]);
    listGoals.mockReset().mockResolvedValue([{ id: "goal-1", description: "Escalas", completed: false }]);
    startSession.mockReset().mockResolvedValue({ id: "session-1" });
  });

  it("lets the user pick an existing goal before starting the session", async () => {
    renderModal();
    const pieceButton = await screen.findByText("Sonata");
    fireEvent.click(pieceButton);
    await screen.findByText("Escalas");
    fireEvent.click(screen.getByText("Escalas"));
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));
    await waitFor(() => expect(startSession).toHaveBeenCalledWith(deps, { repertoireItemId: "piece-1", goalId: "goal-1" }));
  });
});
