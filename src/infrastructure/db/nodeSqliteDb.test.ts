import { describe, expect, it } from "vitest";
import { NodeSqliteDb } from "./nodeSqliteDb";
describe("NodeSqliteDb", () =>
  it("enables foreign keys", async () => {
    const db = new NodeSqliteDb();
    expect(db.foreignKeysEnabled()).toBe(true);
    await db.execute("CREATE TABLE parent(id INTEGER PRIMARY KEY)");
    await db.execute(
      "CREATE TABLE child(parent_id INTEGER REFERENCES parent(id))",
    );
    await expect(
      db.execute("INSERT INTO child(parent_id) VALUES ($1)", [99]),
    ).rejects.toThrow();
  }));
