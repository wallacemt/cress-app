import type { SqlDb } from "../db/sqlDb";
import type { UserProfileRow } from "../db/rows";
export const makeProfileRepo = (db: SqlDb) => ({
  get: async () =>
    (
      await db.select<UserProfileRow>("SELECT * FROM user_profile WHERE id=1")
    )[0] ?? null,
  save: (r: UserProfileRow) =>
    db.execute(
      "INSERT INTO user_profile(id,display_name,instruments,primary_instrument,other_instrument_label,experience_level,musical_roles,ensemble_name,onboarded_at,updated_at) VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,instruments=excluded.instruments,primary_instrument=excluded.primary_instrument,other_instrument_label=excluded.other_instrument_label,experience_level=excluded.experience_level,musical_roles=excluded.musical_roles,ensemble_name=excluded.ensemble_name,updated_at=excluded.updated_at",
      [
        r.display_name,
        r.instruments,
        r.primary_instrument,
        r.other_instrument_label,
        r.experience_level,
        r.musical_roles,
        r.ensemble_name,
        r.onboarded_at,
        r.updated_at,
      ],
    ),
});
