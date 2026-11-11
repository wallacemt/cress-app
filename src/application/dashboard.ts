import type { Deps } from "./deps";
import { getProfile } from "./profile";
import { listSessions, withGoalCompletion } from "./sessions";
import { makeRepertoireRepo } from "../infrastructure/repositories/repertoireRepo";
import { makeGoalRepo } from "../infrastructure/repositories/goalRepo";
import { FREE_PRACTICE_PIECE_ID } from "../domain/repertoire";
import { liveActiveMs } from "../domain/session";

function activityDays(sessions: Awaited<ReturnType<typeof listSessions>>, now: Date, dates: Date[]) {
  return dates.map((date) => {
    const start = date.getTime();
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return {
      date,
      activeMs: sessions.reduce((total, session) => {
        if (!session.startedAt) return total;
        const sessionStart = session.startedAt.getTime();
        const sessionEnd = (session.endedAt ?? now).getTime();
        const totalDuration = liveActiveMs(session, now);
        const overlap = Math.max(0, Math.min(sessionEnd, end.getTime()) - Math.max(sessionStart, start));
        if (!overlap) return total;
        return total + (sessionStart >= start && sessionEnd <= end.getTime() ? totalDuration : totalDuration * overlap / Math.max(1, sessionEnd - sessionStart));
      }, 0),
    };
  });
}

export async function getMonthActivity(d: Deps, year: number, month: number) {
  const [sessions] = await Promise.all([listSessions(d)]);
  const now = d.now();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return activityDays(sessions, now, Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)));
}

export async function getDashboard(d: Deps) {
  const [profile, sessions, pieces, goals] = await Promise.all([
    getProfile(d),
    listSessions(d),
    makeRepertoireRepo(d.db).list(),
    makeGoalRepo(d.db).list(),
  ]);
  const pieceSessions = sessions.filter((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID);
  const now = d.now();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const days = activityDays(sessions, now, Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }));
  const latest = pieceSessions[0];
  const piece = latest && pieces.find((item) => item.id === latest.repertoire_item_id);
  const goal = piece ? goals.find((item) => item.repertoire_item_id === piece.id && item.completed_at === null) : undefined;
  const open = sessions.filter((session) => session.status !== "FINISHED" && session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID).sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))[0];
  return {
    displayName: profile?.displayName ?? "",
    openSession: open ?? null,
    recentPiece: piece ? { ...piece, goal: goal ? { description: goal.description, targetBpm: goal.target_bpm, startMeasure: goal.measure_start, endMeasure: goal.measure_end } : null } : null,
    latestPieceSession: latest ?? null,
    days,
    weekActiveMs: days.reduce((total, day) => total + day.activeMs, 0),
    recentSessions: withGoalCompletion(sessions.slice(0, 5), goals.map((goal) => ({ id: goal.id, completed: goal.completed_at != null }))),
    pieceSessions,
    pieces: pieces.map((item) => ({ id: item.id, title: item.title })),
  };
}
