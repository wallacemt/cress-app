import { DomainError } from "./errors";
import { assertLength, assertOneOf } from "./validation";
export const INSTRUMENTS = {
  violin: "Violino",
  viola: "Viola",
  cello: "Violoncelo",
  double_bass: "Contrabaixo",
  flute: "Flauta",
  oboe: "Oboé",
  clarinet: "Clarinete",
  bassoon: "Fagote",
  saxophone: "Saxofone",
  horn: "Trompa",
  trumpet: "Trompete",
  trombone: "Trombone",
  tuba: "Tuba",
  percussion: "Percussão",
  harp: "Harpa",
  piano: "Piano",
  guitar: "Violão/Guitarra",
  voice: "Canto",
  conductor: "Regência",
  other: "Outro",
} as const;
export type InstrumentCode = keyof typeof INSTRUMENTS;
export const MUSICAL_ROLES = [
  "orchestra",
  "soloist",
  "chamber",
  "student",
  "teacher",
  "amateur",
] as const;
export type MusicalRole = (typeof MUSICAL_ROLES)[number];
export interface UserProfile {
  displayName: string;
  instruments: InstrumentCode[];
  primaryInstrument: InstrumentCode;
  otherInstrumentLabel?: string | null;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "professional";
  musicalRoles: MusicalRole[];
  ensembleName?: string | null;
  onboardedAt: Date | string;
  updatedAt: Date | string;
}
export function validateProfile(input: UserProfile): UserProfile {
  const p = {
    ...input,
    displayName: input.displayName.trim(),
    ensembleName: input.ensembleName?.trim() || null,
    otherInstrumentLabel: input.otherInstrumentLabel?.trim() || null,
  };
  try {
    assertLength(p.displayName, 1, 60, "displayName");
    if (!p.instruments.length || p.instruments.length > 8) throw new Error();
    if (new Set(p.instruments).size !== p.instruments.length) throw new Error();
    p.instruments.forEach((x) =>
      assertOneOf(
        x,
        Object.keys(INSTRUMENTS) as InstrumentCode[],
        "instrument",
      ),
    );
    if (!p.instruments.includes(p.primaryInstrument)) throw new Error();
    if (p.instruments.includes("other") !== Boolean(p.otherInstrumentLabel))
      throw new Error();
    if (p.otherInstrumentLabel)
      assertLength(p.otherInstrumentLabel, 1, 60, "otherInstrumentLabel");
    if (p.experienceLevel)
      assertOneOf(p.experienceLevel, [
        "beginner",
        "intermediate",
        "advanced",
        "professional",
      ]);
    if (
      p.musicalRoles.length > 6 ||
      new Set(p.musicalRoles).size !== p.musicalRoles.length
    )
      throw new Error();
    p.musicalRoles.forEach((x) => assertOneOf(x, MUSICAL_ROLES));
    if (p.ensembleName) assertLength(p.ensembleName, 1, 120, "ensembleName");
    return p;
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("VALIDATION", "Invalid profile");
  }
}
