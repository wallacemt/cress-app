import { validateBpm } from "./bpm";
import { DomainError } from "./errors";
export interface StudyGoal {
  id: string;
  description: string;
  targetBpm?: number | null;
  startMeasure?: number | null;
  endMeasure?: number | null;
  completed: boolean;
}
export function createStudyGoal(
  input: Omit<StudyGoal, "completed">,
): StudyGoal {
  if (!input.description.trim())
    throw new DomainError("VALIDATION", "Description is required");
  if (input.targetBpm != null) validateBpm(input.targetBpm);
  if (
    input.startMeasure != null &&
    input.endMeasure != null &&
    input.startMeasure > input.endMeasure
  )
    throw new DomainError("VALIDATION", "Invalid measure range");
  return { ...input, completed: false };
}
export const completeGoal = (g: StudyGoal): StudyGoal => ({
  ...g,
  completed: true,
});
export const reopenGoal = (g: StudyGoal): StudyGoal => ({
  ...g,
  completed: false,
});
