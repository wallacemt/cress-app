import type { SqlDb } from "../infrastructure/db/sqlDb";
import { TauriSqlDb } from "../infrastructure/db/tauriSqlDb";
import type { Deps } from "../application/deps";
import { deleteRecordingFile, pauseRecording, probeRecording, resumeRecording, startRecording, stopRecording } from "../infrastructure/tauri/audioPort";
import { deleteScoreFile, importFromScan, pickAndImportFile, pickAndScanFolder } from "../infrastructure/tauri/scoresPort";

let depsPromise: Promise<Deps> | undefined;

// Abrir o banco costuma resolver rápido demais para a tela de loading do
// boot (hydrateFallbackElement) chegar a ser pintada. Garante um mínimo
// visível, só na primeira chamada (--duration-page do Dossier §4.7).
const BOOT_MIN_VISIBLE_MS = 480;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AppContainer {
  clock: () => number;
  newId: () => string;
  db: SqlDb | null;
  getDeps(): Promise<Deps>;
}

export const container: AppContainer = {
  clock: () => Date.now(),
  newId: () => crypto.randomUUID(),
  db: null,
  getDeps() {
    depsPromise ??= Promise.all([
      TauriSqlDb.open(),
      wait(BOOT_MIN_VISIBLE_MS),
    ]).then(([db]) => {
      container.db = db;
      const notImplemented = async (): Promise<never> => {
        throw new Error("not implemented");
      };
      return {
        db,
        now: () => new Date(container.clock()),
        newId: container.newId,
        audio: {
          startRecording: (path, deviceId) => startRecording(path, deviceId),
          pauseRecording,
          resumeRecording,
          stopRecording,
          probeRecording,
          deleteRecordingFile,
        },
        scores: {
          pickAndImportFile,
          pickAndScanFolder,
          importFromScan,
          deleteScoreFile,
          scoresRoot: notImplemented,
        },
      };
    });
    return depsPromise;
  },
};
