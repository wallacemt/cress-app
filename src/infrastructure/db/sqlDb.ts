export interface SqlResult {
  rowsAffected: number;
  lastInsertId?: number;
}
export interface SqlDb {
  execute(sql: string, params?: unknown[]): Promise<SqlResult>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
}
