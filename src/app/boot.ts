import { redirect } from "react-router";
import { getProfile } from "../application/profile";
import { container } from "./container";

export interface ProfileReader {
  getProfile(): Promise<unknown | null>;
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
  return (await deps.getProfile()) ? null : redirect("/onboarding");
}
export async function onboardingLoader({
  deps = profileReader,
}: { deps?: ProfileReader } = {}) {
  return (await deps.getProfile()) ? redirect("/") : null;
}
