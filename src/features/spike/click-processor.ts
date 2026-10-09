declare const registerProcessor: (name: string, processor: typeof AudioWorkletProcessor) => void;
declare class AudioWorkletProcessor { }

class ClickProcessor extends AudioWorkletProcessor {
  process() {
    return true;
  }
}
registerProcessor("cress-click", ClickProcessor);
