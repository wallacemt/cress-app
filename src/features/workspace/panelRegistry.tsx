import type { FunctionComponent } from "react";
import { PanelsTopLeft } from "lucide-react";
import type { IDockviewPanelProps } from "dockview-react";
import { PANEL_CATALOG } from "../../domain/workspace";

type PanelId = keyof typeof PANEL_CATALOG;
const titles: Record<PanelId, string> = {
  metronome: "Metrônomo",
  tuner: "Afinador",
  score: "Partitura",
  recorder: "Gravações",
  session: "Sessão",
};

function EmptyPanel({ api }: IDockviewPanelProps) {
  const id = api.component as PanelId;
  return (
    <section className="cress-panel-placeholder" aria-label={titles[id]}>
      <h2>{titles[id]}</h2>
      <p>Este painel estará disponível em uma próxima fase.</p>
    </section>
  );
}

export const panelRegistry: Record<
  string,
  FunctionComponent<IDockviewPanelProps>
> = Object.fromEntries(
  Object.values(PANEL_CATALOG).map(({ component }) => [component, EmptyPanel]),
);

export function panelRenderer(component: string): "onlyWhenVisible" | "always" {
  return component === PANEL_CATALOG.score.component
    ? "always"
    : "onlyWhenVisible";
}

export function WorkspaceWatermark() {
  return (
    <div className="cress-watermark">
      <svg
        className="cress-watermark-staff"
        viewBox="0 0 600 100"
        aria-hidden="true"
      >
        {[20, 35, 50, 65, 80].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} />
        ))}
      </svg>
      <PanelsTopLeft className="cress-watermark-icon" aria-hidden="true" />
      <h2>Espaço livre</h2>
      <p>Arraste uma aba para cá ou abra um painel.</p>
      <button type="button" className="cress-watermark-button">
        + Painel
      </button>
    </div>
  );
}
