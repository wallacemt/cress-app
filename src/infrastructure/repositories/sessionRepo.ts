import type { SqlDb } from "../db/sqlDb";
import type { StudySessionRow } from "../db/rows";
export const makeSessionRepo = (db: SqlDb) => ({
  list: () => db.select<StudySessionRow>("SELECT * FROM study_sessions"),
  get: async (id: string) =>
    (
      await db.select<StudySessionRow>(
        "SELECT * FROM study_sessions WHERE id=$1",
        [id],
      )
    )[0] ?? null,
  open: () =>
    db.select<StudySessionRow>(
      "SELECT * FROM study_sessions WHERE ended_at IS NULL",
    ),
  save: (r: StudySessionRow) =>
    db.execute(
      "INSERT INTO study_sessions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO UPDATE SET status=excluded.status,ended_at=excluded.ended_at,active_ms=excluded.active_ms,resumed_at=excluded.resumed_at,last_heartbeat_at=excluded.last_heartbeat_at,final_bpm=excluded.final_bpm,notes=excluded.notes",
      [
        r.id,
        r.repertoire_item_id,
        r.goal_id,
        r.status,
        r.started_at,
        r.ended_at,
        r.active_ms,
        r.resumed_at,
        r.last_heartbeat_at,
        r.initial_bpm,
        r.final_bpm,
        r.notes,
      ],
    ),
  remove: (id: string) =>
    db.execute("DELETE FROM study_sessions WHERE id=$1", [id]),
});
