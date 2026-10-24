import { describe, expect, it } from "vitest";
import { getBeatInterval, tapTempo } from "./metronome";
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
});
