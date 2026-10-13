declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): { run(...params: never[]): { changes: number; lastInsertRowid: number }; all(...params: never[]): unknown[]; get(): unknown };
  }
}
