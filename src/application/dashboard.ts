import type { Deps } from "./deps";
import { getProfile } from "./profile";
import { listSessions } from "./sessions";
import { makeSessionRepo } from "../infrastructure/repositories/sessionRepo";
import { makeRepertoireRepo } from "../infrastructure/repositories/repertoireRepo";
import { makeGoalRepo } from "../infrastructure/repositories/goalRepo";
import { FREE_PRACTICE_PIECE_ID } from "../domain/repertoire";

export async function getDashboard(d: Deps) {
  const [profile, sessions, openRows, pieces, goals] = await Promise.all([
    getProfile(d),
    listSessions(d),
    makeSessionRepo(d.db).open(),
    makeRepertoireRepo(d.db).list(),
    makeGoalRepo(d.db).list(),
  ]);
  const pieceSessions = sessions.filter((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID);
  const now = d.now().getTime();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekSessions = sessions.filter((session) => session.startedAt && session.startedAt.getTime() >= weekStart.getTime() && session.startedAt.getTime() <= now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const start = date.getTime();
    return {
      date,
      activeMs: weekSessions.reduce((total, session) => total + (session.startedAt && session.startedAt.getTime() >= start && session.startedAt.getTime() < start + 86_400_000 ? session.activeMs : 0), 0),
    };
  });
  const latest = pieceSessions[0];
  const piece = latest && pieces.find((item) => item.id === latest.repertoire_item_id);
  const goal = latest?.goal_id ? goals.find((item) => item.id === latest.goal_id && item.completed_at === null) : undefined;
  const open = openRows.sort((a, b) => b.started_at - a.started_at)[0];
  return {
    displayName: profile?.displayName ?? "",
    openSession: open ? sessions.find((session) => session.id === open.id) ?? null : null,
    recentPiece: piece ? { ...piece, goal: goal ? { description: goal.description, targetBpm: goal.target_bpm, startMeasure: goal.measure_start, endMeasure: goal.measure_end } : null } : null,
    latestPieceSession: latest ?? null,
    days,
    weekActiveMs: days.reduce((total, day) => total + day.activeMs, 0),
    recentSessions: sessions.slice(0, 5).map((session) => ({ ...session, goalCompleted: session.goal_id ? goals.find((item) => item.id === session.goal_id)?.completed_at != null : false })),
    pieceSessions,
    pieces: pieces.map((item) => ({ id: item.id, title: item.title })),
  };
}
