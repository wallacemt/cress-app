import { describe, expect, it } from "vitest";
import { completeOnboarding, getProfile, saveProfile } from "./profile";
import { makeTestDeps } from "./test-support";
const profile = {
  displayName: "Ana",
  instruments: ["violin"] as "violin"[],
  primaryInstrument: "violin" as const,
  musicalRoles: [],
};
describe("profile application", () => {
  it("reads null, creates, updates, and preserves onboardedAt", async () => {
    const d = makeTestDeps({ now: () => new Date("2026-01-01") });
    expect(await getProfile(d)).toBeNull();
    const first = await saveProfile(d, profile);
    const saved = first.onboardedAt;
    const second = await saveProfile(d, { ...profile, displayName: "Bia" });
    expect(second.displayName).toBe("Bia");
    expect(second.onboardedAt).toEqual(saved);
  });
  it("completes onboarding and rejects invalid A4 before writes", async () => {
    const d = makeTestDeps();
    await completeOnboarding(d, { ...profile, a4: 440, noteNaming: "letter" });
    expect(await getProfile(d)).not.toBeNull();
    const e = makeTestDeps();
    await expect(
      completeOnboarding(e, { ...profile, a4: 470, noteNaming: "letter" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await e.db.select("SELECT * FROM settings")).toHaveLength(0);
    expect(await getProfile(e)).toBeNull();
  });
});
