import { describe, expect, it } from "vitest";
import {
  createRecording,
  finishRecording,
  pauseRecording,
  resumeRecording,
} from "./recording";
const input = {
  id: "r",
  sessionId: "s",
  relativePath: "r.wav",
  durationMs: 1,
  bpm: 80,
  createdAt: "now",
  title: "Take",
};
describe("recording", () => {
  it("requires active session and relative path", () => {
    expect(createRecording(input, "ACTIVE").status).toBe("ACTIVE");
    expect(() => createRecording(input, "PAUSED")).toThrow();
    expect(() =>
      createRecording({ ...input, relativePath: "/r.wav" }, "ACTIVE"),
    ).toThrow();
    expect(() =>
      createRecording({ ...input, relativePath: "C:\\r.wav" }, "ACTIVE"),
    ).toThrow();
  });
  it("supports lifecycle", () => {
    const recording = createRecording(input, "ACTIVE");
    expect(pauseRecording(recording).status).toBe("PAUSED");
    expect(resumeRecording(recording).status).toBe("ACTIVE");
    expect(finishRecording(recording).status).toBe("COMPLETE");
  });
});
