import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNotesStore } from "../store/useNotesStore";

export function GroupNameModal() {
  const groupModal = useNotesStore((s) => s.groupModal);
  const groups = useNotesStore((s) => s.groups);
  const createGroup = useNotesStore((s) => s.createGroup);
  const renameGroup = useNotesStore((s) => s.renameGroup);
  const openGroupModal = useNotesStore((s) => s.openGroupModal);
  const [name, setName] = useState("");

  const existing =
    groupModal?.mode === "rename" ? groups.find((g) => g.id === groupModal.groupId) : null;

  useEffect(() => {
    setName(existing?.name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupModal]);

  if (!groupModal) return null;

  const submit = () => {
    const value = name.trim();
    if (!value) return;
    if (groupModal.mode === "rename" && existing) {
      renameGroup(existing.id, value);
    } else {
      createGroup(value);
    }
    openGroupModal(null);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && openGroupModal(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl focus:outline-none">
          <Dialog.Title className="text-sm font-semibold">
            {groupModal.mode === "rename" ? "Đổi tên group" : "Tạo group mới"}
          </Dialog.Title>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") openGroupModal(null);
            }}
            placeholder="Tên group (VD: Snippets, Lệnh hay dùng…)"
            className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => openGroupModal(null)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Hủy
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {groupModal.mode === "rename" ? "Lưu" : "Tạo group"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
