// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { createGoal, updateGoal, completeGoal, reopenGoal, deleteGoal, getDeps } = vi.hoisted(() => ({
  createGoal: vi.fn(), updateGoal: vi.fn(), completeGoal: vi.fn(), reopenGoal: vi.fn(), deleteGoal: vi.fn(), getDeps: vi.fn(),
}));
vi.mock("../../application/goals", () => ({ createGoal, updateGoal, completeGoal, reopenGoal, deleteGoal }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { GoalList } from "./GoalList";

const deps = {} as Deps;
const goals = [
  { id: "done", description: "Objetivo concluído", completed: true },
  { id: "open", description: "Objetivo pendente", completed: false },
];

describe("GoalList", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    getDeps.mockReset().mockResolvedValue(deps);
    createGoal.mockReset().mockResolvedValue({}); updateGoal.mockReset().mockResolvedValue({});
    completeGoal.mockReset().mockResolvedValue({}); reopenGoal.mockReset().mockResolvedValue({}); deleteGoal.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders pending goals before completed goals", () => {
    render(<GoalList goals={goals} repertoireItemId="piece-1" onChanged={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("Objetivo pendente");
    expect(items[1]?.textContent).toContain("Objetivo concluído");
  });

  it("creates a goal with optional numeric fields", async () => {
    render(<GoalList goals={[]} repertoireItemId="piece-1" onChanged={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar objetivo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Descrição" }), { target: { value: "Arpejo" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "BPM-alvo" }), { target: { value: "96" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Compasso inicial" }), { target: { value: "4" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Compasso final" }), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar objetivo" }));
    await waitFor(() => expect(createGoal).toHaveBeenCalledWith(deps, {
      repertoireItemId: "piece-1", description: "Arpejo", targetBpm: 96, startMeasure: 4, endMeasure: 8,
    }));
  });

  it("completes and deletes goals, then reloads", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<GoalList goals={[goals[1]!]} repertoireItemId="piece-1" onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Concluir: Objetivo pendente" }));
    await waitFor(() => expect(completeGoal).toHaveBeenCalledWith(deps, { id: "open" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith(deps, { id: "open" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
  });
});
