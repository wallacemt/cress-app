import type { StudyGoal } from "../../domain/goal";

export function GoalList({ goals }: { goals: StudyGoal[] }) {
  return (
    <section aria-labelledby="piece-goals-title" className="mt-10">
      <h2
        id="piece-goals-title"
        className="font-display text-2xl text-[var(--text-primary)]"
      >
        Objetivos
      </h2>
      {!goals.length ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Nenhum objetivo registrado.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm text-[var(--text-primary)]">
                  {goal.description}
                </p>
                {goal.targetBpm != null && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Meta: {goal.targetBpm} BPM
                  </p>
                )}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                {goal.completed ? "Concluído" : "Em andamento"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
