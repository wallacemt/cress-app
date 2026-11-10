import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { createGoal, listGoals } from "../../application/goals";
import type { Deps } from "../../application/deps";
import { listPieces } from "../../application/repertoire";
import { startSession } from "../../application/sessions";
import { container } from "../../app/container";
import { makeSessionRepo } from "../../infrastructure/repositories/sessionRepo";
import type { StudyGoal } from "../../domain/goal";
import { FREE_PRACTICE_PIECE_ID, type RepertoireItem } from "../../domain/repertoire";
import { validateBpm } from "../../domain/bpm";
import { GoalSelect } from "./GoalSelect";

export function PracticeSetupPage() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [pieceId, setPieceId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [bpm, setBpm] = useState("80");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void container
      .getDeps()
      .then(listPieces)
      .then((items) => {
        if (!active) return;
        const available = items.filter((piece) => !piece.archived);
        setPieces(available);
        setPieceId(available[0]?.id ?? "");
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o repertório.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!pieceId) {
      setGoals([]);
      setGoalId("");
      return;
    }
    void container
      .getDeps()
      .then((deps) => listGoals(deps, { repertoireItemId: pieceId }))
      .then((items) => {
        if (!active) return;
        setGoals(items.filter((goal) => !goal.completed));
        setGoalId((selected) =>
          items.some((goal) => goal.id === selected && !goal.completed)
            ? selected
            : "",
        );
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os objetivos.");
      });
    return () => {
      active = false;
    };
  }, [pieceId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    let initialBpm: number;
    try {
      initialBpm = validateBpm(Number(bpm));
    } catch {
      setError("Informe um BPM inteiro entre 20 e 300.");
      return;
    }
    if (!pieceId) {
      setError("Cadastre uma obra antes de iniciar a prática.");
      return;
    }
    if (newGoal.trim().length > 120) {
      setError("Use até 120 caracteres no objetivo.");
      return;
    }
    setBusy(true);
    try {
      const deps: Deps = await container.getDeps();
      if ((await makeSessionRepo(deps.db).open()).some((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID)) {
        setError("Finalize ou retome a sessão aberta antes de iniciar outra.");
        return;
      }
      const goal = newGoal.trim()
        ? await createGoal(deps, {
            repertoireItemId: pieceId,
            description: newGoal.trim(),
          })
        : undefined;
      const session = await startSession(deps, {
        repertoireItemId: pieceId,
        goalId: (goal?.id ?? goalId) || undefined,
        initialBpm,
      });
      navigate(`/practice/${session.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível iniciar a sessão.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10 text-[var(--text-primary)]">
      <button
        type="button"
        className="mb-8 text-sm text-[var(--text-secondary)]"
        onClick={() => navigate("/")}
      >
        ← Voltar ao início
      </button>
      <header className="mb-8 border-b border-[var(--border-subtle)] pb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">
          PRÁTICA
        </p>
        <h1 className="font-display text-4xl">Nova sessão</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Escolha uma obra e defina o ponto de partida.
        </p>
      </header>
      <form className="grid gap-6" noValidate onSubmit={submit}>
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          Obra
          <select
            aria-label="Obra"
            className="h-12 rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)]"
            value={pieceId}
            onChange={(event) => setPieceId(event.target.value)}
          >
            <option value="">Selecione uma obra</option>
            {pieces.map((piece) => (
              <option key={piece.id} value={piece.id}>
                {piece.title}
              </option>
            ))}
          </select>
        </label>
        <GoalSelect goals={goals} value={goalId} onChange={(id) => { setGoalId(id); setNewGoal(""); }} />
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          Novo objetivo{" "}
          <span className="text-[var(--text-muted)]">
            (opcional; substitui o existente)
          </span>
          <input
            aria-label="Novo objetivo"
            maxLength={120}
            className="h-12 rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)]"
            value={newGoal}
            onChange={(event) => {
              setNewGoal(event.target.value);
              if (event.target.value) setGoalId("");
            }}
          />
        </label>
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          BPM inicial
          <input
            aria-label="BPM inicial"
            type="number"
            min={20}
            max={300}
            step={1}
            required
            className="h-12 rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)]"
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !pieces.length}
          className="cress-btn-primary min-h-12"
        >
          {busy ? "Iniciando…" : "Iniciar sessão"}
        </button>
      </form>
    </main>
  );
}
