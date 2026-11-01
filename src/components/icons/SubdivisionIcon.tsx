import type { SUBDIVISIONS } from "../../domain/metronome";

type SubdivisionPattern = (typeof SUBDIVISIONS)[number];

export function SubdivisionIcon({
  pattern,
  active,
}: {
  pattern: SubdivisionPattern;
  active: boolean;
}) {
  const notes = pattern.split("-");
  const count = notes.length;
  const xFor = (index: number) => 5 + (14 / Math.max(1, count - 1)) * index;
  const stemTop = count === 3 || count === 6 ? 5 : 7;
  const beamCount = count === 1 ? 0 : count === 4 ? 2 : 1;
  const beamY = (beam: number) => 6 + beam * 3;

  return (
    <svg
      className={`cress-subdivision-icon${active ? " is-active" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {count === 3 && (
        <text x="12" y="5" textAnchor="middle" className="cress-subdivision-icon-tuplet">
          3
        </text>
      )}
      {count === 6 && (
        <text x="12" y="5" textAnchor="middle" className="cress-subdivision-icon-tuplet">
          6
        </text>
      )}
      {notes.map((note, index) => {
        const x = xFor(index);
        const y = 17;
        return (
          <g key={index} className={note === "0" ? "is-rest" : "is-note"}>
            <ellipse
              cx={x}
              cy={y}
              rx="1.65"
              ry="1.15"
              transform={`rotate(-25 ${x} ${y})`}
              fill={note === "1" ? "currentColor" : "transparent"}
              strokeDasharray={note === "0" ? "1 1" : undefined}
            />
            <path d={`M${x + 1.35} ${y - 0.7}V${stemTop}`} />
          </g>
        );
      })}
      {beamCount > 0 &&
        Array.from({ length: beamCount }, (_, beam) => {
          const first = xFor(0) + 1.35;
          const last = xFor(count - 1) + 1.35;
          const y = beamY(beam);
          return (
            <path
              key={beam}
              d={`M${first} ${y}H${last}`}
              strokeWidth="2.4"
              opacity={active ? 1 : 0.8}
            />
          );
        })}
    </svg>
  );
}
