interface CressSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  "aria-label": string;
  className?: string;
}

export function CressSlider({ value, min, max, onChange, "aria-label": ariaLabel, className = "" }: CressSliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <span className={`cress-slider ${className}`} style={{ "--cress-slider-progress": `${progress}%` } as React.CSSProperties}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </span>
  );
}
