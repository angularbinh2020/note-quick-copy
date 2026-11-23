use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};

use zeroize::Zeroize;

use crate::crypto;
use crate::model::NotesData;

pub fn data_dir() -> Result<PathBuf, String> {
    let base = std::env::var("APPDATA")
        .map_err(|_| "Không tìm thấy biến môi trường %APPDATA%.".to_string())?;
    let dir = PathBuf::from(base).join("note-quick-copy");
    fs::create_dir_all(&dir).map_err(|e| format!("Không tạo được thư mục dữ liệu: {e}"))?;
    Ok(dir)
}

pub fn enc_path() -> Result<PathBuf, String> {
    Ok(data_dir()?.join("notes.enc"))
}

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut os: OsString = path.as_os_str().to_owned();
    os.push(suffix);
    PathBuf::from(os)
}

fn bak_path(path: &Path) -> PathBuf {
    with_suffix(path, ".bak")
}

fn tmp_path(path: &Path) -> PathBuf {
    with_suffix(path, ".tmp")
}

fn read_and_decrypt(path: &Path, key: &[u8]) -> Result<NotesData, String> {
    if !path.exists() {
        return Ok(NotesData::default());
    }
    let blob = fs::read(path).map_err(|e| format!("Không đọc được {}: {e}", path.display()))?;
    let plaintext = crypto::decrypt(&blob, key)?;
    serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Dữ liệu giải mã không đúng cấu trúc: {e}"))
}

/// Đọc + giải mã notes.enc; nếu file chính hỏng → thử file backup .bak.
/// File chưa tồn tại → trả về dữ liệu rỗng (lần chạy đầu).
pub fn load() -> Result<NotesData, String> {
    let path = enc_path()?;
    let mut key = crypto::get_or_create_key()?;
    let result = match read_and_decrypt(&path, &key) {
        Ok(data) => Ok(data),
        Err(primary_err) => {
            let bak = bak_path(&path);
            read_and_decrypt(&bak, &key).map_err(|bak_err| {
                format!(
                    "Không đọc được dữ liệu chính ({primary_err}) và cũng không khôi phục được từ backup ({bak_err})."
                )
            })
        }
    };
    key.zeroize();
    result
}

/// Ghi an toàn: serialize → mã hóa → ghi file tạm .tmp → copy bản cũ sang
/// .bak → rename đè lên notes.enc (atomic trên cùng volume NTFS).
pub fn save(data: &NotesData) -> Result<(), String> {
    let path = enc_path()?;
    let json = serde_json::to_vec(data).map_err(|e| format!("Không serialize được dữ liệu: {e}"))?;
    let mut key = crypto::get_or_create_key()?;
    let blob = crypto::encrypt(&json, &key)?;
    key.zeroize();

    let tmp = tmp_path(&path);
    fs::write(&tmp, &blob).map_err(|e| format!("Không ghi được file tạm: {e}"))?;
    if path.exists() {
        fs::copy(&path, bak_path(&path)).map_err(|e| format!("Không tạo được bản backup: {e}"))?;
    }
    fs::rename(&tmp, &path).map_err(|e| format!("Không ghi được file dữ liệu (rename): {e}"))?;
    Ok(())
}

/// Backup file dữ liệu hiện tại trước khi import replace.
pub fn snapshot_backup() -> Result<(), String> {
    let path = enc_path()?;
    if path.exists() {
        let dest = with_suffix(&path, ".pre-import.bak");
        fs::copy(&path, &dest)
            .map_err(|e| format!("Không tạo được backup trước khi import: {e}"))?;
    }
    Ok(())
}
