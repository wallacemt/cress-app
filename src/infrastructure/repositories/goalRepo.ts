import type { SqlDb } from "../db/sqlDb";
import type { StudyGoalRow } from "../db/rows";
export const makeGoalRepo = (db: SqlDb) => ({
  list: () => db.select<StudyGoalRow>("SELECT * FROM study_goals"),
  get: async (id: string) =>
    (
      await db.select<StudyGoalRow>("SELECT * FROM study_goals WHERE id=$1", [
        id,
      ])
    )[0] ?? null,
  save: (r: StudyGoalRow) =>
    db.execute(
      "INSERT INTO study_goals VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET description=excluded.description,target_bpm=excluded.target_bpm,measure_start=excluded.measure_start,measure_end=excluded.measure_end,completed_at=excluded.completed_at,updated_at=excluded.updated_at",
      [
        r.id,
        r.repertoire_item_id,
        r.description,
        r.target_bpm,
        r.measure_start,
        r.measure_end,
        r.completed_at,
        r.created_at,
        r.updated_at,
      ],
    ),
  remove: (id: string) =>
    db.execute("DELETE FROM study_goals WHERE id=$1", [id]),
});
