import { useEffect, useState, type FunctionComponent } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { completeGoal, listGoals, reopenGoal } from "../../../application/goals";
import type { StudyGoal } from "../../../domain/goal";
import { setSessionGoal, updateSessionNotes } from "../../../application/sessions";
import type { Deps } from "../../../application/deps";
import type { StudySessionRow } from "../../../infrastructure/db/rows";
import { GoalSelect } from "../GoalSelect";
import { GoalFormDialog } from "../../repertoire/GoalFormDialog";

interface SessionPanelParams {
  session: StudySessionRow;
  pieceId: string;
  deps: Deps;
}

export const SessionPanel: FunctionComponent<IDockviewPanelProps> = ({ params }) => {
  const { session, pieceId, deps } = params as SessionPanelParams;
  const [goal, setGoal] = useState<StudyGoal>();
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [selecting, setSelecting] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void listGoals(deps, { repertoireItemId: pieceId }).then((items) => {
      if (!active) return;
      setGoals(items);
      setGoal(items.find((item) => item.id === session.goal_id));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os objetivos.");
    });
    return () => { active = false; };
  }, [deps, pieceId, session.goal_id]);

  useEffect(() => {
    if (notes === (session.notes ?? "")) return;
    // ponytail: 1 s reduz gravações repetidas enquanto a pessoa digita.
    const timer = setTimeout(() => {
      setSaving(true);
      setSaved(false);
      void updateSessionNotes(deps, { id: session.id, notes }).then(() => {
        setSaved(true);
        setError("");
      }).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar as notas.");
      }).finally(() => setSaving(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [deps, notes, session.id, session.notes]);

  async function chooseGoal(id: string) {
    try {
      const next = id ? goals.find((item) => item.id === id) : undefined;
      await setSessionGoal(deps, { id: session.id, goalId: id || null });
      setGoal(next);
      setSelecting(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível trocar o objetivo.");
    }
  }

  async function saveGoal(saved: StudyGoal) {
    try {
      await setSessionGoal(deps, { id: session.id, goalId: saved.id });
      setGoal(saved);
      setCreatingGoal(false);
      setSelecting(false);
      const items = await listGoals(deps, { repertoireItemId: pieceId });
      setGoals(items);
      setGoal(items.find((item) => item.id === saved.id) ?? saved);
      setError("");
    } catch (cause) {
      setCreatingGoal(false);
      setError(cause instanceof Error ? cause.message : "Não foi possível definir o objetivo.");
    }
  }

  async function toggleComplete() {
    if (!goal) return;
    try {
      if (goal.completed) await reopenGoal(deps, { id: goal.id });
      else await completeGoal(deps, { id: goal.id });
      setGoal({ ...goal, completed: !goal.completed });
      setGoals((items) => items.map((item) => item.id === goal.id ? { ...item, completed: !goal.completed } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o objetivo.");
    }
  }

  return (
    <section className="cress-session-panel" aria-label="Painel da sessão">
      <article className="cress-session-goal">
        <p className="cress-session-eyebrow">OBJETIVO</p>
        {selecting ? <div className="cress-session-goal-select"><GoalSelect label="Escolher objetivo" goals={goals.filter((item) => !item.completed || item.id === goal?.id)} value={goal?.id ?? ""} onChange={(id) => void chooseGoal(id)} /><button type="button" className="cress-session-ghost" onClick={() => setSelecting(false)}>Cancelar</button><button type="button" className="cress-session-secondary" onClick={() => setCreatingGoal(true)}>Novo objetivo</button></div> : goal ? <>
          <p className="cress-session-goal-description">{goal.description}</p>
          <div className="cress-session-chips">
            {goal.targetBpm != null && <span>Alvo ♩ {goal.targetBpm}</span>}
            {goal.startMeasure != null && goal.endMeasure != null && <span>Compassos {goal.startMeasure}–{goal.endMeasure}</span>}
          </div>
          <label className="cress-session-complete"><input type="checkbox" checked={goal.completed} onChange={() => void toggleComplete()} /> Objetivo concluído</label>
          <div className="flex flex-wrap gap-2"><button type="button" className="cress-session-ghost" onClick={() => setSelecting(true)}>Trocar objetivo</button><button type="button" className="cress-session-secondary" onClick={() => setCreatingGoal(true)}>Novo objetivo</button></div>
        </> : <>
          <p>Nenhum objetivo para esta sessão.</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="cress-session-secondary" disabled={!goals.length} onClick={() => setSelecting(true)}>Definir objetivo</button><button type="button" className="cress-session-secondary" onClick={() => setCreatingGoal(true)}>Novo objetivo</button></div>
        </>}
      </article>
      <label className="cress-session-notes-label" htmlFor={`session-notes-${session.id}`}>NOTAS DA SESSÃO</label>
      <textarea id={`session-notes-${session.id}`} className="cress-session-notes" maxLength={2000} placeholder="O que observar hoje? Dedilhados, respirações, trechos difíceis…" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <div className="cress-session-note-footer">
        {error && <span role="alert">{error}</span>}
        <span className="cress-session-save-status" aria-live="polite">{saving ? "Salvando…" : saved ? "Salvo" : ""}</span>
      </div>
      {creatingGoal && <GoalFormDialog repertoireItemId={pieceId} onClose={() => setCreatingGoal(false)} onSaved={(saved) => void saveGoal(saved)} />}
    </section>
  );
};
