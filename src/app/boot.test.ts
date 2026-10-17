import { describe, expect, it } from "vitest";
import { onboardingLoader, rootLoader, type ProfileReader } from "./boot";

describe("onboarding route gate", () => {
  it("redirects to onboarding when no profile exists", async () => {
    const deps: ProfileReader = { getProfile: async () => null };
    const result = await rootLoader({ deps });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/onboarding");
  });

  it("redirects away from onboarding when a profile exists", async () => {
    const deps: ProfileReader = { getProfile: async () => ({ displayName: "Ana" }) };
    const result = await onboardingLoader({ deps });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });
});
