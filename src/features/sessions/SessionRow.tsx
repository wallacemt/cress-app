import { AudioLines, Check, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";

type Session = {
  id: string;
  startedAt: Date | null;
  activeMs: number;
  repertoire_item_id: string;
  initial_bpm: number | null;
  final_bpm: number | null;
  goalCompleted: boolean;
  goalDescription?: string;
};

const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};

export function SessionRow({ session, pieceName, pieceSubtitle, goalDescription, to }: {
  session: Session;
  pieceName: string;
  pieceSubtitle?: string;
  goalDescription?: string;
  to: string;
}) {
  const free = session.repertoire_item_id === FREE_PRACTICE_PIECE_ID;
  const delta = session.initial_bpm != null && session.final_bpm != null && session.final_bpm > session.initial_bpm
    ? session.final_bpm - session.initial_bpm
    : 0;
  return <Link to={to} className="group relative grid min-h-16 grid-cols-[44px_minmax(0,1fr)_auto_16px] items-center gap-3 rounded-lg px-4 hover:bg-[rgb(255_255_255/.04)] focus-visible:outline-2 focus-visible:outline-[var(--violet-400)] focus-visible:-outline-offset-2 sm:grid-cols-[56px_minmax(0,1fr)_auto_72px_auto_16px] sm:gap-4 sm:px-5">
    {session.goalCompleted && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[var(--gold-400)]" />}
    <time className="font-metric text-[15px] tabular-nums text-[var(--text-secondary)]">{session.startedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "—"}</time>
    <span className="min-w-0">
      <span className={`block truncate text-sm font-medium ${free ? "italic text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>{free && <AudioLines size={14} className="mr-1 inline" />}{free ? "Prática livre" : pieceName}</span>
      <span className="block truncate text-xs text-[var(--text-muted)]">{goalDescription || pieceSubtitle || " "}</span>
    </span>
    <span className="flex items-center gap-1 font-metric text-sm tabular-nums">
      {session.initial_bpm == null && session.final_bpm == null ? <span className="text-[var(--text-subtle)]">—</span> : <><span>{session.initial_bpm ?? "—"}</span><span className="text-[var(--text-subtle)]">→</span><span>{session.final_bpm ?? "—"}</span>{delta > 0 && <span className="ml-1 text-xs text-[var(--violet-300)]">+{delta}</span>}</>}
    </span>
    <span className="hidden text-right font-metric text-sm tabular-nums text-[var(--text-secondary)] sm:block">{duration(session.activeMs)}</span>
    <span className="hidden sm:block">{session.goalCompleted && <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--gold-tint)] px-2.5 text-xs font-medium text-[var(--gold-300)]"><Check size={12} />Objetivo cumprido</span>}</span>
    {session.goalCompleted && <span className="sm:hidden text-[var(--gold-300)]" aria-label="Objetivo cumprido"><Check size={14} /></span>}
    <ChevronRight size={16} className="text-[var(--text-subtle)] transition-transform group-hover:translate-x-0.5" />
  </Link>;
}
