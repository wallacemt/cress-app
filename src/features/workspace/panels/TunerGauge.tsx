import { useEffect, useRef, useState } from "react";

interface TunerGaugeProps { cents: number; inTune: boolean }

export function TunerGauge({ cents, inTune }: TunerGaugeProps) {
  const value = Math.max(-50, Math.min(50, cents));
  const wasInTune = useRef(inTune);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (inTune && !wasInTune.current) {
      setPulse(true);
      const timeout = window.setTimeout(() => setPulse(false), 420);
      wasInTune.current = inTune;
      return () => window.clearTimeout(timeout);
    }
    wasInTune.current = inTune;
  }, [inTune]);

  return (
    <div className="cress-tuner-gauge" role="meter" aria-label="Afinação em cents" aria-valuemin={-50} aria-valuemax={50} aria-valuenow={value}>
      <div className="cress-tuner-gauge-track">
        <span className={`cress-tuner-gauge-fill${inTune ? " is-tuned" : ""}`} style={{ transform: `scaleX(${Math.abs(value) / 100}) scaleX(${value < 0 ? -1 : 1})` }} />
        <span className="cress-tuner-gauge-ticks" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} className={index === 4 ? "is-center" : ""} style={{ left: `${(index + 1) * 10}%` }} />)}</span>
        <i key={pulse ? "pulse" : "steady"} className={`cress-tuner-gauge-needle${inTune ? " is-tuned" : ""}${pulse ? " is-pulsing" : ""}`} style={{ transform: `translateX(${value}%)` }} />
      </div>
      <div className="cress-tuner-gauge-labels"><span>−50</span><span>0</span><span>+50</span></div>
    </div>
  );
}
