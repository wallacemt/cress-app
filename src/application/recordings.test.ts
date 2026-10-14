import { describe, expect, it } from "vitest";
import { createPiece } from "./repertoire";
import { startSession } from "./sessions";
import {
  startTake,
  pauseTake,
  resumeTake,
  stopTake,
  deleteRecording,
} from "./recordings";
import { makeTestDeps } from "./test-support";
describe("recordings", () => {
  it("covers lifecycle and guards", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    await expect(startTake(d, { sessionId: "x" })).rejects.toMatchObject({
      code: "SESSION_NOT_ACTIVE",
    });
    const s = await startSession(d, { repertoireItemId: p.id });
    const r = await startTake(d, { sessionId: s.id });
    await expect(startTake(d, { sessionId: s.id })).rejects.toMatchObject({
      code: "TAKE_IN_PROGRESS",
    });
    await pauseTake(d);
    await resumeTake(d);
    await stopTake(d);
    await deleteRecording(d, { id: r!.id });
    await expect(stopTake(d)).rejects.toMatchObject({
      code: "NO_ACTIVE_RECORDING",
    });
  });
  it("rolls back failed input", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    const s = await startSession(d, { repertoireItemId: p.id });
    Object.assign(d.audio, { failStart: true });
    await expect(startTake(d, { sessionId: s.id })).rejects.toMatchObject({
      code: "INPUT_NOT_RUNNING",
    });
    expect(await d.db.select("SELECT * FROM recordings")).toHaveLength(0);
  });
});
