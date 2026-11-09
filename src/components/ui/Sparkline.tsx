import { useId } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel: string;
}

export function Sparkline({ values, width = 160, height = 48, color = "var(--text-primary)", ariaLabel }: SparklineProps) {
  const gradientId = `sparkline-hairpin-${useId()}`;
  if (values.length < 2) return <p className="text-sm text-[var(--text-muted)]">Sem dados suficientes</p>;

  const padding = 4;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) =>
    `${padding + (index * (width - padding * 2)) / (values.length - 1)},${height - padding - ((value - min) * (height - padding * 2)) / range}`,
  ).join(" ");
  const lastPoint = points.split(" ")[values.length - 1] ?? "0,0";
  const [lastX, lastY] = lastPoint.split(",").map(Number);

  return (
    <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <defs><linearGradient id={gradientId}><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#60a5fa" /></linearGradient></defs>
      <polyline points={points} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}
