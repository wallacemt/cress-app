import { useMemo, useState, type FormEvent } from "react";
import { importPlan } from "../../application/scores";
import type { FolderScan } from "../../application/deps";
import { container } from "../../app/container";
import { INSTRUMENTS, type InstrumentCode } from "../../domain/profile";
import { normalizeName, type ImportPlan } from "../../domain/score";

const control = "rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)]";

export function ImportFolderDialog({ scan, plan, onClose, onImported }: {
  scan: FolderScan;
  plan: ImportPlan;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const [edited, setEdited] = useState(plan);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [composers, setComposers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => edited.candidates.filter((c) => normalizeName(c.title).includes(normalizeName(query))), [edited, query]);
  const selectedFiles = edited.candidates.flatMap((c) => c.files).filter((f) => f.selected).length;
  const selectedWorks = edited.candidates.filter((c) => c.files.some((f) => f.selected)).length;

  function updateCandidate(index: number, change: (candidate: typeof edited.candidates[number]) => typeof edited.candidates[number]) {
    setEdited((current) => ({ candidates: current.candidates.map((c, i) => i === index ? change(c) : c) }));
  }
  function selectCandidate(index: number, selected: boolean) {
    updateCandidate(index, (candidate) => ({ ...candidate, files: candidate.files.map((file) => ({ ...file, selected })) }));
  }
  function moveFile(from: number, entryId: string, to: number) {
    setEdited((current) => {
      const candidates = current.candidates.map((c) => ({ ...c, files: [...c.files] }));
      const source = candidates[from]!;
      const fileIndex = source.files.findIndex((f) => f.entryId === entryId);
      if (fileIndex < 0 || from === to) return current;
      const [file] = source.files.splice(fileIndex, 1);
      candidates[to]!.files.push(file!);
      return { candidates: candidates.filter((c) => c.files.length) };
    });
    setExpanded(null);
  }
  function toggleVisible(selected: boolean) {
    const indexes = new Set(visible.map((candidate) => edited.candidates.indexOf(candidate)));
    setEdited((current) => ({ candidates: current.candidates.map((candidate, index) => indexes.has(index) ? { ...candidate, files: candidate.files.map((file) => ({ ...file, selected })) } : candidate) }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setProgress({ done: 0, total: selectedFiles });
    try {
      const deps = await container.getDeps();
      await importPlan(deps, { scanId: scan.scanId, plan: edited }, setProgress);
      await onImported();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar as partituras.");
    } finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="import-folder-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-[var(--border-default)] bg-[var(--ink-900)] text-[var(--text-primary)] shadow-2xl">
      <header className="border-b border-[var(--border-subtle)] p-5">
        <h2 id="import-folder-title" className="font-display text-3xl">Prévia da importação</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{scan.rootName} · {scan.entries.length} arquivos encontrados</p>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] p-4">
          <input aria-label="Buscar obra" placeholder="Buscar por título" value={query} onChange={(e) => setQuery(e.target.value)} className={`${control} h-10 min-w-56 flex-1`} />
          <button type="button" className="text-sm text-[var(--violet-300)]" onClick={() => toggleVisible(!visible.every((c) => c.files.every((f) => f.selected)))}>Selecionar/desmarcar todos</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {visible.map((candidate) => {
            const index = edited.candidates.indexOf(candidate);
            const open = expanded === candidate.files[0]?.entryId;
            return <article key={candidate.files[0]?.entryId ?? `${candidate.title}-${index}`} className="border-b border-[var(--border-subtle)] py-3">
              <div className="grid grid-cols-[auto_minmax(150px,2fr)_minmax(120px,1fr)_minmax(130px,1fr)_auto] items-center gap-2">
                <input type="checkbox" aria-label={`Selecionar ${candidate.title}`} checked={candidate.files.some((f) => f.selected)} onChange={(e) => selectCandidate(index, e.target.checked)} disabled={busy} />
                <input aria-label={`Título ${candidate.title}`} value={candidate.title} onChange={(e) => updateCandidate(index, (c) => ({ ...c, title: e.target.value }))} className={`${control} h-10 min-w-0`} disabled={busy} />
                <input aria-label={`Compositor ${candidate.title}`} placeholder="Compositor (não será salvo nesta importação)" value={composers[candidate.files[0]?.entryId ?? ""] ?? ""} onChange={(e) => setComposers((all) => ({ ...all, [candidate.files[0]?.entryId ?? ""]: e.target.value }))} className={`${control} h-10 min-w-0`} disabled={busy} />
                <select aria-label={`Instrumento ${candidate.title}`} value={candidate.instrument} onChange={(e) => updateCandidate(index, (c) => ({ ...c, instrument: e.target.value as InstrumentCode }))} className={`${control} h-10 min-w-0`} disabled={busy}>{Object.entries(INSTRUMENTS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
                <button type="button" aria-expanded={open} className="px-2 text-sm text-[var(--text-secondary)]" onClick={() => setExpanded(open ? null : candidate.files[0]?.entryId ?? null)}>{open ? "Fechar" : `${candidate.files.length} arquivos`}</button>
              </div>
              <p className="ml-8 mt-1 text-xs text-[var(--text-muted)]">{candidate.target.startsWith("existing:") ? `Vincular à obra existente: ${candidate.title}` : "Nova obra"}</p>
              {open && <ul className="ml-8 mt-2 space-y-2">{candidate.files.map((file) => <li key={file.entryId} className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input type="checkbox" aria-label={`Importar ${file.label}`} checked={file.selected} onChange={(e) => updateCandidate(index, (c) => ({ ...c, files: c.files.map((f) => f.entryId === file.entryId ? { ...f, selected: e.target.checked } : f) }))} disabled={busy} />
                <span className="min-w-0 flex-1 truncate">{file.label}</span><span>{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                {!file.selected && <span>Não será importado</span>}
                {file.probableDuplicate && <span title={file.probableDuplicate}>Provável duplicata: {file.probableDuplicate}</span>}
                <select aria-label={`Mover ${file.label} para`} value="" onChange={(e) => { if (e.target.value) moveFile(index, file.entryId, Number(e.target.value)); }} disabled={busy} className={`${control} h-8`}><option value="">Mover para…</option>{edited.candidates.map((other, otherIndex) => otherIndex !== index && <option key={other.files[0]?.entryId ?? otherIndex} value={otherIndex}>{other.title}</option>)}</select>
              </li>)}</ul>}
            </article>;
          })}
          {scan.ignoredByExt.length > 0 && <p className="py-3 text-xs text-[var(--text-muted)]">Ignorados: {scan.ignoredByExt.map(({ ext, count }) => `${ext || "sem extensão"} (${count})`).join(", ")}</p>}
          {scan.skippedDeepDirs > 0 && <p className="py-2 text-xs text-[var(--text-muted)]">{scan.skippedDeepDirs} pastas muito profundas foram ignoradas. Para importar uma subpasta mais profunda, escolha-a diretamente.</p>}
          {scan.truncated && <p className="py-2 text-xs text-[var(--text-muted)]">A busca foi limitada; alguns arquivos podem não aparecer.</p>}
        </div>
        <footer className="border-t border-[var(--border-subtle)] p-4">
          {error && <p role="alert" className="mb-2 text-sm text-[var(--danger)]">{error}</p>}
          {busy && <div className="mb-3" aria-live="polite"><progress className="h-2 w-full accent-[var(--violet-400)]" max={progress?.total || 1} value={progress?.done ?? 0} /><p className="mt-1 text-xs text-[var(--text-muted)]">Importando {progress?.done ?? 0} de {progress?.total ?? selectedFiles} partituras…</p></div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--text-secondary)]">Importar {selectedFiles} partituras em {selectedWorks} obras</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm">Cancelar</button><button type="submit" disabled={busy || !selectedFiles} className="rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{busy ? "Importando…" : "Importar"}</button></div></div>
        </footer>
      </form>
    </section>
  </div>;
}
