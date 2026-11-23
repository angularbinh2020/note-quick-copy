import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { FolderPlus } from "lucide-react";
import type { Group, Item } from "../lib/types";
import { byOrder, arrayMove } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";
import { GroupCard } from "./GroupCard";
import { GroupCardOverlay, ItemRowOverlay } from "./Overlays";

interface ActiveDrag {
  type: "group" | "item";
  id: string;
}

export function GroupList() {
  const groups = useNotesStore((s) => s.groups);
  const items = useNotesStore((s) => s.items);
  const reorderGroups = useNotesStore((s) => s.reorderGroups);
  const reorderItems = useNotesStore((s) => s.reorderItems);
  const moveItemToGroup = useNotesStore((s) => s.moveItemToGroup);
  const openGroupModal = useNotesStore((s) => s.openGroupModal);

  const activeGroups = useMemo(
    () => groups.filter((g) => !g.deletedAt).sort(byOrder),
    [groups]
  );

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const g of activeGroups) map.set(g.id, []);
    for (const it of items) {
      if (it.deletedAt) continue;
      map.get(it.groupId)?.push(it);
    }
    for (const arr of map.values()) arr.sort(byOrder);
    return map;
  }, [activeGroups, items]);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === "group" || type === "item") {
      setActiveDrag({ type, id: String(event.active.id) });
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "item") return;
    const activeItem = itemsById.get(String(active.id));
    if (!activeItem) return;
    const overData = over.data.current;

    if (overData?.type === "item") {
      const overItem = itemsById.get(String(over.id));
      if (!overItem || overItem.groupId === activeItem.groupId) return;
      const targetList = itemsByGroup.get(overItem.groupId) ?? [];
      const index = targetList.findIndex((i) => i.id === overItem.id);
      moveItemToGroup(activeItem.id, overItem.groupId, index >= 0 ? index : "end");
      return;
    }

    if (overData?.type === "group") {
      const gid = String(over.id);
      if (gid !== activeItem.groupId) moveItemToGroup(activeItem.id, gid, "end");
      return;
    }

    if (overData?.type === "group-list") {
      const gid = String(overData.groupId);
      if (gid !== activeItem.groupId) moveItemToGroup(activeItem.id, gid, "end");
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const activeType = active.data.current?.type;
    const overData = over.data.current;

    if (activeType === "group") {
      if (overData?.type !== "group") return;
      const ids = activeGroups.map((g) => g.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1 || from === to) return;
      reorderGroups(arrayMove(ids, from, to));
      return;
    }

    if (activeType === "item") {
      const activeItem = itemsById.get(String(active.id));
      if (!activeItem) return;

      if (overData?.type === "item") {
        const overItem = itemsById.get(String(over.id));
        if (!overItem) return;
        if (overItem.groupId !== activeItem.groupId) {
          const targetList = itemsByGroup.get(overItem.groupId) ?? [];
          const index = targetList.findIndex((i) => i.id === overItem.id);
          moveItemToGroup(activeItem.id, overItem.groupId, index >= 0 ? index : "end");
        } else {
          const list = itemsByGroup.get(activeItem.groupId) ?? [];
          const from = list.findIndex((i) => i.id === activeItem.id);
          const to = list.findIndex((i) => i.id === overItem.id);
          if (from === -1 || to === -1 || from === to) return;
          reorderItems(
            activeItem.groupId,
            arrayMove(list, from, to).map((i) => i.id)
          );
        }
        return;
      }

      if (overData?.type === "group") {
        const gid = String(over.id);
        if (gid !== activeItem.groupId) moveItemToGroup(activeItem.id, gid, "end");
        return;
      }

      if (overData?.type === "group-list") {
        const gid = String(overData.groupId);
        if (gid !== activeItem.groupId) moveItemToGroup(activeItem.id, gid, "end");
      }
    }
  };

  if (activeGroups.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-6 py-14 text-center">
        <FolderPlus size={36} className="text-zinc-300" />
        <p className="text-sm font-semibold text-zinc-600">Chưa có group nào</p>
        <p className="max-w-sm text-xs text-zinc-400">
          Group là nơi chứa các đoạn text bạn hay dùng (snippet, lệnh, link…). Tạo
          group đầu tiên để bắt đầu, sau đó nhập nội dung vào ô quick input và copy
          bằng 1 click.
        </p>
        <button
          onClick={() => openGroupModal({ mode: "create" })}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        >
          <FolderPlus size={14} />
          Tạo group đầu tiên
        </button>
      </div>
    );
  }

  const draggedGroup =
    activeDrag?.type === "group" ? activeGroups.find((g) => g.id === activeDrag.id) : null;
  const draggedItem =
    activeDrag?.type === "item" ? itemsById.get(activeDrag.id) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <SortableContext items={activeGroups.map((g) => g.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {activeGroups.map((g: Group) => (
            <GroupCard key={g.id} group={g} items={itemsByGroup.get(g.id) ?? []} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {draggedGroup && <GroupCardOverlay group={draggedGroup} count={itemsByGroup.get(draggedGroup.id)?.length ?? 0} />}
        {draggedItem && <ItemRowOverlay item={draggedItem} />}
      </DragOverlay>
    </DndContext>
  );
}
