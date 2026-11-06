import { describe, expect, it } from "vitest";
import { initialMeterState, meterPos, step, toDb } from "./meter";

describe("meter scale and ballistics", () => {
  it("maps the specified dB marks", () => {
    expect(meterPos(-48)).toBe(0);
    expect(meterPos(0)).toBe(1);
    expect(meterPos(-6)).toBe(0.75);
    expect(Math.abs(meterPos(-1) - 0.9583)).toBeLessThan(1e-3);
    expect(meterPos(-Infinity)).toBe(0);
    expect(toDb(0)).toBe(-Infinity);
  });

  it("is monotonic over the displayed range", () => {
    for (let db = -60; db < 0; db += 1) expect(meterPos(db + 1)).toBeGreaterThanOrEqual(meterPos(db));
  });

  it("holds clipping until explicitly reset by its owner", () => {
    const clipped = step(initialMeterState(), -0.5, 50, 16);
    expect(clipped.clipped).toBe(true);
    expect(step(clipped, -12, 100, 50).clipped).toBe(true);
  });

  it("attacks immediately, releases at 20 dB per second, and tracks silence", () => {
    const attack = step(initialMeterState(), -6, 0, 16);
    expect(attack.display).toBe(-6);
    expect(step(attack, -20, 500, 500).display).toBe(-16);
    expect(step(attack, -Infinity, 10, 16).silentSince).toBe(10);
    expect(step(attack, -20, 10, 16).silentSince).toBeNull();
  });
});
