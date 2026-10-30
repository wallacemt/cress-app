import { describe, expect, it } from "vitest";
import { getBeatInterval, scheduleBlock, type SchedulerState } from "./scheduler";

const state: SchedulerState = {
  bpm: 120,
  beatsPerBar: 4,
  accentBeats: [0],
  subdivision: "1",
  sampleRate: 48000,
  positionFrame: 0,
};

describe("scheduler", () => {
  it("reuses the millisecond beat interval and schedules beats in the block", () => {
    expect(getBeatInterval(120)).toBe(500);
    expect(scheduleBlock(state, 0, 48000)).toHaveLength(2);
  });

  it("marks the first beat of each bar as accented", () => {
    expect(scheduleBlock(state, 0, 96000).map(({ type }) => type)).toEqual(["accent", "beat", "beat", "beat"]);
  });

  it("accents each selected beat independently and allows no accents", () => {
    expect(scheduleBlock({ ...state, accentBeats: [1, 3] }, 0, 96000).map(({ type }) => type)).toEqual(["beat", "accent", "beat", "accent"]);
    expect(scheduleBlock({ ...state, accentBeats: [1, 3] }, 0, 192000).map(({ type }) => type)).toEqual(["beat", "accent", "beat", "accent", "beat", "accent", "beat", "accent"]);
    expect(scheduleBlock({ ...state, accentBeats: [] }, 0, 48000).map(({ type }) => type)).toEqual(["beat", "beat"]);
  });

  it("omits zero subdivisions and labels active offbeats", () => {
    const events = scheduleBlock({ ...state, subdivision: "1-0-1-1" }, 0, 24000);
    expect(events.map(({ frame, type }) => [frame, type])).toEqual([
      [0, "accent"], [12000, "subdivision"], [18000, "subdivision"],
    ]);
  });

  it("rejects invalid beatsPerBar, sampleRate, and block frames", () => {
    expect(() => scheduleBlock({ ...state, beatsPerBar: 13 }, 0, 128)).toThrow("beatsPerBar");
    expect(() => scheduleBlock({ ...state, sampleRate: 0 }, 0, 128)).toThrow("sampleRate");
    expect(() => scheduleBlock(state, 0, -1)).toThrow("block frames");
  });

  it("keeps absolute timing within one frame across ten simulated minutes", () => {
    const blockLength = 128;
    const duration = 600 * state.sampleRate;
    let lastFrame = -1;
    for (let start = 0; start < duration; start += blockLength) {
      const length = Math.min(blockLength, duration - start);
      for (const event of scheduleBlock(state, start, length)) {
        const absoluteFrame = start + event.frame;
        const beatNumber = Math.round(absoluteFrame / (state.sampleRate * 60 / state.bpm));
        expect(Math.abs(absoluteFrame - beatNumber * state.sampleRate * 60 / state.bpm)).toBeLessThanOrEqual(1);
        expect(absoluteFrame).toBeGreaterThan(lastFrame);
        lastFrame = absoluteFrame;
      }
    }
    expect(lastFrame).toBe(599.5 * state.sampleRate);
  });
});
