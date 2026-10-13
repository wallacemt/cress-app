import { InstrumentCode } from "./profile";
export interface ScanEntry {
  entryId: string;
  relDir: string;
  fileName: string;
  sizeBytes: number;
}
export interface ExistingPiece {
  id: string;
  title: string;
  archived?: boolean;
}
export interface ImportFile {
  entryId: string;
  originalPath: string;
  label: string;
  sizeBytes: number;
  selected: boolean;
  probableDuplicate?: string;
}
export interface ImportCandidate {
  title: string;
  target: string;
  instrument: InstrumentCode;
  files: ImportFile[];
}
export interface ImportPlan {
  candidates: ImportCandidate[];
}
export function cleanFileStem(fileName: string): string {
  let s = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/^\[[^\]]*\][\s_-]*/, "")
    .replace(/(?:-\d{4,})+$/, "")
    .replace(/_/g, " ");
  if (!/\s/.test(s) && s.includes("-")) s = s.replace(/-/g, " ");
  return s
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}
const instr =
  "violin|violino|violine|viola|cello|violoncelo|contrabaixo|double bass|guitar|piano|flute|flauta|clarinet|oboe|fagote|bassoon|trumpet|horn|trombone|tuba|sax|voz|voice|canto|soprano|contralto|tenor|baritono";
const token = new RegExp(
  `^(?:${instr})(?:\\s+(?:i{1,3}|iv|v|\\d{1,2}))?(?:\\s*\\([^)]*\\))?$`,
  "i",
);
const special =
  /^(?:grades? e partes|grade|partes|partitura(?: completa)?|score|full score|parts?|completo|solo)$/i;
const modifier =
  /^(?:reduzido|simplificado|facil|fácil|easy|vers(?:ão|ao)\s+\d+|v\s*\d+)$/i;
export function splitPart(stem: string): { base: string; part: string | null } {
  const seg = stem.split(" - "),
    mods: string[] = [];
  while (seg.length && modifier.test(seg[seg.length - 1]!))
    mods.unshift(seg.pop()!);
  const last = () => seg[seg.length - 1]!;
  let part: string | null = null;
  if (seg.length && (token.test(last()) || special.test(last())))
    part = seg.pop()!;
  else if (seg.length) {
    const m = last().match(
      new RegExp(`(?:^|\\s|\\()(${instr}|score|completo)\\)?$`, "i"),
    );
    if (m && m.index! > 0) {
      part = m[1] ?? null;
      seg[seg.length - 1] = last().slice(0, m.index).trim();
    }
  }
  if (part) part = [part, ...mods].join(" — ");
  let base = seg
    .join(" - ")
    .replace(/\s*\(\d+\)$/, "")
    .trim();
  if (base && base === base.toLowerCase())
    base = base.replace(/\b\w/g, (c) => c.toUpperCase());
  return { base, part };
}
export const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export function planImport(
  entries: ScanEntry[],
  existing: ExistingPiece[],
  importedOriginalPaths: string[],
  defaultInstrument: InstrumentCode,
): ImportPlan {
  const groups = new Map<string, ScanEntry[]>();
  for (const e of entries) {
    const p = splitPart(cleanFileStem(e.fileName)),
      parts = e.relDir.split("/"),
      dir = parts[parts.length - 1] ?? "";
    const key = `${e.relDir}\0${normalizeName(p.base || dir)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const seen = new Map<string, string>(),
    candidates: ImportCandidate[] = [];
  for (const es of groups.values()) {
    const first = splitPart(cleanFileStem(es[0]!.fileName)),
      ps = es[0]!.relDir.split("/"),
      title = first.base || (ps[ps.length - 1] ?? "Sem título"),
      old = existing.find(
        (x) => !x.archived && normalizeName(x.title) === normalizeName(title),
      );
    candidates.push({
      title,
      target: old ? `existing:${old.id}` : `new:${normalizeName(title)}`,
      instrument: defaultInstrument,
      files: es.map((e) => {
        const p = splitPart(cleanFileStem(e.fileName)),
          path = e.relDir ? `${e.relDir}/${e.fileName}` : e.fileName,
          key = `${normalizeName(e.fileName)}:${e.sizeBytes}`,
          dup = seen.get(key);
        if (!dup) seen.set(key, path);
        return {
          entryId: e.entryId,
          originalPath: path,
          label: p.part || p.base,
          sizeBytes: e.sizeBytes,
          selected: !importedOriginalPaths.includes(path) && !dup,
          probableDuplicate: dup,
        };
      }),
    });
  }
  return { candidates };
}
