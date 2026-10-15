import { DatabaseSync } from "node:sqlite";
import type { SqlDb, SqlResult } from "./sqlDb";

function normalizeParameters(sql: string) {
  return sql.replace(/\$(\d+)/g, "?$1");
}

export class NodeSqliteDb implements SqlDb {
  constructor(private readonly db = new DatabaseSync(":memory:")) {
    this.db.exec("PRAGMA foreign_keys = ON");
  }
  exec(sql: string): void {
    this.db.exec(sql);
  }
  async execute(sql: string, params: unknown[] = []): Promise<SqlResult> {
    const result = this.db
      .prepare(normalizeParameters(sql))
      .run(...(params as never[]));
    return {
      rowsAffected: Number(result.changes),
      lastInsertId: Number(result.lastInsertRowid),
    };
  }
  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db
      .prepare(normalizeParameters(sql))
      .all(...(params as never[])) as T[];
  }
  foreignKeysEnabled() {
    const row = this.db.prepare("PRAGMA foreign_keys").get() as {
      foreign_keys: number;
    };
    return row.foreign_keys === 1;
  }
}
