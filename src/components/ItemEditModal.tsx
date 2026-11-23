import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useNotesStore } from "../store/useNotesStore";

export function ItemEditModal() {
  const editingItemId = useNotesStore((s) => s.editingItemId);
  const items = useNotesStore((s) => s.items);
  const updateItem = useNotesStore((s) => s.updateItem);
  const setEditingItem = useNotesStore((s) => s.setEditingItem);
  const [content, setContent] = useState("");

  const item = items.find((i) => i.id === editingItemId && !i.deletedAt) ?? null;

  useEffect(() => {
    setContent(item?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItemId]);

  if (!item) return null;

  const save = () => {
    if (content !== item.content) updateItem(item.id, content);
    setEditingItem(null);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && setEditingItem(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(680px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl focus:outline-none">
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">Sửa item</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X size={16} />
            </Dialog.Close>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                save();
              }
            }}
            className="h-64 w-full resize-y rounded-lg border border-zinc-300 p-2.5 text-sm leading-6 outline-none focus:border-zinc-500"
            placeholder="Nội dung item…"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400">
              {content.length} ký tự · Ctrl+Enter: lưu · Esc: đóng
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Đóng
              </button>
              <button
                onClick={save}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
