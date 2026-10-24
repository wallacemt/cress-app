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
  starting ??= (async () => {
    await context!.audioWorklet.addModule(new URL("./processor.ts?worker&url", import.meta.url));
    node = new AudioWorkletNode(context!, "cress-metronome", {
      processorOptions: { ...config, sampleRate: context!.sampleRate },
    });
    node.port.onmessage = ({ data }: MessageEvent<BeatMessage>) => {
      if (data.type === "beat" || data.type === "accent") listeners.forEach((listener) => listener(data));
    };
  })().catch((error: unknown) => {
    starting = null;
    throw error;
  });
  await starting;
  node!.connect(context.destination);
  node!.port.postMessage({ type: "config", config: { ...config, sampleRate: context.sampleRate } });
  node!.port.postMessage({ type: "start" });
  await context.resume();
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
