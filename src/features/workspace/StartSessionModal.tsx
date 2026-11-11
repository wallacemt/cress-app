import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AudioLines, Search } from "lucide-react";
import { container } from "../../app/container";
import { listPieces } from "../../application/repertoire";
import { listSessions, startSession } from "../../application/sessions";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { normalizeName } from "../../domain/score";
import type { RepertoireItem } from "../../domain/repertoire";

export function StartSessionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (deps) => {
      const [allPieces, sessions] = await Promise.all([listPieces(deps), listSessions(deps)]);
      const available = allPieces.filter((piece) => !piece.archived);
      const availableIds = new Set(available.map((piece) => piece.id));
      const recent = [...new Set(sessions.filter((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID && availableIds.has(session.repertoire_item_id)).map((session) => session.repertoire_item_id))].slice(0, 3);
      if (active) { setPieces(available); setRecentIds(recent); }
    }).catch(() => { if (active) setError("Não foi possível carregar o repertório."); }).finally(() => { if (active) setLoading(false); });
    searchRef.current?.focus();
    return () => { active = false; };
  }, []);
  const needle = normalizeName(query);
  const matches = (piece: RepertoireItem) => !needle || normalizeName(`${piece.title} ${piece.composer ?? ""}`).includes(needle);
  const recent = pieces.filter((piece) => recentIds.includes(piece.id) && matches(piece));
  const repertoire = pieces.filter((piece) => !recentIds.includes(piece.id) && matches(piece)).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  const rows = ["free", ...recent.map((piece) => piece.id), ...repertoire.map((piece) => piece.id)];
  async function confirm() {
    if (loading) return;
    if (selected !== "free" && !rows.includes(selected)) { setSelected("free"); return; }
    if (selected === "free") { onClose(); navigate("/tools"); return; }
    const piece = pieces.find((item) => item.id === selected);
    if (!piece) return;
    setError("");
    try {
      const deps = await container.getDeps();
      const session = await startSession(deps, { repertoireItemId: piece.id });
      onClose();
      navigate(`/practice/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error && "code" in cause && cause.code === "SESSION_ALREADY_OPEN" ? "Finalize ou retome a sessão aberta antes de iniciar outra." : "Não foi possível iniciar a sessão. Tente novamente.");
    }
  }
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!rows.length) return;
      event.preventDefault();
      const current = rows.indexOf(selected);
      setSelected(rows[(current + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length] ?? "free");
    }
    if (event.key === "Enter") { event.preventDefault(); void confirm(); }
  }
  function pieceButton(piece: RepertoireItem) {
    return <button key={piece.id} type="button" onClick={() => setSelected(piece.id)} className={`relative flex h-14 w-full flex-col justify-center border-b border-[var(--border-subtle)] px-4 pl-6 text-left ${selected === piece.id ? "bg-[var(--ink-600)]" : "hover:bg-[var(--ink-800)]"}`}><span className="truncate">{piece.title}</span><span className="truncate text-xs text-[var(--text-muted)]">{piece.composer || "Compositor não informado"}</span>{selected === piece.id && <span className="cress-hairpin-v absolute inset-y-0 left-0" />}</button>;
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(5_7_13/.72)] p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
    <section role="dialog" aria-modal="true" aria-labelledby="start-session-title" className="cress-card flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl shadow-2xl">
      <header className="border-b border-[var(--border-subtle)] p-5"><h2 id="start-session-title" className="font-display text-[28px]">Nova sessão</h2><label className="mt-4 flex h-11 items-center gap-3 rounded-lg border border-[var(--border-default)] px-3 text-[var(--text-muted)]"><Search size={17} /><input ref={searchRef} autoFocus aria-label="Buscar obra" placeholder="Buscar obra…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none" /></label></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Prática livre</p><button type="button" onClick={() => setSelected("free")} className={`relative flex h-14 w-full items-center gap-3 rounded-lg px-4 text-left ${selected === "free" ? "bg-[var(--ink-600)]" : "hover:bg-[var(--ink-800)]"}`}><AudioLines size={19} /><span className="italic">Prática livre</span>{selected === "free" && <span className="cress-hairpin-v absolute inset-y-0 left-0" />}</button>
        {recent.length > 0 && <><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recentes</p>{recent.map(pieceButton)}</>}
        {repertoire.length > 0 && <><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Repertório</p>{repertoire.map(pieceButton)}</>}
        {!loading && !error && !recent.length && !repertoire.length && <p className="p-4 text-sm text-[var(--text-muted)]">Nenhuma obra encontrada. <a className="text-[var(--violet-300)]" href="/repertoire" onClick={(event) => { event.preventDefault(); onClose(); navigate("/repertoire"); }}>Ir para Repertório</a></p>}
        {loading && <p role="status" className="p-4 text-sm text-[var(--text-muted)]">Carregando repertório…</p>}
        {error && <p role="alert" className="p-3 text-sm text-[var(--danger)]">{error}</p>}
      </div>
      <footer className="flex justify-end border-t border-[var(--border-subtle)] p-4"><button type="button" className="cress-btn-primary" disabled={loading || (selected !== "free" && !pieces.some((piece) => piece.id === selected))} onClick={() => void confirm()}>Iniciar estudo</button></footer>
    </section>
  </div>;
}
