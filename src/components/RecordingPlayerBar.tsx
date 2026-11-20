import { Pause, Play, X } from "lucide-react";
import { useLocation } from "react-router";
import { CressSlider } from "./CressSlider";
import { useRecordingPlayerStore, type UseRecordingPlayerStore } from "../stores/recordingPlayerStore";
import { t } from "../lib/i18n";

function timeLabel(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function RecordingPlayerBar({ store = useRecordingPlayerStore }: { store?: UseRecordingPlayerStore }) {
  const pathname = useLocation().pathname;
  const currentId = store((state) => state.currentId);
  const currentTitle = store((state) => state.currentTitle);
  const playing = store((state) => state.playing);
  const currentTime = store((state) => state.currentTime);
  const duration = store((state) => state.duration);
  const originPath = store((state) => state.originPath);

  // A tela de onde o play() partiu já mostra o player completo (forma de onda, busca por
  // trecho) — a barra global só faz sentido quando o usuário navega para outra tela.
  if (currentId === null || pathname === originPath) return null;

  return (
    <section aria-label={t("workspace.recording_panel")} className="cress-player-bar">
      <button type="button" className="cress-player-toggle" aria-label={playing ? t("workspace.pause_audio") : t("workspace.play_audio")} onClick={() => (playing ? store.getState().pause() : void store.getState().play({ id: currentId, relativePath: "", title: currentTitle, durationMs: duration * 1000 }))}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <p className="cress-player-title">{currentTitle}</p>
      <span className="cress-player-time">{timeLabel(currentTime)}</span>
      <CressSlider aria-label={t("workspace.recording_position", { title: currentTitle })} min={0} max={Math.max(duration, 1)} value={currentTime} onChange={(value) => store.getState().seek(value)} className="cress-player-seek" />
      <span className="cress-player-time">{timeLabel(duration)}</span>
      <button type="button" className="cress-player-close" aria-label={t("workspace.close_player")} onClick={() => store.getState().close()}>
        <X size={14} />
      </button>
    </section>
  );
}
