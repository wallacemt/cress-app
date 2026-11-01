import { noteLabel } from "../../../domain/tuner";

type NoteNaming = "letter" | "solfege";

interface TunerCarouselProps {
  midi: number | null;
  naming: NoteNaming;
}

const NEIGHBORS = 4;

export function TunerCarousel({ midi, naming }: TunerCarouselProps) {
  if (midi === null) {
    return <div className="cress-tuner-carousel is-empty">As notas detectadas aparecerão aqui.</div>;
  }

  return (
    <div className="cress-tuner-carousel" aria-label="Notas vizinhas">
      {Array.from({ length: NEIGHBORS * 2 + 1 }, (_, index) => {
        const distance = index - NEIGHBORS;
        return (
          <span
            className={`cress-tuner-carousel-note${distance === 0 ? " is-active" : ""}`}
            key={midi + distance}
            style={{ opacity: distance === 0 ? 1 : 1 - Math.abs(distance) * 0.16 }}
            aria-current={distance === 0 ? "true" : undefined}
          >
            {noteLabel(midi + distance, naming)}
          </span>
        );
      })}
    </div>
  );
}
