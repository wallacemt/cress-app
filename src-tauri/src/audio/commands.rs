use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::Duration,
};

use serde::Serialize;
use tauri::{ipc::Channel, State};

use super::{
    input::{self, InputStream},
    pitch,
    recorder::{self, Recorder},
};
use crate::paths;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDevice {
    id: String,
    name: String,
    is_default: bool,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputInfo {
    sample_rate: u32,
    channels: u16,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "event",
    content = "data"
)]
pub enum AudioEvent {
    Frame {
        rms: f32,
        peak: f32,
        pitch: Option<Pitch>,
        recorded_ms: Option<u64>,
    },
    Error {
        code: String,
        message: String,
    },
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pitch {
    hz: f32,
    clarity: f32,
}

struct ActiveInput {
    running: Arc<AtomicBool>,
    worker: JoinHandle<InputStream>,
}

struct ActiveRecording {
    path: String,
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    worker: JoinHandle<(Recorder, InputStream)>,
}

#[derive(Default)]
pub struct RecordingState(Mutex<Option<ActiveRecording>>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStartResult {
    sample_rate: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingFinishResult {
    relative_path: String,
    duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingProbeResult {
    duration_ms: u64,
    sample_rate: u32,
}

#[tauri::command]
pub fn recording_start(
    path: String,
    device_id: Option<String>,
    app: tauri::AppHandle,
    state: State<'_, RecordingState>,
) -> Result<RecordingStartResult, AudioCommandError> {
    let resolved_path = paths::resolve_recording_path(&app, &path)?;
    let mut active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("recording state is unavailable"))?;
    stop_recording(&mut active);

    let stream = input::InputStream::open(device_id.as_deref())?;
    let sample_rate = stream.sample_rate();
    stream.play()?;
    let recorder = Recorder::start(&resolved_path, sample_rate)?;
    let running = Arc::new(AtomicBool::new(true));
    let paused = Arc::new(AtomicBool::new(false));
    let worker_running = Arc::clone(&running);
    let worker_paused = Arc::clone(&paused);
    let worker = match thread::Builder::new()
        .name("recording-worker".into())
        .spawn(move || recording_worker(recorder, stream, worker_running, worker_paused))
    {
        Ok(worker) => worker,
        Err(error) => {
            return Err(AudioCommandError {
                code: "worker_start_failed".into(),
                message: error.to_string(),
            })
        }
    };
    *active = Some(ActiveRecording {
        path,
        running,
        paused,
        worker,
    });
    Ok(RecordingStartResult { sample_rate })
}

#[tauri::command]
pub fn recording_pause(state: State<'_, RecordingState>) -> Result<(), AudioCommandError> {
    set_recording_paused(&state, true)
}

#[tauri::command]
pub fn recording_resume(state: State<'_, RecordingState>) -> Result<(), AudioCommandError> {
    set_recording_paused(&state, false)
}

fn set_recording_paused(
    state: &State<'_, RecordingState>,
    paused: bool,
) -> Result<(), AudioCommandError> {
    let active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("recording state is unavailable"))?;
    let recording = active
        .as_ref()
        .ok_or_else(AudioCommandError::no_active_recording)?;
    recording.paused.store(paused, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn recording_finish(
    state: State<'_, RecordingState>,
) -> Result<RecordingFinishResult, AudioCommandError> {
    let mut active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("recording state is unavailable"))?;
    let recording = active
        .take()
        .ok_or_else(AudioCommandError::no_active_recording)?;
    recording.running.store(false, Ordering::Relaxed);
    let (mut recorder, stream) = recording
        .worker
        .join()
        .map_err(|_| AudioCommandError::internal("recording worker failed"))?;
    stream.stop()?;
    let summary = recorder.finish()?;
    Ok(RecordingFinishResult {
        relative_path: recording.path,
        duration_ms: summary.duration_ms,
    })
}

#[tauri::command]
pub fn recording_delete(
    path: String,
    app: tauri::AppHandle,
    state: State<'_, RecordingState>,
) -> Result<(), AudioCommandError> {
    let resolved_path = paths::resolve_recording_path(&app, &path)?;
    let active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("recording state is unavailable"))?;
    if active
        .as_ref()
        .is_some_and(|recording| recording.path == path)
    {
        return Err(AudioCommandError {
            code: "recording_in_progress".into(),
            message: "recording is currently in progress".into(),
        });
    }
    match std::fs::remove_file(resolved_path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(AudioCommandError {
            code: "recording_delete_failed".into(),
            message: error.to_string(),
        }),
    }
}

#[tauri::command]
pub fn recording_probe(path: String, app: tauri::AppHandle) -> Option<RecordingProbeResult> {
    let resolved_path = paths::resolve_recording_path(&app, &path).ok()?;
    recorder::recording_probe(&resolved_path).map(|probe| RecordingProbeResult {
        duration_ms: probe.duration_ms,
        sample_rate: probe.sample_rate,
    })
}

fn recording_worker(
    mut recorder: Recorder,
    mut stream: InputStream,
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
) -> (Recorder, InputStream) {
    while running.load(Ordering::Relaxed) {
        let consumer = stream.consumer();
        let available = consumer.slots().min(4096);
        if available == 0 {
            thread::sleep(Duration::from_millis(2));
            continue;
        }
        let mut samples = Vec::with_capacity(available);
        for _ in 0..available {
            if let Ok(sample) = consumer.pop() {
                samples.push(sample);
            }
        }
        if !paused.load(Ordering::Relaxed) {
            if let Err(error) = recorder.write_samples(&samples) {
                log::error!("recording write failed: {error}");
                running.store(false, Ordering::Relaxed);
            }
        }
    }
    (recorder, stream)
}

fn stop_recording(active: &mut Option<ActiveRecording>) {
    if let Some(recording) = active.take() {
        recording.running.store(false, Ordering::Relaxed);
        if let Ok((_, stream)) = recording.worker.join() {
            let _ = stream.stop();
        }
    }
}

#[derive(Default)]
pub struct AudioInputState(Mutex<Option<ActiveInput>>);

#[tauri::command]
pub fn audio_list_input_devices() -> Vec<InputDevice> {
    input::list_input_devices()
        .into_iter()
        .map(|device| InputDevice {
            id: device.id,
            name: device.name,
            is_default: device.is_default,
        })
        .collect()
}

#[tauri::command]
pub fn audio_start_input(
    device_id: Option<String>,
    on_event: Channel<AudioEvent>,
    state: State<'_, AudioInputState>,
) -> Result<InputInfo, AudioCommandError> {
    let mut active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("audio state is unavailable"))?;
    // Starting again replaces the previous device before opening the new one.
    stop_active(&mut active);

    let stream = input::InputStream::open(device_id.as_deref()).map_err(AudioCommandError::from)?;
    stream.play().map_err(AudioCommandError::from)?;
    let info = InputInfo {
        sample_rate: stream.sample_rate(),
        channels: stream.channels(),
    };
    let running = Arc::new(AtomicBool::new(true));
    let worker_running = Arc::clone(&running);
    let worker = match thread::Builder::new()
        .name("audio-input-worker".into())
        .spawn(move || process_input(stream, worker_running, on_event))
    {
        Ok(worker) => worker,
        Err(error) => {
            return Err(AudioCommandError {
                code: "worker_start_failed".into(),
                message: error.to_string(),
            })
        }
    };

    *active = Some(ActiveInput { running, worker });
    Ok(info)
}

#[tauri::command]
pub fn audio_stop_input(state: State<'_, AudioInputState>) -> Result<(), AudioCommandError> {
    let mut active = state
        .0
        .lock()
        .map_err(|_| AudioCommandError::internal("audio state is unavailable"))?;
    stop_active(&mut active);
    Ok(())
}

fn process_input(
    mut stream: InputStream,
    running: Arc<AtomicBool>,
    channel: Channel<AudioEvent>,
) -> InputStream {
    let mut window = Vec::with_capacity(pitch::WINDOW_SIZE);
    let mut hop = Vec::with_capacity(pitch::HOP_SIZE);
    while running.load(Ordering::Relaxed) {
        if let Some(message) = stream.take_stream_error() {
            let _ = channel.send(AudioEvent::Error {
                code: "stream_runtime_error".into(),
                message,
            });
            running.store(false, Ordering::Relaxed);
            break;
        }
        let consumer = stream.consumer();
        let available = consumer.slots().min(pitch::HOP_SIZE - hop.len());
        for _ in 0..available {
            if let Ok(sample) = consumer.pop() {
                hop.push(sample);
            }
        }
        if hop.len() == pitch::HOP_SIZE {
            let (rms, peak) = level(&hop);
            window.extend_from_slice(&hop);
            if window.len() > pitch::WINDOW_SIZE {
                window.drain(..pitch::HOP_SIZE);
            }
            if window.len() == pitch::WINDOW_SIZE {
                let detected = pitch::detect_pitch(&window, stream.sample_rate()).map(|p| Pitch {
                    hz: p.frequency_hz,
                    clarity: p.clarity,
                });
                if channel
                    .send(AudioEvent::Frame {
                        rms,
                        peak,
                        pitch: detected,
                        recorded_ms: None,
                    })
                    .is_err()
                {
                    running.store(false, Ordering::Relaxed);
                    break;
                }
            }
            hop.clear();
        } else {
            thread::sleep(Duration::from_millis(2));
        }
    }
    stream
}

fn level(samples: &[f32]) -> (f32, f32) {
    let peak = samples
        .iter()
        .fold(0.0_f32, |max, sample| max.max(sample.abs()));
    let rms =
        (samples.iter().map(|sample| sample * sample).sum::<f32>() / samples.len() as f32).sqrt();
    (rms, peak)
}

fn stop_active(active: &mut Option<ActiveInput>) {
    if let Some(active) = active.take() {
        active.running.store(false, Ordering::Relaxed);
        if let Ok(stream) = active.worker.join() {
            let _ = stream.stop();
        }
    }
}

#[derive(Debug, Serialize)]
pub struct AudioCommandError {
    code: String,
    message: String,
}

impl AudioCommandError {
    fn internal(message: &str) -> Self {
        Self {
            code: "audio_state_unavailable".into(),
            message: message.into(),
        }
    }

    fn no_active_recording() -> Self {
        Self {
            code: "no_active_recording".into(),
            message: "there is no active recording".into(),
        }
    }
}

impl From<input::AudioError> for AudioCommandError {
    fn from(error: input::AudioError) -> Self {
        Self {
            code: error.code().into(),
            message: error.to_string(),
        }
    }
}

impl From<recorder::RecorderError> for AudioCommandError {
    fn from(error: recorder::RecorderError) -> Self {
        Self {
            code: error.code().into(),
            message: error.to_string(),
        }
    }
}

impl From<paths::PathsError> for AudioCommandError {
    fn from(error: paths::PathsError) -> Self {
        Self {
            code: error.code().into(),
            message: error.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::level;

    #[test]
    fn level_measures_only_the_supplied_hop() {
        let (rms, peak) = level(&[0.0, 0.5, -1.0, 0.5]);
        assert!((rms - 0.612_372_4).abs() < 0.0001);
        assert_eq!(peak, 1.0);
    }
}
