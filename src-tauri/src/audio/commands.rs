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
};

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
}

impl From<input::AudioError> for AudioCommandError {
    fn from(error: input::AudioError) -> Self {
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
