import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "../lib/api";
import { useNotesStore } from "../store/useNotesStore";

export function ImportModeModal() {
  const importPath = useNotesStore((s) => s.importPath);
  const startImport = useNotesStore((s) => s.startImport);
  const applyImport = useNotesStore((s) => s.applyImport);
  const setNotice = useNotesStore((s) => s.setNotice);
  const [busy, setBusy] = useState(false);

  if (!importPath) return null;

  const run = async (mode: "replace" | "merge") => {
    setBusy(true);
    try {
      const result = await api.importJson(importPath, mode);
      applyImport(result);
    } catch (err) {
      setNotice(`Import thất bại: ${String(err)}`);
      startImport(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !busy && startImport(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl focus:outline-none">
          <Dialog.Title className="text-sm font-semibold">Chọn chế độ import</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-zinc-500">
            File hợp lệ. Bạn muốn import theo cách nào?
          </Dialog.Description>
          <div className="mt-3 grid gap-2">
            <button
              disabled={busy}
              onClick={() => void run("merge")}
              className="rounded-lg border border-zinc-300 p-3 text-left hover:border-zinc-500 disabled:opacity-50"
            >
              <span className="block text-sm font-semibold">Merge (gộp thêm)</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Thêm group/item mới vào dữ liệu hiện tại. Trùng id → giữ bản trong app.
              </span>
            </button>
            <button
              disabled={busy}
              onClick={() => void run("replace")}
              className="rounded-lg border border-red-200 p-3 text-left hover:border-red-400 disabled:opacity-50"
            >
              <span className="block text-sm font-semibold text-red-700">
                Replace (thay toàn bộ)
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Xóa hết data hiện tại, thay bằng file import. File hiện tại được tự
                động backup trước khi thay.
              </span>
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              disabled={busy}
              onClick={() => startImport(null)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
