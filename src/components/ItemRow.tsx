import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { copyText } from "../lib/api";
import type { Item } from "../lib/types";
import { cn } from "../lib/utils";
import { useNotesStore } from "../store/useNotesStore";

export function ItemRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", groupId: item.groupId }
  });

  const setEditingItem = useNotesStore((s) => s.setEditingItem);
  const deleteItem = useNotesStore((s) => s.deleteItem);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    await copyText(item.content);
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "flex cursor-default items-stretch gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 shadow-sm",
        isDragging ? "opacity-40" : "hover:border-zinc-300"
      )}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void handleCopy()}
        title="Copy nội dung (giữ focus để copy tiếp item khác)"
        className={cn(
          "flex shrink-0 items-center gap-1 self-center rounded px-1.5 py-1 text-[11px] font-medium",
          copied ? "text-green-600" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        )}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied && <span>Copied!</span>}
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setEditingItem(item.id)}
        title={item.content}
        className="min-w-0 flex-1 self-center whitespace-pre-wrap break-words text-left text-sm leading-5 line-clamp-2"
      >
        {item.content || <span className="text-zinc-400">(trống)</span>}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setEditingItem(item.id)}
          aria-label="Sửa item"
          title="Sửa nội dung"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => deleteItem(item.id)}
          aria-label="Xóa item"
          title="Xóa (chuyển vào thùng rác)"
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
