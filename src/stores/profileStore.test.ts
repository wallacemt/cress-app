import { describe, expect, it } from "vitest";
import type { UserProfile } from "../domain/profile";
import { useProfileStore } from "./profileStore";

describe("profileStore", () => {
  it("updates the profile synchronously", () => {
    const profile: UserProfile = {
      displayName: "Ana",
      instruments: ["violin"],
      primaryInstrument: "violin",
      musicalRoles: ["student"],
      onboardedAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    };

    useProfileStore.getState().setProfile(profile);

    expect(useProfileStore.getState().profile).toEqual(profile);
    useProfileStore.getState().setProfile(null);
  });
});
