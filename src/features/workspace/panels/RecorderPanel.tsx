import { useCallback, useEffect, useState, type FunctionComponent } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { listTakes, pauseTake, resumeTake, startTake, stopTake } from "../../../application/recordings";
import type { Deps } from "../../../application/deps";
import type { RecordingRow, StudySessionRow } from "../../../infrastructure/db/rows";
import { RecordingItem } from "./RecordingItem";

interface RecorderPanelParams { session: StudySessionRow; pieceId: string; deps: Deps }

export const RecorderPanel: FunctionComponent<IDockviewPanelProps> = ({ params }) => {
  const { session, deps } = params as RecorderPanelParams;
  const [takes, setTakes] = useState<RecordingRow[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const activeTake = takes.find((take) => take.status === "RECORDING");
  const refresh = useCallback(async () => setTakes(await listTakes(deps, { sessionId: session.id })), [deps, session.id]);
  const reportError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    let alive = true;
    void listTakes(deps, { sessionId: session.id }).then((items) => { if (alive) setTakes(items); }).catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as gravações.");
    });
    return () => { alive = false; };
  }, [deps, session.id]);

  useEffect(() => {
    if (!activeTake) { setElapsed(0); return; }
    const startedAt = activeTake.created_at;
    const update = () => setElapsed(Math.max(0, Date.now() - startedAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeTake]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); setError(""); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a gravação."); }
    finally { setBusy(false); }
  }

  const elapsedLabel = `${String(Math.floor(elapsed / 60000)).padStart(2, "0")}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}`;
  return (
    <section className="cress-session-panel cress-recorder-panel" aria-label="Painel de gravações">
      <header className="cress-recorder-header"><div><p className="cress-session-eyebrow">GRAVAÇÕES DA SESSÃO</p><h2>Recorder</h2></div>
        {activeTake && <span className="cress-recorder-live"><i aria-hidden="true" /> Gravando · {elapsedLabel}</span>}
      </header>
      <div className="cress-recorder-controls">
        <input aria-label="Título da gravação" placeholder="Título do take" value={title} onChange={(event) => setTitle(event.target.value)} />
        {!activeTake ? <button type="button" className="cress-session-secondary" disabled={busy || session.status !== "ACTIVE"} onClick={() => void run(() => startTake(deps, { sessionId: session.id, title: title.trim() || `Take — ${new Date().toLocaleString("pt-BR", { hour12: false })}` }))}>Iniciar gravação</button> : <>
          <button type="button" className="cress-session-secondary" disabled={busy} onClick={() => void run(pauseTake.bind(null, deps))}>Pausar</button>
          <button type="button" className="cress-session-ghost" disabled={busy} onClick={() => void run(resumeTake.bind(null, deps))}>Retomar</button>
          <button type="button" className="cress-session-ghost" disabled={busy} onClick={() => void run(stopTake.bind(null, deps))}>Finalizar</button>
        </>}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="cress-recorder-list">{takes.length ? takes.map((take) => <RecordingItem key={take.id} take={take} deps={deps} onChange={() => void refresh()} onError={reportError} />) : <p className="cress-recorder-empty">Nenhum take nesta sessão ainda.</p>}</div>
    </section>
  );
};
