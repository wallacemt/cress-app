import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChangelog } from "./useChangelog";

export function ChangelogPage() {
  const { status, entries } = useChangelog();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { if (!selected && entries[0]) setSelected(entries[0].version); }, [entries, selected]);

  const active = entries.find((entry) => entry.version === selected) ?? entries[0] ?? null;

  return (
    <main className="mx-auto flex h-screen w-full max-w-5xl flex-col px-6 py-10 text-[var(--text-primary)]">
      <header className="mb-6 shrink-0 border-b border-[var(--border-subtle)] pb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">CRESS</p>
        <h1 className="font-display text-4xl">Novidades</h1>
      </header>

      {status === "loading" && <div role="status" aria-label="Carregando novidades" aria-busy="true" className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-6"><div className="space-y-4 border-r border-[var(--border-subtle)] pr-4">{[0, 1, 2, 3].map((i) => <div key={i} className="space-y-2"><div className="cress-skeleton" style={{ width: `${52 + i * 8}%`, height: `${14 + (i % 3) * 2}px` }} /><div className="cress-skeleton h-3 w-2/5" /></div>)}</div><div className="space-y-5"><div className="cress-skeleton h-6 w-2/3" /><div className="cress-skeleton h-4 w-1/3" /><div className="space-y-3 pt-3">{[100, 91, 96, 68, 87, 56].map((width, i) => <div key={i} className="cress-skeleton h-4" style={{ width: `${width}%` }} />)}</div></div></div>}
      {status === "offline" && <p role="status">Sem conexão. Não foi possível carregar as novidades.</p>}
      {status === "error" && <p role="alert">Não foi possível carregar as novidades agora.</p>}
      {status === "ready" && entries.length === 0 && <p>Nenhuma release publicada ainda.</p>}

      {status === "ready" && entries.length > 0 && (
        <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-6">
          <nav aria-label="Versões" className="min-h-0 overflow-y-auto border-r border-[var(--border-subtle)] pr-4">
            <ul className="space-y-1">
              {entries.map((entry) => (
                <li key={entry.url}>
                  <button
                    type="button"
                    aria-current={entry.version === active?.version ? "true" : undefined}
                    onClick={() => setSelected(entry.version)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      entry.version === active?.version
                        ? "bg-[var(--violet-500)]/15 text-[var(--violet-300)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--ink-750)]"
                    }`}
                  >
                    <span className="block font-medium">{entry.version}</span>
                    <time dateTime={entry.date} className="block text-xs text-[var(--text-muted)]">
                      {entry.date ? new Date(entry.date).toLocaleDateString("pt-BR") : "Data indisponível"}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {active && (
            <section key={active.url} className="min-h-0 overflow-y-auto">
              <div className="mx-auto max-w-2xl pb-10">
                <h2 className="text-2xl font-semibold">{active.title}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {active.version} ·{" "}
                  <time dateTime={active.date}>{active.date ? new Date(active.date).toLocaleDateString("pt-BR") : "Data indisponível"}</time>
                </p>
                <div className="cress-changelog-markdown mt-6">
                  {active.notes ? <ReactMarkdown>{active.notes}</ReactMarkdown> : <p>Sem notas para esta versão.</p>}
                </div>
                <a className="mt-6 inline-block text-sm text-[var(--violet-300)] underline" href={active.url} target="_blank" rel="noreferrer">
                  Ver release no GitHub
                </a>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
