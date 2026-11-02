import { useChangelog } from "./useChangelog";

export function ChangelogPage() {
  const { status, entries } = useChangelog();
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 text-[var(--text-primary)]">
      <header className="mb-8 border-b border-[var(--border-subtle)] pb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">CRESS</p>
        <h1 className="font-display text-4xl">Novidades</h1>
      </header>
      {status === "loading" && <p role="status">Carregando novidades…</p>}
      {status === "offline" && <p role="status">Sem conexão. Não foi possível carregar as novidades.</p>}
      {status === "error" && <p role="alert">Não foi possível carregar as novidades agora.</p>}
      {status === "ready" && entries.length === 0 && <p>Nenhuma release publicada ainda.</p>}
      <div className="space-y-8">
        {entries.map((entry) => <article key={entry.url} className="border-b border-[var(--border-subtle)] pb-7">
          <h2 className="text-2xl font-semibold">{entry.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{entry.version} · <time dateTime={entry.date}>{entry.date ? new Date(entry.date).toLocaleDateString("pt-BR") : "Data indisponível"}</time></p>
          <p className="mt-4 whitespace-pre-wrap text-[var(--text-secondary)]">{entry.notes || "Sem notas para esta versão."}</p>
          <a className="mt-3 inline-block text-sm text-[var(--violet-300)] underline" href={entry.url} target="_blank" rel="noreferrer">Ver release no GitHub</a>
        </article>)}
      </div>
    </main>
  );
}
