import {
  layoutKey,
  sanitizeLayout,
  type WorkspaceMode,
} from "../domain/workspace";
import type { Deps } from "./deps";
import { makeSettingsRepo } from "../infrastructure/repositories/settingsRepo";
export async function loadLayout(
  d: Deps,
  scope: { pieceId?: string; mode: WorkspaceMode; scoreIds: Set<string> },
) {
  const raw = await makeSettingsRepo(d.db).get(layoutKey(scope));
  if (!raw) return null;
  try {
    const x = JSON.parse(raw);
    return x.version === 1 ? sanitizeLayout(x.layout, scope) : null;
  } catch {
    return null;
  }
}
export async function saveLayout(
  d: Deps,
  scope: { pieceId?: string },
  layout: unknown,
) {
  return makeSettingsRepo(d.db).set(
    layoutKey(scope),
    JSON.stringify({ version: 1, layout }),
  );
}
export async function resetLayouts(d: Deps) {
  return makeSettingsRepo(d.db).resetLayouts();
}
