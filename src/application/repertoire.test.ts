import { describe, expect, it } from "vitest";
import {
  createPiece,
  updatePiece,
  listPieces,
  archivePiece,
  unarchivePiece,
  deletePiece,
} from "./repertoire";
import { startSession } from "./sessions";
import { makeTestDeps } from "./test-support";
describe("repertoire application", () => {
  it("CRUDs, archives, and validates instruments", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: " Suite ", instrument: "violin" });
    expect((await listPieces(d))[0]?.title).toBe("Suite");
    await updatePiece(d, { id: p.id, title: "New", instrument: "viola" });
    await archivePiece(d, { id: p.id });
    expect((await listPieces(d))[0]?.archived).toBe(true);
    await unarchivePiece(d, { id: p.id });
    await expect(
      createPiece(d, { title: "x", instrument: "bad" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(updatePiece(d, { id: "x", title: "x" })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(archivePiece(d, { id: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("deletes files/layout and protects pieces with sessions", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "Suite" });
    await d.db.execute(
      "INSERT INTO score_documents VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      ["s", p.id, "S", "s.pdf", "h", "s.pdf", null, 1, 0, 1, 1],
    );
    await d.db.execute("INSERT INTO settings VALUES($1,$2)", [
      "workspace.layout.piece." + p.id,
      "x",
    ]);
    await deletePiece(d, { id: p.id });
    expect((d.scores as unknown as { deleted: string[] }).deleted).toEqual([
      "s.pdf",
    ]);
    expect(
      await d.db.select("SELECT * FROM repertoire_items WHERE id=$1", [p.id]),
    ).toHaveLength(0);
    const q = await createPiece(d, { title: "Q" });
    await startSession(d, { repertoireItemId: q.id });
    await expect(deletePiece(d, { id: q.id })).rejects.toMatchObject({
      code: "PIECE_HAS_SESSIONS",
    });
  });
});
