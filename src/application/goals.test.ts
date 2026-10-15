import { describe, expect, it } from "vitest";
import { createPiece } from "./repertoire";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  reopenGoal,
} from "./goals";
import { makeTestDeps } from "./test-support";
describe("goals application", () => {
  it("CRUDs and completes/reopens", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    const g = await createGoal(d, {
      repertoireItemId: p.id,
      description: "Practice",
      targetBpm: 80,
    });
    expect(g.description).toBe("Practice");
    await updateGoal(d, {
      id: g.id,
      repertoireItemId: p.id,
      description: "Updated",
    });
    expect((await completeGoal(d, { id: g.id })).completed_at).not.toBeNull();
    expect((await reopenGoal(d, { id: g.id })).completed_at).toBeNull();
    await deleteGoal(d, { id: g.id });
    await expect(deleteGoal(d, { id: g.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      updateGoal(d, { id: "x", description: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
