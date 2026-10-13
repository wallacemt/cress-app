import { describe, expect, it } from "vitest";
import { completeGoal, createStudyGoal, reopenGoal } from "./goal";
describe("goal", () => {
  it("creates and completes a goal", () => {
    const goal = createStudyGoal({
      id: "1",
      description: "Practice",
      targetBpm: 80,
      startMeasure: 1,
      endMeasure: 8,
    });
    expect(goal.completed).toBe(false);
    expect(completeGoal(goal).completed).toBe(true);
    expect(reopenGoal(goal).completed).toBe(false);
  });
  it("rejects invalid description and measure range", () => {
    expect(() => createStudyGoal({ id: "1", description: " " })).toThrow();
    expect(() =>
      createStudyGoal({
        id: "1",
        description: "x",
        startMeasure: 8,
        endMeasure: 1,
      }),
    ).toThrow();
  });
});
