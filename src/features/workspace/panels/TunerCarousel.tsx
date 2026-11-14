import { t } from "../../../lib/i18n";
import { useLanguageStore } from "../../../stores/languageStore";
import { noteLabel } from "../../../domain/tuner";

type NoteNaming = "letter" | "solfege";

interface TunerCarouselProps {
  midi: number | null;
  naming: NoteNaming;
}

const NEIGHBORS = 4;

export function TunerCarousel({
  midi, naming }: TunerCarouselProps) {
  useLanguageStore((state) => state.language);
  if (midi === null) {
    return <div className="cress-tuner-carousel is-empty">{t("workspace.tuner_no_notes")}</div>;
  }

  return (
    <div className="cress-tuner-carousel" aria-label={t("workspace.neighbor_notes")}>
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
