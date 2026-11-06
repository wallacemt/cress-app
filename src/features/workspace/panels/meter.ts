export const METER_FLOOR_DB = -48;
export const CLIP_DB = -1;
export const RELEASE_DB_PER_S = 20;
export const HOLD_MS = 1000;
export const SILENCE_DB = -60;
export const SILENCE_MS = 5000;

export const toDb = (linear: number) => linear > 0 ? 20 * Math.log10(linear) : -Infinity;

export function meterPos(db: number): number {
  if (!(db > METER_FLOOR_DB)) return 0;
  if (db < -18) return ((db + 48) / 30) * 0.4;
  if (db < -6) return 0.4 + ((db + 18) / 12) * 0.35;
  return Math.min(1, 0.75 + ((db + 6) / 6) * 0.25);
}

export interface MeterState {
  display: number;
  hold: number;
  holdAt: number;
  clipped: boolean;
  silentSince: number | null;
}

export const initialMeterState = (): MeterState => ({
  display: -Infinity,
  hold: -Infinity,
  holdAt: 0,
  clipped: false,
  silentSince: null,
});

export function step(state: MeterState, targetDb: number, now: number, dtMs: number): MeterState {
  const display = targetDb >= state.display
    ? targetDb
    : Math.max(targetDb, state.display - RELEASE_DB_PER_S * Math.max(0, dtMs) / 1000);
  const hold = targetDb > state.hold || now - state.holdAt >= HOLD_MS ? display : state.hold;
  const holdAt = hold > state.hold ? now : state.holdAt;
  const silentSince = targetDb < SILENCE_DB ? state.silentSince ?? now : null;
  return {
    display,
    hold,
    holdAt,
    clipped: state.clipped || targetDb >= CLIP_DB,
    silentSince,
  };
}

