import type { SqlDb } from "../infrastructure/db/sqlDb";
import type { ScanEntry } from "../domain/score";
export interface ImportedFile {
  relativePath: string;
  sha256: string;
  originalName: string;
  originalPath: string;
  sizeBytes: number;
}
export interface FolderScan {
  scanId: string;
  rootName: string;
  rootPath: string;
  truncated: boolean;
  skippedDeepDirs: number;
  ignoredByExt: { ext: string; count: number }[];
  entries: ScanEntry[];
}
export type ImportResult =
  | { entryId: string; ok: true; file: ImportedFile }
  | {
      entryId: string;
      ok: false;
      code: "NOT_A_PDF" | "TOO_LARGE" | "IO" | "NOT_FOUND";
    };
export interface AudioPort {
  startRecording(path: string): Promise<{ sampleRate: number }>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  stopRecording(): Promise<{ relativePath: string; durationMs: number }>;
  probeRecording(
    path: string,
  ): Promise<{ durationMs: number; sampleRate: number } | null>;
  deleteRecordingFile(path: string): Promise<void>;
}
export interface ScoresPort {
  pickAndImportFile(): Promise<ImportedFile | null>;
  pickAndScanFolder(): Promise<FolderScan | null>;
  importFromScan(
    scanId: string,
    entryIds: string[],
    onProgress: (p: { done: number; total: number }) => void,
  ): Promise<ImportResult[]>;
  deleteScoreFile(path: string): Promise<void>;
  scoresRoot(): Promise<string>;
}
export interface Deps {
  db: SqlDb;
  now: () => Date;
  newId: () => string;
  audio: AudioPort;
  scores: ScoresPort;
}
