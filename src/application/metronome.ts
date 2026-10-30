import { SUBDIVISIONS, type MetronomeConfig } from "../domain/metronome";
import type { Deps } from "./deps";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";

const KEY = "metronome.config";
const DEFAULT_CONFIG: MetronomeConfig = { bpm: 92, beatsPerBar: 4, accentBeats: [0], subdivision: "1" };

export async function loadMetronomeConfig(deps: Deps): Promise<MetronomeConfig> {
  const raw = await makeSettingsRepo(deps.db).get(KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const value = JSON.parse(raw) as Partial<MetronomeConfig>;
    if (Number.isInteger(value.bpm) && value.bpm! >= 20 && value.bpm! <= 300 && Number.isInteger(value.beatsPerBar) && value.beatsPerBar! >= 1 && value.beatsPerBar! <= 12 && Array.isArray(value.accentBeats) && value.accentBeats.every((i) => Number.isInteger(i) && i >= 0) && (SUBDIVISIONS as readonly string[]).includes(value.subdivision ?? "")) {
      return value as MetronomeConfig;
    }
  } catch { /* use defaults for old or invalid settings */ }
  return DEFAULT_CONFIG;
}

export function saveMetronomeConfig(deps: Deps, config: MetronomeConfig) {
  return makeSettingsRepo(deps.db).set(KEY, JSON.stringify(config));
}
