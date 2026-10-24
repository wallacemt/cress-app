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
// ponytail: faixas de andamento convencionais (Dossier S4), ajustáveis por ouvido.
export const TEMPO_MARKINGS = [
  [20, "Grave"], [40, "Largo"], [60, "Larghetto"], [66, "Adagio"],
  [76, "Andante"], [108, "Moderato"], [120, "Allegro"], [156, "Vivace"],
  [176, "Presto"], [200, "Prestissimo"],
] as const;
export type TempoMarking = (typeof TEMPO_MARKINGS)[number][1];
export function getTempoMarkingRange(name: TempoMarking): readonly [number, number] {
  const index = TEMPO_MARKINGS.findIndex(([, marking]) => marking === name);
  const [minimum] = TEMPO_MARKINGS[index]!;
  return [minimum, TEMPO_MARKINGS[index + 1]?.[0] ? TEMPO_MARKINGS[index + 1]![0] - 1 : 300];
}
export function getTempoMarking(bpm: number): TempoMarking {
  validateBpm(bpm);
  return [...TEMPO_MARKINGS].reverse().find(([min]) => bpm >= min)![1];
}
export const TEMPO_MARKING_MIDPOINTS: Record<TempoMarking, number> = {
  Grave: 30, Largo: 50, Larghetto: 63, Adagio: 70, Andante: 92,
  Moderato: 114, Allegro: 137, Vivace: 165, Presto: 188, Prestissimo: 250,
};
export function tapTempo(times: number[], now = Date.now()): number {
  const recent = times.filter((t) => now - t <= 2000).slice(-5);
  if (recent.length < 2) return 0;
  const total = recent
    .slice(1)
    .reduce((a, t, i) => a + t - (recent[i] ?? t), 0);
  return Math.round(60000 / (total / (recent.length - 1)));
}
