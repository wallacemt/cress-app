use std::path::PathBuf;

use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PathsError {
    #[error("recording path contains a parent-directory segment")]
    PathTraversal,
    #[error("recording path must be relative")]
    AbsolutePath,
    #[error("recording path has an invalid format")]
    InvalidFormat,
    #[error("recording path must use the .wav extension")]
    InvalidExtension,
    #[error("recording path contains an invalid or non-v4 UUID")]
    InvalidUuid,
    #[error("could not resolve application data directory: {0}")]
    AppDataDir(#[source] tauri::Error),
}

impl PathsError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::PathTraversal => "path_traversal",
            Self::AbsolutePath => "absolute_path",
            Self::InvalidFormat => "invalid_format",
            Self::InvalidExtension => "invalid_extension",
            Self::InvalidUuid => "invalid_uuid",
            Self::AppDataDir(_) => "app_data_dir_unavailable",
        }
    }
}

pub fn validate_recording_rel(rel: &str) -> Result<(), PathsError> {
    if rel
        .split(['/', '\\'])
        .any(|segment| segment.contains(".."))
    {
        return Err(PathsError::PathTraversal);
    }
    if rel.starts_with(['/', '\\']) || rel.as_bytes().get(1) == Some(&b':') {
        return Err(PathsError::AbsolutePath);
    }

    let segments: Vec<&str> = rel.split('/').collect();
    if segments.len() != 3
        || segments[0].len() != 4
        || !segments[0].bytes().all(|byte| byte.is_ascii_digit())
        || segments[1].len() != 2
        || !segments[1].bytes().all(|byte| byte.is_ascii_digit())
    {
        return Err(PathsError::InvalidFormat);
    }

    let month = segments[1].parse::<u8>().map_err(|_| PathsError::InvalidFormat)?;
    if !(1..=12).contains(&month) {
        return Err(PathsError::InvalidFormat);
    }

    let filename = segments[2];
    let Some(uuid_text) = filename.strip_suffix(".wav") else {
        return Err(PathsError::InvalidExtension);
    };
    if uuid_text.len() != 36 {
        return Err(PathsError::InvalidUuid);
    }
    if !uuid_text.bytes().all(|byte| {
        byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte) || byte == b'-'
    }) {
        return Err(PathsError::InvalidUuid);
    }
    let uuid = uuid::Uuid::parse_str(uuid_text).map_err(|_| PathsError::InvalidUuid)?;
    if uuid.get_version() != Some(uuid::Version::Random)
        || uuid.get_variant() != uuid::Variant::RFC4122
    {
        return Err(PathsError::InvalidUuid);
    }

    Ok(())
}

pub fn recordings_root(app: &tauri::AppHandle) -> Result<PathBuf, PathsError> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("recordings"))
        .map_err(PathsError::AppDataDir)
}

pub fn resolve_recording_path(
    app: &tauri::AppHandle,
    rel: &str,
) -> Result<PathBuf, PathsError> {
    validate_recording_rel(rel)?;
    Ok(recordings_root(app)?.join(rel))
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_REL: &str = "2026/11/550e8400-e29b-41d4-a716-446655440000.wav";

    #[test]
    fn accepts_valid_recording_path() {
        assert!(validate_recording_rel(VALID_REL).is_ok());
    }

    #[test]
    fn rejects_invalid_months() {
        for rel in [
            "2026/13/550e8400-e29b-41d4-a716-446655440000.wav",
            "2026/00/550e8400-e29b-41d4-a716-446655440000.wav",
        ] {
            assert!(matches!(validate_recording_rel(rel), Err(PathsError::InvalidFormat)));
        }
    }

    #[test]
    fn rejects_parent_directory_segments_and_occurrences() {
        for rel in [
            "2026/11/../../etc/passwd",
            "../2026/11/550e8400-e29b-41d4-a716-446655440000.wav",
            "2026/11/name..wav",
            "2026/11/x..550e8400-e29b-41d4-a716-446655440000.wav",
        ] {
            assert!(matches!(validate_recording_rel(rel), Err(PathsError::PathTraversal)));
        }
    }

    #[test]
    fn rejects_absolute_paths() {
        for rel in ["/etc/passwd", "\\etc\\passwd", "C:\\Windows\\file.wav"] {
            assert!(matches!(validate_recording_rel(rel), Err(PathsError::AbsolutePath)));
        }
    }

    #[test]
    fn rejects_wrong_extensions() {
        for rel in [
            "2026/11/550e8400-e29b-41d4-a716-446655440000.mp3",
            "2026/11/550e8400-e29b-41d4-a716-446655440000.WAV",
            "2026/11/550e8400-e29b-41d4-a716-446655440000",
        ] {
            assert!(matches!(validate_recording_rel(rel), Err(PathsError::InvalidExtension)));
        }
    }

    #[test]
    fn rejects_malformed_and_non_v4_uuids() {
        for rel in [
            "2026/11/not-a-uuid.wav",
            "2026/11/550e8400-e29b-11d4-a716-446655440000.wav",
        ] {
            assert!(matches!(validate_recording_rel(rel), Err(PathsError::InvalidUuid)));
        }
    }

    #[test]
    fn validated_relative_path_joins_under_recordings_root() {
        let root = PathBuf::from("/app/data/recordings");
        let resolved = resolve_under_root(&root, VALID_REL).unwrap();
        assert_eq!(resolved, root.join(VALID_REL));
        assert!(resolved.starts_with(&root));
    }

    #[test]
    fn invalid_path_is_rejected_before_root_is_used() {
        assert!(matches!(
            resolve_under_root(PathBuf::new().as_path(), "../escape.wav"),
            Err(PathsError::PathTraversal)
        ));
    }

    fn resolve_under_root(root: &std::path::Path, rel: &str) -> Result<PathBuf, PathsError> {
        validate_recording_rel(rel)?;
        Ok(root.join(rel))
    }
}
