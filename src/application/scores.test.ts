import { describe, expect, it } from "vitest";
import { completeOnboarding } from "./profile";
import { createPiece } from "./repertoire";
import {
  scanFolder,
  importPlan,
  attachScoreFile,
  renameScore,
  deleteScore,
  setScoreLastPage,
  reorderScore,
  listScores,
} from "./scores";
import { makeTestDeps } from "./test-support";
describe("scores", () => {
  it("uses primary instrument and reports failures", async () => {
    const d = makeTestDeps();
    await completeOnboarding(d, {
      displayName: "A",
      instruments: ["viola"],
      primaryInstrument: "viola",
      musicalRoles: [],
      a4: 440,
      noteNaming: "letter",
    });
    Object.assign(d.scores, {
      scan: {
        scanId: "1",
        rootName: "x",
        rootPath: "x",
        truncated: false,
        skippedDeepDirs: 0,
        ignoredByExt: [],
        entries: [
          { entryId: "e", relDir: "", fileName: "P.pdf", sizeBytes: 1 },
        ],
      },
    });
    expect((await scanFolder(d))!.plan.candidates[0]!.instrument).toBe("viola");
    Object.assign(d.scores, {
      results: [{ entryId: "e", ok: false, code: "NOT_A_PDF" }],
    });
    const out = await importPlan(d, {
      scanId: "1",
      plan: {
        candidates: [
          {
            title: "P",
            target: "new:p",
            instrument: "viola",
            files: [
              {
                entryId: "e",
                originalPath: "P.pdf",
                label: "P",
                sizeBytes: 1,
                selected: true,
              },
            ],
          },
        ],
      },
    });
    expect(out.failed[0]?.code).toBe("NOT_A_PDF");
  });

  it("attaches a file, returns null on cancel, and rejects duplicates", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    await expect(
      attachScoreFile(d, { pieceId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await attachScoreFile(d, { pieceId: p.id })).toBeNull();

    const file = {
      relativePath: "a.pdf",
      sha256: "h1",
      originalName: "a.pdf",
      originalPath: "/tmp/a.pdf",
      sizeBytes: 10,
    };
    Object.assign(d.scores, { pickAndImportFile: async () => file });
    const attached = await attachScoreFile(d, { pieceId: p.id });
    expect(attached?.label).toBe("a");

    await expect(attachScoreFile(d, { pieceId: p.id })).rejects.toMatchObject({
      code: "DUPLICATE_SCORE",
    });
    expect((d.scores as unknown as { deleted: string[] }).deleted).toContain(
      "a.pdf",
    );
  });

  it("renames, deletes, sets last page, and validates", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    Object.assign(d.scores, {
      pickAndImportFile: async () => ({
        relativePath: "a.pdf",
        sha256: "h2",
        originalName: "a.pdf",
        originalPath: "/tmp/a.pdf",
        sizeBytes: 10,
      }),
    });
    const score = (await attachScoreFile(d, { pieceId: p.id }))!;

    await expect(
      renameScore(d, { id: score.id, label: "" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await renameScore(d, { id: score.id, label: "Renamed" });
    await expect(
      renameScore(d, { id: "missing", label: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      setScoreLastPage(d, { id: score.id, page: 0 }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await setScoreLastPage(d, { id: score.id, page: 3 });

    await deleteScore(d, { id: score.id });
    expect((d.scores as unknown as { deleted: string[] }).deleted).toContain(
      "a.pdf",
    );
    await expect(deleteScore(d, { id: score.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("reorders scores and no-ops at the boundaries", async () => {
    const d = makeTestDeps();
    const p = await createPiece(d, { title: "P" });
    let n = 0;
    Object.assign(d.scores, {
      pickAndImportFile: async () => ({
        relativePath: `s${n}.pdf`,
        sha256: `h${n++}`,
        originalName: `s${n}.pdf`,
        originalPath: `/tmp/s${n}.pdf`,
        sizeBytes: 10,
      }),
    });
    const first = (await attachScoreFile(d, { pieceId: p.id }))!;
    const second = (await attachScoreFile(d, { pieceId: p.id }))!;

    await reorderScore(d, { id: first.id, direction: "up" });
    let ordered = await listScores(d, { pieceId: p.id });
    expect(ordered.map((s) => s.id)).toEqual([first.id, second.id]);

    await reorderScore(d, { id: second.id, direction: "down" });
    ordered = await listScores(d, { pieceId: p.id });
    expect(ordered.map((s) => s.id)).toEqual([first.id, second.id]);

    await reorderScore(d, { id: first.id, direction: "down" });
    ordered = await listScores(d, { pieceId: p.id });
    expect(ordered.map((s) => s.id)).toEqual([second.id, first.id]);
  });
});
