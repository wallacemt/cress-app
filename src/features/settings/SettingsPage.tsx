import { useState, type FormEvent } from "react";
import { Check, RefreshCw, Star } from "lucide-react";
import { saveProfile } from "../../application/profile";
import { container } from "../../app/container";
import {
  INSTRUMENTS,
  MUSICAL_ROLES,
  type InstrumentCode,
  type MusicalRole,
} from "../../domain/profile";
import { useProfileStore } from "../../stores/profileStore";
import { useUpdateCheck } from "../../hooks/useUpdateCheck";
import { Monogram } from "../../components/ui/Monogram";

const levels = [
  ["beginner", "Iniciante"],
  ["intermediate", "Intermediário"],
  ["advanced", "Avançado"],
  ["professional", "Profissional"],
] as const;
const roles: Record<MusicalRole, string> = {
  orchestra: "Músico(a) de orquestra",
  soloist: "Solista",
  chamber: "Camerista",
  student: "Estudante",
  teacher: "Professor(a)",
  amateur: "Amador(a)",
};
const control =
  "rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-tint)]";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-not-allowed disabled:opacity-45";
const chip = (selected: boolean) =>
  `${button} w-full border ${selected ? "border-[var(--violet-400)] bg-[var(--violet-tint)] text-[var(--text-primary)]" : "border-[var(--border-default)] bg-[var(--ink-800)] text-[var(--text-secondary)] hover:bg-[var(--ink-700)]"}`;

export function SettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const update = useUpdateCheck();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [instruments, setInstruments] = useState<InstrumentCode[]>(profile?.instruments ?? []);
  const [primaryInstrument, setPrimaryInstrument] = useState<InstrumentCode | null>(profile?.primaryInstrument ?? null);
  const [otherInstrumentLabel, setOtherInstrumentLabel] = useState(profile?.otherInstrumentLabel ?? "");
  const [experienceLevel, setExperienceLevel] = useState<(typeof levels)[number][0] | undefined>(profile?.experienceLevel);
  const [musicalRoles, setMusicalRoles] = useState<MusicalRole[]>(profile?.musicalRoles ?? []);
  const [ensembleName, setEnsembleName] = useState(profile?.ensembleName ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleInstrument = (code: InstrumentCode) => {
    setInstruments((current) => {
      if (current.includes(code)) {
        const next = current.filter((item) => item !== code);
        setPrimaryInstrument((primary) => primary === code ? (next[0] ?? null) : primary);
        return next;
      }
      if (current.length === 8) return current;
      setPrimaryInstrument((primary) => primary ?? code);
      return [...current, code];
    });
  };
  const toggleRole = (role: MusicalRole) =>
    setMusicalRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!displayName.trim()) return setError("Informe seu nome.");
    if (displayName.trim().length > 60) return setError("Use até 60 caracteres no nome.");
    if (!instruments.length) return setError("Selecione pelo menos um instrumento.");
    if (instruments.includes("other") && !otherInstrumentLabel.trim()) return setError("Informe qual é o instrumento.");
    setSaving(true);
    try {
      const updated = await saveProfile(await container.getDeps(), {
        displayName: displayName.trim(),
        instruments,
        primaryInstrument: primaryInstrument!,
        otherInstrumentLabel: instruments.includes("other") ? otherInstrumentLabel.trim() : null,
        experienceLevel,
        musicalRoles,
        ensembleName: ensembleName.trim() || null,
      });
      useProfileStore.getState().setProfile(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <section className="placeholder"><p role="alert">Perfil indisponível.</p></section>;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 text-[var(--text-primary)]">
      <section aria-labelledby="settings-profile-title">
        <section aria-labelledby="settings-profile-title" className="cress-card relative mb-8 overflow-hidden rounded-2xl p-8">
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(520px 220px at 0% 0%, rgb(124 58 237 / .16), transparent 70%)" }} />
          <div className="cress-hairpin absolute inset-x-0 bottom-0" />
          <div className="relative flex items-center gap-8">
            <Monogram name={displayName || "?"} size="lg" />
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">CONFIGURAÇÕES · PERFIL</p>
              <h1 id="settings-profile-title" className={`font-display text-[44px] leading-[48px] font-semibold ${displayName.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{displayName.trim() || "Seu nome"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
                <Star size={14} className="text-[var(--gold-300)]" fill="currentColor" aria-hidden="true" />
                <span>{primaryInstrument ? INSTRUMENTS[primaryInstrument] === "Outro" && otherInstrumentLabel.trim() ? otherInstrumentLabel.trim() : INSTRUMENTS[primaryInstrument] : "Instrumento principal"}</span>
                <span aria-hidden="true">·</span><span>{levels.find(([value]) => value === experienceLevel)?.[1] ?? "Nível não informado"}</span>
              </div>
              {ensembleName.trim() && <p className="mt-1 text-sm text-[var(--text-muted)]">{ensembleName.trim()}</p>}
              {!!musicalRoles.length && <div className="mt-3 flex flex-wrap gap-2">{musicalRoles.map((role) => <span key={role} className="inline-flex h-6 items-center rounded-full bg-[var(--ink-700)] px-2.5 text-xs text-[var(--text-secondary)]">{roles[role]}</span>)}</div>}
            </div>
          </div>
        </section>
        <form onSubmit={save}>
          <label className="mb-7 block text-sm text-[var(--text-secondary)]">Seu nome
            <input aria-label="Seu nome" className={`${control} mt-2 h-12 w-full`} maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <fieldset className="mb-7">
            <legend className="mb-3 text-sm text-[var(--text-secondary)]">Instrumentos <span className="text-[var(--text-muted)]">(marque a estrela para definir o principal)</span></legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.entries(INSTRUMENTS) as [InstrumentCode, string][]).map(([code, label]) => <div key={code} className="relative">
                <button type="button" aria-pressed={instruments.includes(code)} className={chip(instruments.includes(code))} onClick={() => toggleInstrument(code)}>
                  {instruments.includes(code) && <Check size={15} aria-hidden="true" />} {label}
                </button>
                {instruments.includes(code) && <button type="button" aria-label={`Definir ${label} como principal`} title="Principal" className={`absolute -right-1 -top-2 rounded-full p-1 ${primaryInstrument === code ? "text-[var(--gold-300)]" : "text-[var(--text-muted)]"}`} onClick={() => setPrimaryInstrument(code)}><Star size={16} fill={primaryInstrument === code ? "currentColor" : "none"} /></button>}
              </div>)}
            </div>
            {instruments.includes("other") && <label className="mt-5 block text-sm text-[var(--text-secondary)]">Qual instrumento?
              <input aria-label="Qual instrumento?" className={`${control} mt-2 h-12 w-full`} maxLength={60} value={otherInstrumentLabel} onChange={(event) => setOtherInstrumentLabel(event.target.value)} />
            </label>}
          </fieldset>
          <fieldset className="mb-7">
            <legend className="mb-3 text-sm text-[var(--text-secondary)]">Nível</legend>
            <div className="flex flex-wrap gap-2">
              {levels.map(([value, label]) => <button key={value} type="button" aria-pressed={experienceLevel === value} className={chip(experienceLevel === value)} onClick={() => setExperienceLevel(experienceLevel === value ? undefined : value)}>{label}</button>)}
              <button type="button" aria-pressed={!experienceLevel} className={chip(!experienceLevel)} onClick={() => setExperienceLevel(undefined)}>Prefiro não dizer</button>
            </div>
          </fieldset>
          <fieldset className="mb-7">
            <legend className="mb-3 text-sm text-[var(--text-secondary)]">Papéis</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MUSICAL_ROLES.map((role) => <button key={role} type="button" aria-pressed={musicalRoles.includes(role)} className={chip(musicalRoles.includes(role))} onClick={() => toggleRole(role)}>{roles[role]}</button>)}
            </div>
          </fieldset>
          <label className="mb-7 block text-sm text-[var(--text-secondary)]">Conjunto, orquestra ou escola <span className="text-[var(--text-muted)]">(opcional)</span>
            <input aria-label="Conjunto, orquestra ou escola" className={`${control} mt-2 h-12 w-full`} maxLength={120} value={ensembleName} onChange={(event) => setEnsembleName(event.target.value)} />
          </label>
          {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" disabled={saving} className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{saving ? "Salvando…" : "Salvar perfil"}</button>
        </form>
        <section aria-labelledby="settings-updates-title" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
          <h2 className="mb-4 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">APLICATIVO</h2>
          <h3 id="settings-updates-title" className="mb-2 text-lg font-semibold">Atualizações</h3>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">{update.status === "checking" ? "Verificando…" : update.status === "none" ? "O Cress está atualizado." : update.status === "available" ? "Há uma atualização disponível." : update.status === "error" ? "Não foi possível verificar agora." : "Verifique se há uma nova versão do Cress."}</p>
          <button type="button" disabled={update.status === "checking" || update.installing} onClick={() => void update.check()} className={`${button} gap-2 border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--ink-700)]`}><RefreshCw size={16} />Verificar atualizações</button>
          {update.status === "available" && <button type="button" disabled={update.installing} onClick={() => void update.install()} className={`${button} ml-2 bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{update.installing ? update.progress === null ? "Baixando…" : `Baixando… ${update.progress}%` : "Atualizar agora"}</button>}
        </section>
      </section>
    </main>
  );
}
