import type { SqlDb } from "../infrastructure/db/sqlDb";

export interface AppContainer {
  clock: () => number;
  newId: () => string;
  db: SqlDb | null;
}

export const container: AppContainer = {
  clock: () => Date.now(),
  newId: () => crypto.randomUUID(),
  db: null,
};
