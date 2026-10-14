import type { SqlDb } from "../db/sqlDb";
export const makeSettingsRepo = (db: SqlDb) => ({
  get: async (key: string) =>
    (
      await db.select<{ value: string }>(
        "SELECT value FROM settings WHERE key=$1",
        [key],
      )
    )[0]?.value ?? null,
  set: (key: string, value: string) =>
    db.execute(
      "INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      [key, value],
    ),
  remove: (key: string) =>
    db.execute("DELETE FROM settings WHERE key=$1", [key]),
  resetLayouts: () =>
    db.execute("DELETE FROM settings WHERE key LIKE 'workspace.layout.%'"),
});
