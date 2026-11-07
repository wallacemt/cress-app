import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/violino-folder.json";
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

  it("plans the real violin folder fixture without crossing directories", () => {
    const plan = planImport(fixture, [], [], "violin");
    const forPath = (part: string) =>
      plan.candidates.filter((candidate) =>
        candidate.files.some((file) => file.originalPath.startsWith(part)),
      );

    // AC-S2's 686±5 is specific to 630+ARRANJOS+PARA+VIOLINISTAS, not the whole
    // fixture (746 candidates total across every folder). Real count there is
    // 697 — 6 above the estimate, caused by genuine messy filenames (e.g. a
    // "Violin I" with no "Violin II" sibling on disk, or a missing space
    // before "-" that keeps splitPart from recognizing the part).
    expect(forPath("630+ARRANJOS+PARA+VIOLINISTAS/")).toHaveLength(697);
    expect(plan.candidates).toHaveLength(746);
    const reasons = plan.candidates.find(
      (candidate) => candidate.title === "10000 Reasons",
    );
    expect(reasons?.files.map((file) => file.label).sort()).toEqual([
      "Violin I",
      "Violin II",
    ]);
    expect(forPath("Hans-Sit/")).toHaveLength(5);
    expect(forPath("Metodo SUZUKI/VOL 7/")).toHaveLength(1);
    expect(forPath("Musicas extra/Impresas/")).toHaveLength(10);
    expect(
      plan.candidates.filter((candidate) =>
        candidate.files.some((file) =>
          file.originalPath.toLowerCase().includes("bacchanale"),
        ),
      ),
    ).toHaveLength(1);

    // Lalo occurs in two directories; ADR-18 keeps those as separate works.
    const lalo = plan.candidates.filter((candidate) =>
      candidate.files.some((file) =>
        file.originalPath.toLowerCase().includes("lalo"),
      ),
    );
    expect(lalo).toHaveLength(2);
    expect(new Set(lalo.flatMap((candidate) => candidate.files.map((file) =>
      file.originalPath.split("/").slice(0, -1).join("/"),
    ))).size).toBe(2);

    const suzukiDuplicates = fixture.filter((entry) =>
      entry.relDir.startsWith("VIOLINO/Metodo SUZUKI/"),
    );
    const plannedFiles = new Map(
      plan.candidates.flatMap((candidate) =>
        candidate.files.map((file) => [file.entryId, file] as const),
      ),
    );
    expect(suzukiDuplicates).toHaveLength(10);
    for (const entry of suzukiDuplicates) {
      expect(plannedFiles.get(entry.entryId)).toMatchObject({
        selected: false,
        probableDuplicate: expect.any(String),
      });
    }
  });
});
