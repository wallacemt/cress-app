import { useEffect, useState, type FormEvent } from "react";
import { Check, Edit2, RefreshCw, Star } from "lucide-react";
import { saveProfile } from "../../application/profile";
import { container } from "../../app/container";
import {
  INSTRUMENTS,
  MUSICAL_ROLES,
  type InstrumentCode,
  type MusicalRole,
} from "../../domain/profile";
import { useProfileStore } from "../../stores/profileStore";
import { useLanguageStore } from "../../stores/languageStore";
import { useUpdateCheck } from "../../hooks/useUpdateCheck";
import { Monogram } from "../../components/ui/Monogram";
import { LANGUAGES, t, type LanguageCode } from "../../lib/i18n";

const levels = [
  ["beginner", "level.beginner"],
  ["intermediate", "level.intermediate"],
  ["advanced", "level.advanced"],
  ["professional", "level.professional"],
] as const;
const roles: Record<MusicalRole, string> = {
  orchestra: "role.orchestra",
  soloist: "role.soloist",
  chamber: "role.chamber",
  student: "role.student",
  teacher: "role.teacher",
  amateur: "role.amateur",
};
const control =
  "rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-tint)]";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-not-allowed disabled:opacity-45";
const chip = (selected: boolean) =>
  `${button} w-full border ${selected ? "border-[var(--violet-400)] bg-[var(--violet-tint)] text-[var(--text-primary)]" : "border-[var(--border-default)] bg-[var(--ink-800)] text-[var(--text-secondary)] hover:bg-[var(--ink-700)]"}`;

function labelFor(code: InstrumentCode, otherLabel: string | null) {
  if (INSTRUMENTS[code] === "Outro") return otherLabel?.trim() || t("profile.outro");
  return INSTRUMENTS[code];
}

export function SettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const update = useUpdateCheck();
  const [edit, setEdit] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [instruments, setInstruments] = useState<InstrumentCode[]>(profile?.instruments ?? []);
  const [primaryInstrument, setPrimaryInstrument] = useState<InstrumentCode | null>(profile?.primaryInstrument ?? null);
  const [otherInstrumentLabel, setOtherInstrumentLabel] = useState(profile?.otherInstrumentLabel ?? "");
  const [experienceLevel, setExperienceLevel] = useState<(typeof levels)[number][0] | undefined>(profile?.experienceLevel);
  const [musicalRoles, setMusicalRoles] = useState<MusicalRole[]>(profile?.musicalRoles ?? []);
  const [ensembleName, setEnsembleName] = useState(profile?.ensembleName ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    container.getDeps().then((deps) => {
      useLanguageStore.getState().loadLanguage(deps.db);
    });
  }, []);

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
    if (!displayName.trim()) return setError(t("settings.erro_nome"));
    if (displayName.trim().length > 60) return setError(t("settings.erro_nome_tamanho"));
    if (!instruments.length) return setError(t("settings.erro_instrumento"));
    if (instruments.includes("other") && !otherInstrumentLabel.trim()) return setError(t("settings.erro_outro"));
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
      setEdit(false);
    } catch {
      setError(t("settings.erro_salvar"));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <section className="placeholder"><p role="alert">{t("settings.perfil_indisponivel")}</p></section>;

  const currentLevel =
    levels.find(([value]) => value === experienceLevel)?.[1] ??
    t("profile.nivel_nao_informado");
  const currentRoles = roles;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 text-[var(--text-primary)]">
      <section aria-labelledby="settings-profile-title">
        {/* Cabeçalho do perfil: visualização por padrão */}
        <section aria-labelledby="settings-profile-title" className={`cress-card relative mb-8 overflow-hidden rounded-2xl p-8 ${edit ? "pointer-events-none opacity-40" : ""}`}>
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(520px 220px at 0% 0%, rgb(124 58 237 / .16), transparent 70%)" }} />
          <div className="cress-hairpin absolute inset-x-0 bottom-0" />
          <div className="relative flex items-center gap-8">
            <Monogram name={displayName || "?"} size="lg" />
            <div className="min-w-0 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">{t("settings.titulo")}</p>
                <h1 id="settings-profile-title" className={`font-display text-[44px] leading-[48px] font-semibold ${displayName.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{displayName.trim() || t("profile.nome")}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
                  <Star size={14} className="text-[var(--gold-300)]" fill="currentColor" aria-hidden="true" />
                  <span>{primaryInstrument ? labelFor(primaryInstrument, otherInstrumentLabel) : t("settings.instrumento_principal")}</span>
                  <span aria-hidden="true">·</span><span>{t(currentLevel)}</span>
                </div>
                {ensembleName.trim() && <p className="mt-1 text-sm text-[var(--text-muted)]">{ensembleName.trim()}</p>}
                {!!musicalRoles.length && <div className="mt-3 flex flex-wrap gap-2">{musicalRoles.map((role) => <span key={role} className="inline-flex h-6 items-center rounded-full bg-[var(--ink-700)] px-2.5 text-xs text-[var(--text-secondary)]">{t(currentRoles[role])}</span>)}</div>}
              </div>
              <button
                type="button"
                onClick={() => setEdit(true)}
                aria-label={t("profile.editar")}
                className={`p-2 rounded-lg hover:bg-[var(--ink-700)] transition-colors ${edit ? "hidden" : ""}`}
              >
                <Edit2 size={18} strokeWidth={1.5} />
                <span className="sr-only">{t("profile.editar")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Idioma (só configurado na visualização; seletor só no modo edição) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">{t("profile.idioma")}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t("profile.idioma_desc")}</p>
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {LANGUAGES[language].native}
            </span>
          </div>
        </section>

        {edit && (
          <form onSubmit={save}>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("profile.idioma")}</legend>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">{t("profile.idioma_desc")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(LANGUAGES).map(([code, info]) => {
                  const selected = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={selected}
                      className={chip(selected)}
                      onClick={() => {
                        void container.getDeps().then((deps) =>
                          setLanguage(code as LanguageCode, deps.db),
                        );
                      }}
                    >
                      {info.native}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.seu_nome")}</legend>
              <input aria-label={t("settings.seu_nome")} className={`${control} mt-2 h-12 w-full`} maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </fieldset>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.instrumentos")} <span className="text-[var(--text-muted)]">{t("settings.instrumentos_ajuda")}</span></legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.entries(INSTRUMENTS) as [InstrumentCode, string][]).map(([code, label]) => <div key={code} className="relative">
                  <button type="button" aria-pressed={instruments.includes(code)} className={chip(instruments.includes(code))} onClick={() => toggleInstrument(code)}>
                    {instruments.includes(code) && <Check size={15} aria-hidden="true" />} {label}
                  </button>
                  {instruments.includes(code) && <button type="button" aria-label={t("settings.instrumento_principal")} title={t("settings.instrumento_principal")} className={`absolute -right-1 -top-2 rounded-full p-1 ${primaryInstrument === code ? "text-[var(--gold-300)]" : "text-[var(--text-muted)]"}`} onClick={() => setPrimaryInstrument(code)}><Star size={16} fill={primaryInstrument === code ? "currentColor" : "none"} /></button>}
                </div>)}
              </div>
              {instruments.includes("other") && <label className="mt-5 block text-sm text-[var(--text-secondary)]">{t("settings.qual_instrumento")}
                <input aria-label={t("settings.qual_instrumento")} className={`${control} mt-2 h-12 w-full`} maxLength={60} value={otherInstrumentLabel} onChange={(event) => setOtherInstrumentLabel(event.target.value)} />
              </label>}
            </fieldset>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.nivel")}</legend>
              <div className="flex flex-wrap gap-2">
                {levels.map(([value, key]) => <button key={value} type="button" aria-pressed={experienceLevel === value} className={chip(experienceLevel === value)} onClick={() => setExperienceLevel(experienceLevel === value ? undefined : value)}>{t(key)}</button>)}
                <button type="button" aria-pressed={!experienceLevel} className={chip(!experienceLevel)} onClick={() => setExperienceLevel(undefined)}>{t("profile.prefiro_nao_dizer")}</button>
              </div>
            </fieldset>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.papeis")}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MUSICAL_ROLES.map((role) => <button key={role} type="button" aria-pressed={musicalRoles.includes(role)} className={chip(musicalRoles.includes(role))} onClick={() => toggleRole(role)}>{t(currentRoles[role])}</button>)}
              </div>
            </fieldset>
            <label className="mb-7 block text-sm text-[var(--text-secondary)]">{t("settings.conjunto")} <span className="text-[var(--text-muted)]">{t("settings.conjunto_ajuda")}</span>
              <input aria-label={t("settings.conjunto")} className={`${control} mt-2 h-12 w-full`} maxLength={120} value={ensembleName} onChange={(event) => setEnsembleName(event.target.value)} />
            </label>
            {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={saving} className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{saving ? t("settings.salvando") : t("profile.salvar_alteracoes")}</button>
            <button type="button" onClick={() => setEdit(false)} className={`ml-2 ${button} border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--ink-700)]`}>{t("common.cancelar")}</button>
          </form>
        )}
      </section>
      <section aria-labelledby="settings-updates-title" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">{t("app.atualizacoes")}</h2>
        <h3 id="settings-updates-title" className="mb-2 text-lg font-semibold">{t("app.atualizacoes")}</h3>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{update.status === "checking" ? t("app.verificando") : update.status === "none" ? t("app.atualizado") : update.status === "available" ? t("app.disponivel") : update.status === "error" ? t("app.erro_verificar") : t("app.erro_verificar")}</p>
        <button type="button" disabled={update.status === "checking" || update.installing} onClick={() => void update.check()} className={`${button} gap-2 border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--ink-700)]`}><RefreshCw size={16} />{t("app.verificar_atualizacoes")}</button>
        {update.status === "available" && <button type="button" disabled={update.installing} onClick={() => void update.install()} className={`${button} ml-2 bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{update.installing ? update.progress === null ? t("app.baixando") : `Baixando… ${update.progress}%` : t("app.atualizar_agora")}</button>}
      </section>
    </main>
  );
}
