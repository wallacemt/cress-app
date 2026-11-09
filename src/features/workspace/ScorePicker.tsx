import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { container } from "../../app/container";
import { listPieces } from "../../application/repertoire";
import { listScores } from "../../application/scores";
import { normalizeName } from "../../domain/score";
import type { ScoreDocumentRow } from "../../infrastructure/db/rows";
import type { RepertoireItem } from "../../domain/repertoire";

export function ScorePicker({ onSelect }: { onSelect: (id: string, title: string) => void }) {
  const [scores, setScores] = useState<ScoreDocumentRow[]>([]);
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (deps) => Promise.all([listScores(deps, {}), listPieces(deps)])).then(([items, repertoire]) => {
      if (active) { setScores(items); setPieces(repertoire); }
    }).catch(() => { if (active) setError("Não foi possível carregar as partituras."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const pieceNames = useMemo(() => new Map(pieces.map((piece) => [piece.id, piece.title])), [pieces]);
  const filtered = useMemo(() => {
    const needle = normalizeName(query);
    return scores.filter((score) => !needle || normalizeName(`${score.label} ${pieceNames.get(score.repertoire_item_id) ?? ""} ${score.original_name}`).includes(needle));
  }, [scores, pieceNames, query]);
  return <div className="cress-score-picker">
    <label className="cress-score-picker-search"><Search size={14} /><input autoFocus aria-label="Buscar partitura" placeholder="Buscar partitura ou obra…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {loading ? <p role="status">Carregando partituras…</p> : error ? <p role="alert">{error}</p> : filtered.length ? <div className="cress-score-picker-list" role="group" aria-label="Partituras">{filtered.map((score) => {
      const title = `${pieceNames.get(score.repertoire_item_id) ?? "Obra"} · ${score.label}`;
      return <button key={score.id} type="button" title={score.original_name} onClick={() => onSelect(score.id, title)}><span>{score.label}</span><small>{pieceNames.get(score.repertoire_item_id) ?? "Obra"}</small></button>;
    })}</div> : <p>{scores.length ? "Nenhuma partitura encontrada." : "Nenhuma partitura importada."}</p>}
  </div>;
}
