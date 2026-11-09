import type { IDockviewPanelProps } from "dockview-react";
import { ScoreViewer } from "../../pdf/ScoreViewer";

export function ScorePanel({ api }: IDockviewPanelProps) {
  const scoreId = api.id.split(":")[1] ?? "";
  return <ScoreViewer scoreId={scoreId} />;
}
