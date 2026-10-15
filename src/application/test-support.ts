import { readFileSync } from "node:fs";
import { NodeSqliteDb } from "../infrastructure/db/nodeSqliteDb";
import type {
  Deps,
  AudioPort,
  ScoresPort,
  FolderScan,
  ImportResult,
} from "./deps";
export function fakeAudioPort(): AudioPort & {
  failStart: boolean;
  failStop: boolean;
} {
  let recording = false;
  return {
    failStart: false,
    failStop: false,
    async startRecording() {
      if (this.failStart) throw new Error("input failed");
      recording = true;
      return { sampleRate: 44100 };
    },
    async pauseRecording() {},
    async resumeRecording() {
      recording = true;
    },
    async stopRecording() {
      if (this.failStop) throw new Error("stop failed");
      recording = false;
      return { relativePath: "take.wav", durationMs: 1000 };
    },
    async probeRecording() {
      return recording ? { durationMs: 1000, sampleRate: 44100 } : null;
    },
    async deleteRecordingFile() {
      recording = false;
    },
  };
}
export function fakeScoresPort(): ScoresPort & {
  scan: FolderScan | null;
  results: ImportResult[];
  deleted: string[];
} {
  const p = {
    scan: null as FolderScan | null,
    results: [] as ImportResult[],
    deleted: [] as string[],
  };
  return {
    get scan() {
      return p.scan;
    },
    set scan(value) {
      p.scan = value;
    },
    get results() {
      return p.results;
    },
    set results(value) {
      p.results = value;
    },
    get deleted() {
      return p.deleted;
    },
    async pickAndImportFile() {
      return null;
    },
    async pickAndScanFolder() {
      return p.scan;
    },
    async importFromScan(_id, ids, onProgress) {
      onProgress({ done: ids.length, total: ids.length });
      return p.results.filter((x) => ids.includes(x.entryId));
    },
    async deleteScoreFile(path) {
      p.deleted.push(path);
    },
    async scoresRoot() {
      return "scores";
    },
  };
}
export function makeTestDeps(options: { now?: () => Date } = {}): Deps {
  const db = new NodeSqliteDb();
  db.exec(
    readFileSync(
      new URL("../../src-tauri/migrations/0001_init.sql", import.meta.url),
      "utf8",
    ),
  );
  return {
    db,
    now: options.now ?? (() => new Date()),
    newId: () => crypto.randomUUID(),
    audio: fakeAudioPort(),
    scores: fakeScoresPort(),
  };
}
