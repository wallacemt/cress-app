import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
import type { FunctionComponent } from "react";
import { AudioLines, FileMusic, Gauge, NotebookPen, PanelsTopLeft } from "lucide-react";
import type { IDockviewPanelProps } from "dockview-react";
import { PANEL_CATALOG, PANEL_ICON_NAMES } from "../../domain/workspace";
import { MetronomeIcon } from "../../components/icons/MetronomeIcon";
import { SessionPanel } from "./panels/SessionPanel";
import { MetronomePanel } from "./panels/MetronomePanel";
import { TunerPanel } from "./panels/TunerPanel";
import { RecorderPanel } from "./panels/RecorderPanel";
import { ScorePanel } from "./panels/ScorePanel";

export function getPanelTitle(component: string) {
  const titles: Record<string, string> = {
    metronome: t("workspace.panel_metronome"),
    tuner: t("workspace.panel_tuner"),
    score: t("workspace.panel_score"),
    recorder: t("workspace.panel_recordings"),
    session: t("workspace.panel_session"),
  };
  return titles[component] ?? component;
}

const icons = { metronome: MetronomeIcon, gauge: Gauge, "file-music": FileMusic, "audio-lines": AudioLines, "notebook-pen": NotebookPen };
export function PanelTab({ api }: IDockviewPanelProps) {
  useLanguageStore((state) => state.language);
  const Icon = icons[PANEL_ICON_NAMES[api.component as keyof typeof PANEL_ICON_NAMES]];
  return <span className="cress-panel-tab"><Icon size={16} /><span>{api.title}</span></span>;
}

type PanelId = keyof typeof PANEL_CATALOG;

function EmptyPanel({ api }: IDockviewPanelProps) {
  useLanguageStore((state) => state.language);
  const id = api.component as PanelId;
  return (
    <section className="cress-panel-placeholder" aria-label={getPanelTitle(id)}>
      <h2>{getPanelTitle(id)}</h2>
      <p>{t("workspace.panel_future")}</p>
    </section>
  );
}

export const panelRegistry: Record<
  string,
  FunctionComponent<IDockviewPanelProps>
> = {
  ...Object.fromEntries(
  Object.values(PANEL_CATALOG).map(({ component }) => [component, EmptyPanel]),
  ),
  session: SessionPanel,
  metronome: MetronomePanel,
  tuner: TunerPanel,
  recorder: RecorderPanel,
  score: ScorePanel,
};

export function panelRenderer(component: string): "onlyWhenVisible" | "always" {
  return component === PANEL_CATALOG.score.component
    ? "always"
    : "onlyWhenVisible";
}

export function WorkspaceWatermark() {
  useLanguageStore((state) => state.language);
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
      <h2>{t("workspace.free_space")}</h2>
      <p>{t("workspace.watermark_hint")}</p>
      <button type="button" className="cress-watermark-button">
        {`+ ${t("workspace.panel")}`}
      </button>
    </div>
  );
}
