import { describe, expect, it } from "vitest";
import {
  buildDefaultLayoutPanels,
  buildDefaultLayoutAddPanelSpecs,
  chooseLayoutSource,
  defaultLayoutPlan,
  layoutKey,
  sanitizeLayout,
} from "./workspace";
describe("workspace", () => {
  it("builds layout modes and keys", () => {
    const free = defaultLayoutPlan("free");
    expect(free.map((group) => group.panels.map((panel) => panel.id))).toEqual([
      ["tuner"], ["metronome"],
    ]);
    expect(free[1]!.split).toBe("right");
    const session = defaultLayoutPlan("session", true, "p1");
    expect(session.map((group) => group.panels.map((panel) => panel.id))).toEqual([
      ["score:p1"], ["recorder", "session"], ["metronome", "tuner"],
    ]);
    expect(session.map((group) => group.split)).toEqual([undefined, "right", "below"]);
    expect(session[0]!.width).toBe(62);
    expect(session[1]!.width).toBe(38);
    expect(defaultLayoutPlan("session").map((group) => group.panels.map((panel) => panel.id))).toEqual([
      ["recorder", "session"], ["metronome", "tuner"],
    ]);
    expect(layoutKey({ pieceId: "p1" })).toBe("workspace.layout.piece.p1");
    expect(layoutKey({})).toBe("workspace.layout.free");
  });
  it("builds dockview addPanel specs regardless of which group index carries a split", () => {
    // Regression: sizing must come from each group's own width/height, not from a
    // hardcoded group index — the recorder/session group sits at index 0 (not 1) when
    // there is no score, and its split sibling must still get initialHeight.
    const noScore = buildDefaultLayoutPanels("session", false);
    expect(noScore).toEqual([
      { id: "recorder", component: "recorder", title: "Gravações" },
      {
        id: "session",
        component: "session",
        title: "Sessão",
        position: { referencePanel: "recorder" },
      },
      {
        id: "metronome",
        component: "metronome",
        title: "Metrônomo",
        position: { referencePanel: "session", direction: "below" },
        initialHeight: 50,
      },
      {
        id: "tuner",
        component: "tuner",
        title: "Afinador",
        position: { referencePanel: "metronome" },
      },
    ]);
    const withScore = buildDefaultLayoutPanels("session", true, "p1");
    expect(withScore[1]).toEqual({
      id: "recorder",
      component: "recorder",
      title: "Gravações",
      position: { referencePanel: "score:p1", direction: "right" },
      initialWidth: 38,
    });
    expect(withScore[3]).toEqual({
      id: "metronome",
      component: "metronome",
      title: "Metrônomo",
      position: { referencePanel: "session", direction: "below" },
      initialHeight: 50,
    });
  });
  it("adds params only to session panels and includes scores when available", () => {
    const params = { session: { id: "s1" }, pieceId: "p1", deps: {} };
    const specs = buildDefaultLayoutAddPanelSpecs("session", true, "score1", undefined, params);
    expect(specs.find((spec) => spec.component === "score")).toMatchObject({
      id: "score:score1", renderer: "always", params: undefined,
    });
    expect(specs.filter((spec) => spec.component === "recorder" || spec.component === "session").map((spec) => spec.params)).toEqual([params, params]);
    expect(specs.filter((spec) => spec.component === "metronome" || spec.component === "tuner").every((spec) => spec.params === undefined)).toBe(true);
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
