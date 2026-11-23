import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Group, Item } from "../lib/types";
import { cn } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";
import { ItemRow } from "./ItemRow";
import { QuickInput } from "./QuickInput";

interface Props {
  group: Group;
  items: Item[];
}

export function GroupCard({ group, items }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: "group" }
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `list:${group.id}`,
    data: { type: "group-list", groupId: group.id }
  });

  const toggleCollapse = useNotesStore((s) => s.toggleCollapse);
  const openGroupModal = useNotesStore((s) => s.openGroupModal);
  const deleteGroup = useNotesStore((s) => s.deleteGroup);
  const requestConfirm = useNotesStore((s) => s.requestConfirm);

  const handleDelete = () => {
    requestConfirm({
      title: "Xóa group",
      message: `Xóa group "${group.name}" cùng toàn bộ ${items.length} item bên trong? Bạn có thể khôi phục từ Thùng rác.`,
      confirmLabel: "Xóa group",
      danger: true,
      onConfirm: () => deleteGroup(group.id)
    });
  };

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-sm",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-zinc-300"
      )}
    >
      <header className="flex items-center gap-0.5 px-2 py-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Kéo để đổi thứ tự group"
          className="cursor-grab rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <button
          onClick={() => toggleCollapse(group.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-zinc-50"
          title={group.collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {group.collapsed ? <ChevronRight size={17} className="shrink-0 text-zinc-400" /> : <ChevronDown size={17} className="shrink-0 text-zinc-400" />}
          <span className="truncate text-sm font-semibold">{group.name}</span>
          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-500">
            {items.length}
          </span>
        </button>
        <button
          onClick={() => openGroupModal({ mode: "rename", groupId: group.id })}
          aria-label="Đổi tên group"
          title="Đổi tên group"
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={handleDelete}
          aria-label="Xóa group"
          title="Xóa group (chuyển vào thùng rác)"
          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </header>

      {!group.collapsed && (
        <div className="px-3 pb-3">
          <QuickInput groupId={group.id} />
          <div
            ref={setDroppableRef}
            className={cn(
              "mt-2 grid grid-cols-1 gap-2 md:grid-cols-2",
              items.length === 0 && "grid-cols-1"
            )}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              {items.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </SortableContext>
            {items.length === 0 && (
              <p className="py-5 text-center text-xs text-zinc-400">
                Chưa có item — nhập vào ô quick input phía trên rồi bấm Enter.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
