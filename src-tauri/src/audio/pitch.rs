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
/// diferença ao redor dele. Usado para frequências baixas/médias, onde o período
/// tem muitas amostras e o array `difference` já tem resolução suficiente.
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

/// Refina um tau inteiro (muito curto = frequência alta) com busca fracionária
/// sub-amostra ao redor do inteiro, usando interpolação linear do sinal. Só
/// necessário quando o período tem poucas amostras (ex.: 2000 Hz @ 48 kHz ≈ 24).
fn refine_tau_fractional(window: &[f32], half_window: usize, tau_int: usize) -> f32 {
    let step = 0.05_f32;
    let range = 0.3_f32;

    // Busca grossa de -0.3 a +0.3 amostra em torno de tau_int.
    let mut best_frac = 0.0_f32;
    let mut best_diff = f32::MAX;
    let mut frac = -range;
    while frac <= range {
        let d = difference_at_tau(window, half_window, tau_int as f32 + frac);
        if d < best_diff {
            best_diff = d;
            best_frac = frac;
        }
        frac += step;
    }

    // Interpolação parabólica fina nos 3 pontos fracionários ao redor do melhor.
    let f0 = best_frac - step;
    let f1 = best_frac;
    let f2 = best_frac + step;
    let d0 = difference_at_tau(window, half_window, tau_int as f32 + f0);
    let d1 = difference_at_tau(window, half_window, tau_int as f32 + f1);
    let d2 = difference_at_tau(window, half_window, tau_int as f32 + f2);

    let denom = d0 - 2.0 * d1 + d2;
    if denom.abs() > f32::EPSILON {
        let offset = 0.5 * (d0 - d2) / denom;
        let refined_frac = best_frac + offset;
        if refined_frac.abs() <= range {
            return tau_int as f32 + refined_frac;
        }
    }
    tau_int as f32 + best_frac
}

/// Retorna o valor do sinal em um índice fracionário via interpolação linear.
/// Índices fora dos bounds são clampados ao valor mais próximo. Usado apenas
/// pelo refinamento fracionário de frequências altas.
fn interpolated_sample(window: &[f32], idx: f32) -> f32 {
    let len = window.len();
    if idx <= 0.0 {
        return window[0];
    }
    if idx >= len as f32 - 1.0 {
        return window[len - 1];
    }
    let i = idx as usize;
    let frac = idx - i as f32;
    window[i] * (1.0 - frac) + window[i + 1] * frac
}

/// Calcula a função de diferença do YIN para um tau (possivelmente fracionário),
/// somando (w[i] - w[i + tau])² sobre a metade da janela. Usado apenas pelo
/// refinamento fracionário de frequências altas.
fn difference_at_tau(window: &[f32], half_window: usize, tau: f32) -> f32 {
    let mut sum = 0.0_f32;
    for index in 0..half_window {
        let a = interpolated_sample(window, index as f32);
        let b = interpolated_sample(window, index as f32 + tau);
        let delta = a - b;
        sum += delta * delta;
    }
    sum
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

    let refined_tau = if tau <= 200 {
        // Alta frequência (período curto): refinamento fracionário sub-amostra,
        // necessário porque a interpolação parabólica sobre `difference` não
        // tem resolução suficiente quando o período tem poucas amostras
        // (ex.: 2000 Hz @ 48 kHz ≈ 24 amostras).
        refine_tau_fractional(window, half_window, tau)
    } else {
        // Baixa/média frequência: refinamento parabólico sobre o array
        // `difference` já computado (comportamento original do YIN).
        refine_tau_parabolic(&difference, tau, max_tau)
    };

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
