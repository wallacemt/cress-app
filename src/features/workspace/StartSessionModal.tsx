import { getLanguage, t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AudioLines, Search } from "lucide-react";
import { container } from "../../app/container";
import { listPieces } from "../../application/repertoire";
import { listSessions, startSession } from "../../application/sessions";
import { listGoals } from "../../application/goals";
import type { StudyGoal } from "../../domain/goal";
import { GoalFormDialog } from "../repertoire/GoalFormDialog";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { normalizeName } from "../../domain/score";
import type { RepertoireItem } from "../../domain/repertoire";

export function StartSessionModal({ onClose }: { onClose: () => void }) {
  useLanguageStore((state) => state.language);
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<RepertoireItem[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [goalId, setGoalId] = useState("");
  const [goalDialog, setGoalDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (deps) => {
      const [allPieces, sessions] = await Promise.all([listPieces(deps), listSessions(deps)]);
      const available = allPieces.filter((piece) => !piece.archived);
      const availableIds = new Set(available.map((piece) => piece.id));
      const recent = [...new Set(sessions.filter((session) => session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID && availableIds.has(session.repertoire_item_id)).map((session) => session.repertoire_item_id))].slice(0, 3);
      if (active) { setPieces(available); setRecentIds(recent); }
    }).catch(() => { if (active) setError(t("workspace.load_repertoire_error")); }).finally(() => { if (active) setLoading(false); });
    searchRef.current?.focus();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    setGoalId("");
    setGoals([]);
    if (selected === "free" || !pieces.some((piece) => piece.id === selected)) return;
    let active = true;
    void container.getDeps().then((deps) => listGoals(deps, { repertoireItemId: selected })).then((items) => {
      if (active) setGoals(items.filter((goal) => !goal.completed));
    }).catch(() => { if (active) setError(t("workspace.load_goals_error")); });
    return () => { active = false; };
  }, [selected, pieces]);
  const needle = normalizeName(query);
  const matches = (piece: RepertoireItem) => !needle || normalizeName(`${piece.title} ${piece.composer ?? ""}`).includes(needle);
  const recent = pieces.filter((piece) => recentIds.includes(piece.id) && matches(piece));
  const repertoire = pieces.filter((piece) => !recentIds.includes(piece.id) && matches(piece)).sort((a, b) => a.title.localeCompare(b.title, getLanguage()));
  const rows = ["free", ...recent.map((piece) => piece.id), ...repertoire.map((piece) => piece.id)];
  async function confirm() {
    if (loading) return;
    if (selected !== "free" && !rows.includes(selected)) { setSelected("free"); return; }
    if (selected === "free") { onClose(); navigate("/tools"); return; }
    const piece = pieces.find((item) => item.id === selected);
    if (!piece) return;
    setError("");
    try {
      const deps = await container.getDeps();
      const session = await startSession(deps, { repertoireItemId: piece.id, ...(goalId ? { goalId } : {}) });
      onClose();
      navigate(`/practice/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error && "code" in cause && cause.code === "SESSION_ALREADY_OPEN" ? t("workspace.open_session_error") : t("workspace.start_session_error"));
    }
  }
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!rows.length) return;
      event.preventDefault();
      const current = rows.indexOf(selected);
      setSelected(rows[(current + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length] ?? "free");
    }
    if (event.key === "Enter") { event.preventDefault(); void confirm(); }
  }
  function pieceButton(piece: RepertoireItem) {
    return <button key={piece.id} type="button" onClick={() => setSelected(piece.id)} className={`relative flex h-14 w-full flex-col justify-center border-b border-[var(--border-subtle)] px-4 pl-6 text-left ${selected === piece.id ? "bg-[var(--ink-600)]" : "hover:bg-[var(--ink-800)]"}`}><span className="truncate">{piece.title}</span><span className="truncate text-xs text-[var(--text-muted)]">{piece.composer || t("search.composer_missing")}</span>{selected === piece.id && <span className="cress-hairpin-v absolute inset-y-0 left-0" />}</button>;
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(5_7_13/.72)] p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
    <section role="dialog" aria-modal="true" aria-labelledby="start-session-title" className="cress-card flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl shadow-2xl">
      <header className="border-b border-[var(--border-subtle)] p-5"><h2 id="start-session-title" className="font-display text-[28px]">{t("workspace.new_session")}</h2><label className="mt-4 flex h-11 items-center gap-3 rounded-lg border border-[var(--border-default)] px-3 text-[var(--text-muted)]"><Search size={17} /><input ref={searchRef} autoFocus aria-label={t("search.title")} placeholder={t("search.title")} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none" /></label></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t("workspace.free_practice")}</p><button type="button" onClick={() => setSelected("free")} className={`relative flex h-14 w-full items-center gap-3 rounded-lg px-4 text-left ${selected === "free" ? "bg-[var(--ink-600)]" : "hover:bg-[var(--ink-800)]"}`}><AudioLines size={19} /><span className="italic">{t("workspace.free_practice")}</span>{selected === "free" && <span className="cress-hairpin-v absolute inset-y-0 left-0" />}</button>
        {recent.length > 0 && <><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t("workspace.recent")}</p>{recent.map(pieceButton)}</>}
        {repertoire.length > 0 && <><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t("repertoire.title")}</p>{repertoire.map(pieceButton)}</>}
        {selected !== "free" && pieces.some((piece) => piece.id === selected) && <section className="mt-4 border-t border-[var(--border-subtle)] px-3 pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t("workspace.study_goal")}</p>{goals.map((goal) => <label key={goal.id} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm"><input type="radio" name="session-goal" checked={goalId === goal.id} onChange={() => setGoalId(goal.id)} />{goal.description}</label>)}<button type="button" className="mt-2 text-sm text-[var(--violet-300)]" onClick={() => setGoalDialog(true)}>{`+ ${t("workspace.new_goal")}`}</button></section>}
        {!loading && !error && !recent.length && !repertoire.length && <p className="p-4 text-sm text-[var(--text-muted)]">{t("search.empty")} <a className="text-[var(--violet-300)]" href="/repertoire" onClick={(event) => { event.preventDefault(); onClose(); navigate("/repertoire"); }}>{t("workspace.go_to_repertoire")}</a></p>}
        {loading && <p role="status" className="p-4 text-sm text-[var(--text-muted)]">{t("search.loading")}</p>}
        {error && <p role="alert" className="p-3 text-sm text-[var(--danger)]">{error}</p>}
      </div>
      <footer className="flex justify-end border-t border-[var(--border-subtle)] p-4"><button type="button" className="cress-btn-primary" disabled={loading || (selected !== "free" && !pieces.some((piece) => piece.id === selected))} onClick={() => void confirm()}>{t("workspace.start_study")}</button></footer>
    </section>
    {goalDialog && <GoalFormDialog repertoireItemId={selected} onClose={() => setGoalDialog(false)} onSaved={(goal) => { setGoals((items) => [...items, goal]); setGoalId(goal.id); setGoalDialog(false); }} />}
  </div>;
}
