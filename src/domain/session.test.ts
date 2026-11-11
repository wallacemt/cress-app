import { describe, expect, it } from "vitest";
import {
  createSession,
  finish,
  heartbeat,
  liveActiveMs,
  pause,
  recover,
  resume,
  updateNotes,
} from "./session";
const date = (ms: number) => new Date(ms);
describe("session", () => {
  it("includes elapsed time only while active", () => {
    expect(liveActiveMs({ status: "ACTIVE", activeMs: 500, resumedAt: date(1000) }, date(2500))).toBe(2000);
    expect(liveActiveMs({ status: "PAUSED", activeMs: 500, resumedAt: null }, date(2500))).toBe(500);
  });
  it("covers valid lifecycle transitions", () => {
    const active = createSession("s", date(0));
    expect(active.status).toBe("ACTIVE");
    const paused = pause(active, date(1000));
    expect(paused).toMatchObject({ status: "PAUSED", activeMs: 1000 });
    expect(resume(paused, date(2000)).status).toBe("ACTIVE");
    expect(finish(active, date(1000))).toMatchObject({
      status: "FINISHED",
      activeMs: 1000,
    });
    expect(finish(paused, date(2000))).toMatchObject({
      status: "FINISHED",
      activeMs: 1000,
    });
  });
  it("heartbeats and recovers", () => {
    const active = heartbeat(createSession("s", date(0)), date(500));
    expect(active.lastHeartbeatAt).toEqual(date(500));
    expect(recover(active)).toMatchObject({ status: "PAUSED", activeMs: 500 });
  });
  it.each([
    () => pause(pause(createSession("s"))),
    () => resume(createSession("s")),
    () => finish(finish(createSession("s"))),
    () => heartbeat(pause(createSession("s"))),
    () => recover(pause(createSession("s"))),
  ])("rejects invalid transition", (transition) =>
    expect(transition).toThrow(/Invalid/),
  );
  it("updates and limits notes", () => {
    expect(updateNotes(createSession("s"), "ok").notes).toBe("ok");
    expect(() => updateNotes(createSession("s"), "x".repeat(2001))).toThrow();
  });
});
