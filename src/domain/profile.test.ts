import { describe, expect, it } from "vitest";
import { validateProfile, type UserProfile } from "./profile";
const base: UserProfile = {
  displayName: " Ana ",
  instruments: ["violin"],
  primaryInstrument: "violin" as const,
  musicalRoles: ["student"],
  onboardedAt: "now",
  updatedAt: "now",
};
describe("profile", () => {
  it("normalizes valid profile", () =>
    expect(validateProfile(base)).toMatchObject({
      displayName: "Ana",
      ensembleName: null,
      otherInstrumentLabel: null,
    }));
  it("rejects invalid profile combinations", () => {
    expect(() => validateProfile({ ...base, displayName: "" })).toThrow();
    expect(() =>
      validateProfile({ ...base, primaryInstrument: "piano" as never }),
    ).toThrow();
    expect(() =>
      validateProfile({ ...base, instruments: ["violin", "violin"] as never }),
    ).toThrow();
    expect(() =>
      validateProfile({
        ...base,
        instruments: ["other"],
        primaryInstrument: "other",
      }),
    ).toThrow();
  });
  it("accepts other instrument and optional fields", () =>
    expect(
      validateProfile({
        ...base,
        instruments: ["other"],
        primaryInstrument: "other",
        otherInstrumentLabel: "Mandolin",
        experienceLevel: "advanced",
        ensembleName: " Trio ",
      }),
    ).toMatchObject({
      otherInstrumentLabel: "Mandolin",
      ensembleName: "Trio",
    }));
});
