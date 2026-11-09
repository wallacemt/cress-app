// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FolderScan } from "../../application/deps";
import type { ImportPlan } from "../../domain/score";

const { importPlan, getDeps } = vi.hoisted(() => ({ importPlan: vi.fn(), getDeps: vi.fn() }));
vi.mock("../../application/scores", () => ({ importPlan }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { ImportFolderDialog } from "./ImportFolderDialog";

const scan: FolderScan = { scanId: "scan", rootName: "Scores", rootPath: "Scores", truncated: false, skippedDeepDirs: 0, ignoredByExt: [], entries: [] };
const plan: ImportPlan = { candidates: [
  { title: "Sonata", target: "new:sonata", instrument: "violin", files: [{ entryId: "a", originalPath: "Sonata.pdf", label: "Solo", sizeBytes: 2048, selected: true }] },
  { title: "Concerto", target: "new:concerto", instrument: "piano", files: [{ entryId: "b", originalPath: "Concerto.pdf", label: "Piano", sizeBytes: 2048, selected: false, probableDuplicate: "old/Concerto.pdf" }] },
] };

describe("ImportFolderDialog", () => {
  afterEach(cleanup);
  it("filters candidates and reports selected import totals", () => {
    render(<ImportFolderDialog scan={scan} plan={plan} onClose={vi.fn()} onImported={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByText("Importar 1 partituras em 1 obras")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar obra" }), { target: { value: "conc" } });
    expect(screen.getByRole("textbox", { name: "Título Concerto" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Título Sonata" })).toBeNull();
  });

  it("applies bulk selection only to visible works", () => {
    render(<ImportFolderDialog scan={scan} plan={plan} onClose={vi.fn()} onImported={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar obra" }), { target: { value: "conc" } });
    fireEvent.click(screen.getByRole("button", { name: "Selecionar/desmarcar todos" }));
    expect(screen.getByText("Importar 2 partituras em 2 obras")).toBeTruthy();
  });
});
