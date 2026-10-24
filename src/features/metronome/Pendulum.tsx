import { useMetronomeStore } from "../../stores/metronomeStore";

export function Pendulum() {
  const running = useMetronomeStore((state) => state.running);
  const beat = useMetronomeStore((state) => state.beat);
  return <div className={`cress-metronome-pendulum${running ? " is-running" : ""}`} aria-hidden="true"><span style={{ transform: `rotate(${running && beat % 2 === 1 ? 18 : running ? -18 : 0}deg)` }}><i /></span></div>;
}
