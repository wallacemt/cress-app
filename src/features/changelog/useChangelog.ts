import { useEffect, useState } from "react";

export interface ChangelogEntry {
  version: string;
  title: string;
  notes: string;
  notesByLocale: { "pt-BR": string; "en-US": string } | null;
  date: string;
  url: string;
}

export function parseLocalizedNotes(body: string): ChangelogEntry["notesByLocale"] {
  const sections = new Map<string, string>();
  const header = /^## (pt-BR|en-US)\s*$/gm;
  const matches = [...body.matchAll(header)];
  for (const [index, match] of matches.entries()) {
    const locale = match[1];
    if (!locale) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    sections.set(locale, body.slice(start, end).trim());
  }
  const ptBR = sections.get("pt-BR");
  const enUS = sections.get("en-US");
  return ptBR === undefined || enUS === undefined ? null : { "pt-BR": ptBR, "en-US": enUS };
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
          notesByLocale: parseLocalizedNotes(String(release.body ?? "")),
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
