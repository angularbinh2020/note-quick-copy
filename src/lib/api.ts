import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ImportResult, NotesData, PurgeResult } from "./types";

export const api = {
  loadNotes: () => invoke<NotesData>("load_notes"),
  saveNotes: (data: NotesData) => invoke<void>("save_notes", { data }),
  purgeTrash: () => invoke<PurgeResult>("purge_trash"),
  exportJson: (path: string, data: NotesData) => invoke<string>("export_json", { path, data }),
  importJson: (path: string, mode: "replace" | "merge") =>
    invoke<ImportResult>("import_json", { path, mode }),
  checkKey: () => invoke<void>("get_or_create_key"),

  pickImportFile: () =>
    open({
      multiple: false,
      title: "Chọn file JSON để import",
      filters: [{ name: "JSON", extensions: ["json"] }]
    }),

  pickExportPath: (defaultName: string) =>
    save({
      defaultPath: defaultName,
      title: "Chọn nơi lưu file export",
      filters: [{ name: "JSON", extensions: ["json"] }]
    })
};

export async function copyText(text: string): Promise<void> {
  try {
    await writeText(text);
  } catch {
    await navigator.clipboard.writeText(text);
  }
}
