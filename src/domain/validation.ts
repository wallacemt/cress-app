import { DomainError } from "./errors";
const fail = (message: string): never => {
  throw new DomainError("VALIDATION", message);
};
export function assertLength(
  value: string,
  min: number,
  max: number,
  field = "value",
): void {
  const n = value.trim().length;
  if (n < min || n > max)
    fail(`${field} length must be between ${min} and ${max}`);
}
export function assertRange(
  value: number,
  min: number,
  max: number,
  field = "value",
): void {
  if (!Number.isFinite(value) || value < min || value > max)
    fail(`${field} must be between ${min} and ${max}`);
}
export function assertOneOf<T>(
  value: T,
  allowed: readonly T[],
  field = "value",
): void {
  if (!allowed.includes(value)) fail(`${field} is invalid`);
}
