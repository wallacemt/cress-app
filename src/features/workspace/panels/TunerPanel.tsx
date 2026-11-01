import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { CressSlider } from "../../../components/CressSlider";
import { frequencyToNote, noteLabel } from "../../../domain/tuner";
import { useAudioInputStore } from "../../../stores/audioInputStore";
import { useTunerStore } from "../../../stores/tunerStore";
import { TunerGauge } from "./TunerGauge";
import { TunerCarousel } from "./TunerCarousel";

const SWITCH_DELAY_MS = 160;

export function TunerPanel() {
  const pitch = useAudioInputStore((s) => s.pitch);
  const inputError = useAudioInputStore((s) => s.error);
  const level = useAudioInputStore((s) => s.level);
  const running = useAudioInputStore((s) => s.running);
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
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [silentInput, setSilentInput] = useState(false);
  const [lastNote, setLastNote] = useState<{ note: ReturnType<typeof frequencyToNote>; hz: number; at: number } | null>(null);
  const [stableReading, setStableReading] = useState<{ note: ReturnType<typeof frequencyToNote>; hz: number } | null>(null);
  const stableReadingRef = useRef(stableReading);
  const pendingReading = useRef<{ midi: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const deviceMenu = useRef<HTMLDivElement>(null);
  const silenceStarted = useRef<number | null>(null);
  const note = useMemo(() => pitch ? frequencyToNote(pitch.hz, a4) : null, [pitch, a4]);
  const liveNote = stableReading && pitch && pitch.clarity >= 0.7;
  const isHeld = !liveNote && lastNote !== null;
  const displayNote = liveNote ? stableReading.note : isHeld ? lastNote.note : null;
  const displayHz = liveNote ? stableReading.hz : isHeld ? lastNote.hz : null;
  stableReadingRef.current = stableReading;

  useEffect(() => {
    let active = true;
    void loadDevices().catch(() => { if (active) setError(true); });
    void acquire().catch(() => { if (active) setError(true); });
    return () => { active = false; void release().catch(() => {}); };
  }, [acquire, loadDevices, release]);
  useEffect(() => {
    setError(Boolean(inputError));
  }, [inputError]);
  useEffect(() => {
    if (!running || level.rms >= 0.001) {
      silenceStarted.current = null;
      setSilentInput(false);
      return;
    }
    silenceStarted.current ??= Date.now();
    const remaining = Math.max(0, 5000 - (Date.now() - silenceStarted.current));
    const timer = setTimeout(() => setSilentInput(true), remaining);
    return () => clearTimeout(timer);
  }, [level.rms, running]);
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
  useEffect(() => {
    if (!deviceMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!deviceMenu.current?.contains(event.target as Node)) setDeviceMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setDeviceMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [deviceMenuOpen]);

  const status = error ? "Sem entrada de áudio" : !pitch ? "Sem sinal · ouvindo…" : pitch.clarity < 0.7 ? "Detectando…" : Math.abs(note?.cents ?? 50) <= 5 ? "Afinado" : "Ajuste a afinação";
  return (
    <section className="cress-tuner-panel" aria-label="Afinador">
      <header><span className={`cress-tuner-status${note && Math.abs(note.cents) <= 5 ? " is-tuned" : ""}`}><i />{status}</span><button type="button" className="cress-control" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={15} /> Configurações</button></header>
      {settings && <div className="cress-tuner-settings"><label className="cress-tuner-reference">A4 <strong>{a4} Hz</strong><CressSlider aria-label="Frequência de referência A4" min={415} max={466} value={a4} onChange={(value) => useTunerStore.getState().setA4(value)} /></label><span className="cress-tuner-settings-divider" /><button type="button" aria-label="Alternar nomenclatura de notas" onClick={() => useTunerStore.getState().setNoteNaming(naming === "letter" ? "solfege" : "letter")}>Nomes <strong>{naming === "letter" ? "C–D–E" : "Dó–Ré–Mi"}</strong></button></div>}
      {!error && silentInput && <div className="cress-tuner-silence-hint" role="status">Verifique: Configurações do Windows → Privacidade e segurança → Microfone → Permitir que apps da área de trabalho acessem o microfone.</div>}
      {error ? <div className="cress-tuner-error"><p>Verifique a permissão de microfone do Windows e a entrada de áudio.</p><button type="button" className="cress-control" onClick={() => { setError(false); void acquire().catch(() => setError(true)); }}>Tentar novamente</button></div> : <>
        <TunerGauge cents={displayNote?.cents ?? 0} inTune={!!displayNote && Math.abs(displayNote.cents) <= 5} />
        <div className={`cress-tuner-main${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}><strong>{displayNote ? noteLabel(displayNote.midi, naming) : "—"}</strong><span>{displayHz !== null ? `${displayHz.toFixed(1)} Hz` : "Aguardando som"}</span></div>
        <div className={`cress-tuner-cents${displayNote && Math.abs(displayNote.cents) <= 5 ? " is-tuned" : ""}${isHeld ? " is-held" : ""}`}>{displayNote ? <><strong>{displayNote.cents > 0 ? "+" : ""}{displayNote.cents}</strong><span>cents</span></> : <><strong>—</strong><span>cents</span></>}</div>
        <div className="cress-tuner-device"><label htmlFor="cress-tuner-device-button">Entrada de áudio</label><div ref={deviceMenu} className="cress-tuner-device-menu">
          <button id="cress-tuner-device-button" type="button" aria-haspopup="listbox" aria-expanded={deviceMenuOpen} onClick={() => setDeviceMenuOpen(!deviceMenuOpen)}>{devices.find((device) => device.id === deviceId)?.name ?? "Padrão do sistema"}</button>
          {deviceMenuOpen && <div role="listbox" aria-label="Entrada de áudio" className="cress-menu-popover cress-tuner-device-options">
            {[{ id: "", name: "Padrão do sistema", isDefault: false }, ...devices].map((device) => <button key={device.id || "default"} type="button" role="option" aria-selected={(deviceId ?? "") === device.id} className={(deviceId ?? "") === device.id ? "is-selected" : ""} onClick={() => { void setDevice(device.id || null).catch(() => setError(true)); setDeviceMenuOpen(false); }}>{device.name}{device.isDefault ? " (padrão)" : ""}</button>)}
          </div>}
        </div></div>
      </>}
      <TunerCarousel midi={displayNote?.midi ?? null} naming={naming} />
    </section>
  );
}
