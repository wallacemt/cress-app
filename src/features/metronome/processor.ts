import { scheduleBlock, type SchedulerState } from "../../domain/scheduler";

declare const registerProcessor: (name: string, processor: typeof AudioWorkletProcessor) => void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

type ProcessorConfig = Omit<SchedulerState, "positionFrame">;

const PARTIALS = [
  { ratio: 1, gain: 0.09, decayMs: 10 },
  { ratio: 2, gain: 0.34, decayMs: 5 },
  { ratio: 6, gain: 0.57, decayMs: 2 },
];
const VOICE_CUTOFF_MS = 100;

class MetronomeProcessor extends AudioWorkletProcessor {
  private state: SchedulerState;
  private blockStartFrame = 0;
  private active = false;
  private voices: { startFrame: number; phase: number; frequency: number; amplitude: number }[] = [];

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    this.state = { ...(options?.processorOptions as ProcessorConfig), positionFrame: 0 };
    this.port.onmessage = ({ data }) => {
      if (data.type === "config") this.state = { ...this.state, ...data.config };
      if (data.type === "start") {
        this.state.positionFrame = this.blockStartFrame;
        this.voices = [];
        this.active = true;
      }
      if (data.type === "stop") {
        this.active = false;
        this.voices = [];
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const output = outputs[0]?.[0];
    const blockLength = output?.length ?? 128;
    if (output) {
      output.fill(0);
      if (this.active) {
        for (const event of scheduleBlock(this.state, this.blockStartFrame, blockLength)) {
          const frequency = event.type === "accent" ? 1500 : event.type === "beat" ? 1000 : 800; // ponytail: click pitch by event type, tune by ear.
          this.voices.push({
            startFrame: this.blockStartFrame + event.frame,
            phase: 0,
            frequency,
            amplitude: event.type === "subdivision" ? 0.5 : 1, // ponytail: subdivision loudness relative to main beat, tune by ear.
          });
          if (event.type !== "subdivision") this.port.postMessage({ beat: event.beat, bar: event.bar, type: event.type });
        }
        for (const voice of this.voices) {
          for (let frame = Math.max(0, voice.startFrame - this.blockStartFrame); frame < blockLength; frame += 1) {
            const elapsed = this.blockStartFrame + frame - voice.startFrame;
            let sample = 0;
            for (const partial of PARTIALS) {
              const decayFrames = this.state.sampleRate * (partial.decayMs / 1000);
              sample += Math.sin(voice.phase * partial.ratio) * Math.exp(-elapsed / decayFrames) * partial.gain;
            }
            output[frame] = (output[frame] ?? 0) + sample * voice.amplitude;
            voice.phase += (2 * Math.PI * voice.frequency) / this.state.sampleRate;
          }
        }
        this.voices = this.voices.filter((voice) =>
          this.blockStartFrame + blockLength - voice.startFrame < this.state.sampleRate * (VOICE_CUTOFF_MS / 1000),
        );
      }
    }
    this.blockStartFrame += blockLength;
    return true;
  }
}

registerProcessor("cress-metronome", MetronomeProcessor);
