import { ChevronDown, GripVertical } from "lucide-react";
import type { Group, Item } from "../lib/types";

export function GroupCardOverlay({ group, count }: { group: Group; count: number }) {
  return (
    <section className="w-[min(560px,90vw)] rotate-1 rounded-xl border border-zinc-300 bg-white p-2 shadow-xl">
      <div className="flex items-center gap-1.5 px-1 py-1">
        <GripVertical size={16} className="text-zinc-300" />
        <ChevronDown size={17} className="text-zinc-400" />
        <span className="truncate text-sm font-semibold">{group.name}</span>
        <span className="rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-500">
          {count}
        </span>
      </div>
    </section>
  );
}

export function ItemRowOverlay({ item }: { item: Item }) {
  return (
    <div className="rotate-2 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 shadow-xl">
      <p className="whitespace-pre-wrap break-words text-sm leading-5 line-clamp-2">
        {item.content}
      </p>
    </div>
  );
}
