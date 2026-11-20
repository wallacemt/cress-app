// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { getSession, listPieces, listTakes, getGoal, getGoalCompletion, getDeps } = vi.hoisted(() => ({
  getSession: vi.fn(),
  listPieces: vi.fn(),
  listTakes: vi.fn(),
  getGoal: vi.fn(),
  getGoalCompletion: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/sessions", () => ({ getSession, getGoalCompletion }));
vi.mock("../../application/repertoire", () => ({ listPieces }));
vi.mock("../../application/recordings", () => ({ listTakes }));
vi.mock("../../application/goals", () => ({ getGoal }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
vi.mock("../workspace/panels/RecordingItem", () => ({ RecordingItem: () => null }));
import { SessionDetailPage } from "./SessionDetailPage";

const deps = {} as Deps;
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sessions/session-1"]}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        <Route path="/repertoire/:pieceId" element={<p>Página da obra</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SessionDetailPage", () => {
  afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });
  beforeEach(() => {
    getDeps.mockReset().mockResolvedValue(deps);
    listTakes.mockReset().mockResolvedValue([]);
    getGoal.mockReset().mockResolvedValue(null);
    getGoalCompletion.mockReset().mockResolvedValue(false);
  });

  it("links the studied piece title to its repertoire page", async () => {
    getSession.mockResolvedValue({ id: "session-1", repertoire_item_id: "piece-1", goal_id: null, status: "FINISHED", activeMs: 0, initial_bpm: null, final_bpm: null, startedAt: new Date("2026-11-09T10:00:00Z"), endedAt: new Date("2026-11-09T10:30:00Z"), notes: null });
    listPieces.mockResolvedValue([{ id: "piece-1", title: "Sonata" }]);
    renderPage();

    const link = await screen.findByRole("link", { name: "Sonata" });
    expect(link.getAttribute("href")).toBe("/repertoire/piece-1");
  });

  it("does not link free-practice sessions anywhere", async () => {
    getSession.mockResolvedValue({ id: "session-1", repertoire_item_id: "free-practice", goal_id: null, status: "FINISHED", activeMs: 0, initial_bpm: null, final_bpm: null, startedAt: new Date("2026-11-09T10:00:00Z"), endedAt: new Date("2026-11-09T10:30:00Z"), notes: null });
    listPieces.mockResolvedValue([]);
    renderPage();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: /pr[áa]tica livre/i })).toBeNull();
  });
});
