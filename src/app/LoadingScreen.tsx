import cressStacked from "../assets/brand/cress-stacked-gold.svg";

export function LoadingScreen() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--ink-900)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 480 48"
        preserveAspectRatio="none"
        className="absolute bottom-[18%] w-[480px] opacity-5"
      >
        {[8, 16, 24, 32, 40].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="480"
            y2={y}
            stroke="var(--text-primary)"
            strokeWidth="1"
          />
        ))}
      </svg>
      <img src={cressStacked} alt="Cress" className="h-40" />
      <div className="mt-10 h-[3px] w-36 overflow-hidden rounded-full bg-[var(--ink-600)]">
        <div className="loading-hairpin h-full w-full" />
      </div>
      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Preparando sua mesa de estudo…
      </p>
    </main>
  );
}
