import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Check } from "lucide-react";
import { getGoal } from "../../application/goals";
import { listPieces } from "../../application/repertoire";
import { listTakes } from "../../application/recordings";
import { getGoalCompletion, getSession } from "../../application/sessions";
import type { Deps } from "../../application/deps";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { liveActiveMs } from "../../domain/session";
import type { RecordingRow } from "../../infrastructure/db/rows";
import { RecordingItem } from "../workspace/panels/RecordingItem";
import { useLanguageStore } from "../../stores/languageStore";
import { getLanguage, t } from "../../lib/i18n";

const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};
function GoalBadge() { return <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--gold-tint)] px-2.5 text-xs font-medium text-[var(--gold-300)]"><Check size={12} />{t("sessions.goal_completed")}</span>; }

export function SessionDetailPage() {
  useLanguageStore((state) => state.language);
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const audio = useRef(new Audio()).current;
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>>>();
  const [takes, setTakes] = useState<RecordingRow[]>([]);
  const [pieceName, setPieceName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalCompleted, setGoalCompleted] = useState(false);
  const [deps, setDeps] = useState<Deps>();
  const [error, setError] = useState("");
  const [takeError, setTakeError] = useState("");
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (d) => {
      const found = await getSession(d, { id: sessionId });
      if (!found) { if (active) setError(t("sessions.not_found")); return; }
      const [pieces, recordings, goal] = await Promise.all([listPieces(d), listTakes(d, { sessionId }), found.goal_id ? getGoal(d, { id: found.goal_id }) : null]);
      const completed = found.goal_id ? await getGoalCompletion(d, { goalId: found.goal_id }) : false;
      if (active) {
        setDeps(d); setSession(found); setTakes(recordings);
        setPieceName(found.repertoire_item_id === FREE_PRACTICE_PIECE_ID ? t("sessions.free_practice") : pieces.find((piece) => piece.id === found.repertoire_item_id)?.title ?? t("sessions.piece_unavailable"));
        setGoalDescription(goal?.description ?? ""); setGoalCompleted(completed);
      }
    }).catch(() => { if (active) setError(t("sessions.load_detail_error")); });
    return () => { active = false; audio.pause(); };
  }, [sessionId, audio]);

  if (error) return <main className="mx-auto max-w-[1120px] px-8 pt-12"><p role="alert" className="text-[var(--danger)]">{error}</p><button className="mt-4 text-sm text-[var(--text-secondary)]" onClick={() => navigate("/sessions")}>← {t("sessions.title")}</button></main>;
  if (!session || !deps) return <main aria-label={t("sessions.loading_detail")} aria-busy="true" className="mx-auto max-w-[1120px] px-8 pt-12"><div className="cress-skeleton h-12 w-2/3" /><div className="cress-skeleton mt-3 h-5 w-1/3" /><div className="mt-10 grid grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-3"><div className="cress-skeleton h-32" /><div className="cress-skeleton h-32" /><div className="cress-skeleton h-32" /></div></main>;

  const refresh = async () => setTakes(await listTakes(deps, { sessionId }));
  const visibleTakes = takes.filter((take) => take.status !== "RECORDING");
  const recordingInProgress = takes.some((take) => take.status === "RECORDING");
  const delta = session.initial_bpm != null && session.final_bpm != null && session.final_bpm > session.initial_bpm ? session.final_bpm - session.initial_bpm : 0;
  const date = session.startedAt;
  const end = date && session.endedAt ? session.endedAt : date && session.status === "FINISHED" ? new Date(date.getTime() + session.activeMs) : null;
  const dateLabel = date ? date.toLocaleDateString(getLanguage(), { weekday: "long", day: "numeric", month: "long" }) : t("sessions.date_unavailable");
  const timeLabel = date ? `${date.toLocaleTimeString(getLanguage(), { hour: "2-digit", minute: "2-digit" })}${end ? `–${end.toLocaleTimeString(getLanguage(), { hour: "2-digit", minute: "2-digit" })}` : ""}` : "";

  return <main className="mx-auto w-full max-w-[1120px] px-8 pt-12 pb-12 text-[var(--text-primary)]">
    <Link to="/sessions" className="mb-8 inline-block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← {t("sessions.back_to_sessions")}</Link>
    <header className="mb-10">
      <p className="text-xs uppercase tracking-[.08em] text-[var(--text-muted)]">{t("sessions.title_upper")}</p>
      <h1 className="mt-2 font-display text-[44px] leading-[48px] font-medium italic">{pieceName}</h1>
      <p className="mt-2 text-lg text-[var(--text-secondary)]">{dateLabel} · {timeLabel}</p>
    </header>
    <section aria-label={t("sessions.metrics")} className="cress-glass relative mb-10 grid grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-[var(--border-subtle)]">
      {goalCompleted && <div aria-hidden="true" className="cress-hairpin absolute inset-x-0 top-0" style={{ background: "var(--gold-400)" }} />}
      <div className="p-6"><p className="text-xs uppercase tracking-[.08em] text-[var(--text-muted)]">{t("sessions.duration_upper")}</p><p className="mt-2 font-metric text-[36px] leading-tight font-light tabular-nums">{duration(liveActiveMs(session, new Date()))}</p></div>
      <div className="p-6"><p className="text-xs uppercase tracking-[.08em] text-[var(--text-muted)]">BPM</p><p className="mt-2 flex items-baseline gap-2 font-metric text-[36px] leading-tight font-light tabular-nums"><span>{session.initial_bpm ?? "—"}</span><span className="text-[var(--text-subtle)]">→</span><span>{session.final_bpm ?? "—"}</span>{delta > 0 && <span className="text-sm text-[var(--violet-300)]">+{delta}</span>}</p></div>
      <div className="p-6"><p className="text-xs uppercase tracking-[.08em] text-[var(--text-muted)]">{t("sessions.goal_upper")}</p>{goalDescription ? <><p className="mt-2 line-clamp-2 text-base">{goalDescription}</p><p className="mt-2">{goalCompleted ? <GoalBadge /> : <span className="text-xs text-[var(--text-muted)]">{t("sessions.in_progress")}</span>}</p></> : <p className="mt-2 text-xs text-[var(--text-muted)]">{t("sessions.no_goal")}</p>}</div>
    </section>
    {session.notes && <section className="mb-10"><div className="cress-section-head"><h2>{t("sessions.notes")}</h2><div aria-hidden="true" className="cress-hairpin" /></div><p className="max-w-[68ch] whitespace-pre-wrap border-l-2 border-[var(--ink-600)] pl-4 text-base">{session.notes}</p></section>}
    <section aria-labelledby="session-recordings-title"><div className="cress-section-head"><h2 id="session-recordings-title">{t("sessions.recordings", { count: takes.length })}</h2><div aria-hidden="true" className="cress-hairpin" /></div>{takeError && <p role="alert" className="text-[var(--danger)]">{takeError}</p>}{!visibleTakes.length ? <p className="text-sm text-[var(--text-muted)]">{recordingInProgress ? t("sessions.recording_in_progress") : t("sessions.no_recordings")}</p> : <div className="cress-card cress-takes rounded-xl p-2">{visibleTakes.map((take) => <RecordingItem key={take.id} take={take} deps={deps} onChange={() => void refresh()} onError={setTakeError} audio={audio} activeTakeId={activeTakeId} onPlay={(id) => setActiveTakeId(id)} />)}</div>}</section>
  </main>;
}
