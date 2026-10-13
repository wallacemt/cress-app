export type WorkspaceMode = "session" | "free";
export const PANEL_CATALOG = {
  metronome: {
    component: "metronome",
    singleton: true,
    modes: ["session", "free"],
  },
  tuner: { component: "tuner", singleton: true, modes: ["session", "free"] },
  score: { component: "score", singleton: false, modes: ["session", "free"] },
  recorder: { component: "recorder", singleton: true, modes: ["session"] },
  session: { component: "session", singleton: true, modes: ["session"] },
} as const;
export interface LayoutPlan {
  component: string;
  id: string;
  title?: string;
}
export function defaultLayoutPlan(
  mode: WorkspaceMode,
  hasScores = false,
  firstScoreId?: string,
): LayoutPlan[] {
  if (mode === "free")
    return [
      { component: "metronome", id: "metronome" },
      { component: "tuner", id: "tuner" },
    ];
  if (hasScores && firstScoreId)
    return [
      { component: "session", id: "session" },
      { component: "score", id: `score:${firstScoreId}` },
      { component: "metronome", id: "metronome" },
      { component: "tuner", id: "tuner" },
      { component: "recorder", id: "recorder" },
    ];
  return [
    { component: "session", id: "session" },
    { component: "metronome", id: "metronome" },
    { component: "tuner", id: "tuner" },
    { component: "recorder", id: "recorder" },
  ];
}
export const layoutKey = (scope: { pieceId?: string }) =>
  scope.pieceId
    ? `workspace.layout.piece.${scope.pieceId}`
    : "workspace.layout.free";
export interface DockviewBranch {
  type: "branch";
  children: DockviewNode[];
  [key: string]: unknown;
}
export interface DockviewLeaf {
  type: "leaf";
  views: string[];
  [key: string]: unknown;
}
export type DockviewNode = DockviewBranch | DockviewLeaf;
export interface SerializedDockview {
  grid: DockviewNode;
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
      const children = node.children
        .map(clean)
        .filter((child): child is DockviewNode => child !== null);
      return children.length ? { ...node, children } : null;
    }
    if (node.type === "leaf") {
      const views = node.views.filter((id) => id in layout.panels);
      return views.length ? { ...node, views } : null;
    }
    return null;
  };
  layout.grid = clean(layout.grid) as DockviewNode;
  return layout.grid && Object.keys(layout.panels).length ? layout : null;
}
