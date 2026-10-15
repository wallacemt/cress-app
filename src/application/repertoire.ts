import { DomainError } from "../domain/errors";
import {
  createRepertoireItem,
  type RepertoireItem,
} from "../domain/repertoire";
import { makeRepertoireRepo } from "../infrastructure/repositories/repertoireRepo";
import { makeScoreRepo } from "../infrastructure/repositories/scoreRepo";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";
import type { Deps } from "./deps";
import type { RepertoireItemRow } from "../infrastructure/db/rows";
import type { InstrumentCode } from "../domain/profile";
export interface PieceInput {
  title: string;
  composer?: string | null;
  movement?: string | null;
  instrument?: InstrumentCode | null;
  notes?: string | null;
}
const entity = (r: RepertoireItemRow): RepertoireItem => ({
  id: r.id,
  title: r.title,
  composer: r.composer,
  movement: r.movement,
  instrument: r.instrument as InstrumentCode | null,
  notes: r.notes,
  archived: !!r.archived_at,
});
const input = (d: Deps, id: string, x: PieceInput): RepertoireItemRow => {
  const now = d.now().getTime();
  return {
    id,
    title: x.title.trim(),
    composer: x.composer ?? null,
    movement: x.movement ?? null,
    instrument: x.instrument ?? null,
    notes: x.notes ?? null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
};
export async function createPiece(d: Deps, x: PieceInput) {
  const r = input(d, d.newId(), x);
  createRepertoireItem({
    ...r,
    instrument: r.instrument as InstrumentCode | null,
  });
  await makeRepertoireRepo(d.db).insert(r);
  return entity(r);
}
export async function listPieces(d: Deps) {
  return (await makeRepertoireRepo(d.db).list()).map(entity);
}
export async function updatePiece(d: Deps, x: PieceInput & { id: string }) {
  const repo = makeRepertoireRepo(d.db),
    old = await repo.get(x.id);
  if (!old) throw new DomainError("NOT_FOUND", "Piece not found");
  const r = { ...old, ...input(d, x.id, x), created_at: old.created_at };
  createRepertoireItem({
    ...r,
    instrument: r.instrument as InstrumentCode | null,
  });
  await repo.update(r);
  return entity(r);
}
export async function archivePiece(d: Deps, { id }: { id: string }) {
  return setArchived(d, id, true);
}
export async function unarchivePiece(d: Deps, { id }: { id: string }) {
  return setArchived(d, id, false);
}
async function setArchived(d: Deps, id: string, a: boolean) {
  const r = await makeRepertoireRepo(d.db).get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Piece not found");
  r.archived_at = a ? d.now().getTime() : null;
  await makeRepertoireRepo(d.db).update(r);
}
export async function deletePiece(d: Deps, { id }: { id: string }) {
  const repo = makeRepertoireRepo(d.db),
    r = await repo.get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Piece not found");
  if (
    (
      await d.db.select(
        "SELECT id FROM study_sessions WHERE repertoire_item_id=$1",
        [id],
      )
    ).length
  )
    throw new DomainError("PIECE_HAS_SESSIONS", "Piece has sessions");
  for (const s of await makeScoreRepo(d.db).list(id))
    await d.scores.deleteScoreFile(s.relative_path);
  await repo.remove(id);
  await makeSettingsRepo(d.db).remove(`workspace.layout.piece.${id}`);
}
