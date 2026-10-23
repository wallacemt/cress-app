import { describe, expect, it } from "vitest";
import {
  chooseLayoutSource,
  defaultLayoutPlan,
  layoutKey,
  sanitizeLayout,
} from "./workspace";
describe("workspace", () => {
  it("builds layout modes and keys", () => {
    expect(defaultLayoutPlan("free")).toHaveLength(2);
    expect(defaultLayoutPlan("session")).toHaveLength(4);
    expect(
      defaultLayoutPlan("session", true, "p1").some(
        (panel) => panel.id === "score:p1",
      ),
    ).toBe(true);
    expect(layoutKey({ pieceId: "p1" })).toBe("workspace.layout.piece.p1");
    expect(layoutKey({})).toBe("workspace.layout.free");
  });
  it("sanitizes invalid and duplicate panels", () => {
    const layout = sanitizeLayout(
      {
        grid: {
          type: "branch",
          children: [{ type: "leaf", views: ["a", "b", "bad"] }],
        },
        panels: {
          a: { contentComponent: "metronome" },
          b: { contentComponent: "metronome" },
          bad: { contentComponent: "unknown" },
        },
      },
      { mode: "free", scoreIds: new Set() },
    );
    expect(Object.keys(layout?.panels ?? {})).toEqual(["a"]);
    expect(
      sanitizeLayout(null, { mode: "free", scoreIds: new Set() }),
    ).toBeNull();
  });
  it("sanitizes Dockview 8 serialized grid roots", () => {
    const layout = sanitizeLayout(
      {
        grid: {
          root: {
            type: "leaf",
            data: { id: "group", views: ["m", "bad"] },
          },
          height: 600,
          width: 800,
          orientation: "HORIZONTAL",
        },
        panels: {
          m: { contentComponent: "metronome" },
          bad: { contentComponent: "unknown" },
        },
      },
      { mode: "free", scoreIds: new Set() },
    );
    expect(layout?.panels).toEqual({
      m: { contentComponent: "metronome" },
    });
    expect(
      (layout?.grid as { root: { data: { views: string[] } } }).root.data.views,
    ).toEqual(["m"]);
  });
  it("uses a sanitized saved layout or the mode default", () => {
    const saved = {
      grid: { type: "leaf" as const, views: ["m"] },
      panels: { m: { contentComponent: "metronome" } },
    };
    expect(chooseLayoutSource(saved, "free", false)).toEqual({
      kind: "saved",
      layout: saved,
    });
    expect(chooseLayoutSource(null, "free", false)).toEqual({
      kind: "default",
      plan: defaultLayoutPlan("free"),
    });
  });
});
