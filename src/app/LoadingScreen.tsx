import cressStacked from "../assets/brand/cress-stacked-gold.svg";
import { useLanguageStore } from "../stores/languageStore";
import { t } from "../lib/i18n";

// Posição (x) e linha do pentagrama (y) de cada nota do progresso — ritmo levemente
// irregular (não um metrônomo robótico) para parecer uma frase musical de verdade.
const LOADING_NOTES = [
  { x: 36, y: 32 },
  { x: 92, y: 16 },
  { x: 148, y: 24 },
  { x: 204, y: 40 },
  { x: 260, y: 24 },
  { x: 316, y: 16 },
  { x: 372, y: 32 },
  { x: 428, y: 24 },
];

export function LoadingScreen() {
  useLanguageStore((state) => state.language);
  return (
    <main
      role="status"
      aria-live="polite"
      style={{ backgroundColor: "var(--ink-900, #090b14)" }}
      className=" w-full h-full   flex items-center justify-center  cress-loading-fade"
    >
      <div className="flex flex-col items-center">
      <img src={cressStacked} alt="Cress" className="h-82 cress-loading-logo" />
      <p className="mt-8 text-base font-medium text-[var(--text-muted)] cress-loading-text">
        {t("loading.mensagem")}
      </p>
      <svg
        aria-hidden="true"
        viewBox="0 0 480 48"
        className="mt-12 w-[min(840px,85vw)] cress-loading-staff"
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
            opacity={0.3}
          />
        ))}
        {LOADING_NOTES.map((note, i) => (
          <g
            key={note.x}
            className="cress-loading-note"
            style={{ animationDelay: `${i * 560 + 450}ms` }}
          >
            <line
              x1={note.x + 5}
              y1={note.y}
              x2={note.x + 5}
              y2={note.y - 16}
              stroke="var(--violet-400)"
              strokeWidth="1.5"
            />
            <ellipse
              cx={note.x}
              cy={note.y}
              rx="5"
              ry="4"
              fill="var(--violet-400)"
              transform={`rotate(-18 ${note.x} ${note.y})`}
            />
          </g>
        ))}
      </svg>
      </div>
    </main>
  );
}
