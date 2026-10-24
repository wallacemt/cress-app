import type { MetronomeConfig } from "../../domain/metronome";

type BeatMessage = { beat: number; bar: number; type: "accent" | "beat" };
type Listener = (message: BeatMessage) => void;

let context: AudioContext | null = null;
let node: AudioWorkletNode | null = null;
let running = false;
let starting: Promise<void> | null = null;
const listeners = new Set<Listener>();

export async function start(config: MetronomeConfig): Promise<void> {
  // Call from a user gesture so the browser permits AudioContext.resume().
  if (!context) context = new AudioContext();
  const audioContext = context;
  const resumed = audioContext.state === "running" ? Promise.resolve() : audioContext.resume();
  starting ??= (async () => {
    await audioContext.audioWorklet.addModule(new URL("./processor.ts?worker&url", import.meta.url));
    node = new AudioWorkletNode(audioContext, "cress-metronome", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { ...config, sampleRate: audioContext.sampleRate },
    });
    node.port.onmessage = ({ data }: MessageEvent<BeatMessage>) => {
      if (data.type === "beat" || data.type === "accent") listeners.forEach((listener) => listener(data));
    };
  })().catch((error: unknown) => {
    starting = null;
    throw error;
  });
  await resumed;
  await starting;
  node!.port.postMessage({ type: "config", config: { ...config, sampleRate: audioContext.sampleRate } });
  node!.port.postMessage({ type: "start" });
  node!.connect(audioContext.destination);
  running = true;
}

export function stop(): void {
  running = false;
  node?.port.postMessage({ type: "stop" });
  node?.disconnect();
}

export function updateConfig(config: MetronomeConfig): void {
  if (running && node && context) node.port.postMessage({ type: "config", config: { ...config, sampleRate: context.sampleRate } });
}

export function onBeat(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
