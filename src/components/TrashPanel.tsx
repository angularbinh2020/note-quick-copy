import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Folder, RotateCcw, Trash2, X } from "lucide-react";
import { UNCATEGORIZED_NAME, type Group, type Item } from "../lib/types";
import { byDeletedDesc, cn, daysLeft, formatDate } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";

export function TrashPanel() {
  const trashOpen = useNotesStore((s) => s.trashOpen);
  const setTrashOpen = useNotesStore((s) => s.setTrashOpen);
  const groups = useNotesStore((s) => s.groups);
  const items = useNotesStore((s) => s.items);
  const restoreItem = useNotesStore((s) => s.restoreItem);
  const restoreGroup = useNotesStore((s) => s.restoreGroup);
  const deleteItemForever = useNotesStore((s) => s.deleteItemForever);
  const deleteGroupForever = useNotesStore((s) => s.deleteGroupForever);
  const emptyTrash = useNotesStore((s) => s.emptyTrash);
  const requestConfirm = useNotesStore((s) => s.requestConfirm);

  const trashedGroups = useMemo(
    () => groups.filter((g) => g.deletedAt).sort(byDeletedDesc),
    [groups]
  );
  const trashedItems = useMemo(
    () => items.filter((i) => i.deletedAt).sort(byDeletedDesc),
    [items]
  );

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) map.set(g.id, g.name);
    return map;
  }, [groups]);

  const handleEmpty = () => {
    requestConfirm({
      title: "Dọn sạch thùng rác",
      message: `Xóa vĩnh viễn ${trashedGroups.length} group và ${trashedItems.length} item trong thùng rác? Thao tác này không thể hoàn tác.`,
      confirmLabel: "Xóa vĩnh viễn",
      danger: true,
      onConfirm: emptyTrash
    });
  };

  const handleDeleteGroupForever = (group: Group) => {
    const count = items.filter((i) => i.groupId === group.id).length;
    requestConfirm({
      title: "Xóa vĩnh viễn group",
      message: `Xóa vĩnh viễn group "${group.name}" và ${count} item? Không thể hoàn tác.`,
      confirmLabel: "Xóa vĩnh viễn",
      danger: true,
      onConfirm: () => deleteGroupForever(group.id)
    });
  };

  return (
    <Dialog.Root open={trashOpen} onOpenChange={setTrashOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(680px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white p-4 shadow-2xl focus:outline-none">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">
              Thùng rác{" "}
              <span className="ml-1 font-normal text-zinc-400">
                (tự xóa vĩnh viễn sau 30 ngày)
              </span>
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {trashedGroups.length === 0 && trashedItems.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-400">
                Thùng rác trống. Item/group bị xóa sẽ xuất hiện ở đây trong 30 ngày.
              </p>
            )}

            {trashedGroups.length > 0 && (
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <Folder size={13} />
                  Group ({trashedGroups.length})
                </h3>
                <div className="space-y-1.5">
                  {trashedGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                      <span className="shrink-0 text-[11px] text-zinc-400" title="Số ngày còn lại trước khi tự xóa">
                        còn {daysLeft(g.deletedAt ?? "")} ngày
                      </span>
                      <button
                        onClick={() => restoreGroup(g.id)}
                        title="Khôi phục group"
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-green-700"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroupForever(g)}
                        title="Xóa vĩnh viễn"
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {trashedItems.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-zinc-500">
                  Item ({trashedItems.length})
                </h3>
                <div className="space-y-1.5">
                  {trashedItems.map((it: Item) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm leading-5 line-clamp-2">
                          {it.content || <span className="text-zinc-400">(trống)</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {groupNameById.get(it.groupId) ?? UNCATEGORIZED_NAME} · xóa lúc{" "}
                          {formatDate(it.deletedAt ?? "")}
                        </p>
                      </div>
                      <button
                        onClick={() => restoreItem(it.id)}
                        title="Khôi phục item"
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-green-700"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => deleteItemForever(it.id)}
                        title="Xóa vĩnh viễn"
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className={cn("mt-3 flex justify-end", trashedGroups.length + trashedItems.length === 0 && "hidden")}>
            <button
              onClick={handleEmpty}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 size={14} />
              Dọn sạch thùng rác
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
