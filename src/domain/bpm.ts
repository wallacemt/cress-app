import { assertRange } from "./validation";
export const MIN_BPM = 20;
export const MAX_BPM = 300;
export function validateBpm(bpm: number): number {
  assertRange(bpm, MIN_BPM, MAX_BPM, "BPM");
  if (!Number.isInteger(bpm)) throw new Error("BPM must be an integer");
  return bpm;
}
export function changeBpm(bpm: number, delta: 1 | -1 | 5 | -5): number {
  return validateBpm(bpm + delta);
}
