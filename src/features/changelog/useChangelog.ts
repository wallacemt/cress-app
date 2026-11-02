import { useEffect, useState } from "react";

export interface ChangelogEntry {
  version: string;
  title: string;
  notes: string;
  date: string;
  url: string;
}
type State = { status: "loading" | "ready" | "offline" | "error"; entries: ChangelogEntry[] };

export function useChangelog(): State {
  const [state, setState] = useState<State>({ status: "loading", entries: [] });
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.github.com/repos/wallacemt/cress-app/releases", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
        const releases: unknown = await response.json();
        if (!Array.isArray(releases)) throw new Error("Invalid releases response");
        const entries = releases.filter((release) => !release.draft).map((release) => ({
          version: String(release.tag_name ?? ""),
          title: String(release.name || release.tag_name || "Release"),
          notes: String(release.body ?? ""),
          date: String(release.published_at ?? release.created_at ?? ""),
          url: String(release.html_url ?? "https://github.com/wallacemt/cress-app/releases"),
        }));
        setState({ status: "ready", entries });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: error instanceof TypeError ? "offline" : "error", entries: [] });
      });
    return () => controller.abort();
  }, []);
  return state;
}
