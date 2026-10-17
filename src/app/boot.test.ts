import { describe, expect, it } from "vitest";
import type { UserProfile } from "../domain/profile";
import { useProfileStore } from "../stores/profileStore";
import { onboardingLoader, rootLoader, type ProfileReader } from "./boot";

const profile: UserProfile = {
  displayName: "Ana",
  instruments: ["violin"],
  primaryInstrument: "violin",
  musicalRoles: ["student"],
  onboardedAt: "2026-10-17T00:00:00.000Z",
  updatedAt: "2026-10-17T00:00:00.000Z",
};

describe("onboarding route gate", () => {
  it("redirects to onboarding when no profile exists", async () => {
    const deps: ProfileReader = { getProfile: async () => null };
    const result = await rootLoader({ deps });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/onboarding");
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it("loads an existing profile into the store on the root route", async () => {
    const deps: ProfileReader = { getProfile: async () => profile };

    expect(await rootLoader({ deps })).toBeNull();
    expect(useProfileStore.getState().profile).toEqual(profile);
  });

  it("redirects away from onboarding when a profile exists", async () => {
    const deps: ProfileReader = { getProfile: async () => profile };
    const result = await onboardingLoader({ deps });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
    expect(useProfileStore.getState().profile).toEqual(profile);
  });
});
