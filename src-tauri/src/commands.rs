use crate::crypto;
use crate::model::{self, ImportFile, ImportResult, ImportSummary, NotesData, PurgeResult};
use crate::storage;
use crate::trash;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

/// Đọc + giải mã file dữ liệu. App gọi lúc khởi động.
#[tauri::command]
pub fn load_notes() -> Result<NotesData, String> {
    storage::load()
}

/// Mã hóa + ghi file dữ liệu (atomic, có backup).
#[tauri::command]
pub fn save_notes(data: NotesData) -> Result<(), String> {
    let data = model::normalize(data, &now_iso());
    storage::save(&data)
}

/// Xóa vĩnh viễn các mục đã nằm trong thùng rác quá 30 ngày,
/// trả về dữ liệu mới + số bản bị xóa.
#[tauri::command]
pub fn purge_trash() -> Result<PurgeResult, String> {
    let mut data = storage::load()?;
    let purged = trash::purge_expired(&mut data, chrono::Utc::now());
    if purged > 0 {
        data.updated_at = now_iso();
        storage::save(&data)?;
    }
    Ok(PurgeResult { purged, data })
}

/// Xuất toàn bộ data (kể cả thùng rác) ra file JSON plaintext do user chọn.
#[tauri::command]
pub fn export_json(path: String, data: NotesData) -> Result<String, String> {
    let export = model::to_export(&data, now_iso());
    let json = serde_json::to_vec_pretty(&export)
        .map_err(|e| format!("Không serialize được dữ liệu: {e}"))?;
    std::fs::write(&path, json).map_err(|e| format!("Không ghi được file: {e}"))?;
    Ok(path)
}

/// Đọc + validate file JSON export, rồi replace hoặc merge vào dữ liệu hiện tại.
#[tauri::command]
pub fn import_json(path: String, mode: String) -> Result<ImportResult, String> {
    let raw = std::fs::read(&path).map_err(|e| format!("Không đọc được file: {e}"))?;
    let file: ImportFile = serde_json::from_slice(&raw)
        .map_err(|e| format!("File JSON không đúng cấu trúc: {e}"))?;
    if file.app != model::APP_NAME {
        return Err(format!(
            "File không phải bản export của {app} (app = \"{}\").",
            file.app,
            app = model::APP_NAME
        ));
    }
    if file.schema_version != model::SCHEMA_VERSION {
        return Err(format!(
            "Phiên bản schema không được hỗ trợ: {} (hỗ trợ: {})",
            file.schema_version,
            model::SCHEMA_VERSION
        ));
    }

    match mode.as_str() {
        "replace" => {
            storage::snapshot_backup()?;
            let data = model::normalize(model::from_import(file, &now_iso()), &now_iso());
            let summary = ImportSummary {
                mode: "replace".to_string(),
                groups_added: data.groups.len(),
                items_added: data.items.len(),
                groups_kept: 0,
                items_kept: 0,
            };
            storage::save(&data)?;
            Ok(ImportResult { summary, data })
        }
        "merge" => {
            let current = storage::load()?;
            let imported = model::from_import(file, &now_iso());
            let (data, summary) = model::merge(current, imported, &now_iso());
            let data = model::normalize(data, &now_iso());
            storage::save(&data)?;
            Ok(ImportResult { summary, data })
        }
        other => Err(format!("Chế độ import không hợp lệ: {other}")),
    }
}

/// Kiểm tra/lấy encryption key trong OS keyring (tạo nếu chưa có).
#[tauri::command]
pub fn get_or_create_key() -> Result<(), String> {
    crypto::get_or_create_key().map(|mut key| crypto::zeroize_key(&mut key))
}
