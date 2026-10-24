import { describe, expect, it } from "vitest";
import { cleanFileStem, normalizeName, planImport, splitPart } from "./score";

describe("score naming", () => {
  it.each([
    ["[001] Bach_Concerto-2020.pdf", "Bach Concerto"],
    ["Sonata-No-1.pdf", "Sonata No 1"],
    ["piece_ -  violin.pdf", "piece - violin"],
  ])("cleans literal stem case", (fileName, expected) => {
    expect(cleanFileStem(fileName)).toBe(expected);
  });
  it.each([
    ["Concerto - violin", { base: "Concerto", part: "violin" }],
    [
      "Concerto - violin - reduzido",
      { base: "Concerto", part: "violin — reduzido" },
    ],
    ["concerto (1) - score", { base: "Concerto", part: "score" }],
  ])("splits literal and ADR cases", (stem, expected) => {
    expect(splitPart(stem)).toEqual(expected);
  });
  it("normalizes names", () =>
    expect(normalizeName(" Ária   de Ópera ")).toBe("aria de opera"));
});

describe("score import", () => {
  it("groups by directory and marks imported files", () => {
    const entries = [
      {
        entryId: "1",
        relDir: "A",
        fileName: "Piece - violin.pdf",
        sizeBytes: 10,
      },
      {
        entryId: "2",
        relDir: "A",
        fileName: "Piece - piano.pdf",
        sizeBytes: 20,
      },
      {
        entryId: "3",
        relDir: "B",
        fileName: "Piece - violin.pdf",
        sizeBytes: 10,
      },
    ];
    const plan = planImport(
      entries,
      [{ id: "old", title: "Piece" }],
      ["A/Piece - violin.pdf"],
      "violin",
    );
    expect(plan.candidates).toHaveLength(2);
    expect(plan.candidates[0]?.target).toBe("existing:old");
    expect(plan.candidates[0]?.files[0]?.selected).toBe(false);
  });
});
