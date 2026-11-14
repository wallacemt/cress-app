import { describe, expect, it } from "vitest";
import { parseLocalizedNotes } from "./useChangelog";

describe("parseLocalizedNotes", () => {
  it("extracts both language sections", () => {
    expect(parseLocalizedNotes("## en-US\nEnglish\n\n## pt-BR\nPortuguês")).toEqual({
      "pt-BR": "Português",
      "en-US": "English",
    });
  });

  it.each(["Release notes", "## pt-BR\nPortuguês"])("returns null for incomplete markers", (body) => {
    expect(parseLocalizedNotes(body)).toBeNull();
  });
});
