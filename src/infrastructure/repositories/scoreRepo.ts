import type { SqlDb } from "../db/sqlDb";
import type { ScoreDocumentRow } from "../db/rows";
export const makeScoreRepo = (db: SqlDb) => ({
  list: (piece?: string) =>
    db.select<ScoreDocumentRow>(
      piece
        ? "SELECT * FROM score_documents WHERE repertoire_item_id=$1 ORDER BY sort_order,created_at"
        : "SELECT * FROM score_documents ORDER BY sort_order,created_at",
      piece ? [piece] : [],
    ),
  get: async (id: string) =>
    (
      await db.select<ScoreDocumentRow>(
        "SELECT * FROM score_documents WHERE id=$1",
        [id],
      )
    )[0] ?? null,
  insert: (r: ScoreDocumentRow) =>
    db.execute(
      "INSERT INTO score_documents VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        r.id,
        r.repertoire_item_id,
        r.label,
        r.relative_path,
        r.sha256,
        r.original_name,
        r.original_path,
        r.size_bytes,
        r.sort_order,
        r.last_page,
        r.created_at,
      ],
    ),
  update: (id: string, label: string) =>
    db.execute("UPDATE score_documents SET label=$1 WHERE id=$2", [label, id]),
  remove: (id: string) =>
    db.execute("DELETE FROM score_documents WHERE id=$1", [id]),
});
