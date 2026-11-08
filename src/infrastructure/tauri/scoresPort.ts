import { Channel, invoke } from "@tauri-apps/api/core";
import type { FolderScan, ImportedFile, ImportResult } from "../../application/deps";

interface RustScanEntry {
  entryId: string;
  relDir: string;
  fileName: string;
  sizeBytes: number;
}

interface PreparedFiles {
  scanId: string;
  rootName: string;
  result: { entries: RustScanEntry[]; ignoredByExt: { ext: string; count: number }[]; skippedDeepDirs: number; truncated: boolean };
}

type ImportOutcome =
  | { relativePath: string; sha256: string }
  | { error: string };

let scanEntries = new Map<string, RustScanEntry>();

export async function pickAndImportFile(): Promise<ImportedFile | null> {
  const prepared = await invoke<PreparedFiles | null>("scores_pick_file_and_prepare");
  if (!prepared) return null;

  const entry = prepared.result.entries[0];
  if (!entry) return null;
  const progress = new Channel<{ done: number; total: number }>();
  const outcomes = await invoke<ImportOutcome[]>("scores_import_selected", {
    scanId: prepared.scanId,
    entryIds: [entry.entryId],
    progress,
  });
  const outcome = outcomes[0];
  if (!outcome || "error" in outcome)
    throw new Error("Não foi possível importar o PDF selecionado.");
  return {
    relativePath: outcome.relativePath,
    sha256: outcome.sha256,
    originalName: entry.fileName,
    originalPath: "",
    sizeBytes: entry.sizeBytes,
  };
}

export function deleteScoreFile(path: string): Promise<void> {
  return invoke<void>("scores_delete_file", { path });
}

export async function pickAndScanFolder(): Promise<FolderScan | null> {
  const prepared = await invoke<PreparedFiles | null>("scores_pick_folder_and_scan");
  if (!prepared) return null;
  scanEntries = new Map(prepared.result.entries.map((entry) => [entry.entryId, entry]));
  return {
    scanId: prepared.scanId,
    rootName: prepared.rootName,
    // ADR-17: expose only the folder name; absolute paths stay in Rust.
    rootPath: prepared.rootName,
    truncated: prepared.result.truncated,
    skippedDeepDirs: prepared.result.skippedDeepDirs,
    ignoredByExt: prepared.result.ignoredByExt,
    entries: prepared.result.entries.map(({ entryId, relDir, fileName, sizeBytes }) => ({ entryId, relDir, fileName, sizeBytes })),
  };
}

export async function importFromScan(
  scanId: string,
  entryIds: string[],
  onProgress: (p: { done: number; total: number }) => void,
): Promise<ImportResult[]> {
  const progress = new Channel<{ done: number; total: number }>();
  progress.onmessage = onProgress;
  const outcomes = await invoke<ImportOutcome[]>("scores_import_selected", { scanId, entryIds, progress });
  return outcomes.map((outcome, index) => {
    const entryId = entryIds[index]!;
    if ("error" in outcome) return { entryId, ok: false, code: outcome.error === "entry_not_found" ? "NOT_FOUND" : outcome.error === "not_a_pdf" || outcome.error === "invalid_file" ? "NOT_A_PDF" : outcome.error === "too_large" ? "TOO_LARGE" : "IO" };
    const entry = scanEntries.get(entryId);
    return { entryId, ok: true, file: { relativePath: outcome.relativePath, sha256: outcome.sha256, originalName: entry?.fileName ?? entryId, originalPath: entry?.relDir ? `${entry.relDir}/${entry.fileName}` : entry?.fileName ?? "", sizeBytes: entry?.sizeBytes ?? 0 } };
  });
}
