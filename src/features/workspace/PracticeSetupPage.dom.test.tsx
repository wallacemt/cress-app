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
  listPieces,
  listGoals,
  startSession,
  createGoal,
  getDeps,
  openSessions,
} = vi.hoisted(() => ({
  listPieces: vi.fn(),
  listGoals: vi.fn(),
  startSession: vi.fn(),
  createGoal: vi.fn(),
  getDeps: vi.fn(),
  openSessions: vi.fn(),
}));
vi.mock("../../application/repertoire", () => ({ listPieces }));
vi.mock("../../application/goals", () => ({ listGoals, createGoal }));
vi.mock("../../application/sessions", () => ({ startSession }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
vi.mock("../../infrastructure/repositories/sessionRepo", () => ({
  makeSessionRepo: () => ({ open: openSessions }),
}));
import { PracticeSetupPage } from "./PracticeSetupPage";

const deps = {} as Deps;
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/practice/new"]}>
      <Routes>
        <Route path="/practice/new" element={<PracticeSetupPage />} />
        <Route path="/practice/:sessionId" element={<p>Sessão criada</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PracticeSetupPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    getDeps.mockReset().mockResolvedValue(deps);
    listPieces
      .mockReset()
      .mockResolvedValue([{ id: "piece-1", title: "Sonata", archived: false }]);
    listGoals
      .mockReset()
      .mockResolvedValue([
        { id: "goal-1", description: "Escalas", completed: false },
      ]);
    startSession.mockReset().mockResolvedValue({ id: "session-1" });
    createGoal.mockReset().mockResolvedValue({ id: "goal-new" });
    openSessions.mockReset().mockResolvedValue([]);
  });

  it("validates the BPM before creating a session", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Sonata" });
    await screen.findByRole("option", { name: "Escalas" });
    fireEvent.change(screen.getByRole("spinbutton", { name: "BPM inicial" }), {
      target: { value: "19" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(startSession).not.toHaveBeenCalled();
  });

  it("starts a session with the selected piece, goal and BPM, then navigates", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Sonata" });
    await screen.findByRole("option", { name: "Escalas" });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Objetivo existente" }),
      { target: { value: "goal-1" } },
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "BPM inicial" }), {
      target: { value: "96" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() =>
      expect(startSession).toHaveBeenCalledWith(deps, {
        repertoireItemId: "piece-1",
        goalId: "goal-1",
        initialBpm: 96,
      }),
    );
    expect(await screen.findByText("Sessão criada")).toBeTruthy();
  });

  it("creates an inline goal before starting the session", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Sonata" });
    fireEvent.change(screen.getByRole("textbox", { name: /Novo objetivo/ }), {
      target: { value: "Arcos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() =>
      expect(createGoal).toHaveBeenCalledWith(deps, {
        repertoireItemId: "piece-1",
        description: "Arcos",
      }),
    );
    expect(startSession).toHaveBeenCalledWith(deps, {
      repertoireItemId: "piece-1",
      goalId: "goal-new",
      initialBpm: 80,
    });
  });
});
