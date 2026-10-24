import { describe, expect, it } from "vitest";
import { getBeatInterval, getTempoMarking, TEMPO_MARKING_MIDPOINTS, tapTempo } from "./metronome";
describe("metronome", () => {
  it("calculates interval and tap tempo", () => {
    expect(getBeatInterval(60)).toBe(1000);
    expect(tapTempo([0, 500, 1000], 1000)).toBe(120);
    expect(tapTempo([0], 1000)).toBe(0);
  });
  it("rejects invalid bpm and stale taps", () => {
    expect(() => getBeatInterval(0)).toThrow();
    expect(tapTempo([0, 500], 3000)).toBe(0);
  });
  it("maps tempo ranges and representative BPM values", () => {
    expect([39, 40, 59, 60, 65, 66, 75, 76, 107, 108, 119, 120, 155, 156, 175, 176, 199, 200].map(getTempoMarking)).toEqual([
      "Grave", "Largo", "Largo", "Larghetto", "Larghetto", "Adagio", "Adagio", "Andante", "Andante", "Moderato", "Moderato", "Allegro", "Allegro", "Vivace", "Vivace", "Presto", "Presto", "Prestissimo",
    ]);
    expect(getTempoMarking(TEMPO_MARKING_MIDPOINTS.Allegro)).toBe("Allegro");
  });
});
