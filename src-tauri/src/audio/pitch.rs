//! YIN pitch detection for short audio windows.

pub const WINDOW_SIZE: usize = 2048;
pub const HOP_SIZE: usize = 1024;
const THRESHOLD: f32 = 0.15;
const MIN_FREQUENCY_HZ: f32 = 60.0;
const MAX_FREQUENCY_HZ: f32 = 2500.0;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PitchResult {
    pub frequency_hz: f32,
    pub clarity: f32,
}

/// Refina um tau inteiro via interpolação parabólica nos 3 valores inteiros de
/// diferença ao redor dele (método clássico do YIN, usado para todo tau).
fn refine_tau_parabolic(difference: &[f32], tau_int: usize, max_tau: usize) -> f32 {
    if tau_int <= 1 || tau_int >= max_tau {
        return tau_int as f32;
    }
    let d0 = difference[tau_int - 1];
    let d1 = difference[tau_int];
    let d2 = difference[tau_int + 1];
    let denom = d0 - 2.0 * d1 + d2;
    if denom.abs() > f32::EPSILON {
        let offset = 0.5 * (d0 - d2) / denom;
        let refined = tau_int as f32 + offset;
        if refined > 1.0 && refined < max_tau as f32 {
            return refined;
        }
    }
    tau_int as f32
}

/// Detects the strongest periodic component in a window using the YIN algorithm.
///
/// If profiling shows this quadratic difference calculation is too costly, it can
/// be replaced with a YIN-FFT implementation using `realfft`.
pub fn detect_pitch(window: &[f32], sample_rate: u32) -> Option<PitchResult> {
    if window.len() < WINDOW_SIZE || sample_rate == 0 {
        return None;
    }

    let half_window = WINDOW_SIZE / 2;
    let min_tau = ((sample_rate as f32 / MAX_FREQUENCY_HZ).floor() as usize).max(2);
    let max_tau = ((sample_rate as f32 / MIN_FREQUENCY_HZ).ceil() as usize).min(half_window);
    if min_tau >= max_tau {
        return None;
    }

    let mut difference = [0.0_f32; WINDOW_SIZE / 2 + 1];
    let mut cumulative = 0.0_f32;
    let mut cmndf = [1.0_f32; WINDOW_SIZE / 2 + 1];

    for tau in 1..=max_tau {
        let mut sum = 0.0_f32;
        for index in 0..half_window {
            let delta = window[index] - window[index + tau];
            sum += delta * delta;
        }
        difference[tau] = sum;
        cumulative += sum;
        cmndf[tau] = if cumulative > 0.0 {
            sum * tau as f32 / cumulative
        } else {
            1.0
        };
    }

    let mut tau = min_tau;
    while tau <= max_tau {
        if cmndf[tau] < THRESHOLD {
            while tau < max_tau && cmndf[tau + 1] < cmndf[tau] {
                tau += 1;
            }
            break;
        }
        tau += 1;
    }
    if tau > max_tau || cmndf[tau] >= THRESHOLD {
        return None;
    }

    let refined_tau = refine_tau_parabolic(&difference, tau, max_tau);

    if refined_tau <= 0.0 {
        return None;
    }
    Some(PitchResult {
        frequency_hz: sample_rate as f32 / refined_tau,
        clarity: (1.0 - cmndf[tau]).clamp(0.0, 1.0),
    })
}

#[cfg(test)]
mod tests {
    use super::{detect_pitch, PitchResult, WINDOW_SIZE};
    use std::f32::consts::TAU;

    fn sine(frequency_hz: f32, sample_rate: u32) -> Vec<f32> {
        (0..WINDOW_SIZE)
            .map(|index| (TAU * frequency_hz * index as f32 / sample_rate as f32).sin())
            .collect()
    }

    fn cents_error(actual: f32, expected: f32) -> f32 {
        (1200.0 * (actual / expected).log2()).abs()
    }

    fn assert_pitch(result: Option<PitchResult>, expected_hz: f32, tolerance_cents: f32) {
        let result = result.expect("expected a detected pitch");
        assert!(
            cents_error(result.frequency_hz, expected_hz) <= tolerance_cents,
            "expected {expected_hz} Hz, got {} Hz ({} cents)",
            result.frequency_hz,
            cents_error(result.frequency_hz, expected_hz)
        );
        assert!((0.0..=1.0).contains(&result.clarity));
    }

    #[test]
    fn pure_sines_are_accurate_within_one_cent() {
        for sample_rate in [44_100, 48_000] {
            for frequency in [80.0, 110.0, 196.0, 440.0, 880.0, 1318.5, 2000.0] {
                assert_pitch(
                    detect_pitch(&sine(frequency, sample_rate), sample_rate),
                    frequency,
                    1.0,
                );
            }
        }
    }

    #[test]
    fn harmonic_signals_report_the_fundamental() {
        for fundamental in [130.81, 220.0, 329.63, 659.25, 1046.5, 1500.0] {
            let sample_rate = 48_000;
            let window: Vec<f32> = (0..WINDOW_SIZE)
                .map(|index| {
                    let phase = TAU * fundamental * index as f32 / sample_rate as f32;
                    phase.sin() + 0.5 * (2.0 * phase).sin() + 0.25 * (3.0 * phase).sin()
                })
                .collect();
            assert_pitch(detect_pitch(&window, sample_rate), fundamental, 1.0);
        }
    }

    #[test]
    fn silence_returns_none() {
        assert_eq!(detect_pitch(&[0.0; WINDOW_SIZE], 48_000), None);
    }

    #[test]
    fn deterministic_white_noise_is_rejected_by_the_threshold() {
        let mut state = 0x1234_5678_u32;
        let noise: Vec<f32> = (0..WINDOW_SIZE)
            .map(|_| {
                state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
                (state as i32 as f32) / i32::MAX as f32
            })
            .collect();
        assert_eq!(detect_pitch(&noise, 48_000), None);
    }

    #[test]
    fn invalid_input_returns_none() {
        assert_eq!(detect_pitch(&[0.0; WINDOW_SIZE - 1], 48_000), None);
        assert_eq!(detect_pitch(&[0.0; WINDOW_SIZE], 0), None);
    }
}
