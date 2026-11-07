import { Channel, invoke } from "@tauri-apps/api/core";
import type { ImportedFile } from "../../application/deps";

interface ScanEntry {
  entryId: string;
  fileName: string;
  sizeBytes: number;
}

interface PreparedFiles {
  scanId: string;
  result: { entries: ScanEntry[] };
}

type ImportOutcome =
  | { relativePath: string; sha256: string }
  | { error: string };

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
