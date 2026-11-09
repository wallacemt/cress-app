import type { SqlDb } from "../db/sqlDb";
import type { RecordingRow } from "../db/rows";
export const makeRecordingRepo = (db: SqlDb) => ({
  forSession: (id: string) =>
    db.select<RecordingRow>(
      "SELECT * FROM recordings WHERE session_id=$1 ORDER BY created_at DESC",
      [id],
    ),
  active: () =>
    db.select<RecordingRow>(
      "SELECT * FROM recordings WHERE status='RECORDING'",
    ),
  get: async (id: string) =>
    (
      await db.select<RecordingRow>("SELECT * FROM recordings WHERE id=$1", [
        id,
      ])
    )[0] ?? null,
  save: (r: RecordingRow) =>
    db.execute(
      "INSERT INTO recordings VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        r.id,
        r.session_id,
        r.relative_path,
        r.format,
        r.status,
        r.duration_ms,
        r.sample_rate,
        r.bpm,
        r.title,
        r.notes,
        r.created_at,
      ],
    ),
  update: (r: RecordingRow) =>
    db.execute(
      "UPDATE recordings SET status=$1,duration_ms=$2,sample_rate=$3,title=$4,notes=$5 WHERE id=$6",
      [r.status, r.duration_ms, r.sample_rate, r.title, r.notes, r.id],
    ),
  remove: (id: string) =>
    db.execute("DELETE FROM recordings WHERE id=$1", [id]),
});
