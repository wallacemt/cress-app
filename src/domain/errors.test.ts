import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
describe("DomainError", () =>
  it("is an Error with stable code", () => {
    const error = new DomainError("VALIDATION", "bad");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("VALIDATION");
    expect(error.name).toBe("DomainError");
  }));
