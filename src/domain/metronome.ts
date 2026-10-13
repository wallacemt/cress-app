import { validateBpm } from "./bpm";
export const SUBDIVISIONS = [
  "1",
  "1-1",
  "1-1-1",
  "1-1-1-1",
  "1-0-1-1",
  "1-1-0-1",
  "1-0-0-1",
  "1-1-1-1-1-1",
] as const;
export const getBeatInterval = (bpm: number) => 60000 / validateBpm(bpm);
export interface MetronomeConfig {
  bpm: number;
  beatsPerBar: number;
  accentBeat: boolean;
  subdivision: (typeof SUBDIVISIONS)[number];
}
export function tapTempo(times: number[], now = Date.now()): number {
  const recent = times.filter((t) => now - t <= 2000).slice(-5);
  if (recent.length < 2) return 0;
  const total = recent
    .slice(1)
    .reduce((a, t, i) => a + t - (recent[i] ?? t), 0);
  return Math.round(60000 / (total / (recent.length - 1)));
}
