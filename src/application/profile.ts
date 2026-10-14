import { DomainError } from "../domain/errors";
import {
  validateProfile,
  type UserProfile,
  type InstrumentCode,
} from "../domain/profile";
import type { UserProfileRow } from "../infrastructure/db/rows";
import { makeProfileRepo } from "../infrastructure/repositories/profileRepo";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";
import type { Deps } from "./deps";
const from = (r: UserProfileRow): UserProfile => ({
  ...r,
  instruments: JSON.parse(r.instruments),
  musicalRoles: JSON.parse(r.musical_roles),
  onboardedAt: new Date(r.onboarded_at),
  updatedAt: new Date(r.updated_at),
  displayName: r.display_name,
  primaryInstrument: r.primary_instrument as InstrumentCode,
  otherInstrumentLabel: r.other_instrument_label,
  experienceLevel: r.experience_level as UserProfile["experienceLevel"],
  ensembleName: r.ensemble_name,
});
const row = (p: UserProfile, old: number, now: number) => ({
  id: 1,
  display_name: p.displayName,
  instruments: JSON.stringify(p.instruments),
  primary_instrument: p.primaryInstrument,
  other_instrument_label: p.otherInstrumentLabel ?? null,
  experience_level: p.experienceLevel ?? null,
  musical_roles: JSON.stringify(p.musicalRoles),
  ensemble_name: p.ensembleName ?? null,
  onboarded_at: old,
  updated_at: now,
});
export async function getProfile(d: Deps) {
  const r = await makeProfileRepo(d.db).get();
  return r ? from(r) : null;
}
export async function saveProfile(
  d: Deps,
  input: Omit<UserProfile, "onboardedAt" | "updatedAt">,
) {
  const p = validateProfile({
    ...input,
    onboardedAt: new Date(),
    updatedAt: new Date(),
  });
  const old = await makeProfileRepo(d.db).get();
  await makeProfileRepo(d.db).save(
    row(p, old?.onboarded_at ?? d.now().getTime(), d.now().getTime()),
  );
  return getProfile(d) as Promise<UserProfile>;
}
export async function completeOnboarding(
  d: Deps,
  input: Omit<UserProfile, "onboardedAt" | "updatedAt"> & {
    a4: number;
    noteNaming: "letter" | "solfege";
  },
) {
  if (!Number.isInteger(input.a4) || input.a4 < 415 || input.a4 > 466)
    throw new DomainError("VALIDATION", "Invalid A4");
  const p = validateProfile({
    ...input,
    onboardedAt: d.now(),
    updatedAt: d.now(),
  });
  const s = makeSettingsRepo(d.db);
  await s.set("tuner.a4", JSON.stringify(input.a4));
  await s.set("tuner.noteNaming", JSON.stringify(input.noteNaming));
  const old = await makeProfileRepo(d.db).get();
  await makeProfileRepo(d.db).save(
    row(p, old?.onboarded_at ?? d.now().getTime(), d.now().getTime()),
  );
  return getProfile(d) as Promise<UserProfile>;
}
