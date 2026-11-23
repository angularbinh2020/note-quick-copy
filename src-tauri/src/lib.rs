mod commands;
mod crypto;
mod model;
mod storage;
mod trash;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_notes,
            commands::save_notes,
            commands::purge_trash,
            commands::export_json,
            commands::import_json,
            commands::get_or_create_key
        ])
        .run(tauri::generate_context!())
        .expect("Lỗi khi khởi động Note Quick Copy");
}
