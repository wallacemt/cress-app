use serde::Serialize;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};
use thiserror::Error;

const MAX_ENTRIES: usize = 50_000;
const MAX_PDFS: usize = 10_000;
const MAX_DEPTH: usize = 5;

#[derive(Debug, Error)]
pub enum ScoresError {
    #[error("could not read score folder: {0}")]
    ReadFolder(#[source] std::io::Error),
}
impl ScoresError {
    pub fn code(&self) -> &'static str {
        "read_folder"
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreEntry {
    pub entry_id: String,
    pub rel_dir: String,
    pub file_name: String,
    pub size_bytes: u64,
    #[serde(skip)]
    pub source_path: PathBuf,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IgnoredExtension {
    pub ext: String,
    pub count: u32,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub entries: Vec<ScoreEntry>,
    pub ignored_by_ext: Vec<IgnoredExtension>,
    pub ignored_by_ext_others: u32,
    pub skipped_deep_dirs: u32,
    pub truncated: bool,
}

pub fn scan(root: &Path) -> Result<ScanResult, ScoresError> {
    scan_with_limits(root, MAX_ENTRIES, MAX_PDFS)
}

fn scan_with_limits(
    root: &Path,
    max_entries: usize,
    max_pdfs: usize,
) -> Result<ScanResult, ScoresError> {
    let mut result = ScanResult {
        entries: Vec::new(),
        ignored_by_ext: Vec::new(),
        ignored_by_ext_others: 0,
        skipped_deep_dirs: 0,
        truncated: false,
    };
    let mut extensions: HashMap<String, u32> = HashMap::new();
    let mut stack = vec![(root.to_path_buf(), PathBuf::new(), 0usize)];
    let mut visited = 0usize;
    while let Some((dir, rel, depth)) = stack.pop() {
        let items = fs::read_dir(&dir).map_err(ScoresError::ReadFolder)?;
        for item in items {
            let item = item.map_err(ScoresError::ReadFolder)?;
            let name = item.file_name();
            if visited >= max_entries {
                result.truncated = true;
                break;
            }
            visited += 1;
            let name_text = name.to_string_lossy();
            if name_text.starts_with('.') {
                continue;
            }
            let path = item.path();
            let ty = item.file_type().map_err(ScoresError::ReadFolder)?;
            if ty.is_symlink() {
                continue;
            }
            if ty.is_dir() {
                if name_text.eq_ignore_ascii_case("$RECYCLE.BIN")
                    || name_text.eq_ignore_ascii_case("System Volume Information")
                {
                    continue;
                }
                if depth >= MAX_DEPTH {
                    result.skipped_deep_dirs += 1;
                    continue;
                }
                stack.push((path, rel.join(&name), depth + 1));
            } else if ty.is_file() {
                let Some(file_name) = name.to_str() else {
                    continue;
                };
                if Path::new(file_name)
                    .extension()
                    .is_some_and(|e| e.to_string_lossy().eq_ignore_ascii_case("pdf"))
                {
                    if result.entries.len() >= max_pdfs {
                        result.truncated = true;
                        break;
                    }
                    let size_bytes = item.metadata().map_err(ScoresError::ReadFolder)?.len();
                    let rel_dir = rel
                        .components()
                        .map(|c| c.as_os_str().to_string_lossy())
                        .collect::<Vec<_>>()
                        .join("/");
                    result.entries.push(ScoreEntry {
                        entry_id: result.entries.len().to_string(),
                        rel_dir,
                        file_name: file_name.to_owned(),
                        size_bytes,
                        source_path: path,
                    });
                } else {
                    let ext = Path::new(file_name)
                        .extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_default();
                    *extensions.entry(ext).or_default() += 1;
                }
            }
        }
        if result.truncated {
            break;
        }
    }
    let mut exts: Vec<_> = extensions.into_iter().collect();
    exts.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    result.ignored_by_ext_others = exts.iter().skip(10).map(|(_, n)| *n).sum();
    result.ignored_by_ext = exts
        .into_iter()
        .take(10)
        .map(|(ext, count)| IgnoredExtension { ext, count })
        .collect();
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };
    fn temp() -> PathBuf {
        let p = std::env::temp_dir().join(format!(
            "cress-scan-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&p).unwrap();
        p
    }
    #[test]
    fn scans_depth_hidden_extensions_and_limits() {
        let root = temp();
        for (dir, name) in [
            ("", "a.pdf"),
            ("", "b.PDF"),
            ("1/2/3/4/5", "deep.pdf"),
            ("1/2/3/4/5/6", "skip.pdf"),
            ("$RECYCLE.BIN", "trash.pdf"),
            ("", ".x.pdf"),
            ("", "x.mp3"),
            ("", "x.mxl"),
        ] {
            let d = root.join(dir);
            fs::create_dir_all(&d).unwrap();
            fs::write(d.join(name), b"").unwrap();
        }
        // 100 é bem acima dos 3 PDFs elegíveis (a.pdf, b.PDF, deep.pdf) -- não deve truncar.
        let r = scan_with_limits(&root, 100, 100).unwrap();
        assert_eq!(r.entries.len(), 3);
        assert_eq!(r.skipped_deep_dirs, 1);
        assert!(r.entries.iter().all(|e| !e.rel_dir.contains('\\')));
        assert!(r.entries.iter().any(|e| e.file_name == "deep.pdf"));
        assert!(!r.entries.iter().any(|e| e.file_name == "skip.pdf"
            || e.file_name == "trash.pdf"
            || e.file_name == ".x.pdf"));
        assert!(!r.truncated);
        assert!(r.ignored_by_ext.iter().any(|e| e.ext == "mp3"));
        assert!(r.ignored_by_ext.iter().any(|e| e.ext == "mxl"));
        let _ = fs::remove_dir_all(root);
    }
    #[test]
    fn truncates_when_pdf_limit_is_exceeded() {
        let root = temp();
        for name in ["a.pdf", "b.pdf", "c.pdf", "d.pdf"] {
            fs::write(root.join(name), b"").unwrap();
        }
        let r = scan_with_limits(&root, 100, 2).unwrap();
        assert_eq!(r.entries.len(), 2);
        assert!(r.truncated);
        let _ = fs::remove_dir_all(root);
    }
    #[test]
    fn hidden_entries_count_toward_the_scan_limit() {
        let root = temp();
        fs::write(root.join(".hidden"), b"").unwrap();
        fs::write(root.join("visible.pdf"), b"%PDF-").unwrap();
        let result = scan_with_limits(&root, 1, 10).unwrap();
        assert!(result.truncated);
        assert!(result.entries.is_empty());
        let _ = fs::remove_dir_all(root);
    }
    #[cfg(unix)]
    #[test]
    fn keeps_real_entry_path_when_display_path_is_lossy() {
        use std::os::unix::ffi::OsStrExt;
        let root = temp();
        let invalid_name = std::ffi::OsStr::from_bytes(b"bad-\xff");
        let dir = root.join(invalid_name);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("score.pdf"), b"%PDF-").unwrap();
        let result = scan_with_limits(&root, 10, 10).unwrap();
        assert_eq!(result.entries.len(), 1);
        assert!(result.entries[0].rel_dir.contains('\u{fffd}'));
        assert_eq!(result.entries[0].source_path, dir.join("score.pdf"));
        let _ = fs::remove_dir_all(root);
    }
    #[cfg(unix)]
    #[test]
    fn skips_symlink() {
        use std::os::unix::fs::symlink;
        let root = temp();
        let outside = temp();
        fs::write(outside.join("x.pdf"), b"").unwrap();
        symlink(&outside, root.join("linked")).unwrap();
        let r = scan_with_limits(&root, 100, 10).unwrap();
        assert!(r.entries.is_empty());
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(outside);
    }
}
