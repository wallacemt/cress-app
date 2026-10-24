import { describe, expect, it } from "vitest";
import { assertLength, assertOneOf, assertRange } from "./validation";
describe("validation", () => {
  it("accepts valid values", () => {
    expect(() => assertLength(" x ", 1, 2)).not.toThrow();
    expect(() => assertRange(2, 1, 3)).not.toThrow();
    expect(() => assertOneOf("a", ["a", "b"])).not.toThrow();
  });
  it("rejects invalid values", () => {
    expect(() => assertLength("", 1, 2)).toThrow();
    expect(() => assertRange(NaN, 1, 2)).toThrow();
    expect(() => assertOneOf("x", ["a"])).toThrow();
  });
});
