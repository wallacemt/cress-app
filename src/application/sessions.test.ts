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
  getPieceStats,
  listSessions,
  listSessionsPage,
  getSession,
  withGoalCompletion,
} from "./sessions";
import { startTake } from "./recordings";
import { makeTestDeps } from "./test-support";
describe("sessions application", () => {
  it("adds goal completion state to sessions", () => {
    const session = { id: "s1", status: "FINISHED" as const, startedAt: null, resumedAt: null, lastHeartbeatAt: null, endedAt: null, activeMs: 0, notes: "", repertoire_item_id: "p1", goal_id: "g1", initial_bpm: null, final_bpm: null };
    expect(withGoalCompletion([session], [{ id: "g1", completed: true }])[0]?.goalCompleted).toBe(true);
    expect(withGoalCompletion([session], [])[0]?.goalCompleted).toBe(false);
  });
  it("aggregates piece practice stats with newest session first", async () => {
    const d = makeTestDeps({ now: () => new Date("2026-11-08T12:00:00Z") });
    const piece = await createPiece(d, { title: "Stats" });
    const first = await startSession(d, { repertoireItemId: piece.id, initialBpm: 60 });
    await finishSession(d, { id: first.id, finalBpm: 72, completeGoal: false });
    const stats = await getPieceStats(d, { repertoireItemId: piece.id });
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalActiveMs).toBe(0);
    expect(stats.lastPracticeAt).toEqual(first.startedAt);
    expect(stats.sessions[0]).toMatchObject({ id: first.id, initial_bpm: 60, final_bpm: 72 });
    expect(stats.finalBpmHistory).toEqual([72]);
    expect(stats.completedGoals).toBe(0);
    expect(stats.totalGoals).toBe(0);
  });
  it("returns the latest 20 final BPM values oldest first and counts completed goals", async () => {
    let now = 0;
    const d = makeTestDeps({ now: () => new Date(now += 1_000) });
    const piece = await createPiece(d, { title: "BPM history" });
    const goal = await createGoal(d, { repertoireItemId: piece.id, description: "Goal" });
    for (let bpm = 60; bpm < 82; bpm += 1) {
      const session = await startSession(d, { repertoireItemId: piece.id });
      await finishSession(d, { id: session.id, finalBpm: bpm, completeGoal: false });
    }
    await createGoal(d, { repertoireItemId: piece.id, description: "Done", completed: true });
    const stats = await getPieceStats(d, { repertoireItemId: piece.id });

    expect(stats.finalBpmHistory).toEqual(Array.from({ length: 20 }, (_, index) => index + 62));
    expect(stats).toMatchObject({ completedGoals: 1, totalGoals: 2 });
    expect(goal.id).toBeTruthy();
  });
  it("includes the associated goal completion state in listed sessions", async () => {
    const d = makeTestDeps();
    const piece = await createPiece(d, { title: "Goal completion" });
    const goal = await createGoal(d, { repertoireItemId: piece.id, description: "Practice cleanly" });
    const session = await startSession(d, { repertoireItemId: piece.id, goalId: goal.id });
    await finishSession(d, { id: session.id, completeGoal: true });
    await expect(listSessions(d, { repertoireItemId: piece.id })).resolves.toMatchObject([
      { id: session.id, goalCompleted: true },
    ]);
  });
  it("lists sessions globally or by piece and reads an individual session", async () => {
    let now = 1_000;
    const d = makeTestDeps({ now: () => new Date(now += 1_000) });
    const p = await createPiece(d, { title: "List" });
    await d.db.execute(
      "INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [FREE_PRACTICE_PIECE_ID, "Free practice", null, null, null, null, null, 0, 0],
    );
    const first = await startSession(d, { repertoireItemId: p.id });
    await finishSession(d, { id: first.id, finalBpm: 72, completeGoal: false });
    const second = await startSession(d, { repertoireItemId: FREE_PRACTICE_PIECE_ID });

    expect((await listSessions(d)).map((session) => session.id)).toEqual([second.id, first.id]);
    expect((await listSessions(d, { repertoireItemId: p.id })).map((session) => session.id)).toEqual([first.id]);
    expect(await getSession(d, { id: first.id })).toMatchObject({ initial_bpm: null, final_bpm: 72 });
    expect(await getSession(d, { id: "missing" })).toBeNull();
  });
  it("returns a limited session page and reports whether another page exists", async () => {
    let now = 0;
    const d = makeTestDeps({ now: () => new Date(now += 1_000) });
    const piece = await createPiece(d, { title: "Paged" });
    for (let i = 0; i < 3; i++) {
      const session = await startSession(d, { repertoireItemId: piece.id });
      await finishSession(d, { id: session.id, completeGoal: false });
    }

    await expect(listSessionsPage(d, { repertoireItemId: piece.id, page: 0, pageSize: 2 })).resolves.toMatchObject({
      sessions: [{ id: expect.any(String) }, { id: expect.any(String) }],
      hasMore: true,
    });
    await expect(listSessionsPage(d, { repertoireItemId: piece.id, page: 1, pageSize: 2 })).resolves.toMatchObject({
      sessions: [{ id: expect.any(String) }],
      hasMore: false,
    });
  });
  it("does not block starting a real session while free practice is open", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    await d.db.execute(
      "INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [FREE_PRACTICE_PIECE_ID, "Free practice", null, null, null, null, null, 0, 0],
    );
    await ensureFreeSession(d);

    const session = await startSession(d, { repertoireItemId: p.id });

    expect(await getSession(d, { id: session.id })).toMatchObject({ repertoire_item_id: p.id, status: "ACTIVE" });
  });
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
