import { Channel, invoke } from "@tauri-apps/api/core";

export interface InputDevice { id: string; name: string; isDefault: boolean }
export interface InputInfo { sampleRate: number; channels: number }
export type AudioEvent =
  | { event: "frame"; data: { rms: number; peak: number; pitch: { hz: number; clarity: number } | null; recordedMs: null } }
  | { event: "error"; data: { code: string; message: string } };

export function listInputDevices(): Promise<InputDevice[]> {
  return invoke<InputDevice[]>("audio_list_input_devices");
}

export function startInput(deviceId: string | null, onEvent: (event: AudioEvent) => void): Promise<InputInfo> {
  const channel = new Channel<AudioEvent>();
  channel.onmessage = onEvent;
  return invoke<InputInfo>("audio_start_input", { deviceId, onEvent: channel });
}

export function stopInput(): Promise<void> {
  return invoke("audio_stop_input");
}
