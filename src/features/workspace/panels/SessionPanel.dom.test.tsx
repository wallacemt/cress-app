// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudyGoal } from "../../../domain/goal";

const { completeGoal, reopenGoal, listGoals, updateSessionNotes, setSessionGoal } = vi.hoisted(() => ({
  completeGoal: vi.fn(), reopenGoal: vi.fn(), listGoals: vi.fn(), updateSessionNotes: vi.fn(), setSessionGoal: vi.fn(),
}));
vi.mock("../../../application/goals", () => ({ completeGoal, reopenGoal, listGoals }));
vi.mock("../../../application/sessions", () => ({ updateSessionNotes, setSessionGoal }));
vi.mock("../../repertoire/GoalFormDialog", () => ({
  GoalFormDialog: ({ onSaved }: { onSaved: (goal: StudyGoal) => void }) => <button type="button" onClick={() => onSaved({ id: "goal-new", description: "Escalas rápidas", completed: false })}>Salvar novo objetivo</button>,
}));

import { SessionPanel } from "./SessionPanel";

const deps = {} as never;
const session = { id: "session-1", repertoire_item_id: "piece-1", goal_id: "goal-1", notes: "", status: "FINISHED" } as never;
const goals = [{ id: "goal-1", description: "Escalas", targetBpm: 90, startMeasure: 2, endMeasure: 8, completed: false }];

function renderPanel(value = session) {
  return render(<SessionPanel api={{} as never} containerApi={{} as never} params={{ session: value, pieceId: "piece-1", deps }} />);
}

describe("SessionPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    listGoals.mockReset().mockResolvedValue(goals);
    completeGoal.mockReset().mockResolvedValue({});
    reopenGoal.mockReset().mockResolvedValue({});
    updateSessionNotes.mockReset().mockResolvedValue({});
    setSessionGoal.mockReset().mockResolvedValue({});
  });

  it("shows the session goal and completes it through the goal use case", async () => {
    renderPanel();
    expect(await screen.findByText("Escalas")).toBeTruthy();
    expect(screen.getByText("Alvo ♩ 90")).toBeTruthy();
    expect(screen.getByText("Compassos 2–8")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Objetivo concluído"));
    await waitFor(() => expect(completeGoal).toHaveBeenCalledWith(deps, { id: "goal-1" }));
  });

  it("offers to define a goal and updates the session selection", async () => {
    renderPanel({ ...(session as object), goal_id: null } as never);
    expect(await screen.findByText("Nenhum objetivo para esta sessão.")).toBeTruthy();
    fireEvent.click(screen.getByText("Definir objetivo"));
    fireEvent.change(screen.getByLabelText("Escolher objetivo"), { target: { value: "goal-1" } });
    await waitFor(() => expect(setSessionGoal).toHaveBeenCalledWith(deps, { id: "session-1", goalId: "goal-1" }));
  });

  it("creates and assigns a goal from an active session with no goals", async () => {
    const saved = { id: "goal-new", description: "Escalas rápidas", completed: false };
    listGoals.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([saved]);
    renderPanel({ ...(session as object), goal_id: null } as never);
    expect(await screen.findByText("Nenhum objetivo para esta sessão.")).toBeTruthy();
    fireEvent.click(screen.getByText("Novo objetivo"));
    fireEvent.click(screen.getByText("Salvar novo objetivo"));
    await waitFor(() => expect(setSessionGoal).toHaveBeenCalledWith(deps, { id: "session-1", goalId: saved.id }));
    expect(await screen.findByText(saved.description)).toBeTruthy();
  });

  it("debounces notes updates and caps input at 2000 characters", async () => {
    vi.useFakeTimers();
    renderPanel();
    const textarea = screen.getByLabelText("NOTAS DA SESSÃO") as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(2000);
    fireEvent.change(textarea, { target: { value: "Trecho difícil" } });
    expect(updateSessionNotes).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(updateSessionNotes).toHaveBeenCalledWith(deps, { id: "session-1", notes: "Trecho difícil" });
    vi.useRealTimers();
  });
});
