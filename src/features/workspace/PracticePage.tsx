import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
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
  useLanguageStore((state) => state.language);
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
        if (!found) throw new Error(t("workspace.session_not_found"));
        const [pieces, goals] = await Promise.all([
          listPieces(deps),
          listGoals(deps, { repertoireItemId: found.repertoire_item_id }),
        ]);
        if (!active) return;
        const selectedPiece = pieces.find(
          (item) => item.id === found.repertoire_item_id,
        );
        if (!selectedPiece)
          throw new Error(t("workspace.session_piece_not_found"));
        setSession(found);
        setPiece(selectedPiece);
        setGoal(goals.find((item) => item.id === found.goal_id));
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : t("workspace.load_session_error"),
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
          {t("workspace.back_home")}
        </button>
      </main>
    );
  if (!session || !piece)
    return (
      <main className="p-8 text-[var(--text-secondary)]" aria-busy="true">
        {t("workspace.loading_session")}
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
