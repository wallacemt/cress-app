import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
import { useState, type FormEvent } from "react";
import { validateBpm } from "../../domain/bpm";

export function FinishSessionDialog({ initialBpm, notes, hasGoal, onCancel, onConfirm }: {
  initialBpm: number | null; notes: string; hasGoal: boolean;
  onCancel: () => void; onConfirm: (data: { finalBpm: number | null; notes: string; completeGoal: boolean }) => void;
}) {
  useLanguageStore((state) => state.language);
  const [bpm, setBpm] = useState(initialBpm == null ? "" : String(initialBpm));
  const [text, setText] = useState(notes);
  const [completeGoal, setCompleteGoal] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (text.length > 2000) throw new Error(t("workspace.long_notes"));
      onConfirm({ finalBpm: bpm ? validateBpm(Number(bpm)) : null, notes: text, completeGoal });
    }
    catch { setError(text.length > 2000 ? t("workspace.notes_length_error") : t("workspace.confirm_bpm_error")); }
  }
  return <div className="session-dialog-backdrop"><form className="session-dialog" onSubmit={submit} aria-label={t("workspace.finish_session")}>
    <h2>{t("workspace.finish_session")}</h2>
    <label>{t("workspace.final_bpm")}<input aria-label={t("workspace.final_bpm")} type="number" min="20" max="300" value={bpm} onChange={(event) => setBpm(event.target.value)} /></label>
    <label>{t("workspace.notes")}<textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} /></label>
    {hasGoal && <label className="session-dialog-check"><input type="checkbox" checked={completeGoal} onChange={(event) => setCompleteGoal(event.target.checked)} /> {t("workspace.goal_completed")}</label>}
    {error && <p role="alert">{error}</p>}
    <footer><button type="button" onClick={onCancel}>{t("workspace.cancel")}</button><button type="submit">{t("workspace.confirm")}</button></footer>
  </form></div>;
}
