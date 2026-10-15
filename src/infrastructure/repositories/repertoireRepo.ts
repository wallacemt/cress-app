import type { SqlDb } from "../db/sqlDb";
import type { RepertoireItemRow } from "../db/rows";
export const makeRepertoireRepo = (db: SqlDb) => ({
  list: () =>
    db.select<RepertoireItemRow>(
      "SELECT * FROM repertoire_items ORDER BY title",
    ),
  get: async (id: string) =>
    (
      await db.select<RepertoireItemRow>(
        "SELECT * FROM repertoire_items WHERE id=$1",
        [id],
      )
    )[0] ?? null,
  insert: (r: RepertoireItemRow) =>
    db.execute(
      "INSERT INTO repertoire_items VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        r.id,
        r.title,
        r.composer,
        r.movement,
        r.instrument,
        r.notes,
        r.archived_at,
        r.created_at,
        r.updated_at,
      ],
    ),
  update: (r: RepertoireItemRow) =>
    db.execute(
      "UPDATE repertoire_items SET title=$1,composer=$2,movement=$3,instrument=$4,notes=$5,archived_at=$6,updated_at=$7 WHERE id=$8",
      [
        r.title,
        r.composer,
        r.movement,
        r.instrument,
        r.notes,
        r.archived_at,
        r.updated_at,
        r.id,
      ],
    ),
  remove: (id: string) =>
    db.execute("DELETE FROM repertoire_items WHERE id=$1", [id]),
});
