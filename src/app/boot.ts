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
const MIN_LOAD_MS = 5000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let bootPromise: Promise<void> | undefined;
export async function boot() {
  const startedAt = Date.now();
  bootPromise ??= container.getDeps().then(async (deps) => { await recoverOnBoot(deps); }).catch((error) => { bootPromise = undefined; throw error; });
  await bootPromise;
  await sleep(Math.max(0, MIN_LOAD_MS - (Date.now() - startedAt)));
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
