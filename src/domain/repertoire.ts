import { DomainError } from "./errors";
import { INSTRUMENTS, InstrumentCode } from "./profile";
export interface RepertoireItem {
  id: string;
  title: string;
  composer?: string | null;
  movement?: string | null;
  instrument?: InstrumentCode | null;
  notes?: string | null;
  archived?: boolean;
}
export function createRepertoireItem(
  input: Omit<RepertoireItem, "archived">,
): RepertoireItem {
  if (!input.title.trim())
    throw new DomainError("VALIDATION", "Title is required");
  if (input.instrument && !(input.instrument in INSTRUMENTS))
    throw new DomainError("VALIDATION", "Invalid instrument");
  return { ...input, archived: false };
}
export const archiveRepertoireItem = (
  item: RepertoireItem,
): RepertoireItem => ({ ...item, archived: true });
export const unarchiveRepertoireItem = (
  item: RepertoireItem,
): RepertoireItem => ({ ...item, archived: false });
