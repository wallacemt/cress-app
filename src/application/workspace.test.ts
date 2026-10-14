import { describe, expect, it } from "vitest";
import { loadLayout, saveLayout, resetLayouts } from "./workspace";
import { makeTestDeps } from "./test-support";
describe("workspace application", () => {
  const scope = { mode: "free" as const, scoreIds: new Set<string>() };
  it("loads only valid sanitized layouts", async () => {
    const d = makeTestDeps();
    expect(await loadLayout(d, scope)).toBeNull();
    await d.db.execute("INSERT INTO settings VALUES($1,$2)", [
      "workspace.layout.free",
      "bad",
    ]);
    expect(await loadLayout(d, scope)).toBeNull();
    await saveLayout(
      d,
      {},
      {
        panels: { m: { contentComponent: "metronome" } },
        grid: { type: "leaf", views: ["m"] },
      },
    );
    expect(await loadLayout(d, scope)).not.toBeNull();
  });
  it("saves and resets only layout settings", async () => {
    const d = makeTestDeps();
    await d.db.execute("INSERT INTO settings VALUES($1,$2)", ["keep", "yes"]);
    await saveLayout(d, {}, {});
    await resetLayouts(d);
    expect(
      await d.db.select("SELECT * FROM settings WHERE key='keep'"),
    ).toHaveLength(1);
    expect(
      await d.db.select(
        "SELECT * FROM settings WHERE key LIKE 'workspace.layout.%'",
      ),
    ).toHaveLength(0);
  });
});
