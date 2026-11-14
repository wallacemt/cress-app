import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
import type { StudyGoal } from "../../domain/goal";

export function GoalSelect({
  goals,
  value,
  onChange,
  label = t("workspace.existing_goal"),
}: {
  goals: StudyGoal[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  useLanguageStore((state) => state.language);
  return (
    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
      {label}
      <select
        aria-label={label}
        className="h-12 rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!goals.length}
      >
        <option value="">{t("workspace.no_goal_option")}</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.description}
          </option>
        ))}
      </select>
    </label>
  );
}
