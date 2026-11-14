import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Check, Star } from "lucide-react";
import cressSymbol from "../../assets/brand/cress-symbol-gold.svg";
import cressStacked from "../../assets/brand/cress-stacked-gold.svg";
import { completeOnboarding } from "../../application/profile";
import { container } from "../../app/container";
import {
  INSTRUMENTS,
  MUSICAL_ROLES,
  type InstrumentCode,
  type MusicalRole,
} from "../../domain/profile";
import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";

const levels = [
  ["beginner", "level.beginner"],
  ["intermediate", "level.intermediate"],
  ["advanced", "level.advanced"],
  ["professional", "level.professional"],
] as const;
const roleKeys: Record<MusicalRole, string> = {
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
  "inline-flex min-h-11 items-center justify-center rounded-lg px-5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-not-allowed disabled:opacity-45";
const chip = (selected: boolean) =>
  `${button} w-full border ${selected ? "border-[var(--violet-400)] bg-[var(--violet-tint)] text-[var(--text-primary)]" : "border-[var(--border-default)] bg-[var(--ink-800)] text-[var(--text-secondary)] hover:bg-[var(--ink-700)]"}`;

export function OnboardingPage() {
  const navigate = useNavigate();
  useLanguageStore((state) => state.language);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [instruments, setInstruments] = useState<InstrumentCode[]>([]);
  const [primaryInstrument, setPrimaryInstrument] =
    useState<InstrumentCode | null>(null);
  const [otherInstrumentLabel, setOtherInstrumentLabel] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<
    (typeof levels)[number][0] | undefined
  >();
  const [musicalRoles, setMusicalRoles] = useState<MusicalRole[]>([]);
  const [ensembleName, setEnsembleName] = useState("");
  const [a4, setA4] = useState("440");
  const [noteNaming, setNoteNaming] = useState<"letter" | "solfege">("letter");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);

  const advance = (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    if (step === 2) {
      if (!displayName.trim()) return invalid(t("settings.erro_nome"));
      if (displayName.trim().length > 60)
        return invalid(t("onboarding.erro_nome_tamanho"));
    }
    if (step === 3) {
      if (!instruments.length) return invalid(t("settings.erro_instrumento"));
      if (instruments.length > 8) return invalid(t("onboarding.erro_instrumento_max"));
      if (instruments.includes("other") && !otherInstrumentLabel.trim())
        return invalid(t("settings.erro_outro"));
    }
    if (step === 5 && (!Number.isInteger(Number(a4)) || Number(a4) < 415 || Number(a4) > 466))
      return invalid(t("onboarding.erro_afinacao"));
    setStep((current) => Math.min(current + 1, 6));
  };

  const invalid = (message: string) => {
    setError(message);
    requestAnimationFrame(() => (focusRef.current ?? fieldRef.current)?.focus());
  };

  const toggleInstrument = (code: InstrumentCode) => {
    setInstruments((current) => {
      if (current.includes(code)) {
        const next = current.filter((item) => item !== code);
        setPrimaryInstrument((primary) =>
          primary === code ? (next[0] ?? null) : primary,
        );
        return next;
      }
      if (current.length === 8) return current;
      setPrimaryInstrument((primary) => primary ?? code);
      return [...current, code];
    });
  };

  const toggleRole = (role: MusicalRole) =>
    setMusicalRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      await completeOnboarding(await container.getDeps(), {
        displayName: displayName.trim(),
        instruments,
        primaryInstrument: primaryInstrument!,
        otherInstrumentLabel: instruments.includes("other")
          ? otherInstrumentLabel.trim()
          : null,
        experienceLevel,
        musicalRoles,
        ensembleName: ensembleName.trim() || null,
        a4: Number(a4),
        noteNaming,
      });
      navigate("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("onboarding.erro_concluir"));
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    [t("onboarding.resumo_nome"), displayName.trim(), 2],
    [
      t("onboarding.resumo_instrumentos"),
      instruments
        .map((code) => `${code === primaryInstrument ? `${t("onboarding.principal_prefixo")} ` : ""}${INSTRUMENTS[code]}${code === "other" ? ` (${otherInstrumentLabel.trim()})` : ""}`)
        .join(", "),
      3,
    ],
    [t("settings.papeis"), musicalRoles.map((role) => t(roleKeys[role])).join(", ") || "—", 4],
    [t("onboarding.resumo_conjunto"), ensembleName.trim() || "—", 4],
    ["A4", `${a4} Hz`, 5],
    [t("onboarding.resumo_nomenclatura"), noteNaming === "letter" ? "C D E" : "Dó Ré Mi", 5],
  ] as const;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ink-900)] px-8 py-10">
      <section className="w-full max-w-[560px]" aria-label={t("onboarding.aria_label")}>
        <div className="mb-12 flex items-center justify-between gap-8">
          <img src={cressSymbol} alt="Cress" className="h-8 w-8" />
          <div className="text-right">
            <div className="mb-2 flex justify-end gap-1" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} style={{ height: index + 1 }} className={`w-10 rounded-full ${index < step ? "bg-[image:var(--gradient-hairpin)]" : "bg-[var(--ink-600)]"}`} />
              ))}
            </div>
            <p aria-live="polite" className="text-xs text-[var(--text-muted)]">{t("onboarding.passo", { step })}</p>
          </div>
        </div>

        <form onSubmit={advance}>
          {step === 1 && <div className="py-8">
            <img src={cressStacked} alt="Cress" className="mb-8 h-32" />
            <p className="mb-5 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">PRACTICE. MEASURE. CRESCENDO.</p>
            <h1 className="mb-6 font-display text-[72px] leading-[76px] font-medium text-[var(--text-primary)]">{t("onboarding.titulo1_pre")} <i>crescendo</i>.</h1>
            <p className="max-w-[68ch] text-lg leading-7 text-[var(--text-secondary)]">{t("onboarding.subtitulo1")}</p>
          </div>}

          {step === 2 && <div className="py-8">
            <h1 className="mb-8 font-display text-4xl leading-10 text-[var(--text-primary)]">{t("onboarding.pergunta_nome")}</h1>
            <input ref={(node) => { fieldRef.current = node; focusRef.current = node; }} autoFocus aria-label={t("settings.seu_nome")} className={`${control} h-[52px] w-full text-lg`} maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <p className="mt-3 text-sm text-[var(--text-muted)]">{t("onboarding.nome_ajuda")}</p>
          </div>}

          {step === 3 && <div className="py-8">
            <h1 className="mb-8 font-display text-4xl leading-10 text-[var(--text-primary)]">{t("onboarding.pergunta_instrumento")}</h1>
            <div ref={(node) => { focusRef.current = node?.querySelector("button") ?? null; }} className="grid grid-cols-4 gap-2">
              {(Object.entries(INSTRUMENTS) as [InstrumentCode, string][]).map(([code, label]) => <div key={code} className="relative">
                <button type="button" aria-pressed={instruments.includes(code)} className={chip(instruments.includes(code))} onClick={() => toggleInstrument(code)}>
                  {instruments.includes(code) && <Check size={15} aria-hidden="true" />} {label}
                </button>
                {instruments.includes(code) && <button type="button" aria-label={t("onboarding.definir_principal", { label })} title={t("onboarding.principal")} className={`absolute -right-1 -top-2 rounded-full p-1 ${primaryInstrument === code ? "text-[var(--gold-300)]" : "text-[var(--text-muted)]"}`} onClick={() => setPrimaryInstrument(code)}><Star size={16} fill={primaryInstrument === code ? "currentColor" : "none"} /></button>}
              </div>)}
            </div>
            {instruments.includes("other") && <label className="mt-6 block text-sm text-[var(--text-secondary)]">{t("settings.qual_instrumento")}
              <input ref={(node) => { fieldRef.current = node; focusRef.current = node; }} autoFocus className={`${control} mt-2 h-12 w-full`} maxLength={60} value={otherInstrumentLabel} onChange={(event) => setOtherInstrumentLabel(event.target.value)} />
            </label>}
          </div>}

          {step === 4 && <div className="py-8">
            <h1 className="mb-2 font-display text-4xl leading-10 text-[var(--text-primary)]">{t("onboarding.voce_musica")}</h1>
            <p className="mb-8 text-[var(--text-secondary)]">{t("onboarding.opcional_ajuda")}</p>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.nivel")}</legend>
              <div className="flex flex-wrap gap-2">{levels.map(([value, labelKey]) => <button key={value} type="button" aria-pressed={experienceLevel === value} className={chip(experienceLevel === value)} onClick={() => setExperienceLevel(experienceLevel === value ? undefined : value)}>{t(labelKey)}</button>)}
                <button type="button" aria-pressed={!experienceLevel} className={chip(!experienceLevel)} onClick={() => setExperienceLevel(undefined)}>{t("profile.prefiro_nao_dizer")}</button>
              </div>
            </fieldset>
            <fieldset className="mb-7">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("settings.papeis")}</legend>
              <div className="grid grid-cols-2 gap-2">{MUSICAL_ROLES.map((role) => <button key={role} type="button" aria-pressed={musicalRoles.includes(role)} className={chip(musicalRoles.includes(role))} onClick={() => toggleRole(role)}>{t(roleKeys[role])}</button>)}</div>
            </fieldset>
            <label className="block text-sm text-[var(--text-secondary)]">{t("settings.conjunto")} <span className="text-[var(--text-muted)]">{t("settings.conjunto_ajuda")}</span>
              <input className={`${control} mt-2 h-12 w-full`} maxLength={120} placeholder={t("onboarding.conjunto_placeholder")} value={ensembleName} onChange={(event) => setEnsembleName(event.target.value)} />
            </label>
          </div>}

          {step === 5 && <div className="py-8">
            <h1 className="mb-8 font-display text-4xl leading-10 text-[var(--text-primary)]">{t("onboarding.sua_afinacao")}</h1>
            <fieldset className="mb-8">
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("onboarding.freq_a4")}</legend>
              <div className="flex gap-2">{[440, 442, 443].map((value) => <button key={value} type="button" aria-pressed={Number(a4) === value} className={chip(Number(a4) === value)} onClick={() => setA4(String(value))}>{value} Hz</button>)}
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">{t("profile.outro")} <input ref={(node) => { fieldRef.current = node; focusRef.current = node; }} aria-label={t("onboarding.outra_freq")} className={`${control} h-11 w-24`} type="number" min="415" max="466" step="1" value={a4} onChange={(event) => setA4(event.target.value)} /> Hz</label>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm text-[var(--text-secondary)]">{t("onboarding.nomenclatura")}</legend>
              <div className="grid grid-cols-2 gap-3">{([["letter", "C D E", "A₄"], ["solfege", "Dó Ré Mi", "Lá₄"]] as const).map(([value, label, example]) => <button key={value} type="button" role="radio" aria-checked={noteNaming === value} className={`${chip(noteNaming === value)} h-28 flex-col`} onClick={() => setNoteNaming(value)}><span>{label}</span><i className="font-display text-3xl">{example}</i></button>)}</div>
            </fieldset>
          </div>}

          {step === 6 && <div className="py-8">
            <h1 className="mb-8 font-display text-4xl leading-10 text-[var(--text-primary)]">{t("onboarding.tudo_pronto", { name: displayName.trim() })}</h1>
            <dl className="divide-y divide-[var(--border-subtle)]">
              {summary.map(([label, value, editStep]) => <div key={label} className="flex items-start justify-between gap-4 py-4">
                <dt className="w-28 shrink-0 text-sm text-[var(--text-muted)]">{label}</dt>
                <dd className="flex-1 text-sm text-[var(--text-primary)]">{value || "—"}</dd>
                <button type="button" className="text-sm text-[var(--violet-300)] underline underline-offset-4 hover:text-[var(--text-primary)]" onClick={() => { setError(""); setStep(editStep); }}>{t("common.editar")}</button>
              </div>)}
            </dl>
          </div>}

          {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
          <div className="mt-6 flex items-center justify-between border-t border-[var(--border-subtle)] pt-6">
            {step > 1 ? <button type="button" className={`${button} bg-transparent text-[var(--text-secondary)] hover:bg-[var(--accent)]`} onClick={() => { setError(""); setStep((current) => current - 1); }}>{t("onboarding.voltar")}</button> : <span />}
            {step < 6 ? <button type="submit" className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{step === 1 ? t("onboarding.comecar") : t("onboarding.continuar")}</button> : <button type="button" disabled={saving} className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`} onClick={finish}>{saving ? t("settings.salvando") : t("onboarding.entrar")}</button>}
          </div>
        </form>
      </section>
    </main>
  );
}
