import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { frequencyToNote, noteLabel } from "../../../domain/tuner";
import { useAudioInputStore } from "../../../stores/audioInputStore";
import { useTunerStore } from "../../../stores/tunerStore";
import { TunerGauge } from "./TunerGauge";
import { TunerCarousel } from "./TunerCarousel";

const HOLD_MS = 900;

export function TunerPanel() {
  const pitch = useAudioInputStore((s) => s.pitch);
  const devices = useAudioInputStore((s) => s.devices);
  const deviceId = useAudioInputStore((s) => s.deviceId);
  const acquire = useAudioInputStore((s) => s.acquire);
  const release = useAudioInputStore((s) => s.release);
  const loadDevices = useAudioInputStore((s) => s.loadDevices);
  const setDevice = useAudioInputStore((s) => s.setDevice);
  const a4 = useTunerStore((s) => s.a4);
  const naming = useTunerStore((s) => s.noteNaming);
  const [error, setError] = useState(false);
  const [settings, setSettings] = useState(false);
  const [lastNote, setLastNote] = useState<{ note: ReturnType<typeof frequencyToNote>; hz: number; at: number } | null>(null);
  const [, setHoldExpired] = useState(0);
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const note = useMemo(() => pitch ? frequencyToNote(pitch.hz, a4) : null, [pitch, a4]);
  const liveNote = note && pitch && pitch.clarity >= 0.7;
  const isHeld = !liveNote && lastNote !== null && Date.now() - lastNote.at < HOLD_MS;
  const displayNote = liveNote ? note : isHeld ? lastNote.note : null;
  const displayHz = liveNote ? pitch.hz : isHeld ? lastNote.hz : null;

  useEffect(() => {
    let active = true;
    void loadDevices().catch(() => { if (active) setError(true); });
    void acquire().catch(() => { if (active) setError(true); });
    return () => { active = false; void release().catch(() => {}); };
  }, [acquire, loadDevices, release]);
  useEffect(() => {
    if (!note || !pitch || pitch.clarity < 0.7) return;
    const next = { note, hz: pitch.hz, at: Date.now() };
    setLastNote(next);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    holdTimeout.current = setTimeout(() => setHoldExpired((count) => count + 1), HOLD_MS);
  }, [note, pitch]);
  useEffect(() => () => { if (holdTimeout.current) clearTimeout(holdTimeout.current); }, []);

  const status = error ? "Sem entrada de áudio" : !pitch ? "Sem sinal · ouvindo…" : pitch.clarity < 0.7 ? "Detectando…" : Math.abs(note?.cents ?? 50) <= 5 ? "Afinado" : "Ajuste a afinação";
  return (
    <section className="cress-tuner-panel" aria-label="Afinador">
      <header><span className={`cress-tuner-status${note && Math.abs(note.cents) <= 5 ? " is-tuned" : ""}`}><i />{status}</span><button type="button" className="cress-control" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={15} /> Configurações</button></header>
      {settings && <div className="cress-tuner-settings"><span>Referência <strong>A4 · {a4} Hz</strong></span><span className="cress-tuner-settings-divider" /><button type="button" aria-label="Alternar nomenclatura de notas" onClick={() => useTunerStore.getState().setNoteNaming(naming === "letter" ? "solfege" : "letter")}>Nomes <strong>{naming === "letter" ? "C–D–E" : "Dó–Ré–Mi"}</strong></button></div>}
      {error ? <div className="cress-tuner-error"><p>Verifique a permissão de microfone do Windows e a entrada de áudio.</p><button type="button" className="cress-control" onClick={() => { setError(false); void acquire().catch(() => setError(true)); }}>Tentar novamente</button></div> : <>
        <div className={`cress-tuner-main${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}><strong>{displayNote ? noteLabel(displayNote.midi, naming) : "—"}</strong><span>{displayHz !== null ? `${displayHz.toFixed(1)} Hz` : "Aguardando som"}</span></div>
        <TunerGauge cents={displayNote?.cents ?? 0} inTune={!!displayNote && Math.abs(displayNote.cents) <= 5} />
        <div className={`cress-tuner-cents${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}>{displayNote ? <><strong>{displayNote.cents > 0 ? "+" : ""}{displayNote.cents}</strong><span>cents</span></> : <><strong>—</strong><span>cents</span></>}</div>
        <label className="cress-tuner-device">Entrada de áudio<select value={deviceId ?? ""} onChange={(e) => void setDevice(e.target.value || null).catch(() => setError(true))}><option value="">Padrão do sistema</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name}{device.isDefault ? " (padrão)" : ""}</option>)}</select></label>
      </>}
      <TunerCarousel midi={displayNote?.midi ?? null} naming={naming} />
    </section>
  );
}
