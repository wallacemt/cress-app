import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { listPieces } from "../../application/repertoire";
import { listGoals } from "../../application/goals";
import { container } from "../../app/container";
import { makeSessionRepo } from "../../infrastructure/repositories/sessionRepo";
import type { RepertoireItem } from "../../domain/repertoire";
import type { StudyGoal } from "../../domain/goal";
import type { StudySessionRow } from "../../infrastructure/db/rows";
import { Workspace } from "./Workspace";

export function PracticePage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<StudySessionRow | null>(null);
  const [piece, setPiece] = useState<RepertoireItem>();
  const [goal, setGoal] = useState<StudyGoal>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void container
      .getDeps()
      .then(async (deps) => {
        const found = await makeSessionRepo(deps.db).get(sessionId);
        if (!found) throw new Error("Sessão não encontrada.");
        const [pieces, goals] = await Promise.all([
          listPieces(deps),
          listGoals(deps, { repertoireItemId: found.repertoire_item_id }),
        ]);
        if (!active) return;
        const selectedPiece = pieces.find(
          (item) => item.id === found.repertoire_item_id,
        );
        if (!selectedPiece)
          throw new Error("A obra desta sessão não foi encontrada.");
        setSession(found);
        setPiece(selectedPiece);
        setGoal(goals.find((item) => item.id === found.goal_id));
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar a sessão.",
          );
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (error)
    return (
      <main className="p-8 text-[var(--text-primary)]">
        <p role="alert">{error}</p>
        <button className="mt-4" onClick={() => navigate("/")}>
          Voltar ao início
        </button>
      </main>
    );
  if (!session || !piece)
    return (
      <main className="p-8 text-[var(--text-secondary)]" aria-busy="true">
        Carregando sessão…
      </main>
    );
  return (
    <Workspace
      mode="session"
      pieceId={piece.id}
      pieceTitle={piece.title}
      goalSummary={goal?.description}
      session={session}
      onBack={() => navigate("/")}
    />
  );
}
