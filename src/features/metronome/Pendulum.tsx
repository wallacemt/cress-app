import { getBeatInterval } from "../../domain/metronome";
import { useMetronomeStore } from "../../stores/metronomeStore";

export function Pendulum() {
  const running = useMetronomeStore((state) => state.running);
  const bpm = useMetronomeStore((state) => state.config.bpm);
  return <div className={`cress-metronome-pendulum${running ? " is-running" : ""}`} style={{ "--beat-ms": `${getBeatInterval(bpm)}ms` } as React.CSSProperties} aria-hidden="true"><div className="cress-metronome-frame"><span className="cress-metronome-arm"><i /></span></div></div>;
}
