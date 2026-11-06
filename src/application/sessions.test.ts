import { describe, expect, it } from "vitest";
import { createPiece } from "./repertoire";
import { FREE_PRACTICE_PIECE_ID } from "../domain/repertoire";
import { createGoal } from "./goals";
import {
  startSession,
  pauseSession,
  resumeSession,
  heartbeat,
  updateSessionNotes,
  finishSession,
  discardSession,
  ensureFreeSession,
} from "./sessions";
import { startTake } from "./recordings";
import { makeTestDeps } from "./test-support";
describe("sessions application", () => {
  it("resumes an existing paused free-practice session", async () => {
    const d = makeTestDeps();
    await d.db.execute(
      "INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [FREE_PRACTICE_PIECE_ID, "Free practice", null, null, null, null, null, 0, 0],
    );
    const session = await ensureFreeSession(d);
    await pauseSession(d, { id: session.id });

    const resumed = await ensureFreeSession(d);

    expect(resumed.id).toBe(session.id);
    expect(resumed.status).toBe("ACTIVE");
  });

  it("enforces ownership/open session and finishes take/goal", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" }),
      q = await createPiece(d, { title: "Q" }),
      g = await createGoal(d, { repertoireItemId: p.id, description: "G" });
    await expect(
      startSession(d, { repertoireItemId: p.id, goalId: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      startSession(d, { repertoireItemId: q.id, goalId: g.id }),
    ).rejects.toMatchObject({ code: "GOAL_MISMATCH" });
    const s = await startSession(d, { repertoireItemId: p.id, goalId: g.id });
    await expect(
      startSession(d, { repertoireItemId: p.id }),
    ).rejects.toMatchObject({ code: "SESSION_ALREADY_OPEN" });
    await startTake(d, { sessionId: s.id });
    const done = await finishSession(d, {
      id: s.id,
      finalBpm: 100,
      notes: "done",
      completeGoal: true,
    });
    expect(done.status).toBe("FINISHED");
    expect(
      (
        await d.db.select<{ status: string }>("SELECT status FROM recordings")
      )[0]?.status,
    ).toBe("COMPLETE");
    expect(
      (
        await d.db.select<{ completed_at: number }>(
          "SELECT completed_at FROM study_goals",
        )
      )[0]?.completed_at,
    ).not.toBeNull();
  });
  it("cycles, ignores heartbeat when paused, recovers, and discards", async () => {
    let t = 0;
    const d = makeTestDeps({ now: () => new Date((t += 1000)) });
    const p = await createPiece(d, { title: "P" }),
      s = await startSession(d, { repertoireItemId: p.id });
    await pauseSession(d, { id: s.id });
    await heartbeat(d, { id: s.id });
    await resumeSession(d, { id: s.id });
    await updateSessionNotes(d, { id: s.id, notes: "notes" });
    await startTake(d, { sessionId: s.id });
    await discardSession(d, { id: s.id });
    expect(await d.db.select("SELECT * FROM study_sessions")).toHaveLength(0);
  });
});
