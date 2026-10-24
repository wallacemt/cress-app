import { redirect } from "react-router";
import { getProfile } from "../application/profile";
import type { UserProfile } from "../domain/profile";
import { useProfileStore } from "../stores/profileStore";
import { container } from "./container";
import { recoverOnBoot } from "../application/sessions";

export interface ProfileReader {
  getProfile(): Promise<UserProfile | null>;
}
const profileReader: ProfileReader = {
  getProfile: async () => getProfile(await container.getDeps()),
};
let bootPromise: Promise<void> | undefined;
export async function boot() {
  bootPromise ??= container.getDeps().then(async (deps) => { await recoverOnBoot(deps); }).catch((error) => { bootPromise = undefined; throw error; });
  await bootPromise;
  return { profile: await profileReader.getProfile() };
}
export async function rootLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
  if (deps === profileReader) await boot();
  const profile = await deps.getProfile();
  useProfileStore.getState().setProfile(profile);
  return profile ? null : redirect("/onboarding");
}
export async function onboardingLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
  const profile = await deps.getProfile();
  useProfileStore.getState().setProfile(profile);
  return profile ? redirect("/") : null;
}
