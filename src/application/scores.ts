import { DomainError } from "../domain/errors";
import {
  planImport,
  type ImportFile,
  type ImportCandidate,
} from "../domain/score";
import type { Deps } from "./deps";
import { makeScoreRepo } from "../infrastructure/repositories/scoreRepo";
import { makeRepertoireRepo } from "../infrastructure/repositories/repertoireRepo";
import { makeProfileRepo } from "../infrastructure/repositories/profileRepo";
import type { ImportPlan } from "../domain/score";
import type { InstrumentCode } from "../domain/profile";
export interface ImportPlanInput {
  scanId: string;
  plan: ImportPlan;
}
interface ScoreEdit {
  id: string;
  label: string;
}
interface PageEdit {
  id: string;
  page: number;
}
interface ReorderInput {
  id: string;
  direction: "up" | "down";
}
export async function attachScoreFile(
  d: Deps,
  { pieceId }: { pieceId: string },
) {
  if (!(await makeRepertoireRepo(d.db).get(pieceId)))
    throw new DomainError("NOT_FOUND", "Piece not found");
  const f = await d.scores.pickAndImportFile();
  if (!f) return null;
  const r = {
    id: d.newId(),
    repertoire_item_id: pieceId,
    label: f.originalName.replace(/\.[^.]+$/, ""),
    relative_path: f.relativePath,
    sha256: f.sha256,
    original_name: f.originalName,
    original_path: f.originalPath,
    size_bytes: f.sizeBytes,
    sort_order: (await makeScoreRepo(d.db).list(pieceId)).length,
    last_page: 1,
    created_at: d.now().getTime(),
  };
  try {
    await makeScoreRepo(d.db).insert(r);
  } catch {
    await d.scores.deleteScoreFile(f.relativePath);
    throw new DomainError("DUPLICATE_SCORE", "Score already exists");
  }
  return r;
}
export async function scanFolder(d: Deps) {
  const scan = await d.scores.pickAndScanFolder();
  if (!scan) return null;
  const pieces = await makeRepertoireRepo(d.db).list();
  const existing = pieces.map((x) => ({
    id: x.id,
    title: x.title,
    archived: !!x.archived_at,
  }));
  const paths = (
    await d.db.select<{ original_path: string | null }>(
      "SELECT original_path FROM score_documents WHERE original_path IS NOT NULL",
    )
  ).map((x) => x.original_path!);
  return {
    scan,
    plan: planImport(
      scan.entries,
      existing,
      paths,
      ((await makeProfileRepo(d.db).get())?.primary_instrument ??
        "other") as InstrumentCode,
    ),
  };
}
export async function importPlan(d: Deps, x: ImportPlanInput, onProgress: (p: { done: number; total: number }) => void = () => {}) {
  for (const c of x.plan.candidates)
    if (!c.title.trim()) throw new DomainError("VALIDATION", "Title required");
  const files = x.plan.candidates.flatMap((c: ImportCandidate) =>
    c.files.filter((f: ImportFile) => f.selected),
  );
  const results = await d.scores.importFromScan(
    x.scanId,
    files.map((f: ImportFile) => f.entryId),
    onProgress,
  );
  let piecesCreated = 0,
    scoresImported = 0,
    skippedDuplicates = 0;
  const failed: { fileName: string; code: string }[] = [];
  for (const r of results) {
    if (!r.ok) {
      failed.push({
        fileName:
          files.find((f: ImportFile) => f.entryId === r.entryId)?.label ??
          r.entryId,
        code: r.code,
      });
      continue;
    }
    const f = files.find((z: ImportFile) => z.entryId === r.entryId)!;
    const c = x.plan.candidates.find((z) => z.files.includes(f))!;
    let pieceId = c.target.startsWith("existing:") ? c.target.slice(9) : null;
    if (!pieceId) {
      pieceId = d.newId();
      const now = d.now().getTime();
      await makeRepertoireRepo(d.db).insert({
        id: pieceId,
        title: c.title,
        composer: null,
        movement: null,
        instrument: c.instrument,
        notes: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      });
      piecesCreated++;
    }
    try {
      await makeScoreRepo(d.db).insert({
        id: d.newId(),
        repertoire_item_id: pieceId,
        label: f.label,
        relative_path: r.file.relativePath,
        sha256: r.file.sha256,
        original_name: r.file.originalName,
        original_path: r.file.originalPath,
        size_bytes: r.file.sizeBytes,
        sort_order: (await makeScoreRepo(d.db).list(pieceId)).length,
        last_page: 1,
        created_at: d.now().getTime(),
      });
      scoresImported++;
    } catch {
      await d.scores.deleteScoreFile(r.file.relativePath);
      skippedDuplicates++;
    }
  }
  return { piecesCreated, scoresImported, skippedDuplicates, failed };
}
export async function renameScore(d: Deps, x: ScoreEdit) {
  if (!x.label.trim()) throw new DomainError("VALIDATION", "Label required");
  if (!(await makeScoreRepo(d.db).get(x.id)))
    throw new DomainError("NOT_FOUND", "Score not found");
  await makeScoreRepo(d.db).update(x.id, x.label);
}
export const deleteScore = async (d: Deps, { id }: { id: string }) => {
  const r = await makeScoreRepo(d.db).get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Score not found");
  await d.scores.deleteScoreFile(r.relative_path);
  await makeScoreRepo(d.db).remove(id);
};
export const listScores = (d: Deps, x: { pieceId?: string }) =>
  makeScoreRepo(d.db).list(x.pieceId);
export const setScoreLastPage = async (d: Deps, x: PageEdit) => {
  if (x.page < 1) throw new DomainError("VALIDATION", "Invalid page");
  if (!(await makeScoreRepo(d.db).get(x.id)))
    throw new DomainError("NOT_FOUND", "Score not found");
  await d.db.execute("UPDATE score_documents SET last_page=$1 WHERE id=$2", [
    x.page,
    x.id,
  ]);
};
export async function reorderScore(d: Deps, x: ReorderInput) {
  const r = await makeScoreRepo(d.db).get(x.id);
  if (!r) throw new DomainError("NOT_FOUND", "Score not found");
  const all = await makeScoreRepo(d.db).list(r.repertoire_item_id),
    i = all.findIndex((z) => z.id === r.id),
    j = x.direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  await d.db.execute("UPDATE score_documents SET sort_order=$1 WHERE id=$2", [
    all[j]!.sort_order,
    r.id,
  ]);
  await d.db.execute("UPDATE score_documents SET sort_order=$1 WHERE id=$2", [
    r.sort_order,
    all[j]!.id,
  ]);
}
