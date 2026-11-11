import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Gauge, Plus, Timer } from "lucide-react";
import { getDashboard, getMonthActivity } from "../../application/dashboard";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { INSTRUMENTS } from "../../domain/profile";
import { liveActiveMs } from "../../domain/session";
import { Sparkline } from "../../components/ui/Sparkline";
import { StartSessionModal } from "../workspace/StartSessionModal";
import { SessionRow } from "../sessions/SessionRow";

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};
const pieceName = (id: string, pieces: Dashboard["pieces"]) => id === FREE_PRACTICE_PIECE_ID ? "Prática livre" : pieces.find((piece) => piece.id === id)?.title ?? "Obra indisponível";
const timeLabel = (date: Date | null) => {
  if (!date) return "Data indisponível";
  const today = new Date();
  const yesterday = new Date(today);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (day.getTime() === today.getTime()) return `Hoje, ${time}`;
  if (day.getTime() === yesterday.getTime()) return `Ontem, ${time}`;
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${weekday.charAt(0).toLocaleUpperCase("pt-BR")}${weekday.slice(1)}, ${time}`;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activityView, setActivityView] = useState<"week" | "month">("week");
  const [monthDays, setMonthDays] = useState<Awaited<ReturnType<typeof getMonthActivity>>>();
  useEffect(() => {
    let active = true;
    void container.getDeps().then(getDashboard).then((data) => { if (active) setDashboard(data); }).catch(() => { if (active) setError("Não foi possível carregar o painel."); });
    return () => { active = false; };
  }, []);

  if (error) return <main className="mx-auto max-w-5xl px-6 py-10"><p role="alert" className="text-[var(--danger)]">{error}</p></main>;
  if (!dashboard) return <main aria-label="Carregando painel" aria-busy="true" className="mx-auto w-full max-w-[1120px] px-8 pt-12 pb-12"><div className="cress-skeleton mb-8 h-24 rounded-xl" /><div className="cress-skeleton mb-12 h-80 rounded-2xl" /><div className="grid grid-cols-1 gap-6 md:grid-cols-12"><div className="cress-skeleton h-56 rounded-xl md:col-span-7" /><div className="cress-skeleton h-56 rounded-xl md:col-span-5" /></div></main>;

  const open = dashboard.openSession;
  const latest = dashboard.latestPieceSession;
  const today = new Date();
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const greeting = today.getHours() < 12 ? "Bom dia" : today.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const maxDay = Math.max(...dashboard.days.map((day) => day.activeMs), 1);
  const activityDays = activityView === "month" ? monthDays ?? [] : dashboard.days;
  const maxActivity = Math.max(...activityDays.map((day) => day.activeMs), 1);
  const monthOffset = activityView === "month" && monthDays?.[0] ? (new Date(monthDays[0].date.getFullYear(), monthDays[0].date.getMonth(), 1).getDay() + 6) % 7 : 0;
  const goal = dashboard.recentPiece?.goal;
  const lastBpm = dashboard.pieceSessions.find((session) => session.repertoire_item_id === latest?.repertoire_item_id && session.final_bpm != null)?.final_bpm ?? null;
  const bpmValues = dashboard.pieceSessions.filter((session) => session.repertoire_item_id === latest?.repertoire_item_id && session.final_bpm != null).slice(0, 20).map((session) => session.final_bpm!).reverse();
  const activeDays = dashboard.days.filter((day) => day.activeMs > 0).length;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today);

  return <main className="mx-auto w-full max-w-[1120px] px-8 pt-12 pb-12 text-[var(--text-primary)]">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--text-muted)]">{dateLabel}</p>
        <h1 className="mt-2 font-display text-[56px] leading-[60px] font-medium italic">{greeting}, {dashboard.displayName}.</h1>
        <p className="mt-2 text-lg text-[var(--text-secondary)]"><span className="font-metric tabular-nums text-[var(--text-primary)]">{duration(dashboard.weekActiveMs)}</span> nesta semana · <span className="font-metric tabular-nums text-[var(--text-primary)]">{activeDays} de 7</span> dias com prática</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={dashboard.recentPiece && !open ? "cress-btn-glass" : "cress-btn-primary"} disabled={!!open} title={open ? "Finalize ou retome a sessão em andamento antes de iniciar outra." : undefined} onClick={() => setModalOpen(true)}><Plus size={16} className="mr-2 inline" />Nova sessão</button>
        <kbd className="text-xs text-[var(--text-subtle)]">Ctrl N</kbd>
      </div>
    </header>
    {modalOpen && <StartSessionModal onClose={() => setModalOpen(false)} />}
    {open && <section aria-label="Sessão aberta" className="cress-glass mb-8 flex h-14 items-center gap-4 rounded-xl px-5">
      <span aria-hidden="true" className="cress-hairpin-v h-6 shrink-0" />
      <p className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">Sessão em andamento · <strong className="font-medium text-[var(--text-primary)]">{pieceName(open.repertoire_item_id, dashboard.pieces)}</strong> · <span className="font-metric tabular-nums">{duration(liveActiveMs(open, new Date()))}</span> · {open.status === "ACTIVE" ? "ativa" : "pausada"}</p>
      <button className="cress-btn-primary shrink-0" onClick={() => navigate(`/practice/${open.id}`)}>Retomar sessão</button>
    </section>}

    <section className="cress-glass relative mb-12 overflow-hidden rounded-2xl">
      <div aria-hidden="true" className="cress-hairpin absolute inset-x-0 top-0" />
      {dashboard.recentPiece ? <>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(560px 260px at 0% 0%, rgb(124 58 237 / .20), transparent 70%)" }} />
        <div className="relative grid grid-cols-1 gap-8 p-8 lg:grid-cols-[7fr_5fr] lg:gap-12">
          <div className="flex min-w-0 flex-col">
            <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--violet-300)]">Continuar estudo</p>
            <h2 className="mt-3 line-clamp-2 font-display text-[44px] leading-[48px] font-medium italic">{dashboard.recentPiece.title}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{dashboard.recentPiece.composer || "Compositor não informado"} · {dashboard.recentPiece.instrument && dashboard.recentPiece.instrument in INSTRUMENTS ? INSTRUMENTS[dashboard.recentPiece.instrument as keyof typeof INSTRUMENTS] : "Instrumento não informado"}</p>
            {goal && <div className="mt-6">
              <p className="text-lg text-[var(--text-primary)]">{goal.description}</p>
              {goal.targetBpm != null && <div className="mt-3 flex items-center gap-4">
                <div className="h-1.5 flex-1 rounded-full bg-[var(--ink-600)]" role="progressbar" aria-valuenow={lastBpm ?? 0} aria-valuemax={goal.targetBpm} aria-valuetext={`${lastBpm ?? 0} de ${goal.targetBpm} BPM`} aria-label="Progresso do objetivo de BPM">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((lastBpm ?? 0) / goal.targetBpm) * 100)}%`, background: lastBpm != null && lastBpm >= goal.targetBpm ? "var(--gold-400)" : "var(--gradient-hairpin)", clipPath: "polygon(0 35%,100% 0,100% 100%,0 65%)", boxShadow: lastBpm != null && lastBpm >= goal.targetBpm ? "0 0 24px rgb(232 180 92 / .35)" : undefined }} />
                </div>
                <span className={`shrink-0 font-metric text-sm tabular-nums ${lastBpm != null && lastBpm >= goal.targetBpm ? "text-[var(--gold-300)]" : "text-[var(--text-secondary)]"}`}>♩ {lastBpm ?? "—"} / {goal.targetBpm}</span>
              </div>}
              {goal.startMeasure != null && goal.endMeasure != null && <p className="mt-2 text-xs text-[var(--text-muted)]">Compassos {goal.startMeasure}–{goal.endMeasure}</p>}
            </div>}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
              <div className="flex flex-wrap items-center gap-3"><button className={open ? "cress-btn-glass" : "cress-btn-primary"} onClick={() => navigate(open ? `/practice/${open.id}` : `/practice/new?pieceId=${encodeURIComponent(dashboard.recentPiece!.id)}`)}>{open ? "Retomar sessão" : "Continuar estudo"}</button><Link className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to={`/repertoire/${dashboard.recentPiece.id}`}>Ver obra</Link></div>
              <p className="text-xs text-[var(--text-muted)]">Última sessão · {timeLabel(latest?.startedAt ?? null)} · {duration(latest ? liveActiveMs(latest, new Date()) : 0)}</p>
            </div>
          </div>
          <div className="min-w-0 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--text-muted)]">Último BPM</p>
            <div className="mt-3 flex items-baseline gap-2"><span className="font-metric text-[56px] leading-[56px] font-light tabular-nums">{lastBpm ?? "—"}</span><span className="text-sm text-[var(--text-secondary)]">BPM</span></div>
            <div className="mt-5"><Sparkline values={bpmValues} width={340} height={96} target={goal?.targetBpm ?? undefined} ariaLabel="Histórico de BPM da obra" /></div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">últimas {bpmValues.length} sessões</p>
          </div>
        </div>
      </> : <div className="relative overflow-hidden p-8">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[.05]" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 20H100 M0 35H100 M0 50H100 M0 65H100 M0 80H100" stroke="currentColor" strokeWidth=".5" /></svg>
        <div className="relative"><p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--violet-300)]">Continuar estudo</p><h2 className="mt-3 font-display text-[44px] leading-[48px] italic">Sua estante está pronta.</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Comece uma sessão para ver seu repertório recente aqui.</p><button className="cress-btn-primary mt-6" onClick={() => setModalOpen(true)}>Nova sessão</button></div>
      </div>}
    </section>

    <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-12">
      <section className="cress-card rounded-xl p-6 md:col-span-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--text-muted)]">Esta semana</p><h2 className="mt-3 font-metric text-[36px] leading-tight font-light tabular-nums">{duration(dashboard.weekActiveMs)}</h2></div><div role="group" aria-label="Período de atividade" className="flex rounded-lg bg-[var(--ink-800)] p-1 text-xs"><button type="button" aria-pressed={activityView === "week"} className={`rounded-md px-3 py-1.5 ${activityView === "week" ? "bg-[var(--ink-600)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`} onClick={() => setActivityView("week")}>Semana</button><button type="button" aria-pressed={activityView === "month"} className={`rounded-md px-3 py-1.5 ${activityView === "month" ? "bg-[var(--ink-600)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`} onClick={() => {
          setActivityView("month");
          if (!monthDays) void container.getDeps().then((deps) => getMonthActivity(deps, today.getFullYear(), today.getMonth())).then(setMonthDays).catch(() => setError("Não foi possível carregar a atividade do mês."));
        }}>Mês</button></div></div>
        {activityView === "week" ? <ul className="mt-5 grid grid-cols-7 gap-2 text-center">{dashboard.days.map((day) => { const isToday = day.date.toISOString() === todayKey; return <li key={day.date.toISOString()} title={`${day.date.toLocaleDateString("pt-BR", { weekday: "long" })}, ${duration(day.activeMs)}`} aria-label={`${day.date.toLocaleDateString("pt-BR", { weekday: "long" })}, ${duration(day.activeMs)}`} className="flex flex-col items-center"><span className="flex h-24 items-end"><span className={day.activeMs ? "w-2.5 rounded-full" : "mb-0.5 h-1 w-1 rounded-full bg-[var(--ink-700)]"} style={day.activeMs ? { height: `${Math.max(4, (day.activeMs / maxDay) * 96)}px`, background: isToday ? "linear-gradient(180deg, var(--violet-400), var(--blue-400))" : "var(--ink-600)" } : undefined} /></span><span className={`mt-2 text-xs ${isToday ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{day.date.toLocaleDateString("pt-BR", { weekday: "narrow" })}</span></li>; })}</ul> : <div className="mt-5">{monthDays ? <><div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--text-muted)]">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => <span key={label}>{label}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{Array.from({ length: monthOffset }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}{activityDays.map((day) => { const intensity = day.activeMs ? Math.max(.12, day.activeMs / maxActivity) : 0; const label = `${day.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}, ${duration(day.activeMs)}`; return <span key={day.date.toISOString()} title={label} aria-label={label} className="flex aspect-square items-center justify-center rounded-md text-xs" style={{ background: intensity ? `rgb(167 139 250 / ${intensity * .55})` : "var(--ink-800)", color: intensity ? "var(--text-primary)" : "var(--text-muted)" }}>{day.date.getDate()}</span>; })}</div></> : <p role="status" className="py-8 text-center text-sm text-[var(--text-muted)]">Carregando atividade do mês…</p>}</div>}
      </section>
      <section className="cress-card flex flex-col rounded-xl p-6 md:col-span-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink-700)] text-[var(--violet-300)]"><span className="flex gap-1.5"><Gauge size={18} strokeWidth={1.5} /><Timer size={18} strokeWidth={1.5} /></span></div><h2 className="mt-4 font-display text-[28px] font-semibold">Prática livre</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Metrônomo e afinador lado a lado, sem abrir sessão.</p><Link className="mt-auto inline-flex h-9 items-center self-start rounded-lg border border-[var(--border-default)] px-4 text-sm hover:bg-[var(--ink-700)]" to="/tools">Abrir ferramentas</Link>
      </section>
    </div>

    <section>
      <div className="cress-section-head"><h2>Últimas sessões</h2><div aria-hidden="true" className="cress-hairpin" /><Link className="shrink-0 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to="/sessions">Ver todas →</Link></div>
      <div className="cress-card rounded-xl">
        {dashboard.recentSessions.length ? <ul className="divide-y divide-[var(--border-subtle)]">{dashboard.recentSessions.map((session) => <li key={session.id}><SessionRow session={session} pieceName={pieceName(session.repertoire_item_id, dashboard.pieces)} to={`/sessions/${session.id}`} /></li>)}</ul> : <p className="p-5 text-sm text-[var(--text-muted)]">Nenhuma sessão registrada ainda.</p>}
      </div>
    </section>
  </main>;
}
