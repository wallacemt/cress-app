use std::path::Path;

use hound::{WavReader, WavSpec, WavWriter};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RecorderError {
    #[error("failed to create WAV recording: {0}")]
    Create(#[source] hound::Error),
    #[error("failed to write WAV recording: {0}")]
    Write(#[source] hound::Error),
    #[error("failed to finalize WAV recording: {0}")]
    Finish(#[source] hound::Error),
    #[error("sample rate must be greater than zero")]
    InvalidSampleRate,
}

impl RecorderError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Create(_) => "recording_create_failed",
            Self::Write(_) => "recording_write_failed",
            Self::Finish(_) => "recording_finish_failed",
            Self::InvalidSampleRate => "invalid_sample_rate",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RecordingSummary {
    pub duration_ms: u64,
    pub sample_rate: u32,
}

pub struct Recorder {
    writer: Option<WavWriter<std::io::BufWriter<std::fs::File>>>,
    sample_rate: u32,
    samples_written: u64,
    samples_since_flush: u32,
    paused: bool,
}

impl Recorder {
    pub fn start(path: &Path, sample_rate: u32) -> Result<Self, RecorderError> {
        if sample_rate == 0 {
            return Err(RecorderError::InvalidSampleRate);
        }
        let writer = WavWriter::create(
            path,
            WavSpec {
                channels: 1,
                sample_rate,
                bits_per_sample: 16,
                sample_format: hound::SampleFormat::Int,
            },
        )
        .map_err(RecorderError::Create)?;
        Ok(Self {
            writer: Some(writer),
            sample_rate,
            samples_written: 0,
            samples_since_flush: 0,
            paused: false,
        })
    }

    pub fn write_samples(&mut self, samples: &[f32]) -> Result<(), RecorderError> {
        if self.paused {
            return Ok(());
        }
        let writer = self.writer.as_mut().expect("recorder already finished");
        for &sample in samples {
            let sample = (sample.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16;
            writer
                .write_sample(sample)
                .map_err(RecorderError::Write)?;
            self.samples_written += 1;
            self.samples_since_flush += 1;
            if self.samples_since_flush >= self.sample_rate {
                writer.flush().map_err(RecorderError::Write)?;
                self.samples_since_flush = 0;
            }
        }
        Ok(())
    }

    pub fn pause(&mut self) {
        self.paused = true;
    }

    pub fn resume(&mut self) {
        self.paused = false;
    }

    pub fn finish(&mut self) -> Result<RecordingSummary, RecorderError> {
        let writer = self.writer.take().expect("recorder already finished");
        writer.finalize().map_err(RecorderError::Finish)?;
        Ok(RecordingSummary {
            duration_ms: self.samples_written * 1000 / u64::from(self.sample_rate),
            sample_rate: self.sample_rate,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RecordingProbe {
    pub sample_rate: u32,
    pub duration_ms: u64,
    pub sample_count: u64,
}

pub fn recording_probe(path: &Path) -> Option<RecordingProbe> {
    let mut reader = WavReader::open(path).ok()?;
    let spec = reader.spec();
    if spec.channels != 1
        || spec.sample_rate == 0
        || spec.bits_per_sample != 16
        || spec.sample_format != hound::SampleFormat::Int
    {
        return None;
    }
    let sample_count = reader.samples::<i16>().try_fold(0_u64, |count, sample| {
        sample.ok().map(|_| count + 1)
    })?;
    if sample_count == 0 {
        return None;
    }
    Some(RecordingProbe {
        sample_rate: spec.sample_rate,
        duration_ms: sample_count * 1000 / u64::from(spec.sample_rate),
        sample_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{f32::consts::TAU, fs, time::{SystemTime, UNIX_EPOCH}};

    fn temporary_wav(name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("cress-{name}-{nonce}.wav"))
    }

    fn sine(sample_count: usize, sample_rate: u32) -> Vec<f32> {
        (0..sample_count)
            .map(|index| (TAU * 440.0 * index as f32 / sample_rate as f32).sin())
            .collect()
    }

    #[test]
    fn writes_readable_wav_with_expected_duration_and_samples() {
        let path = temporary_wav("sine");
        let samples = sine(8_000, 8_000);
        let mut recorder = Recorder::start(&path, 8_000).unwrap();
        recorder.write_samples(&samples).unwrap();
        let summary = recorder.finish().unwrap();
        assert_eq!(summary.duration_ms, 1_000);
        assert_eq!(summary.sample_rate, 8_000);
        let mut reader = WavReader::open(&path).unwrap();
        assert_eq!(reader.duration(), 8_000);
        let decoded: Vec<i16> = reader.samples::<i16>().map(Result::unwrap).collect();
        assert_eq!(decoded.len(), samples.len());
        assert!((decoded[2_000] as f32 / i16::MAX as f32 - samples[2_000]).abs() < 0.001);
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn paused_samples_are_not_written() {
        let path = temporary_wav("pause");
        let mut recorder = Recorder::start(&path, 4).unwrap();
        recorder.write_samples(&[0.1, 0.2]).unwrap();
        recorder.pause();
        recorder.write_samples(&[0.3, 0.4, 0.5]).unwrap();
        recorder.resume();
        recorder.write_samples(&[0.6, 0.7]).unwrap();
        let summary = recorder.finish().unwrap();
        assert_eq!(summary.duration_ms, 1_000);
        let reader = WavReader::open(&path).unwrap();
        assert_eq!(reader.duration(), 4);
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn flushes_audio_data_before_finish() {
        let path = temporary_wav("flush");
        let mut recorder = Recorder::start(&path, 8).unwrap();
        recorder.write_samples(&[0.1; 8]).unwrap();
        assert!(fs::metadata(&path).unwrap().len() > 44);
        recorder.finish().unwrap();
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn probe_accepts_valid_wav_and_rejects_empty_or_truncated_files() {
        let valid_path = temporary_wav("probe-valid");
        let mut recorder = Recorder::start(&valid_path, 8).unwrap();
        recorder.write_samples(&[0.1; 8]).unwrap();
        recorder.finish().unwrap();
        assert_eq!(recording_probe(&valid_path).unwrap().sample_count, 8);

        let empty_path = temporary_wav("probe-empty");
        fs::write(&empty_path, []).unwrap();
        assert_eq!(recording_probe(&empty_path), None);

        let truncated_path = temporary_wav("probe-truncated");
        let bytes = fs::read(&valid_path).unwrap();
        fs::write(&truncated_path, &bytes[..bytes.len() - 1]).unwrap();
        assert_eq!(recording_probe(&truncated_path), None);

        fs::remove_file(valid_path).unwrap();
        fs::remove_file(empty_path).unwrap();
        fs::remove_file(truncated_path).unwrap();
    }
}
