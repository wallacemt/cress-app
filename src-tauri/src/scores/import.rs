use std::{
    fs::{self, File},
    io::{self, Read, Seek, Write},
    path::Path,
};

use serde::Serialize;
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::paths::PathsError;

const MAX_SCORE_SIZE: u64 = 200 * 1024 * 1024;
const COPY_BUFFER_SIZE: usize = 64 * 1024;

#[derive(Debug, Error)]
pub enum ImportError {
    #[error("could not inspect or copy score: {0}")]
    Io(#[from] io::Error),
    #[error("score must be a regular non-symlink PDF")]
    InvalidFile,
    #[error("score exceeds the maximum allowed size")]
    TooLarge,
    #[error("file content does not start with %PDF-")]
    NotPdf,
    #[error("could not resolve scores directory: {0}")]
    Paths(#[from] PathsError),
}

impl ImportError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Io(_) => "io_error",
            Self::InvalidFile => "invalid_file",
            Self::TooLarge => "too_large",
            Self::NotPdf => "not_a_pdf",
            Self::Paths(error) => error.code(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedScore {
    pub relative_path: String,
    pub sha256: String,
}

pub fn import_file(source: &Path, destination_root: &Path) -> Result<ImportedScore, ImportError> {
    import_file_with_limit(source, destination_root, MAX_SCORE_SIZE)
}

fn import_file_with_limit(
    source: &Path,
    destination_root: &Path,
    max_size_bytes: u64,
) -> Result<ImportedScore, ImportError> {
    let metadata = fs::symlink_metadata(source)?;
    if !metadata.file_type().is_file() || metadata.file_type().is_symlink() {
        return Err(ImportError::InvalidFile);
    }
    if !source
        .extension()
        .is_some_and(|extension| extension.to_string_lossy().eq_ignore_ascii_case("pdf"))
    {
        return Err(ImportError::InvalidFile);
    }
    if metadata.len() > max_size_bytes {
        return Err(ImportError::TooLarge);
    }

    let mut input = File::open(source)?;
    let mut header = [0; 5];
    if input.read_exact(&mut header).is_err() || &header != b"%PDF-" {
        return Err(ImportError::NotPdf);
    }
    input.rewind()?;

    fs::create_dir_all(destination_root)?;
    let relative_path = format!("{}.pdf", uuid::Uuid::new_v4());
    let destination = destination_root.join(&relative_path);
    let mut output = File::create(&destination)?;
    let mut hash = Sha256::new();
    let mut buffer = [0; COPY_BUFFER_SIZE];
    let mut copied = 0u64;
    loop {
        let count = input.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        copied += count as u64;
        if copied > max_size_bytes {
            drop(output);
            let _ = fs::remove_file(&destination);
            return Err(ImportError::TooLarge);
        }
        output.write_all(&buffer[..count])?;
        hash.update(&buffer[..count]);
    }
    output.flush()?;
    Ok(ImportedScore {
        relative_path,
        sha256: hash
            .finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paths;
    use std::{
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_dir() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "cress-score-import-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn rejects_non_pdf_and_oversized_files_without_copying() {
        let root = temp_dir();
        let destination = root.join("scores");
        let source = root.join("bad.pdf");
        fs::write(&source, b"hello").unwrap();
        assert_eq!(
            import_file_with_limit(&source, &destination, 100)
                .unwrap_err()
                .code(),
            "not_a_pdf"
        );
        assert!(!destination.exists());
        fs::write(&source, b"%PDF-012345678901234").unwrap();
        assert_eq!(
            import_file_with_limit(&source, &destination, 10)
                .unwrap_err()
                .code(),
            "too_large"
        );
        assert!(!destination.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn copies_pdf_with_v4_name_and_hash_of_written_bytes() {
        let root = temp_dir();
        let destination = root.join("scores");
        let source = root.join("valid.PDF");
        let bytes = b"%PDF-arbitrary bytes";
        fs::write(&source, bytes).unwrap();
        let imported = import_file_with_limit(&source, &destination, 100).unwrap();
        paths::validate_score_rel(&imported.relative_path).unwrap();
        let copied = fs::read(destination.join(&imported.relative_path)).unwrap();
        assert_eq!(copied, bytes);
        let expected: String = Sha256::digest(bytes)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect();
        assert_eq!(imported.sha256, expected);
        let _ = fs::remove_dir_all(root);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_source_without_copying() {
        use std::os::unix::fs::symlink;
        let root = temp_dir();
        let source = root.join("real.pdf");
        fs::write(&source, b"%PDF-valid").unwrap();
        let link = root.join("link.pdf");
        symlink(&source, &link).unwrap();
        let destination = root.join("scores");
        assert_eq!(
            import_file_with_limit(&link, &destination, 100)
                .unwrap_err()
                .code(),
            "invalid_file"
        );
        assert!(!destination.exists());
        let _ = fs::remove_dir_all(root);
    }
}
