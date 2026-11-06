export type WorkspaceMode = "session" | "free";
export const PANEL_CATALOG = {
  metronome: {
    component: "metronome",
    singleton: true,
    modes: ["session", "free"],
  },
  tuner: { component: "tuner", singleton: true, modes: ["session", "free"] },
  score: { component: "score", singleton: false, modes: ["session", "free"] },
  recorder: { component: "recorder", singleton: true, modes: ["session", "free"] },
  session: { component: "session", singleton: true, modes: ["session"] },
} as const;
// ponytail: single source for panel display labels (PT-BR), reused by the tab
// title (addPanel), the AddPanelMenu entries and the placeholder heading/aria-label.
export const PANEL_TITLES: Record<keyof typeof PANEL_CATALOG, string> = {
  metronome: "Metrônomo",
  tuner: "Afinador",
  score: "Partitura",
  recorder: "Gravações",
  session: "Sessão",
};
export const PANEL_ICON_NAMES = {
  metronome: "metronome",
  tuner: "gauge",
  score: "file-music",
  recorder: "audio-lines",
  session: "notebook-pen",
} as const;
export interface LayoutPanel {
  component: string;
  id: string;
  title?: string;
}
export interface LayoutPlan {
  panels: LayoutPanel[];
  split?: "left" | "right" | "above" | "below";
  width?: number;
  height?: number;
}
export interface AddPanelSpec {
  id: string;
  component: string;
  title?: string;
  position?: {
    referencePanel: string;
    direction?: "left" | "right" | "above" | "below";
  };
  initialWidth?: number;
  initialHeight?: number;
}
// ponytail: single source of truth for walking the group plan into dockview addPanel
// calls, so Workspace.tsx (initial mount) and LayoutMenu.tsx ("restaurar layout
// padrão") never drift from each other.
export function buildDefaultLayoutPanels(
  mode: WorkspaceMode,
  hasScores = false,
  firstScoreId?: string,
  // dockview's addPanel `initialWidth`/`initialHeight` are pixels, but the plan's
  // `width`/`height` are percentages of the container — convert using the real
  // container size when known (ready.api.width/height), or the splits default to
  // a near-zero pixel size and the layout overflows (issue found 2026-10-24).
  containerSize?: { width: number; height: number },
): AddPanelSpec[] {
  const specs: AddPanelSpec[] = [];
  let previousPanelId: string | undefined;
  defaultLayoutPlan(mode, hasScores, firstScoreId).forEach((group, groupIndex) => {
    group.panels.forEach((panel, panelIndex) => {
      const spec: AddPanelSpec = {
        id: panel.id,
        component: panel.component,
        title: panel.title,
      };
      if (panelIndex > 0 && previousPanelId) {
        spec.position = { referencePanel: previousPanelId };
      } else if (groupIndex > 0 && previousPanelId) {
        spec.position = { referencePanel: previousPanelId, direction: group.split };
        if (group.width !== undefined) {
          spec.initialWidth = containerSize
            ? Math.round((containerSize.width * group.width) / 100)
            : group.width;
        }
        if (group.height !== undefined) {
          spec.initialHeight = containerSize
            ? Math.round((containerSize.height * group.height) / 100)
            : group.height;
        }
      }
      specs.push(spec);
      previousPanelId = panel.id;
    });
  });
  return specs;
}
export function chooseLayoutSource(
  saved: SerializedDockview | null,
  mode: WorkspaceMode,
  hasScores: boolean,
  firstScoreId?: string,
) {
  return saved
    ? { kind: "saved" as const, layout: saved }
    : {
        kind: "default" as const,
        plan: defaultLayoutPlan(mode, hasScores, firstScoreId),
      };
}
export function defaultLayoutPlan(
  mode: WorkspaceMode,
  hasScores = false,
  firstScoreId?: string,
): LayoutPlan[] {
  const panel = (component: keyof typeof PANEL_CATALOG, id: string): LayoutPanel => ({
    component,
    id,
    title: PANEL_TITLES[component],
  });
  if (mode === "free")
    return [
      { panels: [panel("tuner", "tuner")] },
      {
        panels: [panel("metronome", "metronome")],
        split: "right",
        width: 50,
      },
    ];
  // ponytail: when no score is imported, the recorder group anchors the grid; add the score group when one exists.
  return [
    ...(hasScores && firstScoreId
      ? [{ panels: [panel("score", `score:${firstScoreId}`)], width: 62 }]
      : []),
    {
      panels: [panel("recorder", "recorder"), panel("session", "session")],
      split: hasScores && firstScoreId ? "right" : undefined,
      width: hasScores && firstScoreId ? 38 : undefined,
    },
    {
      panels: [panel("metronome", "metronome"), panel("tuner", "tuner")],
      split: "below",
      height: 50,
    },
  ];
}
export const layoutKey = (scope: { pieceId?: string }) =>
  scope.pieceId
    ? `workspace.layout.piece.${scope.pieceId}`
    : "workspace.layout.free";
export interface DockviewBranch {
  type: "branch";
  children?: DockviewNode[];
  data?: DockviewNode[];
  [key: string]: unknown;
}
export interface DockviewLeaf {
  type: "leaf";
  views?: string[];
  data?: { views: string[]; [key: string]: unknown };
  [key: string]: unknown;
}
export type DockviewNode = DockviewBranch | DockviewLeaf;
export interface SerializedDockview {
  grid: DockviewNode | { root: DockviewNode; [key: string]: unknown };
  panels: Record<
    string,
    { contentComponent: string; params?: unknown; title?: string }
  >;
  floatingGroups?: unknown[];
  [key: string]: unknown;
}
export function sanitizeLayout(
  raw: unknown,
  ctx: { mode: WorkspaceMode; scoreIds: Set<string> },
): SerializedDockview | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = structuredClone(raw) as SerializedDockview;
  if (!layout.panels || !layout.grid) return null;
  const allowed = new Set<string>();
  for (const [id, panel] of Object.entries(layout.panels)) {
    const component = panel.contentComponent;
    const score = component === "score" && id.startsWith("score:");
    if (
      (score && !ctx.scoreIds.has(id.slice(6))) ||
      ((component === "recorder" || component === "session") &&
        ctx.mode !== "session") ||
      (!(component in PANEL_CATALOG) && !score)
    ) {
      delete layout.panels[id];
      continue;
    }
    if (
      PANEL_CATALOG[component as keyof typeof PANEL_CATALOG]?.singleton &&
      [...allowed].some((i) => layout.panels[i]?.contentComponent === component)
    ) {
      delete layout.panels[id];
      continue;
    }
    allowed.add(id);
  }
  const clean = (node: DockviewNode): DockviewNode | null => {
    if (node.type === "branch") {
      const key = Array.isArray(node.children) ? "children" : "data";
      const children =
        (node[key] as DockviewNode[] | undefined)
          ?.map(clean)
          .filter((child): child is DockviewNode => child !== null) ?? [];
      return children.length ? { ...node, [key]: children } : null;
    }
    if (node.type === "leaf") {
      const inData = !!node.data;
      const views = (inData ? node.data!.views : (node.views ?? [])).filter(
        (id) => id in layout.panels,
      );
      return views.length
        ? inData
          ? { ...node, data: { ...node.data, views } }
          : { ...node, views }
        : null;
    }
    return null;
  };
  const grid = layout.grid as DockviewNode | { root: DockviewNode };
  if ("root" in grid) {
    const root = clean(grid.root as DockviewNode);
    if (!root) return null;
    layout.grid = { ...grid, root };
  } else {
    const cleanGrid = clean(grid);
    if (!cleanGrid) return null;
    layout.grid = cleanGrid;
  }
  return Object.keys(layout.panels).length ? layout : null;
}
