import { redirect } from "react-router";

export interface ProfileReader {
  getProfile(): Promise<unknown | null>;
}
const profileReader: ProfileReader = { getProfile: async () => null };
export async function boot() {
  return { profile: await profileReader.getProfile() };
}
export async function rootLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
  return (await deps.getProfile()) ? null : redirect("/onboarding");
}
export async function onboardingLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
  return (await deps.getProfile()) ? redirect("/") : null;
}
