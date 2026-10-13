import { describe, expect, it } from "vitest";
import { changeBpm, MAX_BPM, MIN_BPM, validateBpm } from "./bpm";
describe("bpm", () => {
  it("validates boundaries and changes", () => {
    expect(validateBpm(MIN_BPM)).toBe(20);
    expect(validateBpm(MAX_BPM)).toBe(300);
    expect(changeBpm(100, 1)).toBe(101);
    expect(changeBpm(100, -1)).toBe(99);
    expect(changeBpm(100, 5)).toBe(105);
    expect(changeBpm(100, -5)).toBe(95);
  });
  it("rejects invalid bpm", () => {
    expect(() => validateBpm(19)).toThrow();
    expect(() => validateBpm(100.5)).toThrow();
  });
});
