import { convertFileSrc } from "@tauri-apps/api/core";

export function SpikePage({ recordingPath }: { recordingPath: string }) {
  return (
    <div>
      <audio controls src={convertFileSrc(recordingPath)} />
      <p>
        AudioWorklet, áudio nativo, dockview e PDF são validados no Windows.
      </p>
    </div>
  );
}
