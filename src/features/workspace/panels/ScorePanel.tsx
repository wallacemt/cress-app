import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { IDockviewPanelProps } from "dockview-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { container } from "../../../app/container";
import { getScore, setScoreLastPage } from "../../../application/scores";
import type { ScoreDocumentRow } from "../../../infrastructure/db/rows";
import { PdfCanvas } from "../../pdf/PdfCanvas";

type Fit = "width" | "page";

export function ScorePanel({ api }: IDockviewPanelProps) {
  const scoreId = api.id.split(":")[1] ?? "";
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [score, setScore] = useState<ScoreDocumentRow | null>(null);
  const [src, setSrc] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState<Fit | null>("width");
  const [error, setError] = useState("");
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    let active = true;
    void (async () => {
      const deps = await container.getDeps();
      const row = await getScore(deps, { id: scoreId });
      if (!row) throw new Error("Partitura não encontrada.");
      const absolute = await join(await deps.scores.scoresRoot(), row.relative_path);
      if (!active) return;
      setScore(row); setPage(row.last_page); setPageInput(String(row.last_page));
      setSrc(convertFileSrc(absolute));
    })().catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível abrir a partitura."); });
    return () => { active = false; if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [scoreId]);

  const onError = useCallback((message: string) => setError(message), []);
  const onPageCount = useCallback((count: number) => { setPageCount(count); setPage((current) => Math.min(current, count)); }, []);
  const onPageSize = useCallback((size: { width: number; height: number }) => setPageSize(size), []);
  useEffect(() => {
    if (!score || !pageCount) return;
    setPageInput(String(page));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void container.getDeps().then((deps) => setScoreLastPage(deps, { id: score.id, page })).catch(() => setError("Não foi possível salvar a última página."));
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [page, pageCount, score]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (!root.current?.contains(target as Node) || (target as HTMLElement).closest?.(".dv-tab")) return;
      if (["PageDown", "ArrowRight", " "].includes(event.key)) { event.preventDefault(); setPage((value) => Math.min(pageCount || Infinity, value + 1)); }
      else if (["PageUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); setPage((value) => Math.max(1, value - 1)); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pageCount]);

  useEffect(() => {
    if (!fit || !stage.current || !pageSize) return;
    const width = stage.current.clientWidth - 32;
    const height = stage.current.clientHeight - 32;
    setScale(Math.min(3, Math.max(.35, fit === "width" ? width / pageSize.width : Math.min(width / pageSize.width, height / pageSize.height))));
  }, [fit, pageSize]);

  const navigate = (value: number) => setPage(Math.max(1, Math.min(pageCount || 1, Math.floor(value) || 1)));
  const submitPage = () => navigate(Number(pageInput));
  const zoom = (factor: number) => { setFit(null); setScale((value) => Math.min(3, Math.max(.35, Math.round(value * factor * 100) / 100))); };

  return <section className="cress-score-panel" ref={root} aria-label="Visualizador de partitura">
    <header className="cress-score-toolbar">
      <strong title={score?.label}>{score?.label ?? "Partitura"}</strong>
      <div className="cress-score-controls">
        <button type="button" className="cress-control" onClick={() => navigate(page - 1)} disabled={page <= 1}>Anterior</button>
        <label>Página <input aria-label="Ir para página" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={submitPage} onKeyDown={(event) => { if (event.key === "Enter") { submitPage(); event.currentTarget.blur(); } }} /> / {pageCount || "—"}</label>
        <button type="button" className="cress-control" onClick={() => navigate(page + 1)} disabled={pageCount > 0 && page >= pageCount}>Próxima</button>
        <span className="cress-score-divider" />
        <button type="button" className="cress-icon-control" aria-label="Diminuir zoom" onClick={() => zoom(.9)}><Minus size={15} /></button>
        <span className="cress-score-zoom">{Math.round(scale * 100)}%</span>
        <button type="button" className="cress-icon-control" aria-label="Aumentar zoom" onClick={() => zoom(1.1)}><Plus size={15} /></button>
        <button type="button" className={`cress-control ${fit === "width" ? "is-active" : ""}`} onClick={() => setFit("width")}>Largura</button>
        <button type="button" className={`cress-control ${fit === "page" ? "is-active" : ""}`} onClick={() => setFit("page")}><RotateCcw size={14} /> Página</button>
      </div>
    </header>
    {error ? <p className="cress-score-error" role="alert">{error}</p> : <div className="cress-score-stage" ref={stage} tabIndex={0} aria-label="Página da partitura; use as setas ou espaço para navegar">
      {src && <PdfCanvas src={src} page={page} scale={scale} onPageCount={onPageCount} onPageSize={onPageSize} onError={onError} />}
    </div>}
  </section>;
}
