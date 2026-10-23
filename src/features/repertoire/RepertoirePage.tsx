import { useEffect, useMemo, useState } from "react";
import { FileMusic, Music2, Search } from "lucide-react";
import { listPieces } from "../../application/repertoire";
import { container } from "../../app/container";
import { INSTRUMENTS, type InstrumentCode } from "../../domain/profile";
import { normalizeName } from "../../domain/score";
import type { RepertoireItem } from "../../domain/repertoire";
import { Navigate } from "react-router";
import { PieceFormDialog } from "./PieceFormDialog";

const columns =
  "grid min-w-[760px] grid-cols-[minmax(0,3fr)_minmax(0,2fr)_120px_88px_88px_120px] items-center gap-4";

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const needle = normalizeName(query);
  if (!needle) return title;

  let normalized = "";
  const starts: number[] = [];
  const ends: number[] = [];
  for (let offset = 0; offset < title.length;) {
    const character = String.fromCodePoint(title.codePointAt(offset)!);
    const start = offset;
    offset += character.length;
    const value = /\s/u.test(character)
      ? normalized && !normalized.endsWith(" ")
        ? " "
        : ""
      : normalizeName(character);
    for (const unit of value) {
      normalized += unit;
      starts.push(start);
      ends.push(offset);
    }
  }
  const match = normalized.indexOf(needle);
  if (match < 0) return title;
  const start = starts[match]!;
  const end = ends[match + needle.length - 1]!;
  return (
    <>
      {title.slice(0, start)}
      <mark className="rounded-sm bg-[var(--violet-tint)] text-[var(--violet-300)]">
        {title.slice(start, end)}
      </mark>
      {title.slice(end)}
    </>
  );
}

export function RepertoirePage() {
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [destination, setDestination] = useState("");

  useEffect(() => {
    let active = true;
    void container
      .getDeps()
      .then(listPieces)
      .then((items) => {
        if (active) setPieces(items);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar seu repertório.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = normalizeName(query);
    return pieces.filter(
      (piece) =>
        !normalized ||
        normalizeName(piece.title).includes(normalized) ||
        normalizeName(piece.composer ?? "").includes(normalized),
    );
  }, [pieces, query]);

  if (destination) return <Navigate to={destination} />;

  if (loading)
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10" aria-busy="true">
        <p className="text-sm text-[var(--text-muted)]">
          Carregando repertório…
        </p>
      </main>
    );

  if (error)
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      </main>
    );

  if (!pieces.length)
    return (
      <main className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 720 80"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-[22%] w-full opacity-[0.035]"
        >
          {[8, 24, 40, 56, 72].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="720"
              y2={y}
              stroke="var(--text-primary)"
              strokeWidth="1"
            />
          ))}
        </svg>
        <Music2
          aria-hidden="true"
          size={30}
          strokeWidth={1.5}
          className="mb-6 text-[var(--gold-300)]"
        />
        <h1 className="font-display text-5xl leading-[0.95] text-[var(--text-primary)] sm:text-6xl">
          Seu repertório
          <br />
          começa aqui.
        </h1>
        <p className="mt-5 text-base text-[var(--text-secondary)]">
          Adicione uma obra e comece sua evolução.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--violet-600)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--violet-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)]"
          >
            <span aria-hidden="true">+</span> Adicionar obra
          </button>
          <button
            type="button"
            disabled
            title="Disponível na Fase 9"
            className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-lg border border-[var(--border-default)] px-5 text-sm text-[var(--text-subtle)] opacity-70"
          >
            Importar pasta de partituras
          </button>
        </div>
        {creating && (
          <PieceFormDialog
            onClose={() => setCreating(false)}
            onSaved={(piece) => setDestination(`/repertoire/${piece.id}`)}
          />
        )}
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl text-[var(--text-primary)]">
            Repertório
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pieces.length} {pieces.length === 1 ? "obra" : "obras"}
          </p>
        </div>
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Buscar por título ou compositor</span>
          <Search
            aria-hidden="true"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(-1);
            }}
            placeholder="Buscar por título ou compositor"
            className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-tint)]"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <div
          className={`${columns} border-b border-[var(--border-default)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]`}
        >
          <span>Título</span>
          <span>Compositor</span>
          <span>Instrumento</span>
          <span>Partituras</span>
          <span>Sessões</span>
          <span>Última sessão</span>
        </div>
        {filtered.length ? (
          <div
            role="listbox"
            aria-label="Obras do repertório"
            tabIndex={0}
            className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-400)]"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((index) =>
                  Math.min(index + 1, filtered.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && filtered[selected]) {
                event.preventDefault();
                setDestination(`/repertoire/${filtered[selected].id}`);
              }
            }}
          >
            {filtered.map((piece, index) => (
              <div
                key={piece.id}
                role="option"
                aria-selected={selected === index}
                onClick={() => setDestination(`/repertoire/${piece.id}`)}
                className={`${columns} relative h-11 border-b border-[var(--border-subtle)] px-4 text-sm transition-colors hover:bg-white/[0.04] ${selected === index ? "bg-[var(--ink-600)] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[image:var(--gradient-hairpin)]" : ""}`}
              >
                <span
                  className={`truncate font-medium ${piece.archived ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}
                >
                  <HighlightedTitle title={piece.title} query={query} />
                  {piece.archived && (
                    <span className="ml-2 rounded bg-[var(--ink-700)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--text-muted)]">
                      Arquivada
                    </span>
                  )}
                </span>
                <span className="truncate text-[var(--text-secondary)]">
                  {piece.composer || (
                    <span className="text-[var(--text-subtle)]">—</span>
                  )}
                </span>
                <span className="truncate text-[var(--text-secondary)]">
                  {piece.instrument
                    ? INSTRUMENTS[piece.instrument as InstrumentCode]
                    : "—"}
                </span>
                <span
                  className="inline-flex items-center gap-2 font-[var(--font-metric)] tabular-nums text-[var(--text-muted)]"
                  title="Contagem de partituras indisponível"
                >
                  <FileMusic aria-hidden="true" size={14} /> —
                </span>
                <span
                  className="font-[var(--font-metric)] tabular-nums text-[var(--text-muted)]"
                  title="Contagem de sessões indisponível"
                >
                  —
                </span>
                <span
                  className="truncate text-[var(--text-muted)]"
                  title="Última sessão indisponível"
                >
                  —
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            Nenhuma obra encontrada.
          </p>
        )}
      </div>
    </main>
  );
}
