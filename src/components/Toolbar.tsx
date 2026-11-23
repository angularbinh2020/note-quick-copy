import { useMemo } from "react";
import { Download, FolderPlus, Trash2, Upload } from "lucide-react";
import { api } from "../lib/api";
import { SCHEMA_VERSION } from "../lib/types";
import { nowIso } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";

export function Toolbar() {
  const groups = useNotesStore((s) => s.groups);
  const items = useNotesStore((s) => s.items);
  const openGroupModal = useNotesStore((s) => s.openGroupModal);
  const setTrashOpen = useNotesStore((s) => s.setTrashOpen);
  const startImport = useNotesStore((s) => s.startImport);
  const requestConfirm = useNotesStore((s) => s.requestConfirm);
  const setNotice = useNotesStore((s) => s.setNotice);

  const trashCount = useMemo(
    () => groups.filter((g) => g.deletedAt).length + items.filter((i) => i.deletedAt).length,
    [groups, items]
  );

  const handleExport = () => {
    requestConfirm({
      title: "Export JSON",
      message:
        "File export sẽ ở dạng PLAINTEXT (không mã hóa) — bất kỳ ai có file đều đọc được toàn bộ nội dung. Tiếp tục?",
      confirmLabel: "Chọn nơi lưu",
      danger: false,
      onConfirm: async () => {
        const stamp = nowIso().slice(0, 10).replace(/-/g, "");
        const path = await api.pickExportPath(`note-quick-copy-${stamp}.json`);
        if (!path) return;
        try {
          const { groups: gs, items: its } = useNotesStore.getState();
          const saved = await api.exportJson(path, {
            schemaVersion: SCHEMA_VERSION,
            updatedAt: nowIso(),
            groups: gs,
            items: its
          });
          setNotice(`Đã export: ${saved}`);
        } catch (err) {
          setNotice(`Export thất bại: ${String(err)}`);
        }
      }
    });
  };

  const handleImport = async () => {
    try {
      const path = await api.pickImportFile();
      if (path) startImport(path);
    } catch (err) {
      setNotice(`Không mở được hộp thoại chọn file: ${String(err)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <h1 className="mr-auto truncate text-sm font-bold tracking-tight">
          Note Quick Copy
          <span className="ml-2 hidden font-normal text-zinc-400 sm:inline">
            copy nhanh bằng 1 click
          </span>
        </h1>
        <button
          onClick={() => openGroupModal({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          title="Tạo group mới (Ctrl+N)"
        >
          <FolderPlus size={15} />
          New group
        </button>
        <button
          onClick={() => void handleImport()}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          title="Import từ file JSON"
        >
          <Upload size={15} />
          Import
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          title="Export toàn bộ data ra JSON"
        >
          <Download size={15} />
          Export
        </button>
        <button
          onClick={() => setTrashOpen(true)}
          className="relative inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          title="Thùng rác"
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">Thùng rác</span>
          {trashCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {trashCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
