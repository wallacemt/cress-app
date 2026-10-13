import Database from "@tauri-apps/plugin-sql";
import type { SqlDb, SqlResult } from "./sqlDb";
export class TauriSqlDb implements SqlDb {
  private constructor(private readonly db: Database) {}
  static async open(path = "sqlite:cress.db") {
    return new TauriSqlDb(await Database.load(path));
  }
  async execute(sql: string, params: unknown[] = []): Promise<SqlResult> {
    return this.db.execute(sql, params) as Promise<SqlResult>;
  }
  async select<T>(sql: string, params: unknown[] = []) {
    return this.db.select<T[]>(sql, params);
  }
}
