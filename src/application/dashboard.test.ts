import { describe, expect, it } from "vitest";
import { createPiece } from "./repertoire";
import { completeGoal, createGoal } from "./goals";
import { finishSession, pauseSession, startSession } from "./sessions";
import { completeOnboarding } from "./profile";
import { getDashboard } from "./dashboard";
import { makeTestDeps } from "./test-support";
import { FREE_PRACTICE_PIECE_ID } from "../domain/repertoire";

describe("dashboard application", () => {
  it("returns greeting data, current session, recent piece, weekly time and five latest sessions", async () => {
    let now = new Date("2026-11-09T12:00:00");
    const d = makeTestDeps({ now: () => now });
    await completeOnboarding(d, { displayName: "Ana", instruments: ["violin"], primaryInstrument: "violin", musicalRoles: [] , a4: 440, noteNaming: "letter" });
    const piece = await createPiece(d, { title: "Concerto", composer: "Bach" });
    const goal = await createGoal(d, { repertoireItemId: piece.id, description: "Andamento", targetBpm: 120, startMeasure: 8, endMeasure: 16 });
    const sessions = [];
    for (let index = 0; index < 6; index += 1) {
      now = new Date("2026-11-09T10:00:00");
      now.setDate(now.getDate() - index);
      const session = await startSession(d, { repertoireItemId: piece.id, goalId: goal.id });
      await finishSession(d, { id: session.id, finalBpm: 70 + index, completeGoal: false });
      sessions.push(session);
    }
    await d.db.execute("INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [FREE_PRACTICE_PIECE_ID, "Prática livre", null, null, null, null, null, 0, 0]);
    now = new Date("2026-11-09T11:00:00");
    const freeSession = await startSession(d, { repertoireItemId: FREE_PRACTICE_PIECE_ID });
    await finishSession(d, { id: freeSession.id, finalBpm: 90, completeGoal: false });
    now = new Date("2026-11-09T11:30:00");
    const completedGoal = await createGoal(d, { repertoireItemId: piece.id, description: "Escalas" });
    const completedSession = await startSession(d, { repertoireItemId: piece.id, goalId: completedGoal.id });
    await finishSession(d, { id: completedSession.id, finalBpm: 80, completeGoal: false });
    await completeGoal(d, { id: completedGoal.id });
    now = new Date("2026-11-09T12:00:00");
    const open = await startSession(d, { repertoireItemId: piece.id, goalId: goal.id });
    await pauseSession(d, { id: open.id });
    now = new Date("2026-11-09T12:00:00");

    const result = await getDashboard(d);

    expect(result.displayName).toBe("Ana");
    expect(result.openSession).toMatchObject({ id: open.id, status: "PAUSED" });
    expect(result.recentPiece).toMatchObject({ title: "Concerto", composer: "Bach", goal: { description: "Andamento", targetBpm: 120, startMeasure: 8, endMeasure: 16 } });
    expect(result.weekActiveMs).toBe(0);
    expect(result.recentSessions).toHaveLength(5);
    expect(result.recentSessions[0]?.id).toBe(open.id);
    expect(result.recentSessions[0]?.goalCompleted).toBe(false);
    expect(result.recentSessions.find((session) => session.id === completedSession.id)?.goalCompleted).toBe(true);
    expect(result.pieceSessions[0]?.id).toBe(open.id);
    expect(result.pieceSessions.every((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID)).toBe(true);
    expect(result.days).toHaveLength(7);
  });

  it("returns an empty dashboard when no study data exists", async () => {
    const d = makeTestDeps();
    const result = await getDashboard(d);
    expect(result).toMatchObject({ displayName: "", openSession: null, recentPiece: null, latestPieceSession: null, weekActiveMs: 0, recentSessions: [] });
  });

  it("does not present the free practice sentinel as an open study session", async () => {
    const d = makeTestDeps();
    await d.db.execute("INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [FREE_PRACTICE_PIECE_ID, "Prática livre", null, null, null, null, null, 0, 0]);
    await startSession(d, { repertoireItemId: FREE_PRACTICE_PIECE_ID });

    expect((await getDashboard(d)).openSession).toBeNull();
  });
});
