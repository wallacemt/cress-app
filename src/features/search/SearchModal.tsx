import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { container } from "../../app/container";
import { listPieces } from "../../application/repertoire";
import { normalizeName } from "../../domain/score";
import type { RepertoireItem } from "../../domain/repertoire";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void container.getDeps().then(listPieces).then((allPieces) => {
      if (active) setPieces(allPieces.filter((piece) => !piece.archived));
    }).catch(() => {
      if (active) setError("Não foi possível carregar o repertório.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    searchRef.current?.focus();
    return () => { active = false; };
  }, []);

  const needle = normalizeName(query);
  const matches = pieces.filter((piece) => !needle || normalizeName(`${piece.title} ${piece.composer ?? ""}`).includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-search-result]");
      if (!buttons.length) return;
      event.preventDefault();
      const current = [...buttons].indexOf(document.activeElement as HTMLButtonElement);
      buttons[(current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(5_7_13/.72)] p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
    <section role="dialog" aria-modal="true" aria-labelledby="search-title" className="cress-card flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl shadow-2xl">
      <header className="border-b border-[var(--border-subtle)] p-5"><h2 id="search-title" className="font-display text-[28px]">Buscar obra</h2><label className="mt-4 flex h-11 items-center gap-3 rounded-lg border border-[var(--border-default)] px-3 text-[var(--text-muted)]"><Search size={17} /><input ref={searchRef} autoFocus aria-label="Buscar obra" placeholder="Título ou compositor…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none" /></label></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {matches.map((piece) => <button key={piece.id} data-search-result type="button" onClick={() => { onClose(); navigate(`/repertoire/${piece.id}`); }} className="relative flex h-14 w-full flex-col justify-center border-b border-[var(--border-subtle)] px-4 pl-6 text-left hover:bg-[var(--ink-800)]"><span className="truncate">{piece.title}</span><span className="truncate text-xs text-[var(--text-muted)]">{piece.composer || "Compositor não informado"}</span></button>)}
        {!loading && !error && !matches.length && <p className="p-4 text-sm text-[var(--text-muted)]">Nenhuma obra encontrada.</p>}
        {loading && <p role="status" className="p-4 text-sm text-[var(--text-muted)]">Carregando repertório…</p>}
        {error && <p role="alert" className="p-3 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </section>
  </div>;
}
