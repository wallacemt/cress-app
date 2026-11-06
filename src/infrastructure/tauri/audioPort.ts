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
  return invoke<void>("audio_stop_input");
}

export function startRecording(path: string, deviceId: string | null = null): Promise<{ sampleRate: number }> {
  return invoke<{ sampleRate: number }>("recording_start", { path, deviceId });
}

export function pauseRecording(): Promise<void> {
  return invoke<void>("recording_pause");
}

export function resumeRecording(): Promise<void> {
  return invoke<void>("recording_resume");
}

export function stopRecording(): Promise<{ relativePath: string; durationMs: number }> {
  return invoke<{ relativePath: string; durationMs: number }>("recording_finish");
}

export function probeRecording(path: string): Promise<{ durationMs: number; sampleRate: number } | null> {
  return invoke<{ durationMs: number; sampleRate: number } | null>("recording_probe", { path });
}

export function deleteRecordingFile(path: string): Promise<void> {
  return invoke<void>("recording_delete", { path });
}
