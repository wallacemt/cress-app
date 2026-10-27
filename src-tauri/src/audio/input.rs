use std::{
    str::FromStr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, DeviceId, Host, SampleFormat, Stream, StreamConfig,
};
use rtrb::{Consumer, Producer, RingBuffer};
use thiserror::Error;

const RING_BUFFER_SECONDS: usize = 2;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InputDeviceInfo {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Error)]
pub enum AudioError {
    #[error("input device not found: {0}")]
    DeviceNotFound(String),
    #[error("input device has no supported configuration: {0}")]
    UnsupportedConfig(String),
    #[error("failed to build input stream: {0}")]
    BuildStream(#[source] cpal::Error),
    #[error("failed to start or stop input stream: {0}")]
    Stream(#[source] cpal::Error),
    #[error("failed to query input device: {0}")]
    Device(#[source] cpal::Error),
}

impl AudioError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::DeviceNotFound(_) => "device_not_found",
            Self::UnsupportedConfig(_) => "unsupported_config",
            Self::BuildStream(_) => "build_stream_failed",
            Self::Stream(_) => "stream_operation_failed",
            Self::Device(_) => "device_error",
        }
    }
}

pub fn list_input_devices() -> Vec<InputDeviceInfo> {
    let host = cpal::default_host();
    let default_id = host
        .default_input_device()
        .and_then(|device| device.id().ok());

    host.input_devices()
        .into_iter()
        .flatten()
        .filter_map(|device| {
            let id = device.id().ok()?;
            let name = device.description().ok()?.name().to_owned();
            Some(InputDeviceInfo {
                is_default: default_id.as_ref() == Some(&id),
                id: id.to_string(),
                name,
            })
        })
        .collect()
}

pub struct InputStream {
    stream: Stream,
    pub consumer: Consumer<f32>,
    sample_rate: u32,
    channels: u16,
    overruns: Arc<AtomicU64>,
    stream_error: Arc<Mutex<Option<String>>>,
}

impl InputStream {
    pub fn open(device_id: Option<&str>) -> Result<Self, AudioError> {
        let host = cpal::default_host();
        let device = select_device(&host, device_id)?;
        let supported = device
            .default_input_config()
            .map_err(|error| AudioError::UnsupportedConfig(error.to_string()))?;
        let sample_rate = supported.sample_rate();
        let channels = supported.channels();
        let sample_format = supported.sample_format();
        let config: StreamConfig = supported.into();
        let capacity = sample_rate as usize * RING_BUFFER_SECONDS;
        let (producer, consumer) = RingBuffer::new(capacity);
        let overruns = Arc::new(AtomicU64::new(0));
        let stream_error = Arc::new(Mutex::new(None));
        let stream = build_stream(
            device,
            config,
            sample_format,
            producer,
            Arc::clone(&overruns),
            Arc::clone(&stream_error),
        )?;

        Ok(Self {
            stream,
            consumer,
            sample_rate,
            channels,
            overruns,
            stream_error,
        })
    }

    pub fn play(&self) -> Result<(), AudioError> {
        self.stream.play().map_err(AudioError::Stream)
    }

    pub fn stop(&self) -> Result<(), AudioError> {
        self.stream.pause().map_err(AudioError::Stream)
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    pub fn channels(&self) -> u16 {
        self.channels
    }
    pub fn consumer(&mut self) -> &mut Consumer<f32> {
        &mut self.consumer
    }
    pub fn overruns(&self) -> u64 {
        self.overruns.load(Ordering::Relaxed)
    }
    pub(crate) fn take_stream_error(&self) -> Option<String> {
        self.stream_error.lock().ok()?.take()
    }
}

fn select_device(host: &Host, device_id: Option<&str>) -> Result<Device, AudioError> {
    match device_id {
        None => host
            .default_input_device()
            .ok_or_else(|| AudioError::DeviceNotFound("default".into())),
        Some(value) => {
            let id =
                DeviceId::from_str(value).map_err(|_| AudioError::DeviceNotFound(value.into()))?;
            host.device_by_id(&id)
                .ok_or_else(|| AudioError::DeviceNotFound(value.into()))
        }
    }
}

fn build_stream(
    device: Device,
    config: StreamConfig,
    format: SampleFormat,
    producer: Producer<f32>,
    overruns: Arc<AtomicU64>,
    stream_error: Arc<Mutex<Option<String>>>,
) -> Result<Stream, AudioError> {
    macro_rules! build {
        ($sample:ty, $convert:ident) => {{
            let channels = config.channels as usize;
            let mut producer = producer;
            let overruns = Arc::clone(&overruns);
            let stream_error = Arc::clone(&stream_error);
            device
                .build_input_stream::<$sample, _, _>(
                    config,
                    move |data, _| write_mono(data, channels, &mut producer, &overruns, $convert),
                    move |error| {
                        log::error!("audio input stream error: {error}");
                        if let Ok(mut last_error) = stream_error.lock() {
                            *last_error = Some(error.to_string());
                        }
                    },
                    None,
                )
                .map_err(AudioError::BuildStream)
        }};
    }

    match format {
        SampleFormat::F32 => build!(f32, identity),
        SampleFormat::I8 => build!(i8, i8_to_f32),
        SampleFormat::I16 => build!(i16, i16_to_f32),
        SampleFormat::I24 => build!(cpal::I24, i24_to_f32),
        SampleFormat::I32 => build!(i32, i32_to_f32),
        SampleFormat::I64 => build!(i64, i64_to_f32),
        SampleFormat::U8 => build!(u8, u8_to_f32),
        SampleFormat::U16 => build!(u16, u16_to_f32),
        SampleFormat::U32 => build!(u32, u32_to_f32),
        SampleFormat::U64 => build!(u64, u64_to_f32),
        other => Err(AudioError::UnsupportedConfig(format!(
            "sample format {other:?}"
        ))),
    }
}

fn write_mono<T>(
    input: &[T],
    channels: usize,
    producer: &mut Producer<f32>,
    overruns: &AtomicU64,
    convert: fn(T) -> f32,
) where
    T: Copy,
{
    for frame in input.chunks_exact(channels) {
        let sample = frame.iter().copied().map(convert).sum::<f32>() / channels as f32;
        if producer.push(sample).is_err() {
            overruns.fetch_add(1, Ordering::Relaxed);
        }
    }
}

fn identity(sample: f32) -> f32 {
    sample
}
pub fn i8_to_f32(sample: i8) -> f32 {
    signed_to_f32(sample as i64, 8)
}
pub fn i16_to_f32(sample: i16) -> f32 {
    signed_to_f32(sample as i64, 16)
}
pub fn i24_to_f32(sample: cpal::I24) -> f32 {
    signed_to_f32((sample.inner() >> 8) as i64, 24)
}
pub fn i32_to_f32(sample: i32) -> f32 {
    signed_to_f32(sample as i64, 32)
}
pub fn i64_to_f32(sample: i64) -> f32 {
    (sample as f64 / i64::MAX as f64).max(-1.0) as f32
}
pub fn u8_to_f32(sample: u8) -> f32 {
    unsigned_to_f32(sample as u64, 8)
}
pub fn u16_to_f32(sample: u16) -> f32 {
    unsigned_to_f32(sample as u64, 16)
}
pub fn u32_to_f32(sample: u32) -> f32 {
    unsigned_to_f32(sample as u64, 32)
}
pub fn u64_to_f32(sample: u64) -> f32 {
    ((sample as f64 / u64::MAX as f64) * 2.0 - 1.0) as f32
}

fn signed_to_f32(sample: i64, bits: u32) -> f32 {
    (sample as f64 / ((1_i64 << (bits - 1)) - 1) as f64).max(-1.0) as f32
}

fn unsigned_to_f32(sample: u64, bits: u32) -> f32 {
    ((sample as f64 / ((1_u64 << bits) - 1) as f64) * 2.0 - 1.0) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: f32, expected: f32) {
        assert!((actual - expected).abs() < 0.0001, "{actual} != {expected}");
    }

    #[test]
    fn converts_signed_formats() {
        for (min, zero, max, midpoint, bits) in [
            (i8::MIN as i64, 0, i8::MAX as i64, 64, 8),
            (i16::MIN as i64, 0, i16::MAX as i64, 16384, 16),
            (-(1_i64 << 23), 0, (1_i64 << 23) - 1, 1_i64 << 22, 24),
            (i32::MIN as i64, 0, i32::MAX as i64, 1_i64 << 30, 32),
        ] {
            assert_close(signed_to_f32(min, bits), -1.0);
            assert_close(signed_to_f32(zero, bits), 0.0);
            assert_close(signed_to_f32(max, bits), 1.0);
            if bits == 8 {
                assert!((signed_to_f32(midpoint, bits) - 0.5).abs() < 0.01);
            } else {
                assert_close(signed_to_f32(midpoint, bits), 0.5);
            }
        }
        assert_close(i64_to_f32(i64::MIN), -1.0);
        assert_close(i64_to_f32(0), 0.0);
        assert_close(i64_to_f32(i64::MAX), 1.0);
        assert_close(i64_to_f32(i64::MAX / 2), 0.5);
        assert_close(i16_to_f32(i16::MIN), -1.0);
        assert_close(i16_to_f32(0), 0.0);
        assert_close(i16_to_f32(i16::MAX), 1.0);
        assert_close(i16_to_f32(16384), 0.5);
        assert_close(i32_to_f32(i32::MIN), -1.0);
        assert_close(i32_to_f32(0), 0.0);
        assert_close(i32_to_f32(i32::MAX), 1.0);
        assert_close(i32_to_f32(1 << 30), 0.5);
        assert_close(i24_to_f32(cpal::I24::new_unchecked(-(1 << 23) << 8)), -1.0);
        assert_close(
            i24_to_f32(cpal::I24::new_unchecked(((1 << 23) - 1) << 8)),
            1.0,
        );
    }

    #[test]
    fn converts_unsigned_formats() {
        assert_close(u8_to_f32(0), -1.0);
        assert_close(u8_to_f32(128), 0.0039);
        assert_close(u8_to_f32(255), 1.0);
        assert_close(u8_to_f32(192), 0.5059);
        assert_close(u16_to_f32(0), -1.0);
        assert_close(u16_to_f32(32768), 0.000015);
        assert_close(u16_to_f32(u16::MAX), 1.0);
        assert_close(u16_to_f32(49152), 0.50002);
        assert_close(u32_to_f32(0), -1.0);
        assert_close(u32_to_f32(1_u32 << 31), 0.0);
        assert_close(u32_to_f32(u32::MAX), 1.0);
        assert_close(u32_to_f32(3_u32 << 30), 0.5);
        assert_close(u64_to_f32(0), -1.0);
        assert_close(u64_to_f32(1_u64 << 63), 0.0);
        assert_close(u64_to_f32(u64::MAX), 1.0);
        assert_close(u64_to_f32((3_u64 << 62) - 1), 0.5);
    }

    #[test]
    fn mixdown_handles_mono_stereo_and_many_channels() {
        let (mut producer, mut consumer) = RingBuffer::new(3);
        let overruns = AtomicU64::new(0);
        write_mono(&[0.25, -0.5], 1, &mut producer, &overruns, identity);
        write_mono(
            &[1.0, -1.0, 0.5, 0.5],
            2,
            &mut producer,
            &overruns,
            identity,
        );
        write_mono(&[1.0, 0.0, -1.0], 3, &mut producer, &overruns, identity);
        assert_close(consumer.pop().unwrap(), 0.25);
        assert_close(consumer.pop().unwrap(), -0.5);
        assert_close(consumer.pop().unwrap(), 0.0);
        assert_eq!(overruns.load(Ordering::Relaxed), 2);
    }

    #[test]
    fn full_ring_discards_new_samples_and_counts_overruns() {
        let (mut producer, mut consumer) = RingBuffer::new(1);
        let overruns = AtomicU64::new(0);
        write_mono(&[0.25, 0.5, 0.75], 1, &mut producer, &overruns, identity);
        assert_close(consumer.pop().unwrap(), 0.25);
        assert_eq!(overruns.load(Ordering::Relaxed), 2);
    }
}
