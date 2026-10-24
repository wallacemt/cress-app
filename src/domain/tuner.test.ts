import { describe, expect, it } from "vitest";
import { frequencyToNote, noteLabel } from "./tuner";
describe("tuner", () => {
  it.each([
    [440, 69],
    [261.625565, 60],
    [466.1637615, 70],
  ])("maps exact reference frequency", (frequency, midi) =>
    expect(frequencyToNote(frequency)).toEqual({ midi, cents: 0 }),
  );
  it("supports a custom A4 and rejects invalid input", () => {
    expect(frequencyToNote(442, 442).midi).toBe(69);
    expect(() => frequencyToNote(0)).toThrow();
  });
  it.each([
    [60, "C4", "Dó4"],
    [69, "A4", "Lá4"],
    [61, "C♯4", "Dó♯4"],
    [59, "B3", "Si3"],
  ])("labels notes", (midi, letter, solfege) => {
    expect(noteLabel(midi, "letter")).toBe(letter);
    expect(noteLabel(midi, "solfege")).toBe(solfege);
  });
});
