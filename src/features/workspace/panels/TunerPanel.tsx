import { t } from "../../../lib/i18n";
import { useLanguageStore } from "../../../stores/languageStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { CressSlider } from "../../../components/CressSlider";
import { frequencyToNote, noteLabel } from "../../../domain/tuner";
import { useAudioInputStore } from "../../../stores/audioInputStore";
import { useTunerStore } from "../../../stores/tunerStore";
import { useObservedPanelLayout } from "./useObservedPanelLayout";
import { AudioDeviceSelector } from "./AudioDeviceSelector";
import { TunerGauge } from "./TunerGauge";
import { TunerCarousel } from "./TunerCarousel";

const SWITCH_DELAY_MS = 160;

export function TunerPanel() {
  useLanguageStore((state) => state.language);
  const pitch = useAudioInputStore((s) => s.pitch);
  const inputError = useAudioInputStore((s) => s.error);
  const root = useRef<HTMLElement>(null);
  const layoutClass = useObservedPanelLayout(root);
  const a4 = useTunerStore((s) => s.a4);
  const naming = useTunerStore((s) => s.noteNaming);
  const error = Boolean(inputError);
  const [settings, setSettings] = useState(false);
  const [lastNote, setLastNote] = useState<{ note: ReturnType<typeof frequencyToNote>; hz: number; at: number } | null>(null);
  const [stableReading, setStableReading] = useState<{ note: ReturnType<typeof frequencyToNote>; hz: number } | null>(null);
  const stableReadingRef = useRef(stableReading);
  const pendingReading = useRef<{ midi: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const note = useMemo(() => pitch ? frequencyToNote(pitch.hz, a4) : null, [pitch, a4]);
  const liveNote = stableReading && pitch && pitch.clarity >= 0.7;
  const isHeld = !liveNote && lastNote !== null;
  const displayNote = liveNote ? stableReading.note : isHeld ? lastNote.note : null;
  const displayHz = liveNote ? stableReading.hz : isHeld ? lastNote.hz : null;
  stableReadingRef.current = stableReading;

  useEffect(() => {
    if (!note || !pitch || pitch.clarity < 0.7) {
      if (pendingReading.current) clearTimeout(pendingReading.current.timer);
      pendingReading.current = null;
      return;
    }
    const now = Date.now();
    if (stableReadingRef.current?.note.midi === note.midi) {
      if (pendingReading.current) clearTimeout(pendingReading.current.timer);
      pendingReading.current = null;
      const hz = stableReadingRef.current.hz * 0.7 + pitch.hz * 0.3;
      const smoothedNote = frequencyToNote(hz, a4);
      setStableReading({ note: smoothedNote, hz });
      setLastNote({ note: smoothedNote, hz, at: now });
      return;
    }
    if (pendingReading.current?.midi === note.midi) return;
    if (pendingReading.current) clearTimeout(pendingReading.current.timer);
    const candidate = { note, hz: pitch.hz };
    const timer = setTimeout(() => {
      if (pendingReading.current?.midi !== note.midi) return;
      pendingReading.current = null;
      setStableReading(candidate);
      setLastNote({ ...candidate, at: Date.now() });
    }, SWITCH_DELAY_MS);
    pendingReading.current = { midi: note.midi, timer };
  }, [a4, note, pitch]);
  useEffect(() => () => {
    if (pendingReading.current) clearTimeout(pendingReading.current.timer);
  }, []);

  const status = error ? t("workspace.no_audio_input_status") : !pitch ? t("workspace.no_signal") : pitch.clarity < 0.7 ? t("workspace.detecting") : Math.abs(note?.cents ?? 50) <= 5 ? t("workspace.in_tune") : t("workspace.adjust_tuning");
  return (
    <section
      ref={root}
      className={`cress-tuner-panel${layoutClass ? ` ${layoutClass}` : ""}`}
      aria-label={t("workspace.tuner")}
    >
      <header><span className={`cress-tuner-status${note && Math.abs(note.cents) <= 5 ? " is-tuned" : ""}`}><i />{status}</span><button type="button" className="cress-control" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={15} /> {t("workspace.settings")}</button></header>
      {settings && <div className="cress-tuner-settings"><label className="cress-tuner-reference">A4 <strong>{a4} Hz</strong><CressSlider aria-label={t("workspace.reference_frequency")} min={415} max={466} value={a4} onChange={(value) => useTunerStore.getState().setA4(value)} /></label><span className="cress-tuner-settings-divider" /><button type="button" aria-label={t("workspace.toggle_note_names")} onClick={() => useTunerStore.getState().setNoteNaming(naming === "letter" ? "solfege" : "letter")}>{t("workspace.note_names")} <strong>{naming === "letter" ? "C–D–E" : "Dó–Ré–Mi"}</strong></button></div>}
      {error ? <><div className="cress-tuner-error"><p>{t("workspace.microphone_unavailable")}</p><button type="button" className="cress-control" onClick={() => { void useAudioInputStore.getState().acquire().catch(() => {}); }}>{t("workspace.retry")}</button></div><div className="cress-tuner-silence-hint" role="status">{t("workspace.microphone_privacy_hint")}</div></> : <>
        <TunerGauge cents={displayNote?.cents ?? 0} inTune={!!displayNote && Math.abs(displayNote.cents) <= 5} />
        <div className={`cress-tuner-main${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}><strong>{displayNote ? noteLabel(displayNote.midi, naming) : "—"}</strong><span>{displayHz !== null ? `${displayHz.toFixed(1)} Hz` : t("workspace.waiting_for_sound")}</span></div>
        <div className={`cress-tuner-cents${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}>{displayNote ? <><strong>{displayNote.cents > 0 ? "+" : ""}{displayNote.cents}</strong><span>cents</span></> : <><strong>—</strong><span>cents</span></>}</div>
        <AudioDeviceSelector />
      </>}
      <TunerCarousel midi={displayNote?.midi ?? null} naming={naming} />
    </section>
  );
}
