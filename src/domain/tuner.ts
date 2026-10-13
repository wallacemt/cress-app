import { DomainError } from "./errors";
export function frequencyToNote(f: number, a4 = 440) {
  if (!Number.isFinite(f) || f <= 0)
    throw new DomainError("VALIDATION", "Invalid frequency");
  const midi = Math.round(69 + 12 * Math.log2(f / a4));
  const cents = Math.max(
    -50,
    Math.min(
      50,
      Math.round(1200 * Math.log2(f / (a4 * Math.pow(2, (midi - 69) / 12)))),
    ),
  );
  return { midi, cents: cents === 0 ? 0 : cents };
}
const letter = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
const sol = [
  "Dó",
  "Dó♯",
  "Ré",
  "Ré♯",
  "Mi",
  "Fá",
  "Fá♯",
  "Sol",
  "Sol♯",
  "Lá",
  "Lá♯",
  "Si",
];
export function noteLabel(midi: number, naming: "letter" | "solfege") {
  const i = ((midi % 12) + 12) % 12,
    n = Math.floor(midi / 12) - 1;
  return naming === "letter" ? `${letter[i]}${n}` : `${sol[i]}${n}`;
}
