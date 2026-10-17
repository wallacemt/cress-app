import { redirect } from "react-router";
import { getProfile } from "../application/profile";
import type { UserProfile } from "../domain/profile";
import { useProfileStore } from "../stores/profileStore";
import { container } from "./container";

export interface ProfileReader {
  getProfile(): Promise<UserProfile | null>;
}
const profileReader: ProfileReader = {
  getProfile: async () => getProfile(await container.getDeps()),
};
export async function boot() {
  return { profile: await profileReader.getProfile() };
}
export async function rootLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
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
