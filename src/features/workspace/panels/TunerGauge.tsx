import { useEffect, useRef, useState } from "react";

interface TunerGaugeProps { cents: number; inTune: boolean }

export function TunerGauge({ cents, inTune }: TunerGaugeProps) {
  const value = Math.max(-50, Math.min(50, cents));
  const angle = Math.PI - ((value + 50) / 100) * Math.PI;
  const needleX = 100 + 82 * Math.cos(angle);
  const needleY = 104 - 82 * Math.sin(angle);
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
      <svg className="cress-tuner-gauge-arc" viewBox="0 0 200 116" aria-hidden="true">
        <defs><linearGradient id="tuner-arc-zones" x1="0" x2="1"><stop offset="0%" stopColor="var(--danger)" /><stop offset="34%" stopColor="var(--warning)" /><stop offset="50%" stopColor="var(--color-gold)" /><stop offset="66%" stopColor="var(--warning)" /><stop offset="100%" stopColor="var(--danger)" /></linearGradient></defs>
        <path className="cress-tuner-gauge-track" d="M 16 104 A 84 84 0 0 1 184 104" pathLength="100" />
        <path className="cress-tuner-gauge-zones" d="M 16 104 A 84 84 0 0 1 184 104" pathLength="100" />
        {value !== 0 && <path className={`cress-tuner-gauge-fill${inTune ? " is-tuned" : ""}`} d={value < 0 ? "M 16 104 A 84 84 0 0 1 100 20" : "M 100 20 A 84 84 0 0 1 184 104"} pathLength="50" strokeDasharray={`${Math.abs(value)} 50`} />}
        {Array.from({ length: 9 }, (_, index) => {
          const tickAngle = Math.PI - ((index + 1) / 10) * Math.PI;
          const x1 = 100 + 75 * Math.cos(tickAngle);
          const y1 = 104 - 75 * Math.sin(tickAngle);
          const x2 = 100 + (index === 4 ? 86 : 82) * Math.cos(tickAngle);
          const y2 = 104 - (index === 4 ? 86 : 82) * Math.sin(tickAngle);
          return <line key={index} className={index === 4 ? "is-center" : ""} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <circle key={pulse ? "pulse" : "steady"} className={`cress-tuner-gauge-needle${inTune ? " is-tuned" : ""}${pulse ? " is-pulsing" : ""}`} cx={needleX} cy={needleY} r="4" />
      </svg>
      <div className="cress-tuner-gauge-labels"><span>−50</span><span>0</span><span>+50</span></div>
    </div>
  );
}
