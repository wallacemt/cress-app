import { getBeatInterval, SUBDIVISIONS } from "./metronome";
import { validateBpm } from "./bpm";

export interface SchedulerState {
  bpm: number;
  beatsPerBar: number;
  accentBeats: number[];
  subdivision: (typeof SUBDIVISIONS)[number];
  sampleRate: number;
  positionFrame: number;
}

export interface ScheduledBeat {
  frame: number;
  type: "accent" | "beat" | "subdivision";
  beat: number;
  bar: number;
}

export { getBeatInterval };

export function scheduleBlock(
  state: SchedulerState,
  blockStartFrame: number,
  blockLength: number,
): ScheduledBeat[] {
  validateBpm(state.bpm);
  if (!Number.isInteger(state.beatsPerBar) || state.beatsPerBar < 1 || state.beatsPerBar > 12) {
    throw new Error("beatsPerBar must be an integer between 1 and 12");
  }
  if (!Number.isFinite(state.sampleRate) || state.sampleRate <= 0) {
    throw new Error("sampleRate must be positive");
  }
  if (!Number.isInteger(blockStartFrame) || !Number.isInteger(blockLength) || blockLength < 0) {
    throw new Error("block frames must be non-negative integers");
  }

  const pattern = state.subdivision.split("-");
  const framesPerSubdivision = (state.sampleRate * getBeatInterval(state.bpm)) / 1000 / pattern.length;
  const firstIndex = Math.max(0, Math.ceil((blockStartFrame - state.positionFrame) / framesPerSubdivision));
  const endFrame = blockStartFrame + blockLength;
  const events: ScheduledBeat[] = [];

  for (let index = firstIndex; ; index += 1) {
    const absoluteFrame = state.positionFrame + Math.round(index * framesPerSubdivision);
    if (absoluteFrame >= endFrame) break;
    if (absoluteFrame < blockStartFrame || pattern[index % pattern.length] !== "1") continue;

    const beatIndex = Math.floor(index / pattern.length);
    const subdivisionIndex = index % pattern.length;
    events.push({
      frame: absoluteFrame - blockStartFrame,
      type: subdivisionIndex !== 0 ? "subdivision" : state.accentBeats.includes(beatIndex % state.beatsPerBar) ? "accent" : "beat",
      beat: (beatIndex % state.beatsPerBar) + 1,
      bar: Math.floor(beatIndex / state.beatsPerBar) + 1,
    });
  }

  return events;
}
