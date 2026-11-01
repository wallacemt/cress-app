import { describe, expect, it } from "vitest";
import { useTunerStore } from "./tunerStore";

describe("tunerStore", () => {
  it("keeps only the 12 most recent distinct consecutive notes and validates A4", () => {
    useTunerStore.setState({ recent: [], a4: 440 });
    for (let midi = 60; midi < 75; midi += 1) useTunerStore.getState().addRecent(midi);
    expect(useTunerStore.getState().recent).toHaveLength(12);
    expect(useTunerStore.getState().recent[0]?.midi).toBe(63);
    useTunerStore.getState().setA4(0);
    expect(useTunerStore.getState().a4).toBe(440);
    useTunerStore.getState().setA4(415);
    expect(useTunerStore.getState().a4).toBe(415);
    useTunerStore.getState().setA4(466);
    expect(useTunerStore.getState().a4).toBe(466);
    useTunerStore.getState().setA4(467);
    expect(useTunerStore.getState().a4).toBe(466);
  });
});
