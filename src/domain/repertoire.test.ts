import { describe, expect, it } from "vitest";
import {
  archiveRepertoireItem,
  createRepertoireItem,
  unarchiveRepertoireItem,
} from "./repertoire";
describe("repertoire", () => {
  it("creates and toggles archive", () => {
    const item = createRepertoireItem({
      id: "1",
      title: "Piece",
      instrument: "violin",
    });
    expect(item.archived).toBe(false);
    expect(archiveRepertoireItem(item).archived).toBe(true);
    expect(unarchiveRepertoireItem(item).archived).toBe(false);
  });
  it("validates title and instrument", () => {
    expect(() => createRepertoireItem({ id: "1", title: " " })).toThrow();
    expect(() =>
      createRepertoireItem({ id: "1", title: "x", instrument: "bad" as never }),
    ).toThrow();
  });
});
