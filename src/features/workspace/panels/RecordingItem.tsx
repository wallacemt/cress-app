import { friendlyErrorMessage } from "../../../lib/errors";
import { t, getLanguage } from "../../../lib/i18n";
import { useLanguageStore } from "../../../stores/languageStore";
import { useEffect, useRef, useState, type FunctionComponent } from "react";
import { useLocation } from "react-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { Ellipsis, FileX, NotebookPen, Pause, Play } from "lucide-react";
import { deleteRecording, renameRecording, setRecordingNotes } from "../../../application/recordings";
import type { Deps } from "../../../application/deps";
import type { RecordingRow } from "../../../infrastructure/db/rows";
import { useRecordingPlayerStore } from "../../../stores/recordingPlayerStore";

const peakCache = new Map<string, Float32Array>();
let decodeQueue: Promise<void> = Promise.resolve();
const getPeaks = (path: string, src: string) => {
  if (peakCache.has(path)) return Promise.resolve(peakCache.get(path)!);
  const task = decodeQueue.then(async () => {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Asset de áudio indisponível (${response.status}).`);
    const buffer = await response.arrayBuffer();
    const context = new OfflineAudioContext(1, 1, 44100);
    const decoded = await context.decodeAudioData(buffer);
    const channel = decoded.getChannelData(0);
    const peaks = new Float32Array(256);
    for (let i = 0; i < peaks.length; i += 1) {
      const start = Math.floor(i * channel.length / peaks.length);
      const end = Math.max(start + 1, Math.floor((i + 1) * channel.length / peaks.length));
      let peak = 0;
      for (let j = start; j < end; j += 1) peak = Math.max(peak, Math.abs(channel[j] ?? 0));
      peaks[i] = peak;
    }
    peakCache.set(path, peaks);
    return peaks;
  });
  decodeQueue = task.then(() => {}, () => {});
  return task;
};

interface RecordingItemProps { take: RecordingRow; deps: Deps; onChange: () => void; onError: (message: string) => void; }
function durationLabel(ms: number | null) { const s = Math.floor((ms ?? 0) / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
function recordedAtLabel(ms: number) {
  const date = new Date(ms);
  return `${date.toLocaleDateString(getLanguage())} ${date.toLocaleTimeString(getLanguage(), { hour: "2-digit", minute: "2-digit" })}`;
}

export const RecordingItem: FunctionComponent<RecordingItemProps> = ({ take, deps, onChange, onError }) => {
  useLanguageStore((state) => state.language);
  const pathname = useLocation().pathname;
  const [src, setSrc] = useState("");
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [title, setTitle] = useState(take.title);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(take.notes ?? "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const gradientId = `wave-gradient-${take.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const duration = take.duration_ms ? take.duration_ms / 1000 : 0;

  const activeId = useRecordingPlayerStore((state) => state.currentId);
  const activePlaying = useRecordingPlayerStore((state) => state.playing);
  const activeTime = useRecordingPlayerStore((state) => state.currentTime);
  const activeFailed = useRecordingPlayerStore((state) => state.failed);
  const isCurrent = activeId === take.id;
  const playing = isCurrent && activePlaying;
  const current = isCurrent ? activeTime : 0;
  const failed = resolveFailed || (isCurrent && activeFailed);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const root = await appDataDir();
      const absolutePath = await join(root, "recordings", take.relative_path);
      const resolvedSrc = convertFileSrc(absolutePath);
      if (!alive) return;
      setSrc(resolvedSrc);
      try { setPeaks(await getPeaks(take.relative_path, resolvedSrc)); }
      catch (cause) { console.error("[Cress] Falha ao buscar/decodificar take", { path: absolutePath, src: resolvedSrc, cause }); }
    })().catch((cause: unknown) => { if (alive) { setResolveFailed(true); onError(friendlyErrorMessage(cause, t("workspace.resolve_recording_error"))); } });
    return () => { alive = false; };
  }, [take.relative_path, onError]);

  useEffect(() => { setTitle(take.title); setNotes(take.notes ?? ""); }, [take.title, take.notes]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [menuOpen]);

  const recording = { id: take.id, relativePath: take.relative_path, title, durationMs: take.duration_ms };

  async function saveTitle() { setEditing(false); if (title === take.title) return; try { await renameRecording(deps, { id: take.id, title }); onChange(); } catch (cause) { onError(friendlyErrorMessage(cause, t("workspace.rename_recording_error"))); } }
  async function saveNotes() { if (notes === (take.notes ?? "")) return; try { await setRecordingNotes(deps, { id: take.id, notes: notes || null }); onChange(); } catch (cause) { onError(friendlyErrorMessage(cause, t("workspace.save_notes_error"))); } }
  async function togglePlay() {
    if (failed || !src) return;
    try { await useRecordingPlayerStore.getState().toggle(recording, pathname); }
    catch (cause) { onError(friendlyErrorMessage(cause, t("workspace.play_recording_error"))); }
  }
  function seek(clientX: number) {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const target = Math.max(0, Math.min(duration, (clientX - rect.left) / rect.width * duration));
    const store = useRecordingPlayerStore.getState();
    if (store.currentId !== take.id) void store.load(recording, pathname).then(() => store.seek(target));
    else store.seek(target);
  }
  function onWaveKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") { event.preventDefault(); void togglePlay(); return; }
    if (!isCurrent) return;
    const store = useRecordingPlayerStore.getState();
    if (event.key === "Home") store.seek(0);
    else if (event.key === "End") store.seek(duration);
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); store.seek(Math.max(0, Math.min(duration, current + (event.key === "ArrowRight" ? 5 : -5) * (event.shiftKey ? 3 : 1)))); }
  }
  async function remove() { try { await deleteRecording(deps, { id: take.id }); onChange(); } catch (cause) { onError(friendlyErrorMessage(cause, t("workspace.delete_recording_error"))); } }
  const progress = duration ? current / duration : 0;

  return <article className="cress-take" data-playing={playing}>
    <div className="cress-take-row">
      {failed ? <span className="cress-take-file-error" aria-label={t("workspace.file_not_found")}><FileX size={16} /></span> : <button type="button" className="cress-take-play" aria-label={`${playing ? t("workspace.pause_audio") : t("workspace.play_audio")} ${title}`} onClick={() => void togglePlay()}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>}
      <div className="cress-take-title">{editing ? <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => void saveTitle()} onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") { setTitle(take.title); setEditing(false); } }} /> : <button type="button" title={title} onDoubleClick={() => setEditing(true)} onKeyDown={(e) => { if (e.key === "F2") setEditing(true); }}>{title}</button>}{notes && <NotebookPen size={14} aria-label={t("workspace.has_notes")} />}</div>
      <span className="cress-take-bpm">{take.bpm != null ? `♩ ${take.bpm}` : ""}</span>
      <time className="cress-take-recorded-at" dateTime={new Date(take.created_at).toISOString()}>{recordedAtLabel(take.created_at)}</time>
      <span className="cress-take-time">{playing ? `${durationLabel(current * 1000)} / ` : ""}{durationLabel(take.duration_ms)}</span>
      <div className="cress-menu"><button ref={menuButtonRef} type="button" className="cress-take-menu-button" aria-label={t("workspace.recording_actions", { title })} onClick={() => { const next = !menuOpen; if (next && menuButtonRef.current) { const rect = menuButtonRef.current.getBoundingClientRect(); setMenuPos({ top: Math.min(rect.bottom + 8, window.innerHeight - 140), left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)) }); } setMenuOpen(next); }}><Ellipsis size={18} /></button>{menuOpen && menuPos && <div className="cress-menu-popover" style={{ top: menuPos.top, left: menuPos.left }}><button onClick={() => { setEditing(true); setMenuOpen(false); }}>{t("workspace.rename_recording")} <kbd>F2</kbd></button><button onClick={() => { setNotesOpen(!notesOpen); setMenuOpen(false); }}>{t("workspace.recording_notes")}</button><div className="cress-menu-separator" /><button className="is-danger" onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}>{t("workspace.delete_more")}</button></div>}</div>
    </div>
    <div ref={waveRef} className="cress-take-wave" role="slider" tabIndex={0} aria-label={t("workspace.recording_position", { title })} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={current} aria-valuetext={t("workspace.seconds_of_seconds", { current: Math.floor(current), duration: Math.floor(duration) })} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e.clientX); }} onPointerMove={(e) => { if (e.buttons) seek(e.clientX); }} onKeyDown={onWaveKey}>
      {failed ? <span>{t("workspace.file_not_found")}</span> : <svg viewBox="0 0 256 32" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" x2="256" gradientUnits="userSpaceOnUse"><stop stopColor="var(--violet-400)" /><stop offset="1" stopColor="var(--blue-400)" /></linearGradient><clipPath id={`wave-clip-${take.id}`}><rect x="0" y="0" width={progress * 256} height="32" /></clipPath></defs><path d={peaks ? Array.from(peaks, (p, i) => `M${i} ${16 - Math.max(.5, Math.sqrt(p) * 15)}V${16 + Math.max(.5, Math.sqrt(p) * 15)}`).join("") : "M0 16H256"} /><path className="cress-take-wave-progress" style={{ stroke: `url(#${gradientId})` }} d={peaks ? Array.from(peaks, (p, i) => `M${i} ${16 - Math.max(.5, Math.sqrt(p) * 15)}V${16 + Math.max(.5, Math.sqrt(p) * 15)}`).join("") : "M0 16H256"} clipPath={`url(#wave-clip-${take.id})`} /><line className="cress-take-cursor" x1={progress * 256} x2={progress * 256} y1="0" y2="32" /></svg>}
    </div>
    {notesOpen ? <textarea className="cress-take-notes" rows={3} placeholder={t("workspace.recording_notes_placeholder")} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => void saveNotes()} />
      : notes && <p className="cress-take-notes-preview" onClick={() => setNotesOpen(true)} title={t("workspace.recording_notes")}>{notes}</p>}
    {confirmDelete && <div className="cress-take-confirm" role="group" aria-label={t("workspace.confirm_delete_recording", { title })}><span>{t("workspace.delete_recording_confirm", { title })}</span><button className="cress-ghost-sm" onClick={() => setConfirmDelete(false)}>{t("workspace.cancel")}</button><button className="cress-destructive-sm" onClick={() => void remove()}>{t("workspace.delete")}</button></div>}
  </article>;
};
