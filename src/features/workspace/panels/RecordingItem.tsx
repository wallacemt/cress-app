import { useEffect, useState, type FunctionComponent } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { deleteRecording, renameRecording, setRecordingNotes } from "../../../application/recordings";
import type { Deps } from "../../../application/deps";
import type { RecordingRow } from "../../../infrastructure/db/rows";

interface RecordingItemProps {
  take: RecordingRow;
  deps: Deps;
  onChange: () => void;
  onError: (message: string) => void;
}

function formatDuration(ms: number | null) {
  const seconds = Math.floor((ms ?? 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export const RecordingItem: FunctionComponent<RecordingItemProps> = ({ take, deps, onChange, onError }) => {
  const [src, setSrc] = useState("");
  const [title, setTitle] = useState(take.title);
  const [notes, setNotes] = useState(take.notes ?? "");

  useEffect(() => {
    let active = true;
    void (async () => {
      const root = await appDataDir();
      const absolutePath = await join(root, "recordings", take.relative_path);
      if (active) setSrc(convertFileSrc(absolutePath));
    })().catch((cause: unknown) => onError(cause instanceof Error ? cause.message : "Não foi possível abrir a gravação."));
    return () => { active = false; };
  }, [take.relative_path, onError]);

  useEffect(() => setTitle(take.title), [take.title]);
  useEffect(() => setNotes(take.notes ?? ""), [take.notes]);

  async function saveTitle() {
    if (title === take.title) return;
    try { await renameRecording(deps, { id: take.id, title }); onChange(); }
    catch (cause) { onError(cause instanceof Error ? cause.message : "Não foi possível renomear a gravação."); }
  }
  async function saveNotes() {
    if (notes === (take.notes ?? "")) return;
    try { await setRecordingNotes(deps, { id: take.id, notes: notes || null }); onChange(); }
    catch (cause) { onError(cause instanceof Error ? cause.message : "Não foi possível salvar as observações."); }
  }
  async function remove() {
    if (!window.confirm("Excluir esta gravação?")) return;
    try { await deleteRecording(deps, { id: take.id }); onChange(); }
    catch (cause) { onError(cause instanceof Error ? cause.message : "Não foi possível excluir a gravação."); }
  }

  return (
    <article className="cress-recorder-item">
      <div className="cress-recorder-item-meta">
        <label><span className="cress-session-eyebrow">TÍTULO</span><input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void saveTitle()} /></label>
        <span>{new Date(take.created_at).toLocaleString("pt-BR")}</span>
        <span>{formatDuration(take.duration_ms)}</span>
        {take.bpm != null && <span>♩ {take.bpm} BPM</span>}
        <button type="button" className="cress-session-ghost" disabled={take.status === "RECORDING"} onClick={() => void remove()}>Excluir</button>
      </div>
      {src && <audio className="cress-recorder-audio" controls preload="metadata" src={src} />}
      <label className="cress-session-notes-label">OBSERVAÇÕES<textarea value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => void saveNotes()} /></label>
    </article>
  );
};
